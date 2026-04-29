// src/components/bidding/WorkerRequestCard.tsx
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin } from 'lucide-react';
import type { BiddingRequest } from '@/types/biddings';

interface Props {
  request: BiddingRequest;
}

export function WorkerRequestCard({ request }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="cursor-pointer hover:border-primary/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1 capitalize">{request.service_type}</p>
            <h3 className="font-semibold truncate mb-1">{request.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{request.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {request.booking_date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {request.start_time.slice(0, 5)} · {request.duration_hours}{t('bidding.hrs')}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {request.address}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/bidding/${request.id}`)}
            className="shrink-0"
          >
            {t('bidding.submitBid')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
