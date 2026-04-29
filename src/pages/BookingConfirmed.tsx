import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ClipboardList } from 'lucide-react';

const BookingConfirmed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId } = useParams<{ bookingId: string }>();
  const { t } = useTranslation();

  const { workerName, totalCost } = (location.state as { workerName?: string; totalCost?: number }) ?? {};

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-20 w-20 text-green-500" />
          </div>

          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
              {t('bookingConfirmed.title', 'Booking Request Submitted!')}
            </h1>
            <p className="text-muted-foreground">
              {t('bookingConfirmed.subtitle', 'Your booking has been sent to the worker. You will be notified once they accept.')}
            </p>
          </div>

          {(workerName || totalCost) && (
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                {workerName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('payment.provider', 'Provider')}</span>
                    <span className="font-medium">{workerName}</span>
                  </div>
                )}
                {totalCost != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('payment.total', 'Total')}</span>
                    <span className="font-bold text-primary">{totalCost} EGP</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                  {t('bookingConfirmed.payNote', 'Payment will be collected after the service is completed.')}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/my-requests')} className="gap-2">
              <ClipboardList className="h-4 w-4" />
              {t('bookingConfirmed.viewBookings', 'View My Bookings')}
            </Button>
            <Button variant="outline" onClick={() => navigate('/services')}>
              {t('providerDetail.backToServices', 'Back to Services')}
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookingConfirmed;
