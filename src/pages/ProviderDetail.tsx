import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Star, BadgeCheck, Clock, Crown, CalendarIcon, ArrowLeft, Minus, Plus, LocateFixed } from 'lucide-react';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createBooking } from '@/services/bookingService';
import { getWorkerById } from '@/services/workerService';
import { getWorkerFeedback } from '@/services/feedbackService';
import { supabase } from '@/lib/supabaseClient';
import type { NewBookingPayload } from '@/types/bookings';
import { parseError } from '@/lib/parseError';
import { CAREGIVER_MEDICAL_SKILLS, CAREGIVER_MEDICAL_SKILL_LABELS, type CaregiverMedicalSkill } from '@/types/workers';

interface WorkerReview {
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
}

interface Provider {
  id: string;
  name: string;
  nameAr: string;
  service: string;
  serviceType?: string;
  rating: number;
  reviews: number;
  experience: number;
  price: number;
  hourlyRate?: number;
  monthlyPrice: number | null;
  monthlyRate?: number | null;
  image: string;
  verified: boolean;
  chefType?: 'premium' | 'normal';
  attributes?: string[];
  overnightAvailable?: boolean;
}


const MANAGEMENT_FEE = 50;
const EMERGENCY_FEE = 200;

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const durationOptions = [1, 2, 3, 4, 5, 6, 7, 8];

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts'];


const ProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, updateUser } = useAuth();
  const { toast } = useToast();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [bookingType, setBookingType] = useState<'normal' | 'package' | 'emergency' | 'day'>(
    searchParams.get('mode') === 'emergency' ? 'emergency' : 'normal'
  );
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [selectedDays, setSelectedDays] = useState<number>(1);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [bookedIntervals, setBookedIntervals] = useState<{ start: number; end: number }[]>([]);

  // Chef extras
  const [chefMealsCount, setChefMealsCount] = useState<number>(3);
  const [chefPrepWeek, setChefPrepWeek] = useState<boolean>(false);
  const [chefIngredientsStatus, setChefIngredientsStatus] = useState<'available' | 'missing' | 'partial'>('available');
  const [chefMissingIngredients, setChefMissingIngredients] = useState<string>('');
  const [chefMealTypes, setChefMealTypes] = useState<string[]>([]);

  // Caregiver overnight
  const [withOvernight, setWithOvernight] = useState<boolean>(false);

  // Maid extras
  const [maidRoomsCount, setMaidRoomsCount] = useState<number>(2);
  const [maidCleaningType, setMaidCleaningType] = useState<'regular' | 'deep' | 'move_in_out'>('regular');
  const [maidLaundry, setMaidLaundry] = useState<boolean>(false);

  const userAddresses = user?.address
    ? user.address.split(' | ').map((a) => a.trim()).filter(Boolean)
    : [];
  const [selectedAddress, setSelectedAddress] = useState<string>(() =>
    user?.address ? (user.address.split(' | ')[0]?.trim() ?? '') : ''
  );
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoadingProvider(true);
    getWorkerById(id)
      .then(setProvider)
      .catch(() => setProvider(null))
      .finally(() => setLoadingProvider(false));

    setReviewsLoading(true);
    getWorkerFeedback(id)
      .then((data) => setReviews(data as WorkerReview[]))
      .catch(console.error)
      .finally(() => setReviewsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) { setBookedIntervals([]); return; }
    const dateStr = bookingType === 'emergency'
      ? format(new Date(), 'yyyy-MM-dd')
      : selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
    if (!dateStr) { setBookedIntervals([]); return; }
    supabase
      .from('bookings')
      .select('start_time, duration_hours')
      .eq('worker_id', id)
      .eq('booking_date', dateStr)
      .not('status', 'in', '(cancelled,rejected)')
      .then(({ data }) => {
        if (!data) return;
        setBookedIntervals(
          data.map((b: { start_time: string; duration_hours: number }) => {
            const [h, m] = b.start_time.split(':').map(Number);
            const start = h + m / 60;
            // +1 hour gap so the provider has travel/break time between jobs
            return { start, end: start + b.duration_hours + 1 };
          })
        );
      });
  }, [id, selectedDate, bookingType]);

  const effectiveDuration = bookingType === 'day' ? selectedDays * 8 : selectedDuration;

  const isSlotUnavailable = (slotTime: string) => {
    const [h] = slotTime.split(':').map(Number);
    const slotEnd = h + effectiveDuration;
    return bookedIntervals.some(({ start, end }) => h < end && slotEnd > start);
  };

  useEffect(() => {
    if (selectedTime && isSlotUnavailable(selectedTime)) {
      setSelectedTime('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDuration, bookedIntervals]);

  const displayName = provider
    ? (i18n.language === 'ar' ? provider.nameAr : provider.name)
    : '';
  const isPremiumChef = provider?.service === 'chefs' && provider?.chefType === 'premium';

  const actualReviewCount = reviewsLoading ? provider?.reviews ?? 0 : reviews.length;
  const actualRating = reviewsLoading
    ? (provider?.rating ?? 0)
    : reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

  const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIndex = new Date().getMonth();
  const availableMonths = allMonths.filter((_, index) => index > currentMonthIndex);

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const toggleMealType = (type: string) => {
    setChefMealTypes(prev =>
      prev.includes(type) ? prev.filter(m => m !== type) : [...prev, type]
    );
  };

  const monthlyRate = provider?.monthlyPrice ?? 0;
  const hourlyRate = provider?.price ?? 0;

  const emergencyTimeSlots = useMemo(() => {
    const currentHour = new Date().getHours();
    return timeSlots.filter((slot) => parseInt(slot) > currentHour);
  }, []);

  // Derived flags
  const isChef = (provider?.service ?? '').includes('chef');
  const isCaregiver = (provider?.service ?? '').includes('caregiver');
  const isMaid = provider?.service === 'maid';
  const showOvernightSection = isCaregiver && provider?.overnightAvailable === true && bookingType === 'day';

  const totalCost = useMemo(() => {
    if (!provider) return 0;
    if (bookingType === 'package') return monthlyRate * selectedMonths.length + MANAGEMENT_FEE;
    if (bookingType === 'emergency') return provider.price * selectedDuration + EMERGENCY_FEE + MANAGEMENT_FEE;
    if (bookingType === 'day') {
      const base = selectedDays * 8 * hourlyRate;
      const overnight = (withOvernight && showOvernightSection) ? selectedDays * 12 * hourlyRate : 0;
      return base + overnight + MANAGEMENT_FEE;
    }
    return provider.price * selectedDuration + MANAGEMENT_FEE;
  }, [bookingType, selectedMonths, selectedDuration, selectedDays, provider, monthlyRate, hourlyRate, withOvernight, showOvernightSection]);

  const buildExtraDetails = () => {
    const st = provider?.service ?? '';
    if (st.includes('chef')) {
      return {
        meals_count: chefMealsCount,
        prep_for_week: chefPrepWeek,
        ingredients_available: chefIngredientsStatus,
        ...(chefMissingIngredients ? { missing_ingredients: chefMissingIngredients } : {}),
        meal_types: chefMealTypes,
      };
    }
    if (st === 'maid') {
      return {
        rooms_count: maidRoomsCount,
        cleaning_type: maidCleaningType,
        laundry_included: maidLaundry,
      };
    }
    if (st.includes('caregiver')) {
      return {
        with_overnight: withOvernight,
        ...(withOvernight && bookingType === 'day' ? { overnight_nights: selectedDays } : {}),
      };
    }
    return null;
  };

  if (loadingProvider) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <p className="text-muted-foreground text-lg">{t('common.loading')}</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground text-lg">{t('providerDetail.notFound')}</p>
            <Button onClick={() => navigate('/services')} className="mt-4">
              {t('providerDetail.backToServices')}
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleBookNow = async () => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    if (!user.city || !user.address) {
      navigate('/profile');
      toast({ title: t('profile.cityAddressRequired', 'Please complete your profile'), description: t('profile.cityAddressRequiredDesc', 'City and Address are required before booking a service.'), variant: 'destructive' });
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const workerId = provider.id;
      const extraDetails = buildExtraDetails();

      let booking;

      if (bookingType === 'normal') {
        if (!selectedDate || !selectedTime) {
          throw new Error(t('providerDetail.selectDateTimeError'));
        }

        const bookingDate = format(selectedDate, 'yyyy-MM-dd');
        const startTime = `${selectedTime}:00`;

        if (isSlotUnavailable(selectedTime)) {
          throw new Error(t('providerDetail.slotUnavailable', 'This time slot is no longer available. Please choose another time.'));
        }

        const payload: NewBookingPayload = {
          user_id: user.id,
          worker_id: workerId,
          booking_type: 'hour',
          booking_date: bookingDate,
          start_time: startTime,
          duration_hours: selectedDuration,
          total_price: totalCost,
          status: 'pending',
          notes: additionalNotes || null,
          duration_value: selectedDuration,
          address: selectedAddress || null,
          management_fee: MANAGEMENT_FEE,
          emergency_fee: 0,
          booking_extra_details: extraDetails,
        };

        booking = await createBooking(payload);
      } else if (bookingType === 'emergency') {
        if (!selectedTime) {
          throw new Error(t('providerDetail.selectTimeError', 'Please select a time slot.'));
        }

        if (isSlotUnavailable(selectedTime)) {
          throw new Error(t('providerDetail.slotUnavailable', 'This time slot is no longer available. Please choose another time.'));
        }

        const payload: NewBookingPayload = {
          user_id: user.id,
          worker_id: workerId,
          booking_type: 'emergency',
          booking_date: format(new Date(), 'yyyy-MM-dd'),
          start_time: `${selectedTime}:00`,
          duration_hours: selectedDuration,
          total_price: totalCost,
          status: 'pending',
          notes: additionalNotes || null,
          duration_value: selectedDuration,
          address: selectedAddress || null,
          management_fee: MANAGEMENT_FEE,
          emergency_fee: EMERGENCY_FEE,
          booking_extra_details: extraDetails,
        };

        booking = await createBooking(payload);
      } else if (bookingType === 'day') {
        if (!selectedDate || !selectedTime) {
          throw new Error(t('providerDetail.selectDateTimeError'));
        }

        const payload: NewBookingPayload = {
          user_id: user.id,
          worker_id: workerId,
          booking_type: 'day',
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: `${selectedTime}:00`,
          duration_hours: selectedDays * 8,
          total_price: totalCost,
          status: 'pending',
          notes: additionalNotes || null,
          duration_value: selectedDays,
          address: selectedAddress || null,
          management_fee: MANAGEMENT_FEE,
          emergency_fee: 0,
          booking_extra_details: extraDetails,
        };

        booking = await createBooking(payload);
      } else {
        if (selectedMonths.length === 0) {
          throw new Error(t('providerDetail.selectPackageError'));
        }

        const today = new Date();
        const bookingDate = format(today, 'yyyy-MM-dd');
        const startTime = '08:00:00';

        const payload: NewBookingPayload = {
          user_id: user.id,
          worker_id: workerId,
          booking_type: 'package',
          booking_date: bookingDate,
          start_time: startTime,
          duration_hours: selectedMonths.length * 160,
          total_price: totalCost,
          status: 'pending',
          notes: additionalNotes || null,
          duration_value: selectedMonths.length,
          address: selectedAddress || null,
          management_fee: MANAGEMENT_FEE,
          emergency_fee: 0,
          booking_extra_details: extraDetails,
        };

        booking = await createBooking(payload);
      }

      navigate(`/payment/${booking.id}?type=deposit`, {
        state: { workerName: displayName, totalCost },
      });
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/services')}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('providerDetail.backToServices')}
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Provider Details */}
            <div className="lg:col-span-1">
              <Card className={isPremiumChef ? 'ring-2 ring-amber-400/50' : ''}>
                <CardContent className="p-6">
                  {/* Provider Avatar */}
                  <div className={`relative h-48 rounded-xl flex items-center justify-center mb-6 ${isPremiumChef ? 'bg-gradient-to-br from-amber-100 to-amber-50' : 'bg-gradient-to-br from-primary/10 to-primary/5'}`}>
                    <div className={`w-28 h-28 rounded-full overflow-hidden flex items-center justify-center text-4xl font-heading ${isPremiumChef ? 'bg-amber-200 text-amber-800' : 'bg-primary/20 text-primary'}`}>
                      {provider.image ? (
                        <img src={provider.image} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        displayName.charAt(0)
                      )}
                    </div>
                    <div className="absolute top-3 end-3 flex flex-col gap-1.5">
                      {isPremiumChef && (
                        <Badge className="bg-amber-500 text-white gap-1">
                          <Crown className="h-3 w-3" />
                          {t('servicesPage.premium')}
                        </Badge>
                      )}
                      {provider.verified && (
                        <Badge className="bg-primary/90 text-primary-foreground gap-1">
                          <BadgeCheck className="h-3 w-3" />
                          {t('servicesPage.verified')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Provider Info */}
                  <div className="space-y-4">
                    <div>
                      <h1 className="font-heading text-2xl text-foreground mb-1">
                        {displayName}
                      </h1>
                      <p className="text-muted-foreground">
                        {t(`services.${provider.service}`)}
                        {provider.chefType && ` • ${t(`servicesPage.chef${provider.chefType.charAt(0).toUpperCase() + provider.chefType.slice(1)}`)}`}
                      </p>
                    </div>

                    {/* Rating & Experience */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-5 w-5 fill-current" />
                        <span className="font-medium text-lg">{actualRating}</span>
                        <span className="text-muted-foreground">({actualReviewCount} {t('providerDetail.reviews')})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{provider.experience} {t('servicesPage.yearsExp')}</span>
                    </div>

                    {/* Attributes */}
                    {provider.attributes && provider.attributes.length > 0 && (
                      <div>
                        <h3 className="font-medium text-foreground mb-2">{t('providerDetail.specialties')}</h3>
                        <div className="flex flex-wrap gap-2">
                          {provider.attributes
                            .filter(attr => !CAREGIVER_MEDICAL_SKILLS.includes(attr as CaregiverMedicalSkill))
                            .map((attr) => (
                              <Badge key={attr} variant="secondary" className="text-xs">
                                {attr}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Medical Skills (caregivers only) */}
                    {isCaregiver &&
                      (provider?.attributes ?? []).some(a => CAREGIVER_MEDICAL_SKILLS.includes(a as CaregiverMedicalSkill)) && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">Medical Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {(provider?.attributes ?? [])
                            .filter(a => CAREGIVER_MEDICAL_SKILLS.includes(a as CaregiverMedicalSkill))
                            .map(skill => (
                              <span
                                key={skill}
                                className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full border border-green-200 flex items-center gap-1"
                              >
                                🏥 {CAREGIVER_MEDICAL_SKILL_LABELS[skill as CaregiverMedicalSkill]?.en ?? skill}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Price */}
                    <div className="pt-4 border-t border-border">
                      <span className={`text-3xl font-bold ${isPremiumChef ? 'text-amber-600' : 'text-primary'}`}>
                        {provider.price}
                      </span>
                      <span className="text-muted-foreground"> EGP/{t('servicesPage.hour')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Booking Section */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-xl">
                    {t('providerDetail.bookingOptions')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {bookingType === 'emergency' ? (
                    /* Emergency booking — shown directly, no tabs */
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <span className="text-red-600 text-sm font-medium">
                          {t('providerDetail.emergencyDesc', 'Same-day immediate service — available today only')}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          {t('providerDetail.selectDate')}
                        </label>
                        <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-muted/40 text-sm font-medium">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {t('providerDetail.todayDate', 'Today')} — {format(new Date(), 'PPP')}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            {t('providerDetail.selectTime')}
                          </label>
                          <Select value={selectedTime} onValueChange={setSelectedTime}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t('providerDetail.pickTime')} />
                            </SelectTrigger>
                            <SelectContent>
                              {emergencyTimeSlots.length === 0 ? (
                                <SelectItem value="none" disabled>
                                  {t('providerDetail.noSlotsAvailable', 'No slots available today')}
                                </SelectItem>
                              ) : (
                                emergencyTimeSlots.map((time) => {
                                  const unavailable = isSlotUnavailable(time);
                                  return (
                                    <SelectItem key={time} value={time} disabled={unavailable}>
                                      {time}{unavailable ? ` (${t('providerDetail.unavailable', 'Unavailable')})` : ''}
                                    </SelectItem>
                                  );
                                })
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            {t('providerDetail.selectDuration')}
                          </label>
                          <Select value={selectedDuration.toString()} onValueChange={(v) => setSelectedDuration(Number(v))}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {durationOptions.map((hours) => (
                                <SelectItem key={hours} value={hours.toString()}>
                                  {hours} {hours === 1 ? t('providerDetail.hour') : t('providerDetail.hours')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Normal / Package / Day tabs */
                    <Tabs value={bookingType} onValueChange={(v) => { setSelectedTime(''); setBookingType(v as 'normal' | 'package' | 'day'); }}>
                      <TabsList className={`grid w-full ${(provider?.monthlyPrice != null && (provider.monthlyPrice as number) > 0) ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <TabsTrigger value="normal">
                          {t('providerDetail.hourly')}
                        </TabsTrigger>
                        {(provider?.monthlyPrice != null && (provider.monthlyPrice as number) > 0) && (
                          <TabsTrigger value="package">
                            {t('providerDetail.monthly')}
                          </TabsTrigger>
                        )}
                        <TabsTrigger value="day">
                          {t('booking.byDay', 'By Day')}
                        </TabsTrigger>
                      </TabsList>

                      {/* Normal Booking */}
                      <TabsContent value="normal" className="space-y-6 mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Date Picker */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              {t('providerDetail.selectDate')}
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="me-2 h-4 w-4" />
                                  {selectedDate ? format(selectedDate, "PPP") : t('providerDetail.pickDate')}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={setSelectedDate}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Time Picker */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              {t('providerDetail.selectTime')}
                            </label>
                            <Select value={selectedTime} onValueChange={setSelectedTime}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('providerDetail.pickTime')} />
                              </SelectTrigger>
                              <SelectContent>
                                {timeSlots.map((time) => {
                                  const unavailable = isSlotUnavailable(time);
                                  return (
                                    <SelectItem key={time} value={time} disabled={unavailable}>
                                      {time}{unavailable ? ` (${t('providerDetail.unavailable', 'Unavailable')})` : ''}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Duration Selector */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            {t('providerDetail.selectDuration')}
                          </label>
                          <Select value={selectedDuration.toString()} onValueChange={(v) => setSelectedDuration(Number(v))}>
                            <SelectTrigger className="w-full md:w-1/2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {durationOptions.map((hours) => (
                                <SelectItem key={hours} value={hours.toString()}>
                                  {hours} {hours === 1 ? t('providerDetail.hour') : t('providerDetail.hours')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TabsContent>

                      {/* Monthly Selection */}
                      <TabsContent value="package" className="space-y-4 mt-6">
                        <label className="text-sm font-medium text-foreground">
                          {t('providerDetail.selectMonths')}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {availableMonths.map((month) => (
                            <button
                              key={month}
                              type="button"
                              onClick={() => toggleMonth(month)}
                              className={cn(
                                "px-4 py-2 rounded-full border text-sm font-medium transition-colors",
                                selectedMonths.includes(month)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-foreground border-border hover:border-primary"
                              )}
                            >
                              {month}
                            </button>
                          ))}
                        </div>
                      </TabsContent>

                      {/* By Day Booking */}
                      <TabsContent value="day" className="space-y-6 mt-6">
                        {/* Day count stepper */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            {t('booking.selectDays')}
                          </label>
                          <div className="flex items-center gap-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setSelectedDays(d => Math.max(1, d - 1))}
                              disabled={selectedDays <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center text-lg font-semibold">{selectedDays}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setSelectedDays(d => Math.min(30, d + 1))}
                              disabled={selectedDays >= 30}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              {selectedDays === 1 ? t('booking.day', 'day') : t('booking.days', 'days')}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Date Picker */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              {t('providerDetail.selectDate')}
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="me-2 h-4 w-4" />
                                  {selectedDate ? format(selectedDate, "PPP") : t('providerDetail.pickDate')}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={setSelectedDate}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Time Picker */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              {t('providerDetail.selectTime')}
                            </label>
                            <Select value={selectedTime} onValueChange={setSelectedTime}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('providerDetail.pickTime')} />
                              </SelectTrigger>
                              <SelectContent>
                                {timeSlots.map((time) => {
                                  const unavailable = isSlotUnavailable(time);
                                  return (
                                    <SelectItem key={time} value={time} disabled={unavailable}>
                                      {time}{unavailable ? ` (${t('providerDetail.unavailable', 'Unavailable')})` : ''}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}

                  {/* Address Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">
                        {t('common.address')}
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-primary text-xs gap-1 h-auto py-0.5"
                        onClick={() => setLocationPickerOpen(true)}
                      >
                        <LocateFixed className="w-3.5 h-3.5" />
                        {t('location.useCurrentLocation')}
                      </Button>
                    </div>
                    {userAddresses.length > 1 && (
                      <Select value={selectedAddress} onValueChange={setSelectedAddress}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('providerDetail.pickAddress', 'Select address')} />
                        </SelectTrigger>
                        <SelectContent>
                          {userAddresses.map((addr) => (
                            <SelectItem key={addr} value={addr}>
                              {addr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {selectedAddress && userAddresses.length <= 1 && (
                      <p className="text-sm text-muted-foreground truncate">{selectedAddress}</p>
                    )}
                  </div>
                  <LocationPickerModal
                    open={locationPickerOpen}
                    onOpenChange={setLocationPickerOpen}
                    onConfirm={(addr) => {
                      setSelectedAddress(addr);
                      const existing = user?.address
                        ? user.address.split(' | ').map((a) => a.trim()).filter(Boolean)
                        : [];
                      const merged = [...existing, addr].join(' | ');
                      updateUser({ address: merged });
                    }}
                  />

                  {/* Additional Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      {t('providerDetail.additionalNotes')}
                    </label>
                    <Textarea
                      placeholder={t('providerDetail.notesPlaceholder')}
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* Chef Extras */}
                  {isChef && (
                    <div className="rounded-xl bg-orange-50 border border-orange-200 p-5 space-y-4">
                      <h3 className="font-medium text-orange-800 text-sm">{t('booking.chefExtras', 'Chef Preferences')}</h3>

                      {/* Meals count */}
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">{t('booking.mealsCount', 'Number of Meals')}</label>
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setChefMealsCount(c => Math.max(1, c - 1))}
                            disabled={chefMealsCount <= 1}
                            className="h-8 w-8"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-semibold">{chefMealsCount}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setChefMealsCount(c => c + 1)}
                            className="h-8 w-8"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Prep for whole week */}
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">{t('booking.prepForWeek', 'Prep for whole week?')}</label>
                        <Switch checked={chefPrepWeek} onCheckedChange={setChefPrepWeek} />
                      </div>

                      {/* Ingredients status */}
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">{t('booking.ingredientsStatus', 'Ingredients availability')}</label>
                        <Select value={chefIngredientsStatus} onValueChange={(v) => setChefIngredientsStatus(v as 'available' | 'missing' | 'partial')}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">{t('booking.ingredientsAvailable', 'All available')}</SelectItem>
                            <SelectItem value="partial">{t('booking.ingredientsPartial', 'Partially available')}</SelectItem>
                            <SelectItem value="missing">{t('booking.ingredientsMissing', 'Missing ingredients')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Missing ingredients textarea */}
                      {chefIngredientsStatus !== 'available' && (
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-foreground">{t('booking.missingIngredients', 'List missing ingredients')}</label>
                          <Textarea
                            value={chefMissingIngredients}
                            onChange={(e) => setChefMissingIngredients(e.target.value)}
                            placeholder={t('booking.missingIngredientsPlaceholder')}
                            className="min-h-[80px]"
                          />
                        </div>
                      )}

                      {/* Meal types */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t('booking.mealTypes', 'Meal types')}</label>
                        <div className="flex flex-wrap gap-2">
                          {MEAL_TYPES.map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => toggleMealType(type)}
                              className={cn(
                                "px-3 py-1 rounded-full border text-xs font-medium transition-colors",
                                chefMealTypes.includes(type)
                                  ? "bg-orange-500 text-white border-orange-500"
                                  : "bg-white text-orange-700 border-orange-300 hover:border-orange-500"
                              )}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Caregiver Overnight */}
                  {showOvernightSection && (
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-5 space-y-3">
                      <h3 className="font-medium text-blue-800 text-sm">{t('booking.withOvernight', 'Overnight Stay')}</h3>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">{t('booking.withOvernight', 'Include overnight stay?')}</label>
                        <Switch checked={withOvernight} onCheckedChange={setWithOvernight} />
                      </div>
                      <p className="text-xs text-blue-700">{t('booking.overnightNote', 'Overnight stay adds 12 hours per night to the total.')}</p>
                      {withOvernight && bookingType === 'day' && (
                        <div className="text-sm text-blue-800 font-medium">
                          {t('booking.overnightCharge', 'Overnight charge')}: EGP {(selectedDays * 12 * hourlyRate).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Maid Extras */}
                  {isMaid && (
                    <div className="rounded-xl bg-purple-50 border border-purple-200 p-5 space-y-4">
                      <h3 className="font-medium text-purple-800 text-sm">{t('booking.maidExtras', 'Cleaning Preferences')}</h3>

                      {/* Rooms count */}
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">{t('booking.roomsCount', 'Number of Rooms')}</label>
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setMaidRoomsCount(c => Math.max(1, c - 1))}
                            disabled={maidRoomsCount <= 1}
                            className="h-8 w-8"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-semibold">{maidRoomsCount}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setMaidRoomsCount(c => Math.min(20, c + 1))}
                            disabled={maidRoomsCount >= 20}
                            className="h-8 w-8"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Cleaning type */}
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">{t('booking.cleaningType', 'Cleaning type')}</label>
                        <Select value={maidCleaningType} onValueChange={(v) => setMaidCleaningType(v as 'regular' | 'deep' | 'move_in_out')}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">{t('booking.cleaningRegular', 'Regular Cleaning')}</SelectItem>
                            <SelectItem value="deep">{t('booking.cleaningDeep', 'Deep Cleaning')}</SelectItem>
                            <SelectItem value="move_in_out">{t('booking.cleaningMoveInOut', 'Move-In / Move-Out Cleaning')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Laundry */}
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">{t('booking.laundryIncluded', 'Laundry & ironing included?')}</label>
                        <Switch checked={maidLaundry} onCheckedChange={setMaidLaundry} />
                      </div>
                    </div>
                  )}

                  {/* Cost Summary */}
                  <div className="bg-muted/50 rounded-xl p-6 space-y-3">
                    {error && (
                      <p className="text-sm text-red-500 mb-3" role="alert">
                        {error}
                      </p>
                    )}

                    {/* Fee breakdown */}
                    {provider && bookingType !== 'package' && bookingType !== 'day' && (
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t('payment.servicePrice', 'Service Price')}</span>
                          <span>EGP {(provider.price * selectedDuration).toLocaleString()}</span>
                        </div>
                        {bookingType === 'emergency' && (
                          <div className="flex justify-between text-red-600 font-medium">
                            <span>{t('payment.emergencyFee', 'Emergency Fee')}</span>
                            <span>+ EGP {EMERGENCY_FEE}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t('payment.managementFee', 'Management Fee')}</span>
                          <span>+ EGP {MANAGEMENT_FEE}</span>
                        </div>
                        <div className="border-t border-border pt-1.5" />
                      </div>
                    )}
                    {provider && bookingType === 'package' && (
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>{selectedMonths.length} {t('providerDetail.months')} × EGP {monthlyRate.toLocaleString()}</span>
                          <span>EGP {(monthlyRate * selectedMonths.length).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t('payment.managementFee', 'Management Fee')}</span>
                          <span>+ EGP {MANAGEMENT_FEE}</span>
                        </div>
                        <div className="border-t border-border pt-1.5" />
                      </div>
                    )}
                    {provider && bookingType === 'day' && (
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>{selectedDays} {t('providerDetail.days', 'days')} × 8h × EGP {hourlyRate.toLocaleString()}</span>
                          <span>EGP {(selectedDays * 8 * hourlyRate).toLocaleString()}</span>
                        </div>
                        {withOvernight && showOvernightSection && (
                          <div className="flex justify-between text-blue-600 font-medium">
                            <span>{t('booking.overnightCharge', 'Overnight charge')} ({selectedDays} × 12h)</span>
                            <span>+ EGP {(selectedDays * 12 * hourlyRate).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t('payment.managementFee', 'Management Fee')}</span>
                          <span>+ EGP {MANAGEMENT_FEE}</span>
                        </div>
                        <div className="border-t border-border pt-1.5" />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{t('providerDetail.totalCost')}</span>
                      <span className="text-3xl font-bold text-primary">EGP {totalCost.toLocaleString()}</span>
                    </div>

                    <Button
                      size="lg"
                      className={cn('w-full', bookingType === 'emergency' && 'bg-red-600 hover:bg-red-700 text-white')}
                      onClick={handleBookNow}
                      disabled={
                        isSubmitting ||
                        (bookingType === 'normal' && (!selectedDate || !selectedTime)) ||
                        (bookingType === 'emergency' && !selectedTime) ||
                        (bookingType === 'package' && selectedMonths.length === 0) ||
                        (bookingType === 'day' && (!selectedDate || !selectedTime))
                      }
                    >
                      {isSubmitting ? t('booking.submitting', 'Booking...') : bookingType === 'emergency' ? t('providerDetail.bookEmergency', 'Book Emergency Now') : t('common.bookNow')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

          {/* Reviews Section */}
          <div className="container mx-auto px-4 py-8">
            <h2 className="font-heading text-xl font-bold mb-4">{t('feedback.reviews', 'Reviews')}</h2>
            {reviewsLoading ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('feedback.noReviews', 'No reviews yet.')}</p>
            ) : (
              <div className="space-y-4 max-w-2xl">
                {reviews.map((review, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{review.profiles?.full_name ?? t('common.loading')}</p>
                        <p className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground italic">"{review.comment}"</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProviderDetail;
