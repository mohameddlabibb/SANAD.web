import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { rescheduleBooking } from '@/services/bookingService';
import { createNotification } from '@/services/notificationService';
import { parseError } from '@/lib/parseError';

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

interface Props {
  bookingId: string;
  workerId: string;
  userId: string;
  durationHours: number;
  onSuccess: (newDate: string, newTime: string) => void;
}

export function RescheduleDialog({ bookingId, workerId, userId, durationHours, onSuccess }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState('');
  const [bookedIntervals, setBookedIntervals] = useState<{ start: number; end: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDate || !workerId) { setBookedIntervals([]); return; }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    supabase
      .from('bookings')
      .select('start_time, duration_hours')
      .eq('worker_id', workerId)
      .eq('booking_date', dateStr)
      .not('status', 'in', '(cancelled,rejected)')
      .neq('id', bookingId)
      .then(({ data }) => {
        if (!data) return;
        setBookedIntervals(
          data.map((b: { start_time: string; duration_hours: number }) => {
            const [h, m] = b.start_time.split(':').map(Number);
            const start = h + m / 60;
            // +1 hour gap so the provider has travel/break time between jobs
            return { start, end: start + b.duration_hours + 1 };
          }),
        );
      });
    setSelectedTime('');
  }, [selectedDate, workerId, bookingId]);

  const isSlotUnavailable = (slotTime: string) => {
    const [h] = slotTime.split(':').map(Number);
    const slotEnd = h + durationHours;
    return bookedIntervals.some(({ start, end }) => h < end && slotEnd > start);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const newDate = format(selectedDate, 'yyyy-MM-dd');
      const newTime = selectedTime + ':00';
      await rescheduleBooking(bookingId, newDate, newTime);

      const rescheduleMsg = t(
        'reschedule.notificationMessage',
        'Booking {{bookingId}} has been rescheduled to {{date}} at {{time}}.',
        { bookingId: bookingId.slice(0, 8), date: newDate, time: selectedTime },
      );

      // Notify the user
      await createNotification({
        receiver_id: userId,
        title: t('reschedule.notificationTitle', 'Booking Rescheduled'),
        message: t('reschedule.userMessage', 'Your booking has been rescheduled to {{date}} at {{time}}.', {
          date: newDate,
          time: selectedTime,
        }),
        booking_id: bookingId,
      });

      // Notify the worker
      await createNotification({
        receiver_id: workerId,
        title: t('reschedule.notificationTitle', 'Booking Rescheduled'),
        message: rescheduleMsg,
        booking_id: bookingId,
      });

      // Notify all admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      await Promise.all(
        (admins ?? []).map((admin: { id: string }) =>
          createNotification({
            receiver_id: admin.id,
            title: t('reschedule.notificationTitle', 'Booking Rescheduled'),
            message: rescheduleMsg,
            booking_id: bookingId,
          }),
        ),
      );

      onSuccess(newDate, newTime);
      setOpen(false);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mt-2">
          {t('reschedule.button', 'Reschedule Booking')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('reschedule.title', 'Reschedule Booking')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date picker */}
          <div>
            <p className="text-sm font-medium mb-1">{t('reschedule.selectDate', 'Select New Date')}</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : t('reschedule.pickDate', 'Pick a date')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().toDateString())}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div>
              <p className="text-sm font-medium mb-2">{t('reschedule.selectTime', 'Select New Time')}</p>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((slot) => {
                  const unavailable = isSlotUnavailable(slot);
                  return (
                    <button
                      key={slot}
                      disabled={unavailable}
                      onClick={() => !unavailable && setSelectedTime(slot)}
                      className={cn(
                        'py-2 rounded-lg text-sm font-medium border transition-all',
                        unavailable
                          ? 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50'
                          : selectedTime === slot
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-primary/40',
                      )}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full"
            disabled={!selectedDate || !selectedTime || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? t('common.loading') : t('reschedule.confirm', 'Confirm Reschedule')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
