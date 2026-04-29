// src/components/bidding/BidSubmitForm.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createBid } from '@/services/biddingService';
import { createNotification } from '@/services/notificationService';
import { parseError } from '@/lib/parseError';
import type { BiddingRequest } from '@/types/biddings';

interface Props {
  request: BiddingRequest;
  onSuccess: () => void;
}

export function BidSubmitForm({ request, onSuccess }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !price) return;

    setLoading(true);
    try {
      await createBid({
        request_id: request.id,
        worker_id: user.id,
        proposed_price: Number(price),
        message: message.trim() || null,
      });

      await createNotification({
        receiver_id: request.user_id,
        title: 'New Bid Received',
        message: `A worker placed a bid on your request: ${request.title}`,
      });

      toast({ title: t('bidding.bidSubmitted') });
      onSuccess();
    } catch (err) {
      toast({ title: t('common.error'), description: parseError(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4 mt-4">
      <h3 className="font-semibold">{t('bidding.submitBid')}</h3>

      <div className="space-y-1.5">
        <Label>{t('bidding.yourPrice')}</Label>
        <Input
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 350"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('bidding.optionalMessage')}</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('bidding.messagePlaceholder')}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? t('bidding.submitting') : t('bidding.submitBid')}
      </Button>
    </form>
  );
}
