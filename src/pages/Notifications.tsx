import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bell, XCircle, ArrowRight, CheckCircle, CreditCard,
  CalendarCheck, RotateCcw, Ban, Star, AlertTriangle,
  CalendarClock, Heart,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { getNotifications, markAsRead } from '@/services/notificationService';
import { supabase } from '@/lib/supabaseClient';

interface Notification {
  id: string;
  title_en: string;
  message_en: string;
  is_read: boolean;
  created_at: string;
  booking_id: string | null;
  alreadyPaid?: boolean;
}

function getNotificationMeta(title: string): { icon: React.ReactNode; bg: string } {
  const t = title.toLowerCase();
  if (t.includes('deposit refunded'))  return { icon: <CheckCircle className="w-5 h-5 text-green-600" />, bg: 'bg-green-100' };
  if (t.includes('deposit refund'))   return { icon: <RotateCcw className="w-5 h-5 text-orange-500" />,  bg: 'bg-orange-100' };
  if (t.includes('deposit'))          return { icon: <CreditCard className="w-5 h-5 text-blue-500" />,   bg: 'bg-blue-100' };
  if (t.includes('payment approved') || t.includes('payment confirmed'))
                                      return { icon: <CheckCircle className="w-5 h-5 text-green-600" />, bg: 'bg-green-100' };
  if (t.includes('payment rejected')) return { icon: <XCircle className="w-5 h-5 text-destructive" />,  bg: 'bg-destructive/10' };
  if (t.includes('booking confirmed') || t.includes('booking accepted'))
                                      return { icon: <CalendarCheck className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-100' };
  if (t.includes('service completed') || t.includes('completed'))
                                      return { icon: <Star className="w-5 h-5 text-yellow-500" />,       bg: 'bg-yellow-100' };
  if (t.includes('reschedule'))        return { icon: <CalendarClock className="w-5 h-5 text-indigo-500" />, bg: 'bg-indigo-100' };
  if (t.includes('donation'))         return { icon: <Heart className="w-5 h-5 text-rose-500" />,         bg: 'bg-rose-100' };
  if (t.includes('cancel'))           return { icon: <Ban className="w-5 h-5 text-red-500" />,           bg: 'bg-red-100' };
  if (t.includes('alert') || t.includes('warning'))
                                      return { icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-100' };
  return                               { icon: <Bell className="w-5 h-5 text-primary" />,                bg: 'bg-muted' };
}

const Notifications = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { resetBadge } = useNotifications();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    getNotifications(user.id)
      .then(async (notifs) => {
        // For rejected payment notifications, check if booking was subsequently paid
        const enriched = await Promise.all(
          notifs.map(async (n) => {
            if (n.title_en === 'Payment Rejected' && n.booking_id) {
              const { data: invoices } = await supabase
                .from('invoices')
                .select('id, transactions(id, status)')
                .eq('booking_id', n.booking_id);
              const alreadyPaid = (invoices ?? []).some((inv: any) =>
                (inv.transactions ?? []).some((tx: any) => tx.status !== 'rejected')
              );
              return { ...n, alreadyPaid };
            }
            return n;
          })
        );
        setNotifications(enriched);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    resetBadge();
  }, [user?.id]);

  const handleRead = async (notificationId: string) => {
    await markAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
  };

  const handleClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await handleRead(notification.id);
    }
    if (notification.title_en === 'Service Completed' && notification.booking_id) {
      navigate(`/payment/${notification.booking_id}`);
    } else if (notification.title_en === 'Payment Rejected' && notification.booking_id && !notification.alreadyPaid) {
      navigate(`/payment/${notification.booking_id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <Bell className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-heading font-bold">{t('notifications.title')}</h1>
            </div>

            {/* Notifications List */}
            {loading && (
              <p className="text-muted-foreground text-center py-8">{t('common.loading')}</p>
            )}
            {!loading && notifications.length === 0 && (
              <p className="text-muted-foreground text-center py-8">{t('notifications.empty', { defaultValue: 'No notifications yet.' })}</p>
            )}
            <div className="space-y-4">
              {!loading && notifications.map((notification) => {
                const isRejected = notification.title_en === 'Payment Rejected';
                const rejectedButPaid = isRejected && notification.alreadyPaid;
                const displayTitle = rejectedButPaid ? 'Payment Approved' : notification.title_en;
                const { icon, bg } = rejectedButPaid
                  ? { icon: <CheckCircle className="w-5 h-5 text-green-600" />, bg: 'bg-green-100' }
                  : getNotificationMeta(notification.title_en ?? '');
                return (
                  <Card
                    key={notification.id}
                    className={`transition-colors ${
                      rejectedButPaid
                        ? 'border-green-400/40 bg-green-50/50'
                        : isRejected
                          ? 'border-destructive/40 bg-destructive/5 hover:bg-destructive/10 cursor-pointer'
                          : !notification.is_read
                            ? 'bg-primary/5 border-primary/20 cursor-pointer'
                            : 'cursor-pointer'
                    }`}
                    onClick={() => handleClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className={`font-semibold ${rejectedButPaid ? 'text-green-700' : isRejected ? 'text-destructive' : ''}`}>
                              {displayTitle || t('notifications.defaultTitle', { defaultValue: 'Notification' })}
                            </h3>
                            {!notification.is_read && (
                              <Badge variant={isRejected && !rejectedButPaid ? 'destructive' : 'default'} className="flex-shrink-0">
                                {t('notifications.new')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {rejectedButPaid
                              ? t('notifications.paymentNowApprovedDesc', { defaultValue: 'Your subsequent payment was approved successfully.' })
                              : notification.message_en || t('notifications.defaultMessage', { defaultValue: 'You have a new notification.' })}
                          </p>
                          {isRejected && !rejectedButPaid && notification.booking_id && (
                            <p className="text-xs text-destructive font-medium mt-2 flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              {t('notifications.tapToPayAgain', { defaultValue: 'Tap to pay again' })}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.created_at?.slice(0, 10)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Notifications;
