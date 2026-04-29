import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { getInstitutes, donate, type DonationInstitute } from '@/services/donationService';
import { createNotification } from '@/services/notificationService';

const INSTITUTE_TYPE_LABELS: Record<string, string> = {
  orphanage: 'Orphanage',
  nursing_home: 'Nursing Home',
  disability_care: 'Disability Care Center',
  food_bank: 'Food Bank',
  cancer_center: 'Cancer Treatment Center',
  pediatric_care: 'Pediatric Care',
  womens_shelter: "Women's Shelter",
  educational: 'Educational Foundation',
  rehabilitation: 'Rehabilitation Center',
  community_development: 'Community Development Association',
  mosque_charity: 'Mosque Charity',
  blood_bank: 'Blood Bank',
  drug_rehabilitation: 'Drug Rehabilitation Center',
  environmental: 'Environmental Organization',
  animal_welfare: 'Animal Welfare',
};

const Donations = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [institutes, setInstitutes] = useState<DonationInstitute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstitute, setSelectedInstitute] = useState<DonationInstitute | null>(null);
  const [donating, setDonating] = useState(false);

  const [amount, setAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    getInstitutes()
      .then(setInstitutes)
      .catch(() => toast.error('Failed to load institutes'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const openDialog = (institute: DonationInstitute) => {
    setSelectedInstitute(institute);
    setAmount('');
    setCardNumber('');
    setExpiry('');
    setCvv('');
  };

  const handleDonate = async () => {
    if (!user || !selectedInstitute) return;
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (cardNumber.replace(/\s/g, '').length < 16) {
      toast.error('Please enter a valid card number');
      return;
    }
    if (!expiry || !cvv) {
      toast.error('Please fill in all card details');
      return;
    }
    setDonating(true);
    try {
      await donate(user.id, selectedInstitute.id, Number(amount));
      toast.success(t('donations.paymentSuccess'));
      await createNotification({
        receiver_id: user.id,
        title: 'Donation Successful',
        message: `Your donation of ${Number(amount)} to ${selectedInstitute.name} was completed successfully.`,
      });
      setSelectedInstitute(null);
    } catch {
      toast.error('Donation failed. Please try again.');
      try {
        await createNotification({
          receiver_id: user.id,
          title: 'Donation Failed',
          message: `Your donation to ${selectedInstitute.name} could not be processed. Please try again.`,
        });
      } catch (_) {}
    } finally {
      setDonating(false);
    }
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-2xl font-bold mb-6">Donations</h1>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-56 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : institutes.length === 0 ? (
          <p className="text-center text-gray-500 py-16">{t('donations.noInstitutes')}</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {institutes.map(institute => (
              <Card key={institute.id} className="overflow-hidden flex flex-col">
                {institute.photo_url ? (
                  <img
                    src={institute.photo_url}
                    alt={institute.name}
                    className="w-full h-32 object-contain bg-white"
                  />
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center">
                    <Heart className="h-10 w-10 text-teal-400" />
                  </div>
                )}
                <CardContent className="flex-1 pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-lg text-gray-900 leading-tight">{institute.name}</h2>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {INSTITUTE_TYPE_LABELS[institute.type] ?? institute.type}
                    </Badge>
                  </div>
                  {institute.city && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span>{institute.city}</span>
                    </div>
                  )}
                  {institute.description && (
                    <p className="text-sm text-gray-600 line-clamp-3">{institute.description}</p>
                  )}
                  {institute.contact_info && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Phone className="h-4 w-4" />
                      <span>{institute.contact_info}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0 pb-4 px-6">
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700"
                    onClick={() => openDialog(institute)}
                  >
                    {t('donations.donate')}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        </div>
      </main>

      {/* Donate Dialog */}
      <Dialog open={!!selectedInstitute} onOpenChange={open => !open && setSelectedInstitute(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {t('donations.donateNow')} — {selectedInstitute?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t('donations.amount')}</Label>
              <Input
                type="number"
                min="1"
                placeholder="100"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('donations.cardNumber')}</Label>
              <Input
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('donations.expiry')}</Label>
                <Input
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={e => setExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('donations.cvv')}</Label>
                <Input
                  type="password"
                  placeholder="•••"
                  value={cvv}
                  onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInstitute(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handleDonate}
              disabled={donating}
            >
              {donating ? '...' : t('donations.donateNow')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Donations;
