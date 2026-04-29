import { useTranslation } from 'react-i18next';
import { Grid3X3, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const services = [
  { key: 'all', img: null },
  { key: 'caregivers', img: '/icons/Caregiver.png' },
  { key: 'maid', img: '/icons/Maid.png' },
  { key: 'drivers', img: '/icons/Driver.png' },
  { key: 'babysitters', img: '/icons/Babysitter.png' },
  { key: 'chefs', img: '/icons/Chef.png' },
];

interface ServiceTabsProps {
  selectedService: string;
  onSelect: (service: string) => void;
}

export const ServiceTabs = ({ selectedService, onSelect }: ServiceTabsProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2">
      {services.map((service) => {
        const isSelected = selectedService === service.key;

        return (
          <button
            key={service.key}
            onClick={() => onSelect(service.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200",
              isSelected
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {service.img
              ? <img src={service.img} alt={service.key} className="h-8 w-8 object-contain" style={{ mixBlendMode: 'multiply' }} />
              : <Grid3X3 className="h-6 w-6" />
            }
            <span>{service.key === 'all' ? t('servicesPage.allServices') : t(`services.${service.key}`)}</span>
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-px bg-border self-stretch mx-1" />

      {/* Emergency tab */}
      <button
        onClick={() => onSelect('emergency')}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200",
          selectedService === 'emergency'
            ? "bg-red-600 text-white shadow-md"
            : "bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
        )}
      >
        <Zap className="h-5 w-5" />
        <span>{t('providerDetail.emergency', 'Emergency')}</span>
      </button>
    </div>
  );
};
