import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { submitFeedback, getFeedbackByBookingId } from '@/services/feedbackService';
import { parseError } from '@/lib/parseError';

interface FeedbackDialogProps {
  bookingId: string;
  workerId: string;
  workerName: string;
  onSuccess?: () => void;
}

interface ExistingFeedback {
  rating: number;
  comment: string | null;
  created_at: string;
  rating_type: string;
}

export function FeedbackDialog({ bookingId, workerId, workerName, onSuccess }: FeedbackDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const ratingType = user?.role === 'worker' ? 'worker_to_user' : 'user_to_worker';

  const [open, setOpen] = useState(false);
  const [existing, setExisting] = useState<ExistingFeedback | null | undefined>(undefined);
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    getFeedbackByBookingId(bookingId, ratingType).then(setExisting).catch(console.error);
  }, [open, bookingId]);

  const handleSubmit = async () => {
    if (!user || selected === 0) return;
    setSubmitting(true);
    try {
      await submitFeedback({ bookingId, userId: user.id, workerId, rating: selected, comment, ratingType });
      toast({ title: t('feedback.success', 'Thank you for your feedback!') });
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast({ title: t('common.error', 'Error'), description: parseError(err), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = existing?.rating ?? 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {t('feedback.leaveReview', 'Leave a Review')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{workerName}</DialogTitle>
        </DialogHeader>

        {existing === undefined ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t('common.loading')}</p>
        ) : existing !== null ? (
          // Read-only: already reviewed
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('feedback.alreadyReviewed', 'You have already reviewed this booking.')}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-6 w-6 ${s <= displayRating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                />
              ))}
            </div>
            {existing.comment && (
              <p className="text-sm italic text-muted-foreground">"{existing.comment}"</p>
            )}
          </div>
        ) : (
          // Feedback form
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">{t('feedback.rating', 'Rating')}</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-8 w-8 cursor-pointer transition-colors ${
                      s <= (hovered || selected)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setSelected(s)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t('feedback.comment', 'Comment (optional)')}</p>
              <Textarea
                placeholder={t('feedback.commentPlaceholder', 'Share your experience...')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              disabled={selected === 0 || submitting}
              onClick={handleSubmit}
            >
              {submitting ? t('common.loading') : t('feedback.submit', 'Submit Review')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
