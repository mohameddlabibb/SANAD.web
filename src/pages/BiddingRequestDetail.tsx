// src/pages/BiddingRequestDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, MapPin, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  getBiddingRequestById,
  acceptBid,
  cancelBiddingRequest,
  getWorkerBidOnRequest,
} from '@/services/biddingService';
import { createNotification } from '@/services/notificationService';
import { BidCard } from '@/components/bidding/BidCard';
import { BidSubmitForm } from '@/components/bidding/BidSubmitForm';
import { parseError } from '@/lib/parseError';
import type { BiddingRequestWithBids, Bid } from '@/types/biddings';

const BiddingRequestDetail = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [request, setRequest] = useState<BiddingRequestWithBids | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [existingBid, setExistingBid] = useState<Bid | null>(null);
  const [checkingBid, setCheckingBid] = useState(false);

  const isOwner = user?.id === request?.user_id;

  const load = async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const data = await getBiddingRequestById(requestId);
      setRequest(data as BiddingRequestWithBids);
    } catch (err) {
      toast({ title: t('common.error'), description: parseError(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [requestId]);

  useEffect(() => {
    if (!user || !requestId || isOwner) return;
    setCheckingBid(true);
    getWorkerBidOnRequest(requestId, user.id)
      .then((bid) => setExistingBid(bid))
      .finally(() => setCheckingBid(false));
  }, [user, requestId, isOwner]);

  const handleAccept = async (bidId: string) => {
    if (!requestId || !request) return;
    try {
      const bookingId = await acceptBid(bidId, requestId);

      const acceptedBid = request.bids.find((b) => b.id === bidId);
      const rejectedBids = request.bids.filter((b) => b.id !== bidId && b.status === 'pending');

      if (acceptedBid) {
        await createNotification({
          receiver_id: acceptedBid.worker_id,
          title: 'Bid Accepted',
          message: `Your bid was accepted! A booking has been created.`,
          booking_id: bookingId,
        });
      }

      for (const bid of rejectedBids) {
        await createNotification({
          receiver_id: bid.worker_id,
          title: 'Bid Not Selected',
          message: `Your bid on "${request.title}" was not selected.`,
        });
      }

      toast({ title: t('bidding.bidAccepted') });
      navigate(`/booking/${bookingId}`);
    } catch (err) {
      toast({ title: t('common.error'), description: parseError(err), variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    if (!requestId || !request) return;
    if (!window.confirm(t('bidding.confirmCancel'))) return;
    setCancelling(true);
    try {
      await cancelBiddingRequest(requestId);

      for (const bid of request.bids.filter((b) => b.status === 'pending')) {
        await createNotification({
          receiver_id: bid.worker_id,
          title: 'Request Cancelled',
          message: `The request "${request.title}" has been cancelled.`,
        });
      }

      toast({ title: t('bidding.requestCancelled') });
      navigate('/my-requests');
    } catch (err) {
      toast({ title: t('common.error'), description: parseError(err), variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-16 container mx-auto px-4">
          <p className="text-center text-muted-foreground mt-8">{t('common.loading')}</p>
        </main>
      </div>
    );
  }

  if (!request) return null;

  const statusColor: Record<string, string> = {
    open: 'bg-green-100 text-green-800',
    accepted: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <button
            onClick={() => navigate('/my-requests')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>

          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground capitalize mb-1">{request.service_type}</p>
                  <h1 className="text-xl font-bold">{request.title}</h1>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[request.status] ?? ''}`}>
                  {t(`bidding.${request.status}`)}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-4">{request.description}</p>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {request.booking_date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {request.start_time.slice(0, 5)} · {request.duration_hours}{t('bidding.hrs')}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {request.address}
                </span>
              </div>

              {isOwner && request.status === 'open' && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={cancelling}
                    onClick={handleCancel}
                  >
                    {cancelling ? '...' : t('bidding.cancelRequest')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {isOwner && (
            <div className="space-y-3">
              <h2 className="font-semibold">{t('bidding.tab')} ({request.bids.length})</h2>
              {request.bids.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t('bidding.noBids')}</p>
              ) : (
                request.bids.map((bid) => (
                  <BidCard
                    key={bid.id}
                    bid={bid}
                    requestIsOpen={request.status === 'open'}
                    onAccept={handleAccept}
                  />
                ))
              )}
            </div>
          )}

          {!isOwner && !checkingBid && (
            existingBid ? (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-1">{t('bidding.alreadyBid')}</p>
                  <p className="text-2xl font-bold text-primary">{existingBid.proposed_price} {t('bidding.egp')}</p>
                  {existingBid.message && (
                    <p className="text-sm text-muted-foreground italic mt-1">"{existingBid.message}"</p>
                  )}
                  <Badge className="mt-2" variant="secondary">{t(`bidding.${existingBid.status}`)}</Badge>
                </CardContent>
              </Card>
            ) : request.status === 'open' ? (
              <BidSubmitForm
                request={request}
                onSuccess={() => {
                  load();
                  getWorkerBidOnRequest(requestId!, user!.id).then(setExistingBid);
                }}
              />
            ) : null
          )}
        </div>
      </main>
    </div>
  );
};

export default BiddingRequestDetail;
