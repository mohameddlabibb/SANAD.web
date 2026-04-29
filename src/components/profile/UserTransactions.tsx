import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CreditCard, ImageIcon, StickyNote, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getUserTransactions } from '@/services/transactionService';
import type { Transaction } from '@/types/transactions';

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

export function UserTransactions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getUserTransactions(user.id);
        setTransactions(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  if (!user?.id) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.transactionsHistory')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
        {!loading && transactions.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('profile.noTransactions')}</p>
        )}
        {!loading &&
          transactions.map((tx) => (
            <div key={tx.id} className="flex items-start justify-between border-b last:border-b-0 pb-3 last:pb-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="font-medium">
                    {tx.payment_method || t('profile.walletTopUp')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {tx.created_at?.slice(0, 10)}
                  </span>
                  {tx.screenshot_url && (
                    <a
                      href={tx.screenshot_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 underline"
                    >
                      <ImageIcon className="w-3 h-3" />
                      {t('profile.paymentProof')}
                    </a>
                  )}
                </div>
                {tx.admin_notes && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <StickyNote className="w-3 h-3" />
                    {tx.admin_notes}
                  </p>
                )}
              </div>
              <Badge variant={statusVariantMap[tx.status] ?? 'outline'}>
                <span className="flex items-center gap-1">
                  {tx.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                  {tx.status === 'rejected' && <XCircle className="w-3 h-3" />}
                  {tx.status === 'pending' && <Clock className="w-3 h-3" />}
                  {t(`profile.status.${tx.status}`, { defaultValue: tx.status })}
                </span>
              </Badge>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

