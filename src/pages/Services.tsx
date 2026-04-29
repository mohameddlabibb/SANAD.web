import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ServiceFilters } from '@/components/services/ServiceFilters';
import { ProviderCard } from '@/components/services/ProviderCard';
import { ServiceTabs } from '@/components/services/ServiceTabs';
import { getWorkers } from '@/services/workerService';
import { supabase } from '@/lib/supabaseClient';

const ALL_TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

interface Provider {
  id: string;
  name: string;
  nameAr: string;
  service: string;
  rating: number;
  reviews: number;
  experience: number;
  price: number;
  image: string;
  verified: boolean;
  chefType?: 'premium' | 'normal';
  carModel?: string | null;
  attributes?: string[];
}

const Services = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialService = searchParams.get('type') || 'all';

  const [selectedService, setSelectedService] = useState(initialService);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    chefType: 'all' as 'all' | 'premium' | 'normal',
    chefCuisine: 'all',
    chefSpecialty: 'all',
    driverCarOption: 'all' as 'all' | 'noCar' | 'withCar',
    driverCarTypes: [] as string[],
  });
  // workerId → booked intervals today (for emergency mode)
  const [todayBookedMap, setTodayBookedMap] = useState<Record<string, { start: number; end: number }[]>>({});

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    // Always fetch all workers in emergency mode so we can show any service type
    const serviceKey = selectedService === 'emergency' ? 'all' : selectedService;
    getWorkers(serviceKey)
      .then(setProviders)
      .catch((err) => {
        console.error(err);
        setFetchError(t('common.error'));
      })
      .finally(() => setLoading(false));
  }, [selectedService, t]);

  // Fetch today's bookings when in emergency mode
  useEffect(() => {
    if (selectedService !== 'emergency') { setTodayBookedMap({}); return; }
    const today = format(new Date(), 'yyyy-MM-dd');
    supabase
      .from('bookings')
      .select('worker_id, start_time, duration_hours')
      .eq('booking_date', today)
      .not('status', 'in', '(cancelled,rejected)')
      .then(({ data }) => {
        const map: Record<string, { start: number; end: number }[]> = {};
        (data ?? []).forEach((b: { worker_id: string; start_time: string; duration_hours: number }) => {
          const [h, m] = b.start_time.split(':').map(Number);
          const start = h + m / 60;
          if (!map[b.worker_id]) map[b.worker_id] = [];
          map[b.worker_id].push({ start, end: start + b.duration_hours });
        });
        setTodayBookedMap(map);
      });
  }, [selectedService]);

  // Compute available slots per provider for emergency mode
  const emergencySlotMap = useMemo(() => {
    if (selectedService !== 'emergency') return {};
    const currentHour = new Date().getHours();
    const futureSlots = ALL_TIME_SLOTS.filter((s) => parseInt(s) > currentHour);
    const result: Record<string, string[]> = {};
    providers.forEach((p) => {
      const intervals = todayBookedMap[p.id] ?? [];
      result[p.id] = futureSlots.filter((slot) => {
        const h = parseInt(slot);
        return !intervals.some(({ start, end }) => h < end && h + 1 > start);
      });
    });
    return result;
  }, [selectedService, providers, todayBookedMap]);

  const filteredProviders = providers.filter(provider => {
    // Emergency mode: only show providers with at least 1 available slot today + apply same filters
    if (selectedService === 'emergency') {
      if ((emergencySlotMap[provider.id] ?? []).length === 0) return false;
      if (provider.service === 'chefs') {
        if (filters.chefType !== 'all' && provider.chefType !== filters.chefType) return false;
        if (filters.chefCuisine !== 'all' && !provider.attributes?.includes(filters.chefCuisine)) return false;
        if (filters.chefSpecialty !== 'all' && !provider.attributes?.includes(filters.chefSpecialty)) return false;
      }
      if (provider.service === 'drivers') {
        const hasCar = !!provider.carModel;
        if (filters.driverCarOption === 'noCar' && hasCar) return false;
        if (filters.driverCarOption === 'withCar' && !hasCar) return false;
      }
      return true;
    }

    if (selectedService !== 'all' && provider.service !== selectedService) return false;

    // In "All Services" view: if a service-specific filter is active, hide other service types
    if (selectedService === 'all') {
      if ((filters.chefType !== 'all' || filters.chefCuisine !== 'all' || filters.chefSpecialty !== 'all') && provider.service !== 'chefs') return false;
      if (filters.driverCarOption !== 'all' && provider.service !== 'drivers') return false;
    }

    // Chef-specific filters
    if (provider.service === 'chefs') {
      if (filters.chefType !== 'all' && provider.chefType !== filters.chefType) return false;
      if (filters.chefCuisine !== 'all' && !provider.attributes?.includes(filters.chefCuisine)) return false;
      if (filters.chefSpecialty !== 'all' && !provider.attributes?.includes(filters.chefSpecialty)) return false;
    }

    // Driver-specific filters — hasCar is determined by the car_model field
    if (provider.service === 'drivers') {
      const hasCar = !!provider.carModel;
      if (filters.driverCarOption === 'noCar' && hasCar) return false;
      if (filters.driverCarOption === 'withCar' && !hasCar) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-heading text-foreground mb-2">
              {t('servicesPage.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('servicesPage.subtitle')}
            </p>
          </div>

          <ServiceTabs 
            selectedService={selectedService} 
            onSelect={setSelectedService} 
          />

          {/* Emergency mode header */}
          {selectedService === 'emergency' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <span className="text-red-600 font-semibold text-sm">
                {t('servicesPage.emergencyModeDesc', 'Showing providers available right now today. Emergency Fee +200 EGP will apply.')}
              </span>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8 mt-8">
            {/* Filters Sidebar */}
            {(selectedService === 'all' || selectedService === 'chefs' || selectedService === 'drivers' || selectedService === 'emergency') && (
              <aside className="w-full lg:w-72 shrink-0">
                <ServiceFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  serviceType={selectedService === 'emergency' ? 'all' : selectedService}
                />
              </aside>
            )}

            {/* Provider Grid */}
            <div className="flex-1">
              {loading ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">{t('common.loading')}</p>
                </div>
              ) : fetchError ? (
                <div className="text-center py-16">
                  <p className="text-destructive text-lg">{fetchError}</p>
                </div>
              ) : filteredProviders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProviders.map((provider) => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      locale={i18n.language}
                      emergencyMode={selectedService === 'emergency'}
                      availableSlots={emergencySlotMap[provider.id]}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">
                    {selectedService === 'emergency'
                      ? t('servicesPage.noEmergencyProviders', 'No providers are available right now. Please try again later.')
                      : t('servicesPage.noResults')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Services;
