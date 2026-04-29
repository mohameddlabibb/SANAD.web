// src/components/bidding/BidCard.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ExternalLink } from 'lucide-react';
import type { BidWithWorker } from '@/types/biddings';

interface Props {
  bid: BidWithWorker;
  requestIsOpen: boolean;
  onAccept: (bidId: string) => Promise<void>;
}

export function BidCard({ bid, requestIsOpen, onAccept }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept(bid.id);
    } finally {
      setAccepting(false);
    }
  };

  const workerName = bid.profiles?.full_name ?? 'Worker';

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold truncate">{workerName}</span>
              {bid.worker_rating != null && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {bid.worker_rating.toFixed(1)}
                </span>
              )}
              <button
                onClick={() => navigate(`/provider/${bid.worker_id}`)}
                className="ml-auto text-muted-foreground hover:text-primary"
                title="View profile"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xl font-bold text-primary mb-1">
              {bid.proposed_price} {t('bidding.egp')}
            </p>

            {bid.message && (
              <p className="text-sm text-muted-foreground italic">"{bid.message}"</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {bid.status === 'accepted' && (
              <Badge className="bg-green-500 hover:bg-green-500">Accepted</Badge>
            )}
            {bid.status === 'rejected' && (
              <Badge variant="destructive">{t('bidding.rejected')}</Badge>
            )}
            {bid.status === 'pending' && requestIsOpen && (
              <Button size="sm" disabled={accepting} onClick={handleAccept}>
                {accepting ? t('bidding.accepting') : t('bidding.acceptBid')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
