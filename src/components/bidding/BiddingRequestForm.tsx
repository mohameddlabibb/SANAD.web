// src/components/bidding/BiddingRequestForm.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MapPin, ChevronDown, CheckCircle, Plus, LocateFixed } from 'lucide-react';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createBiddingRequest } from '@/services/biddingService';
import { createNotification } from '@/services/notificationService';
import { supabase } from '@/lib/supabaseClient';
import { parseError } from '@/lib/parseError';
import type { NewBiddingRequestPayload } from '@/types/biddings';

const SERVICE_TYPES = ['chefs', 'drivers', 'caregivers', 'maid', 'babysitters'];

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export function BiddingRequestForm({ onSuccess, onCancel }: Props) {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const savedAddresses: string[] = user?.address
    ? user.address.split(' | ').map((a) => a.trim()).filter(Boolean)
    : [];

  const [serviceType, setServiceType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [address, setAddress] = useState(savedAddresses[0] ?? '');
  const [addressOpen, setAddressOpen] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [extraAddresses, setExtraAddresses] = useState<string[]>([]);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const allAddresses = [...savedAddresses, ...extraAddresses];

  const addNewAddress = () => {
    const trimmed = newAddress.trim();
    if (!trimmed) return;
    setExtraAddresses((prev) => [...prev, trimmed]);
    setAddress(trimmed);
    setNewAddress('');
    setAddressOpen(false);
  };

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!serviceType || !title || !description || !bookingDate || !startTime || !durationHours || !address) {
      toast({ title: t('common.error'), description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const payload: NewBiddingRequestPayload = {
        user_id: user.id,
        service_type: serviceType,
        title: title.trim(),
        description: description.trim(),
        booking_date: bookingDate,
        start_time: startTime,
        duration_hours: Number(durationHours),
        address: address.trim(),
      };
      await createBiddingRequest(payload);

      // Notify all workers of this service type
      const { data: workers } = await supabase
        .from('workers')
        .select('id')
        .eq('service_type', serviceType);

      await Promise.allSettled(
        (workers ?? []).map((w) =>
          createNotification({
            receiver_id: w.id,
            title: 'New Bid Request',
            message: `New request: ${payload.title}`,
          })
        )
      );

      toast({ title: t('bidding.bidSubmitted') });
      onSuccess();
    } catch (err) {
      toast({ title: t('common.error'), description: parseError(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('bidding.serviceType')}</Label>
        <Select value={serviceType} onValueChange={setServiceType}>
          <SelectTrigger>
            <SelectValue placeholder={t('bidding.serviceType')} />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`services.${s}`, s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t('bidding.title')}</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('bidding.titlePlaceholder')}
          maxLength={100}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('bidding.description')}</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('bidding.descriptionPlaceholder')}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{t('bidding.date')}</Label>
          <Input
            type="date"
            min={today}
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('bidding.startTime')}</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t('bidding.duration')}</Label>
        <Input
          type="number"
          min={1}
          max={24}
          value={durationHours}
          onChange={(e) => setDurationHours(e.target.value)}
          placeholder="e.g. 3"
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('bidding.address')}</Label>
        <Popover open={addressOpen} onOpenChange={setAddressOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between font-normal"
            >
              <span className="flex items-center gap-2 truncate">
                <MapPin className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{address || t('common.address')}</span>
              </span>
              <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-2 w-[var(--radix-popover-trigger-width)]" align="start" sideOffset={4}>
            {allAddresses.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto mb-2">
                {allAddresses.map((addr) => (
                  <div
                    key={addr}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                      addr === address ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                    onClick={() => { setAddress(addr); setAddressOpen(false); }}
                  >
                    <CheckCircle className={`w-4 h-4 shrink-0 ${addr === address ? 'text-primary' : 'text-transparent'}`} />
                    <span className="text-sm flex-1">{addr}</span>
                  </div>
                ))}
              </div>
            )}
            <div className={`flex gap-2 ${allAddresses.length > 0 ? 'pt-2 border-t' : ''}`}>
              <Input
                placeholder={t('profile.addAddress', 'New address…')}
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNewAddress(); } }}
              />
              <Button type="button" variant="outline" size="icon" disabled={!newAddress.trim()} onClick={addNewAddress}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title={t('location.useCurrentLocation')}
                onClick={() => { setAddressOpen(false); setLocationPickerOpen(true); }}
              >
                <LocateFixed className="w-4 h-4 text-primary" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <LocationPickerModal
          open={locationPickerOpen}
          onOpenChange={setLocationPickerOpen}
          onConfirm={(addr) => {
            setExtraAddresses((prev) => [...prev, addr]);
            setAddress(addr);
            const existing = user?.address
              ? user.address.split(' | ').map((a) => a.trim()).filter(Boolean)
              : [];
            const merged = [...existing, addr].join(' | ');
            updateUser({ address: merged });
          }}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? t('bidding.posting') : t('bidding.post')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
