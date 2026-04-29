import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, CreditCard, Smartphone, ArrowLeft, CheckCircle, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getBookingById, updateBookingStatus } from '@/services/bookingService';
import { createInvoice } from '@/services/invoiceService';
import { createTransaction } from '@/services/transactionService';
import { createNotification } from '@/services/notificationService';
import { parseError } from '@/lib/parseError';
import { supabase } from '@/lib/supabaseClient';
import { getAvailableCoupons, applyCoupon, awardPoints, type UserCoupon } from '@/services/pointsService';

const MANAGEMENT_FEE = 50;
const EMERGENCY_FEE = 200;

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  duration_hours: number;
  total_price: number;
  booking_type: string | null;
  notes: string | null;
  management_fee: number | null;
  emergency_fee: number | null;
}

const paymentMethods = [
  { id: 'card', labelKey: 'payment.card', icon: CreditCard },
  { id: 'instapay', labelKey: 'payment.instapay', icon: Smartphone },
];

const Payment = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();

  // 'deposit' = pay 20% upfront; 'balance' = pay remaining 80% after service
  const paymentType = (searchParams.get('type') ?? 'deposit') as 'deposit' | 'balance';

  const { workerName } = (location.state as { workerName?: string } | null) ?? {};

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingTxState, setExistingTxState] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [existingInvoiceId, setExistingInvoiceId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<UserCoupon | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!bookingId) return;

    getBookingById(bookingId)
      .then(async (b) => {
        setBooking(b);
        // Check for existing active transactions for this payment stage
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, payment_type, transactions(id, status)')
          .eq('booking_id', bookingId);

        if (invoices && invoices.length > 0) {
          // Filter invoices for the current payment stage
          const stageInvoices = (invoices as any[]).filter(
            (inv) => (inv.payment_type ?? 'deposit') === paymentType,
          );

          let detectedState: 'none' | 'pending' | 'approved' | 'rejected' = 'none';
          let lastAllRejectedInvoiceId: string | null = null;

          for (const inv of stageInvoices) {
            const txs: { id: string; status: string }[] = inv.transactions ?? [];
            const hasApproved = txs.some((tx) => tx.status === 'approved');
            const hasPending = txs.some((tx) => tx.status === 'pending');
            const allRejected = txs.length > 0 && txs.every((tx) => tx.status === 'rejected');

            if (hasApproved) { detectedState = 'approved'; break; }
            if (hasPending) { detectedState = 'pending'; break; }
            if (allRejected) { lastAllRejectedInvoiceId = inv.id; }
          }

          if (detectedState !== 'none') {
            setExistingTxState(detectedState);
          } else if (lastAllRejectedInvoiceId) {
            setExistingTxState('rejected');
            setExistingInvoiceId(lastAllRejectedInvoiceId);
          }
        }
      })
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));

    if (user) {
      getAvailableCoupons(user.id).then(setAvailableCoupons).catch(() => {});
    }
  }, [bookingId, user, navigate, paymentType]);

  // Deposit = 20% of total; balance = remaining 80%
  const depositAmount = booking ? Math.ceil(booking.total_price * 0.2) : 0;
  const balanceAmount = booking ? booking.total_price - depositAmount : 0;
  const stageBaseAmount = paymentType === 'deposit' ? depositAmount : balanceAmount;

  // Coupons only apply to the deposit stage
  const effectiveAmount = paymentType === 'deposit' && selectedCoupon
    ? Math.floor(stageBaseAmount * (1 - selectedCoupon.discount_percent / 100))
    : stageBaseAmount;

  const handleConfirm = async () => {
    if (!booking || !user) return;
    if (paymentMethod === 'instapay' && !screenshotFile) {
      setError(t('payment.instapayScreenshotRequired', 'Please upload a screenshot of your Instapay transaction.'));
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const invoice = existingInvoiceId
        ? { id: existingInvoiceId }
        : await createInvoice({
            booking_id: booking.id,
            user_id: user.id,
            amount: effectiveAmount,
            payment_type: paymentType,
          });

      let screenshotUrl: string | null = null;

      if (paymentMethod === 'instapay' && screenshotFile) {
        const ext = screenshotFile.name.split('.').pop();
        const path = `${user.id}/${invoice.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-screenshots')
          .upload(path, screenshotFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('payment-screenshots')
          .getPublicUrl(path);

        screenshotUrl = urlData.publicUrl;
      }

      const transactionStatus = paymentMethod === 'instapay' ? 'pending' : 'approved';

      await createTransaction({
        invoice_id: invoice.id,
        user_id: user.id,
        payment_method: paymentMethod,
        status: transactionStatus,
        screenshot_url: screenshotUrl,
      });

      // Determine new booking status based on payment stage + method
      let newBookingStatus: string;
      if (paymentType === 'deposit') {
        newBookingStatus = paymentMethod === 'instapay' ? 'deposit_pending' : 'deposit_paid';
      } else {
        newBookingStatus = paymentMethod === 'instapay' ? 'balance_pending' : 'paid';
      }
      await updateBookingStatus(booking.id, newBookingStatus);

      // Award points and apply coupon immediately for card balance payments
      if (paymentMethod !== 'instapay' && paymentType === 'balance') {
        await awardPoints(user.id, booking.total_price, 'Booking payment', booking.id);
      }
      if (paymentMethod !== 'instapay' && paymentType === 'deposit' && selectedCoupon) {
        await applyCoupon(selectedCoupon.id, booking.id);
      }

      const notificationMessage = paymentMethod === 'instapay'
        ? t('payment.instapayPendingMessage', 'Your payment of {{amount}} EGP via Instapay is pending admin approval.', { amount: effectiveAmount })
        : paymentType === 'deposit'
          ? t('payment.depositPaidMessage', 'Your 20% deposit of {{amount}} EGP has been paid. Your booking is confirmed!', { amount: effectiveAmount })
          : t('payment.notificationMessage', { amount: effectiveAmount });

      await createNotification({
        receiver_id: user.id,
        title: t('payment.notificationTitle'),
        message: notificationMessage,
      });

      setConfirmed(true);
      if (paymentMethod !== 'instapay') {
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <p className="text-muted-foreground text-lg">{t('common.loading')}</p>
        </main>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground text-lg">{t('payment.bookingNotFound')}</p>
            <Button onClick={() => navigate('/services')} className="mt-4">
              {t('providerDetail.backToServices')}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (existingTxState === 'pending') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Clock className="h-16 w-16 text-yellow-500 mx-auto" />
            <h2 className="text-2xl font-heading font-bold text-foreground">
              {t('payment.pendingPayment', 'Payment Pending')}
            </h2>
            <p className="text-muted-foreground">
              {t('payment.instapayPendingApproval', 'Your payment is pending admin approval. You will be notified once approved.')}
            </p>
            <Button onClick={() => navigate('/')}>{t('common.backToHome', 'Back to Home')}</Button>
          </div>
        </main>
      </div>
    );
  }

  if (existingTxState === 'approved') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-heading font-bold text-foreground">
              {t('payment.success', 'Payment Successful!')}
            </h2>
            <p className="text-muted-foreground">
              {paymentType === 'deposit'
                ? t('payment.depositSuccessDesc', 'Your 20% deposit is paid. Your booking is confirmed!')
                : t('payment.balanceSuccessDesc', 'Your payment has been approved. Thank you!')}
            </p>
            <Button onClick={() => navigate('/')}>{t('common.backToHome', 'Back to Home')}</Button>
          </div>
        </main>
      </div>
    );
  }

  if (confirmed) {
    const isInstapay = paymentMethod === 'instapay';
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="text-center space-y-4">
            {isInstapay ? (
              <Clock className="h-16 w-16 text-yellow-500 mx-auto" />
            ) : (
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            )}
            <h2 className="text-2xl font-heading font-bold text-foreground">
              {isInstapay
                ? t('payment.pendingPayment', 'Payment Pending')
                : t('payment.success', 'Payment Successful!')}
            </h2>
            <p className="text-muted-foreground">
              {isInstapay
                ? t('payment.instapayPendingApproval', 'Your payment is pending admin approval. You will be notified once approved.')
                : paymentType === 'deposit'
                  ? t('payment.depositSuccessDesc', 'Your 20% deposit is paid. Your booking is confirmed!')
                  : t('payment.redirecting')}
            </p>
            {isInstapay && (
              <Button onClick={() => navigate('/')} className="mt-2">
                {t('common.backToHome', 'Back to Home')}
              </Button>
            )}
          </div>
        </main>
      </div>
    );
  }

  const mgmtFee = booking.management_fee ?? (booking.booking_type ? MANAGEMENT_FEE : 0);
  const emergFee = booking.emergency_fee ?? (booking.booking_type === 'emergency' ? EMERGENCY_FEE : 0);
  const basePrice = booking.total_price - mgmtFee - emergFee;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>

          <h1 className="text-2xl font-heading font-bold mb-2">
            {paymentType === 'deposit'
              ? t('payment.depositTitle', 'Pay 20% Deposit')
              : t('payment.balanceTitle', 'Pay Remaining Balance (80%)')}
          </h1>
          {paymentType === 'deposit' && (
            <p className="text-sm text-muted-foreground mb-6">
              {t('payment.depositRefundNote', 'Your 20% deposit is held securely until the service is completed. If cancelled, you will receive a full refund.')}
            </p>
          )}

          {/* Booking Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">{t('payment.bookingSummary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workerName && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('payment.provider')}</span>
                  <span className="font-medium">{workerName}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {t('payment.date')}
                </span>
                <span className="font-medium">{booking.booking_date}</span>
              </div>
              {booking.start_time && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {t('payment.time')}
                  </span>
                  <span className="font-medium">{booking.start_time.slice(0, 5)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('payment.duration')}</span>
                <span className="font-medium">
                  {booking.duration_hours} {t('providerDetail.hours')}
                </span>
              </div>

              {/* Price breakdown */}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('payment.servicePrice', 'Service Price')}</span>
                  <span className="font-medium">{basePrice} EGP</span>
                </div>
                {emergFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600 font-medium">{t('payment.emergencyFee', 'Emergency Fee')}</span>
                    <span className="font-medium text-red-600">+ {emergFee} EGP</span>
                  </div>
                )}
                {mgmtFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('payment.managementFee', 'Management Fee')}</span>
                    <span className="font-medium">+ {mgmtFee} EGP</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{t('payment.totalBookingPrice', 'Total Booking Price')}</span>
                  <span className="font-medium">{booking.total_price} EGP</span>
                </div>
              </div>

              {/* Deposit / Balance split */}
              <div className="border-t border-border pt-3 space-y-2">
                <div className={cn('flex justify-between text-sm', paymentType === 'deposit' ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  <span>{t('payment.depositAmount', 'Deposit (20%)')}</span>
                  <span>{depositAmount} EGP</span>
                </div>
                <div className={cn('flex justify-between text-sm', paymentType === 'balance' ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                  <span>{t('payment.balanceAmount', 'Remaining Balance (80%)')}</span>
                  <span>{balanceAmount} EGP</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="font-semibold">
                    {paymentType === 'deposit'
                      ? t('payment.dueNowDeposit', 'Due Now (Deposit)')
                      : t('payment.dueNowBalance', 'Due Now (Balance)')}
                  </span>
                  <div className="text-right">
                    {paymentType === 'deposit' && selectedCoupon && (
                      <div className="text-xs text-muted-foreground line-through">{depositAmount} EGP</div>
                    )}
                    <span className="text-xl font-bold text-primary">{effectiveAmount} EGP</span>
                    {paymentType === 'deposit' && selectedCoupon && (
                      <div className="text-xs text-green-600 font-medium">
                        {t('coupon.discountApplied', '{{discount}}% discount applied', { discount: selectedCoupon.discount_percent })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">{t('payment.selectMethod')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map(({ id, labelKey, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setPaymentMethod(id)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      paymentMethod === id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <Icon className={cn('h-6 w-6', paymentMethod === id ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium', paymentMethod === id ? 'text-primary' : 'text-muted-foreground')}>
                      {t(labelKey)}
                    </span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'instapay' && (
                <div className="space-y-3">
                  <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
                    <img
                      src="/icons/instapay-qr.png"
                      alt="Instapay QR Code"
                      className="w-48 h-48 object-contain"
                    />
                    <p className="text-sm text-muted-foreground text-center">
                      {t('payment.instapayInstructions')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-1">
                      <Upload className="h-4 w-4" />
                      {t('payment.instapayScreenshot', 'Upload Payment Screenshot')}
                    </label>
                    <input
                      ref={screenshotInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => screenshotInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {screenshotFile ? screenshotFile.name : t('payment.chooseFile', 'Choose File')}
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('payment.instapayScreenshotNote', 'Required — upload proof of your Instapay transaction. Admin will review and approve.')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coupon Selection — only on deposit */}
          {paymentType === 'deposit' && availableCoupons.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">{t('coupon.availableCoupons', 'Your Coupons')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {availableCoupons.map((coupon) => (
                  <button
                    key={coupon.id}
                    onClick={() => setSelectedCoupon(selectedCoupon?.id === coupon.id ? null : coupon)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium',
                      selectedCoupon?.id === coupon.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <span>{t('coupon.discountOff', '{{discount}}% off', { discount: coupon.discount_percent })}</span>
                    {selectedCoupon?.id === coupon.id && (
                      <span className="text-xs text-primary">{t('coupon.couponApplied', 'Coupon applied!')}</span>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Rejection notice */}
          {existingTxState === 'rejected' && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 font-medium">
              {t('payment.rejectedNotice', 'Your previous payment was rejected. Please submit a new payment.')}
            </div>
          )}

          {/* Confirm */}
          {error && (
            <p className="text-sm text-destructive mb-4" role="alert">{error}</p>
          )}
          <Button
            size="lg"
            className="w-full"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t('common.loading')
              : paymentType === 'deposit'
                ? t('payment.confirmDeposit', 'Confirm & Pay Deposit')
                : t('payment.confirmBalance', 'Confirm & Pay Balance')}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            {t('payment.disclaimer')}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Payment;
