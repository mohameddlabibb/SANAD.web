import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  ClipboardList,
  Plus,
  Gavel,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { BookingWithWorker } from '@/types/bookings';
import { FeedbackDialog } from '@/components/FeedbackDialog';
import { getUserBiddingRequests } from '@/services/biddingService';
import { BiddingRequestForm } from '@/components/bidding/BiddingRequestForm';
import type { BiddingRequestWithCount } from '@/types/biddings';

interface BookingWithWorkerName extends BookingWithWorker {
  workers: { service_type: string; profiles?: { full_name: string | null } | null } | null;
}

const MyRequests = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [upcomingBookings, setUpcomingBookings] = useState<BookingWithWorkerName[]>([]);
  const [pastBookings, setPastBookings] = useState<BookingWithWorkerName[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [reviewedBookings, setReviewedBookings] = useState<Set<string>>(new Set());
  const [biddingRequests, setBiddingRequests] = useState<BiddingRequestWithCount[]>([]);
  const [biddingLoading, setBiddingLoading] = useState(false);
  const [showBiddingForm, setShowBiddingForm] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setBookingsLoading(true);
    supabase
      .from('bookings')
      .select('*, workers(service_type, profiles(full_name))')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false })
      .order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error) { console.error('bookings:', error); setBookingsLoading(false); return; }
        const today = new Date(new Date().toDateString());
        const toCancel = (data ?? []).filter(
          b => ['pending', 'confirmed', 'accepted'].includes(b.status ?? '') &&
               b.booking_date && new Date(b.booking_date) < today
        );
        if (toCancel.length > 0) {
          await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .in('id', toCancel.map(b => b.id));
          toCancel.forEach(b => { b.status = 'cancelled'; });
        }
        const rows = data ?? [];
        const past = rows.filter(b => ['completed', 'cancelled', 'paid', 'payment_pending', 'balance_pending'].includes(b.status ?? ''));
        setUpcomingBookings(rows.filter(b => ['pending', 'accepted', 'confirmed', 'ongoing', 'deposit_pending', 'deposit_paid'].includes(b.status ?? '')));
        setPastBookings(past);

        // Load feedback status for paid bookings
        const paidIds = past.filter(b => b.status === 'paid').map(b => b.id);
        if (paidIds.length > 0) {
          const { data: feedbackRows } = await supabase
            .from('feedback')
            .select('booking_id')
            .in('booking_id', paidIds);
          if (feedbackRows) {
            setReviewedBookings(new Set(feedbackRows.map((f: { booking_id: string }) => f.booking_id)));
          }
        }
        setBookingsLoading(false);
      });
  }, [user, navigate]);

  const loadBiddingRequests = async () => {
    if (!user) return;
    setBiddingLoading(true);
    try {
      const data = await getUserBiddingRequests(user.id);
      setBiddingRequests(data as BiddingRequestWithCount[]);
    } catch (err) {
      console.error('bidding requests:', err);
    } finally {
      setBiddingLoading(false);
    }
  };

  useEffect(() => {
    loadBiddingRequests();
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <ClipboardList className="w-7 h-7 text-primary" />
              <h1 className="text-2xl font-heading font-bold">{t('profile.myRequests')}</h1>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upcoming">{t('profile.upcoming')}</TabsTrigger>
                <TabsTrigger value="past">{t('profile.past')}</TabsTrigger>
                <TabsTrigger value="bidding">{t('bidding.tab')}</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4 mt-4">
                {bookingsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t('common.loading')}
                  </p>
                ) : upcomingBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t('profile.noUpcoming')}
                  </p>
                ) : (
                  upcomingBookings.map((booking) => (
                    <Card key={booking.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate(`/booking/${booking.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">
                                {booking.workers?.service_type ?? booking.booking_type ?? '—'}
                              </h3>
                              {booking.booking_type === 'emergency' && (
                                <Badge className="bg-red-600 text-white text-xs">
                                  {t('myRequests.emergency', 'Emergency')}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {booking.booking_date}
                              </span>
                              {booking.start_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {booking.start_time.slice(0, 5)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge
                            className={
                              booking.status === 'ongoing' ? 'bg-blue-500 hover:bg-blue-500 text-white' :
                              booking.status === 'deposit_paid' ? 'bg-blue-500 hover:bg-blue-500 text-white' :
                              booking.status === 'deposit_pending' ? 'bg-yellow-400 hover:bg-yellow-400 text-white' :
                              ''
                            }
                          >
                            <span className="flex items-center gap-1">
                              {booking.status === 'ongoing' ? (
                                <><PlayCircle className="w-3 h-3" /> {t('profile.ongoing')}</>
                              ) : (booking.status === 'confirmed' || booking.status === 'accepted') ? (
                                <><CheckCircle className="w-3 h-3" /> {t('profile.confirmed')}</>
                              ) : booking.status === 'deposit_paid' ? (
                                <><CheckCircle className="w-3 h-3" /> {t('payment.depositPaidStatus', 'Deposit Paid')}</>
                              ) : booking.status === 'deposit_pending' ? (
                                <><Clock className="w-3 h-3" /> {t('payment.depositPendingStatus', 'Deposit Pending')}</>
                              ) : (
                                t('profile.upcoming', 'Upcoming')
                              )}
                            </span>
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4 mt-4">
                {bookingsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t('common.loading')}
                  </p>
                ) : pastBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t('profile.noPast')}
                  </p>
                ) : (
                  pastBookings.map((booking) => (
                    <Card key={booking.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate(`/booking/${booking.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">
                                {booking.workers?.service_type ?? booking.booking_type ?? '—'}
                              </h3>
                              {booking.booking_type === 'emergency' && (
                                <Badge className="bg-red-600 text-white text-xs">
                                  {t('myRequests.emergency', 'Emergency')}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {booking.booking_date}
                              </span>
                              {booking.total_price && (
                                <span>{booking.total_price} EGP</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {booking.status === 'paid' ? (
                              <>
                                <Badge className="bg-green-500 hover:bg-green-500">
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Paid
                                  </span>
                                </Badge>
                                {reviewedBookings.has(booking.id) ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {t('feedback.reviewed', 'Reviewed')}
                                  </Badge>
                                ) : (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <FeedbackDialog
                                      bookingId={booking.id}
                                      workerId={booking.worker_id ?? ''}
                                      workerName={booking.workers?.profiles?.full_name ?? booking.workers?.service_type ?? ''}
                                      onSuccess={() => setReviewedBookings(prev => new Set([...prev, booking.id]))}
                                    />
                                  </div>
                                )}
                              </>
                            ) : (booking.status === 'payment_pending' || booking.status === 'balance_pending') ? (
                              <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {t('payment.balancePendingStatus', 'Balance Pending')}
                                </span>
                              </Badge>
                            ) : booking.status === 'completed' ? (
                              <>
                                <Badge variant="default">
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> {t('profile.completed')}
                                  </span>
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/payment/${booking.id}?type=balance`)}
                                >
                                  {t('profile.payNow', 'Pay Now')}
                                </Button>
                              </>
                            ) : (
                              <Badge variant="destructive">
                                <span className="flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> {t('profile.cancelled')}
                                </span>
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
              <TabsContent value="bidding" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-medium text-muted-foreground">{t('bidding.myRequests')}</h2>
                  <Button size="sm" onClick={() => setShowBiddingForm(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    {t('bidding.postRequest')}
                  </Button>
                </div>

                {showBiddingForm && (
                  <Card>
                    <CardContent className="p-4">
                      <BiddingRequestForm
                        onSuccess={() => { setShowBiddingForm(false); loadBiddingRequests(); }}
                        onCancel={() => setShowBiddingForm(false)}
                      />
                    </CardContent>
                  </Card>
                )}

                {biddingLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t('common.loading')}</p>
                ) : biddingRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{t('bidding.noRequests')}</p>
                ) : (
                  biddingRequests.map((req) => (
                    <Card
                      key={req.id}
                      className="cursor-pointer hover:border-primary/40 transition-colors"
                      onClick={() => navigate(`/bidding/${req.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Gavel className="w-4 h-4 text-muted-foreground shrink-0" />
                              <h3 className="font-semibold truncate">{req.title}</h3>
                            </div>
                            <p className="text-xs text-muted-foreground capitalize mb-1">{req.service_type}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {req.booking_date}
                              </span>
                              <span>{req.bid_count} {t('bidding.bidsReceived')}</span>
                            </div>
                          </div>
                          <Badge
                            className={
                              req.status === 'open'
                                ? 'bg-green-100 text-green-800'
                                : req.status === 'accepted'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {t(`bidding.${req.status}`)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyRequests;
