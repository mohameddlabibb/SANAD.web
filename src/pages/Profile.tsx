import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Settings,
  HelpCircle,
  Star,
  LogOut,
  User,
  Lock,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Upload,
  PlayCircle,
  Plus,
  Trash2,
  ChevronDown,
  MapPin,
  LocateFixed,
  ClipboardList,
  type LucideIcon
} from 'lucide-react';
import { LocationPickerModal } from '@/components/LocationPickerModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { parseError } from '@/lib/parseError';
import type { BookingWithWorker } from '@/types/bookings';
import { getUserDonations, type Donation } from '@/services/donationService';
import { Heart } from 'lucide-react';
import { COUPON_TIERS, getAvailableCoupons, redeemCoupon, type UserCoupon } from '@/services/pointsService';

const Profile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('settings');
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editCity, setEditCity] = useState(user?.city || '');
  const parseAddresses = (raw: string) =>
    raw ? raw.split(' | ').map((a) => a.trim()).filter(Boolean) : [];
  const [addresses, setAddresses] = useState<string[]>(parseAddresses(user?.address || ''));
  const [newAddress, setNewAddress] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<string>(
    () => parseAddresses(user?.address || '')[0] ?? ''
  );
  const [addressOpen, setAddressOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [editNationalId, setEditNationalId] = useState(user?.nationalId || '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pointsHistory, setPointsHistory] = useState<{ id: string; amount: number; description: string | null; created_at: string }[]>([]);
  const [pointsTotal, setPointsTotal] = useState(0);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([]);
  const [claimingCoupon, setClaimingCoupon] = useState(false);
  const [upcomingBookings, setUpcomingBookings] = useState<BookingWithWorker[]>([]);
  const [pastBookings, setPastBookings] = useState<BookingWithWorker[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [userDonations, setUserDonations] = useState<Donation[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(false);

  const refreshPointsTab = () => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('points_balance')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setPointsBalance(Number(data?.points_balance ?? 0)));

    supabase
      .from('points_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('points_history:', error); return; }
        const rows = data ?? [];
        setPointsHistory(rows);
        setPointsTotal(rows.reduce((sum, r) => sum + (r.amount ?? 0), 0));
      });

    getAvailableCoupons(user.id).then(setAvailableCoupons).catch(() => {});
  };

  useEffect(() => {
    if (activeTab !== 'points' || !user?.id) return;
    refreshPointsTab();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id]);

  useEffect(() => {
    if (activeTab !== 'requests' || !user?.id) return;
    setBookingsLoading(true);
    supabase
      .from('bookings')
      .select('*, workers(service_type)')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('bookings:', error); setBookingsLoading(false); return; }
        const rows = data ?? [];
        setUpcomingBookings(rows.filter(b => ['pending', 'accepted', 'confirmed', 'ongoing'].includes(b.status ?? '')));
        setPastBookings(rows.filter(b => ['completed', 'cancelled'].includes(b.status ?? '')));
        setBookingsLoading(false);
      });
  }, [activeTab, user?.id]);

  useEffect(() => {
    if (activeTab !== 'donations' || !user?.id) return;
    setDonationsLoading(true);
    getUserDonations(user.id)
      .then(setUserDonations)
      .catch(console.error)
      .finally(() => setDonationsLoading(false));
  }, [activeTab, user?.id]);

  const handleClaimCoupon = async (discount: number, threshold: number) => {
    if (!user?.id || claimingCoupon) return;
    setClaimingCoupon(true);
    try {
      await redeemCoupon(user.id, pointsBalance, discount, threshold);
      toast({ title: t('coupon.claimCoupon', 'Claim {{discount}}% Coupon', { discount }), description: t('coupon.pointsResetNote', 'All points reset to 0 when you claim a coupon.') });
      refreshPointsTab();
    } catch (err) {
      toast({ title: t('common.error'), description: parseError(err), variant: 'destructive' });
    } finally {
      setClaimingCoupon(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSaveProfile = async () => {
    if (!editCity.trim() || addresses.length === 0) {
      toast({
        title: t('common.error'),
        description: t('profile.cityAddressRequired', 'City and Address are required to book services.'),
        variant: 'destructive',
      });
      return;
    }
    await updateUser({
      name: editName,
      email: editEmail,
      phone: editPhone,
      city: editCity,
      address: [selectedAddress, ...addresses.filter((a) => a !== selectedAddress)].join(' | '),
      nationalId: editNationalId,
    });
    toast({ title: t('profile.profileUpdated'), description: t('profile.profileUpdatedDesc') });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateUser({ avatarUrl: data.publicUrl });
      toast({ title: t('profile.profileUpdated') });
    } catch (err) {
      toast({ title: t('common.error'), description: parseError(err), variant: 'destructive' });
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: t('profile.passwordMismatch'), variant: 'destructive' });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: t('common.error'), description: parseError(error), variant: 'destructive' });
      return;
    }
    toast({ title: t('profile.passwordChanged'), description: t('profile.passwordChangedDesc') });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const faqs = [
    { q: t('profile.faq1Q'), a: t('profile.faq1A') },
    { q: t('profile.faq2Q'), a: t('profile.faq2A') },
    { q: t('profile.faq3Q'), a: t('profile.faq3A') },
    { q: t('profile.faq4Q'), a: t('profile.faq4A') },
  ];

  const isAdmin = user?.role === 'admin';

  const menuItems: { id: string; icon: LucideIcon; label: string; href?: string }[] = [
    { id: 'settings', icon: Settings, label: t('profile.settings') },
    ...(!isAdmin ? [
      { id: 'requests', icon: ClipboardList, label: t('profile.myRequests') },
      { id: 'help', icon: HelpCircle, label: t('profile.help') },
      { id: 'points', icon: Star, label: t('profile.points') },
      { id: 'donations', icon: Heart, label: t('donations.myDonations') },
    ] : []),
  ];

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Profile Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-primary" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold">{user.name}</h1>
                <p className="text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('profile.memberSince')}: {user.createdAt?.slice(0, 10)}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {/* Sidebar Menu */}
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.href ? navigate(item.href) : setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t('common.logout')}</span>
                </button>
              </div>

              {/* Content Area */}
              <div className="md:col-span-3">
                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          {t('profile.editProfile')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">{t('common.fullName')}</label>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">{t('common.email')}</label>
                          <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">{t('common.phone')}</label>
                          <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                        </div>
                        {!isAdmin && (
                          <>
                            <div>
                              <label className="text-sm font-medium">{t('common.city')} <span className="text-destructive">*</span></label>
                              <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} />
                            </div>
                            <div>
                              <label className="text-sm font-medium">{t('common.address')} <span className="text-destructive">*</span></label>
                              <div className="flex gap-2 mt-1">
                                <Popover open={addressOpen} onOpenChange={setAddressOpen}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="flex-1 justify-between font-normal min-w-0"
                                    >
                                      <span className="flex items-center gap-2 truncate">
                                        <MapPin className="w-4 h-4 shrink-0 text-muted-foreground" />
                                        <span className="truncate">
                                          {selectedAddress || t('profile.addAddress', 'Select an address')}
                                        </span>
                                      </span>
                                      <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="p-2 w-[var(--radix-popover-trigger-width)]"
                                    align="start"
                                    sideOffset={4}
                                  >
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                      {addresses.map((addr, idx) => (
                                        <div
                                          key={idx}
                                          className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                                            addr === selectedAddress
                                              ? 'bg-primary/10 text-primary'
                                              : 'hover:bg-muted'
                                          }`}
                                          onClick={() => {
                                            setSelectedAddress(addr);
                                            setAddressOpen(false);
                                          }}
                                        >
                                          <CheckCircle
                                            className={`w-4 h-4 shrink-0 ${addr === selectedAddress ? 'text-primary' : 'text-transparent'}`}
                                          />
                                          <span className="flex-1 text-sm">{addr}</span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setAddresses((prev) => {
                                                const next = prev.filter((_, i) => i !== idx);
                                                if (addr === selectedAddress) {
                                                  setSelectedAddress(next[0] ?? '');
                                                }
                                                return next;
                                              });
                                            }}
                                            className="text-destructive hover:text-destructive/80 shrink-0"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex gap-2 mt-2 pt-2 border-t">
                                      <Input
                                        placeholder={t('profile.addAddress', 'New address…')}
                                        value={newAddress}
                                        onChange={(e) => setNewAddress(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && newAddress.trim()) {
                                            e.preventDefault();
                                            const trimmed = newAddress.trim();
                                            setAddresses((prev) => [...prev, trimmed]);
                                            setSelectedAddress(trimmed);
                                            setNewAddress('');
                                          }
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        disabled={!newAddress.trim()}
                                        onClick={() => {
                                          if (newAddress.trim()) {
                                            const trimmed = newAddress.trim();
                                            setAddresses((prev) => [...prev, trimmed]);
                                            setSelectedAddress(trimmed);
                                            setNewAddress('');
                                          }
                                        }}
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  title={t('location.useCurrentLocation')}
                                  onClick={() => {
                                    setAddressOpen(false);
                                    setLocationPickerOpen(true);
                                  }}
                                >
                                  <LocateFixed className="w-4 h-4 text-primary" />
                                </Button>
                              </div>
                              <LocationPickerModal
                                open={locationPickerOpen}
                                onOpenChange={setLocationPickerOpen}
                                onConfirm={(addr) => {
                                  setAddresses((prev) => [...prev, addr]);
                                  setSelectedAddress(addr);
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">{t('profile.nationalId')}</label>
                              <Input value={editNationalId} onChange={(e) => setEditNationalId(e.target.value)} />
                            </div>
                            <div>
                              <label className="text-sm font-medium">{t('profile.profilePicture')}</label>
                              <div className="flex items-center gap-4 mt-1">
                                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                                  {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-7 h-7 text-primary" />
                                  )}
                                </div>
                                <input
                                  ref={avatarInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleAvatarUpload}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={avatarUploading}
                                  onClick={() => avatarInputRef.current?.click()}
                                  className="gap-2"
                                >
                                  <Upload className="w-4 h-4" />
                                  {avatarUploading ? t('common.loading') : t('profile.uploadPhoto')}
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                        <Button onClick={handleSaveProfile}>{t('common.save')}</Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Lock className="w-5 h-5" />
                          {t('profile.changePassword')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">{t('profile.currentPassword')}</label>
                          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">{t('profile.newPassword')}</label>
                          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">{t('common.confirmPassword')}</label>
                          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                        <Button onClick={handleChangePassword}>{t('profile.updatePassword')}</Button>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Help Tab */}
                {activeTab === 'help' && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('profile.faq')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                          {faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`faq-${index}`}>
                              <AccordionTrigger>{faq.q}</AccordionTrigger>
                              <AccordionContent>{faq.a}</AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>{t('profile.callUs')}</CardTitle>
                        <CardDescription>{t('profile.callUsDesc')}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button className="flex items-center gap-2">
                          <Phone className="w-5 h-5" />
                          +20 123 456 7890
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Points Tab */}
                {activeTab === 'points' && (
                  <div className="space-y-4">
                    {/* Balance */}
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('profile.yourPoints')}</CardTitle>
                        <CardDescription>{t('profile.pointsInfo')}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                            <Star className="w-10 h-10 text-primary" />
                          </div>
                          <div>
                            <div className="text-4xl font-bold text-primary">{pointsBalance}</div>
                            <p className="text-muted-foreground">{t('profile.pointsAvailable')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Coupon Progress Bars */}
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('coupon.title', 'Coupon Rewards')}</CardTitle>
                        <CardDescription>{t('coupon.pointsResetNote', 'All points reset to 0 when you claim a coupon.')}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {COUPON_TIERS.map((tier) => {
                          const pct = Math.min((pointsBalance / tier.threshold) * 100, 100);
                          const unlocked = pointsBalance >= tier.threshold;
                          return (
                            <div key={tier.threshold} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">
                                  {t('coupon.discountOff', '{{discount}}% off coupon', { discount: tier.discount })}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {Math.min(pointsBalance, tier.threshold)} / {tier.threshold} pts
                                </span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${unlocked ? 'bg-green-500' : 'bg-primary'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              {unlocked && (
                                <Button
                                  size="sm"
                                  className="mt-1 bg-teal-600 hover:bg-teal-700 text-white"
                                  disabled={claimingCoupon}
                                  onClick={() => handleClaimCoupon(tier.discount, tier.threshold)}
                                >
                                  {t('coupon.claimCoupon', 'Claim {{discount}}% Coupon', { discount: tier.discount })}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>

                    {/* Available Coupons */}
                    <Card>
                      <CardHeader>
                        <CardTitle>{t('coupon.availableCoupons', 'Your Coupons')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {availableCoupons.length === 0 ? (
                          <p className="text-sm text-muted-foreground">{t('coupon.noCoupons', 'No coupons yet — keep booking!')}</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {availableCoupons.map((c) => (
                              <Badge key={c.id} className="text-sm px-3 py-1 bg-teal-100 text-teal-800 hover:bg-teal-100">
                                {t('coupon.discountOff', '{{discount}}% off', { discount: c.discount_percent })}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Points History */}
                    {pointsHistory.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">{t('profile.points')} History</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {pointsHistory.map((entry) => (
                              <div key={entry.id} className="flex items-center justify-between text-sm border-b last:border-b-0 py-2">
                                <span className="text-muted-foreground">{entry.description ?? t('profile.points')}</span>
                                <div className="flex items-center gap-2">
                                  <span className={entry.amount >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                                    {entry.amount >= 0 ? '+' : ''}{entry.amount}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{entry.created_at?.slice(0, 10)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* My Requests Tab */}
               {activeTab === 'requests' && (
  <Tabs defaultValue="upcoming" className="w-full">
    <TabsList className="grid w-full grid-cols-2">
      <TabsTrigger value="upcoming">{t('profile.upcoming')}</TabsTrigger>
      <TabsTrigger value="past">{t('profile.past')}</TabsTrigger>
    </TabsList>

    <TabsContent value="upcoming" className="space-y-4 mt-4">
      {bookingsLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t('common.loading')}
        </p>
      ) : upcomingBookings.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t('profile.noUpcoming')}
        </p>
      ) : (
        upcomingBookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">
                    {booking.workers?.service_type ?? booking.booking_type ?? '—'}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {booking.booking_date}
                    </span>
                    {booking.start_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {booking.start_time.slice(0, 5)}
                      </span>
                    )}
                  </div>
                </div>
                <Badge
                  variant={
                    booking.status === 'ongoing'
                      ? 'default'
                      : (booking.status === 'confirmed' || booking.status === 'accepted')
                        ? 'default'
                        : 'secondary'
                  }
                  className={booking.status === 'ongoing' ? 'bg-blue-500 hover:bg-blue-500' : ''}
                >
                  <span className="flex items-center gap-1">
                    {booking.status === 'ongoing' ? (
                      <><PlayCircle className="w-3 h-3" /> {t('profile.ongoing')}</>
                    ) : (booking.status === 'confirmed' || booking.status === 'accepted') ? (
                      <><CheckCircle className="w-3 h-3" /> {t('profile.confirmed')}</>
                    ) : (
                      t('profile.pending')
                    )}
                  </span>
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </TabsContent>

    <TabsContent value="past" className="space-y-4 mt-4">
      {bookingsLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t('common.loading')}
        </p>
      ) : pastBookings.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t('profile.noPast')}
        </p>
      ) : (
        pastBookings.map((booking) => (
          <Card key={booking.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">
                    {booking.workers?.service_type ?? booking.booking_type ?? '—'}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {booking.booking_date}
                    </span>
                    {booking.total_price && (
                      <span>{booking.total_price} EGP</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={booking.status === 'completed' ? 'default' : 'destructive'}>
                    <span className="flex items-center gap-1">
                      {booking.status === 'completed' ? (
                        <><CheckCircle className="w-3 h-3" /> {t('profile.completed')}</>
                      ) : (
                        <><XCircle className="w-3 h-3" /> {t('profile.cancelled')}</>
                      )}
                    </span>
                  </Badge>
                  {booking.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/payment/${booking.id}`)}
                    >
                      {t('profile.payNow', 'Pay Now')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </TabsContent>
  </Tabs>
)}
                {/* My Donations Tab */}
                {activeTab === 'donations' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-500" />
                        {t('donations.myDonations')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {donationsLoading ? (
                        <p className="text-sm text-muted-foreground text-center py-8">{t('common.loading')}</p>
                      ) : userDonations.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">{t('donations.noDonations')}</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-muted-foreground">
                                <th className="pb-2 pr-4">{t('donations.institute')}</th>
                                <th className="pb-2 pr-4">{t('donations.amount')}</th>
                                <th className="pb-2 pr-4">{t('donations.date')}</th>
                                <th className="pb-2">{t('donations.status')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {userDonations.map(d => (
                                <tr key={d.id}>
                                  <td className="py-3 pr-4 font-medium">{d.donation_institutes?.name ?? '—'}</td>
                                  <td className="py-3 pr-4">{d.amount} EGP</td>
                                  <td className="py-3 pr-4 text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                                  <td className="py-3">
                                    <Badge variant="outline" className="text-green-600 border-green-300">
                                      {t('donations.completed')}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
};

export default Profile;
