import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Calendar, Clock, User, FileText, CreditCard, MapPin,
  CheckCircle, XCircle, PlayCircle, Star,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import type { Booking } from '@/types/bookings';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { RescheduleDialog } from '@/components/RescheduleDialog';
import { getFeedbackByBookingId } from '@/services/feedbackService';
import { cancelBooking } from '@/services/bookingService';

interface BookingDetail extends Booking {
  workers: {
    service_type: string;
    profiles: { full_name: string | null } | null;
  } | null;
  deposit_refund_status?: string | null;
}

interface FeedbackRecord {
  rating: number;
  comment: string | null;
  created_at: string;
  rating_type: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-800',
  upcoming: 'bg-blue-100 text-blue-800',
  accepted: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-blue-100 text-blue-800',
  ongoing: 'bg-blue-500 text-white',
  completed: 'bg-green-100 text-green-800',
  paid: 'bg-green-500 text-white',
  payment_pending: 'bg-yellow-500 text-white',
  deposit_pending: 'bg-yellow-400 text-white',
  deposit_paid: 'bg-blue-500 text-white',
  balance_pending: 'bg-yellow-500 text-white',
  cancelled: 'bg-red-100 text-red-800',
};

const BookingDetail = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackRecord | null | undefined>(undefined);
  const [paymentRejected, setPaymentRejected] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    supabase
      .from('bookings')
      .select('*, workers(service_type, profiles(full_name))')
      .eq('id', bookingId)
      .single()
      .then(async ({ data, error }) => {
        if (!error && data) {
          const autoCancel =
            ['pending', 'confirmed', 'accepted'].includes(data.status ?? '') &&
            data.booking_date &&
            new Date(data.booking_date) < new Date(new Date().toDateString());

          if (autoCancel) {
            await supabase
              .from('bookings')
              .update({ status: 'cancelled' })
              .eq('id', bookingId);
            data = { ...data, status: 'cancelled' };
          }

          setBooking(data as BookingDetail);
          if (data.status === 'paid') {
            getFeedbackByBookingId(bookingId, 'user_to_worker').then(setFeedback).catch(console.error);
          }
          // Check for rejected payments on pending-approval statuses
          if (['payment_pending', 'deposit_pending', 'balance_pending'].includes(data.status ?? '')) {
            const pendingType = data.status === 'balance_pending' ? 'balance' : 'deposit';
            supabase
              .from('invoices')
              .select('id, payment_type, transactions(status)')
              .eq('booking_id', bookingId)
              .then(({ data: invoices }) => {
                if (invoices && invoices.length > 0) {
                  const stageInvoices = (invoices as any[]).filter(
                    (inv) => (inv.payment_type ?? 'deposit') === pendingType,
                  );
                  for (const inv of stageInvoices) {
                    const txs: { status: string }[] = inv.transactions ?? [];
                    const allRejected = txs.length > 0 && txs.every((tx) => tx.status === 'rejected');
                    if (allRejected) {
                      setPaymentRejected(true);
                      break;
                    }
                  }
                }
              });
          }
        }
        setLoading(false);
      });
  }, [bookingId]);

  const handleCancel = async () => {
    if (!bookingId || !user?.id) return;
    setCancelling(true);
    try {
      await cancelBooking(bookingId, { userId: user.id });
      setBooking((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  const statusIcon = () => {
    if (!booking) return null;
    if (booking.status === 'ongoing') return <PlayCircle className="h-4 w-4" />;
    if (booking.status === 'cancelled') return <XCircle className="h-4 w-4" />;
    if (['completed', 'paid'].includes(booking.status ?? '')) return <CheckCircle className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-xl">
          <Button variant="ghost" onClick={() => navigate('/my-requests')} className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('providerDetail.backToServices', 'Back')}
          </Button>

          {loading ? (
            <p className="text-center text-muted-foreground py-16">{t('common.loading')}</p>
          ) : !booking ? (
            <p className="text-center text-muted-foreground py-16">Booking not found.</p>
          ) : (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="font-heading text-xl capitalize">
                      {booking.workers?.service_type ?? booking.booking_type ?? '—'}
                    </CardTitle>
                    {booking.booking_type === 'emergency' && (
                      <Badge className="bg-red-600 text-white text-xs">
                        {t('myRequests.emergency', 'Emergency')}
                      </Badge>
                    )}
                  </div>
                  <Badge className={STATUS_STYLES[booking.status === 'pending' && booking.booking_date && new Date(booking.booking_date) >= new Date() ? 'upcoming' : (booking.status ?? '')] ?? ''}>
                    <span className="flex items-center gap-1">
                      {statusIcon()}
                      {booking.status === 'pending' && booking.booking_date && new Date(booking.booking_date) >= new Date()
                        ? 'upcoming'
                        : booking.status?.replace('_', ' ')}
                    </span>
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-sm">
                {booking.workers?.profiles?.full_name && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Worker</p>
                      <p className="font-medium">{booking.workers.profiles.full_name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('payment.date', 'Date')}</p>
                    <p className="font-medium">{booking.booking_date}</p>
                  </div>
                </div>

                {booking.start_time && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('payment.time', 'Time')}</p>
                      <p className="font-medium">{booking.start_time.slice(0, 5)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('payment.duration', 'Duration')}</p>
                    <p className="font-medium">
                      {booking.booking_type === 'package'
                        ? `${booking.duration_value} month${(booking.duration_value ?? 0) !== 1 ? 's' : ''}`
                        : `${booking.duration_hours} hour${(booking.duration_hours ?? 0) !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>

                {booking.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium">{booking.address}</p>
                    </div>
                  </div>
                )}

                {booking.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('providerDetail.additionalNotes', 'Notes')}</p>
                      <p className="font-medium">{booking.notes}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border space-y-2">
                  {(() => {
                    const mgmtFee = booking.management_fee ?? 0;
                    const emergFee = booking.emergency_fee ?? 0;
                    const basePrice = booking.total_price - mgmtFee - emergFee;
                    return (
                      <>
                        {(mgmtFee > 0 || emergFee > 0) && (
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                              <span>{t('payment.servicePrice', 'Service Price')}</span>
                              <span>{basePrice} EGP</span>
                            </div>
                            {emergFee > 0 && (
                              <div className="flex justify-between text-red-600 font-medium">
                                <span>{t('payment.emergencyFee', 'Emergency Fee')}</span>
                                <span>+ {emergFee} EGP</span>
                              </div>
                            )}
                            {mgmtFee > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>{t('payment.managementFee', 'Management Fee')}</span>
                                <span>+ {mgmtFee} EGP</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex items-center justify-between w-full">
                            <p className="text-muted-foreground">{t('payment.total', 'Total')}</p>
                            <p className="text-xl font-bold text-primary">{booking.total_price} EGP</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Pay deposit when booking is pending/accepted/confirmed and deposit not yet paid */}
                {['pending', 'accepted', 'confirmed'].includes(booking.status ?? '') && (
                  <Button
                    className="w-full mt-2"
                    onClick={() => navigate(`/payment/${booking.id}?type=deposit`)}
                  >
                    {t('bookingDetail.payDeposit', 'Pay 20% Deposit')}
                  </Button>
                )}

                {/* Pay balance after service is completed */}
                {booking.status === 'completed' && (
                  <Button
                    className="w-full mt-2"
                    onClick={() => navigate(`/payment/${booking.id}?type=balance`)}
                  >
                    {t('bookingDetail.payBalance', 'Pay Remaining Balance (80%)')}
                  </Button>
                )}

                {/* Re-pay deposit if Instapay was rejected */}
                {booking.status === 'deposit_pending' && paymentRejected && (
                  <Button
                    className="w-full mt-2"
                    variant="destructive"
                    onClick={() => navigate(`/payment/${booking.id}?type=deposit`)}
                  >
                    {t('payment.payAgain', 'Pay Again')}
                  </Button>
                )}

                {/* Re-pay balance if Instapay was rejected */}
                {(booking.status === 'balance_pending' || booking.status === 'payment_pending') && paymentRejected && (
                  <Button
                    className="w-full mt-2"
                    variant="destructive"
                    onClick={() => navigate(`/payment/${booking.id}?type=balance`)}
                  >
                    {t('payment.payAgain', 'Pay Again')}
                  </Button>
                )}

                {/* Reschedule booking */}
                {['pending', 'accepted', 'confirmed', 'deposit_paid'].includes(booking.status ?? '') && booking.worker_id && user?.id && (
                  <RescheduleDialog
                    bookingId={booking.id}
                    workerId={booking.worker_id}
                    userId={user.id}
                    durationHours={booking.duration_hours ?? 1}
                    onSuccess={(newDate, newTime) =>
                      setBooking((prev) => prev ? { ...prev, booking_date: newDate, start_time: newTime } : prev)
                    }
                  />
                )}

                {/* Cancel booking — user action only */}
                {['pending', 'accepted', 'confirmed', 'deposit_pending', 'deposit_paid'].includes(booking.status ?? '') && (
                  <Button
                    className="w-full mt-2"
                    variant="outline"
                    disabled={cancelling}
                    onClick={handleCancel}
                  >
                    {cancelling ? t('common.loading') : t('bookingDetail.cancelBooking', 'Cancel Booking')}
                  </Button>
                )}

                {/* Deposit refund badge for cancelled bookings */}
                {booking.deposit_refund_status === 'pending' && (
                  <div className="mt-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-800 font-medium text-center">
                    {t('payment.depositRefundPending', 'Deposit Refund Pending — we will process your refund shortly.')}
                  </div>
                )}
                {booking.deposit_refund_status === 'processed' && (
                  <div className="mt-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800 font-medium text-center">
                    {t('payment.depositRefundProcessed', 'Deposit has been refunded.')}
                  </div>
                )}

                {booking.status === 'paid' && (
                  <div className="pt-4 border-t border-border space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {t('feedback.reviews', 'Reviews')}
                    </p>
                    {feedback === undefined ? (
                      <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                    ) : feedback !== null ? (
                      <div className="space-y-1">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-4 w-4 ${s <= feedback.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                            />
                          ))}
                        </div>
                        {feedback.comment && (
                          <p className="text-sm italic text-muted-foreground">"{feedback.comment}"</p>
                        )}
                      </div>
                    ) : (
                      <FeedbackDialog
                        bookingId={booking.id}
                        workerId={booking.worker_id ?? ''}
                        workerName={booking.workers?.profiles?.full_name ?? booking.workers?.service_type ?? ''}
                        onSuccess={() => getFeedbackByBookingId(booking.id, 'user_to_worker').then(setFeedback).catch(console.error)}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BookingDetail;
