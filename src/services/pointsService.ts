import { supabase } from '../lib/supabaseClient.js';

export const COUPON_TIERS = [
  { threshold: 2500, discount: 10 },
  { threshold: 4000, discount: 20 },
  { threshold: 6000, discount: 30 },
] as const;

export interface UserCoupon {
  id: string;
  user_id: string;
  discount_percent: number;
  points_spent: number;
  is_used: boolean;
  used_at: string | null;
  used_on_booking_id: string | null;
  created_at: string;
}

export async function awardPoints(
  userId: string,
  amountEgp: number,
  description: string,
  bookingId?: string,
): Promise<void> {
  await supabase
    .from('points_history')
    .insert({ user_id: userId, amount: amountEgp, description, ...(bookingId ? { booking_id: bookingId } : {}) });

  const { data: profile, error: fetchErr } = await supabase
    .from('profiles')
    .select('points_balance')
    .eq('id', userId)
    .single();
  if (fetchErr) throw fetchErr;

  const current = Number(profile?.points_balance ?? 0);
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ points_balance: current + amountEgp })
    .eq('id', userId);
  if (updateErr) throw updateErr;
}

export async function deductPointsForBooking(bookingId: string, userId: string): Promise<void> {
  const { data: rows, error: fetchErr } = await supabase
    .from('points_history')
    .select('amount')
    .eq('booking_id', bookingId)
    .eq('user_id', userId)
    .gt('amount', 0);
  if (fetchErr) throw fetchErr;

  const total = (rows ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
  if (total <= 0) return;

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('points_balance')
    .eq('id', userId)
    .single();
  if (profileErr) throw profileErr;

  const current = Number(profile?.points_balance ?? 0);
  const deduction = Math.min(total, current);

  await supabase
    .from('points_history')
    .insert({ user_id: userId, amount: -deduction, description: 'Booking cancelled — points reversed', booking_id: bookingId });

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ points_balance: current - deduction })
    .eq('id', userId);
  if (updateErr) throw updateErr;
}

export async function redeemCoupon(
  userId: string,
  currentBalance: number,
  discountPercent: number,
  threshold: number,
): Promise<void> {
  await supabase.from('points_history').insert({
    user_id: userId,
    amount: -currentBalance,
    description: 'Coupon redeemed — points reset',
  });

  const { error: resetErr } = await supabase
    .from('profiles')
    .update({ points_balance: 0 })
    .eq('id', userId);
  if (resetErr) throw resetErr;

  const { error: couponErr } = await supabase.from('user_coupons').insert({
    user_id: userId,
    discount_percent: discountPercent,
    points_spent: threshold,
  });
  if (couponErr) throw couponErr;
}

export async function getAvailableCoupons(userId: string): Promise<UserCoupon[]> {
  const { data, error } = await supabase
    .from('user_coupons')
    .select('*')
    .eq('user_id', userId)
    .eq('is_used', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function applyCoupon(couponId: string, bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('user_coupons')
    .update({ is_used: true, used_at: new Date().toISOString(), used_on_booking_id: bookingId })
    .eq('id', couponId);
  if (error) throw error;
}
