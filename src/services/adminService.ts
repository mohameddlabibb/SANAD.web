import { supabase } from '../lib/supabaseClient.js';
import type { ProfileRow } from '../types/profile';
import { updateTransactionStatus } from './transactionService';
import { createNotification } from './notificationService';
import { updateBookingStatus } from './bookingService';

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'admin')
    .neq('role', 'worker')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

// ─── Workers ──────────────────────────────────────────────────────────────────

export interface AdminWorkerRow {
  id: string;
  service_type: string;
  average_rating: number | null;
  years_experience: number | null;
  hourly_rate: number | null;
  monthly_rate: number | null;
  total_jobs: number | null;
  nationality: string | null;
  car_model: string | null;
  special_tags: string[] | null;
  special_attributes: Record<string, string> | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    city: string | null;
    phone_number: string | null;
    national_id: string | null;
  } | null;
}

export async function getAllWorkers(): Promise<AdminWorkerRow[]> {
  const [workersRes, jobsRes] = await Promise.all([
    supabase
      .from('workers')
      .select('id, service_type, average_rating, years_experience, hourly_rate, monthly_rate, total_jobs, nationality, car_model, special_tags, special_attributes, profiles(full_name, avatar_url, city, phone_number, national_id)'),
    supabase
      .from('bookings')
      .select('worker_id')
      .in('status', ['completed', 'payment_pending', 'paid']),
  ]);

  if (workersRes.error) throw workersRes.error;
  if (jobsRes.error) throw jobsRes.error;

  const jobCounts: Record<string, number> = {};
  for (const b of jobsRes.data ?? []) {
    if (b.worker_id) {
      jobCounts[b.worker_id] = (jobCounts[b.worker_id] ?? 0) + 1;
    }
  }

  return (workersRes.data ?? []).map((w) => ({
    ...w,
    total_jobs: jobCounts[w.id] ?? 0,
  })) as AdminWorkerRow[];
}

export interface WorkerFormInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  city: string;
  nationality: string;
  serviceType: string;
  dob: string;            // YYYY-MM-DD
  yearsExperience: number | null;
  hourlyRate: number | null;
  monthlyRate: number | null;
  nationalId: string;
  // driver-specific
  carModel: string;
  // chef-specific
  chefType: string;       // 'normal' | 'premium' | ''
  specialTags: string[];  // e.g. ['italian', 'gluten free']
  // caregiver-specific
  medicalSkills: string[];
  overnightAvailable: boolean;
}

export async function createWorker(input: WorkerFormInput): Promise<string> {
  // Use Edge Function with service role — does NOT touch admin's session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-worker`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        phone: input.phone,
        city: input.city,
        nationalId: input.nationalId,
        nationality: input.nationality,
        serviceType: input.serviceType,
        dob: input.dob,
        yearsExperience: input.yearsExperience,
        hourlyRate: input.hourlyRate,
        monthlyRate: input.monthlyRate,
        carModel: input.carModel,
        chefType: input.chefType,
        specialTags: input.specialTags,
        medicalSkills: input.medicalSkills,
        overnightAvailable: input.overnightAvailable,
      }),
    },
  );

  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Failed to create worker');
  return result.userId as string;
}

export async function updateWorker(
  workerId: string,
  profileId: string,
  input: Omit<WorkerFormInput, 'email' | 'password'>,
): Promise<void> {
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName,
      phone_number: input.phone || null,
      city: input.city || null,
      national_id: input.nationalId || null,
    })
    .eq('id', profileId);
  if (profileError) throw profileError;

  const workerExtras: Record<string, unknown> = {
    car_model: null,
    special_tags: null,
    special_attributes: null,
  };
  if (input.serviceType === 'driver') {
    workerExtras.car_model = input.carModel || null;
  }
  if (input.serviceType === 'chef') {
    workerExtras.special_tags = input.specialTags.length ? input.specialTags : null;
    workerExtras.special_attributes = input.chefType ? { chef_type: input.chefType } : null;
  }
  if (input.serviceType === 'caregiver') {
    const ensuredSkills = [...(input.medicalSkills ?? [])];
    if (!ensuredSkills.includes('basic_nursing')) {
      ensuredSkills.unshift('basic_nursing');
    }
    workerExtras.special_tags = ensuredSkills.length ? ensuredSkills : ['basic_nursing'];
    workerExtras.special_attributes = { overnight_available: input.overnightAvailable ?? false };
  }

  const { error: workerError } = await supabase
    .from('workers')
    .update({
      service_type: input.serviceType,
      years_experience: input.yearsExperience,
      nationality: input.nationality || null,
      hourly_rate: input.hourlyRate,
      monthly_rate: input.monthlyRate,
      ...workerExtras,
    })
    .eq('id', workerId);
  if (workerError) throw workerError;
}

export async function deleteWorker(workerId: string): Promise<void> {
  // Remove worker record; profile role is set back to 'user'
  const { error: workerError } = await supabase
    .from('workers')
    .delete()
    .eq('id', workerId);
  if (workerError) throw workerError;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'user' })
    .eq('id', workerId);
  if (profileError) throw profileError;
}

export async function getWorkersByServiceType(serviceType: string): Promise<AdminWorkerRow[]> {
  const { data, error } = await supabase
    .from('workers')
    .select('id, service_type, average_rating, years_experience, hourly_rate, monthly_rate, profiles(full_name, avatar_url, city)')
    .eq('service_type', serviceType);

  if (error) throw error;
  return (data ?? []) as AdminWorkerRow[];
}

export async function updateWorkerPricing(
  workerId: string,
  hourlyRate: number | null,
  monthlyRate: number | null,
): Promise<void> {
  const { error } = await supabase
    .from('workers')
    .update({ hourly_rate: hourlyRate, monthly_rate: monthlyRate })
    .eq('id', workerId);

  if (error) throw error;
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface AdminBookingRow {
  id: string;
  user_id: string;
  worker_id: string | null;
  booking_date: string | null;
  start_time: string | null;
  total_price: number | null;
  status: string;
  booking_type: string | null;
  created_at: string;
  address: string | null;
  user: { full_name: string | null; email: string | null } | null;
  worker: {
    service_type: string;
    profiles: { full_name: string | null } | null;
  } | null;
}

export async function getAllBookings(): Promise<AdminBookingRow[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, user_id, worker_id, booking_date, start_time,
      total_price, status, booking_type, created_at, address,
      user:profiles!bookings_user_id_fkey(full_name, email),
      worker:workers!bookings_worker_id_fkey(service_type, profiles(full_name))
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as AdminBookingRow[];
}

export async function reassignWorker(bookingId: string, newWorkerId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ worker_id: newWorkerId })
    .eq('id', bookingId)
    .in('status', ['pending', 'accepted', 'confirmed']);

  if (error) throw error;
}

// ─── Wallet / Transactions ────────────────────────────────────────────────────

export interface AdminTransactionRow {
  id: string;
  user_id: string;
  invoice_id: string | null;
  payment_method: string | null;
  screenshot_url: string | null;
  status: string;
  created_at: string;
  admin_notes: string | null;
  invoice: { amount: number; booking_id: string | null; payment_type: string | null } | null;
  user: { full_name: string | null; email: string | null } | null;
}

export async function getPendingTransactions(): Promise<AdminTransactionRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id, user_id, invoice_id, payment_method, screenshot_url,
      status, created_at, admin_notes,
      invoice:invoices!transactions_invoice_id_fkey(amount, booking_id, payment_type),
      user:profiles!transactions_user_id_fkey(full_name, email)
    `)
    .eq('payment_method', 'instapay')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as AdminTransactionRow[];
}

export async function approveTransaction(tx: AdminTransactionRow): Promise<void> {
  // 1. Mark transaction approved
  await updateTransactionStatus(tx.id, 'approved');

  const isWalletTopUp = tx.invoice?.booking_id == null;
  const paymentType = tx.invoice?.payment_type ?? 'deposit';

  // 2. For service payments, update booking status based on payment stage
  if (!isWalletTopUp && tx.invoice?.booking_id) {
    const newStatus = paymentType === 'balance' ? 'paid' : 'deposit_paid';
    await updateBookingStatus(tx.invoice.booking_id, newStatus);
  }

  // 3. Award points only on balance payment (full service was completed)
  if (!isWalletTopUp && paymentType === 'balance' && tx.invoice?.booking_id && tx.user_id && tx.invoice?.amount) {
    const { awardPoints } = await import('./pointsService');
    await awardPoints(tx.user_id, tx.invoice.amount, 'Booking payment', tx.invoice.booking_id);
  }

  // 4. Credit wallet only for wallet top-ups
  if (isWalletTopUp) {
    const amount = tx.invoice?.amount;
    if (amount && tx.user_id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', tx.user_id)
        .single();

      if (profileError) throw profileError;

      const current = Number(profile?.wallet_balance ?? 0);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: current + amount })
        .eq('id', tx.user_id);

      if (updateError) throw updateError;
    }
  }

  // 5. Notify user
  const isDeposit = paymentType === 'deposit';
  await createNotification({
    receiver_id: tx.user_id,
    title: 'Payment Approved',
    message: isDeposit
      ? 'Your deposit payment has been approved. Your booking is confirmed.'
      : 'Your final payment has been approved. Thank you!',
    booking_id: tx.invoice?.booking_id ?? undefined,
  });
}

export async function rejectTransaction(
  id: string,
  adminNotes: string,
  userId: string,
  bookingId?: string | null,
): Promise<void> {
  await updateTransactionStatus(id, 'rejected', adminNotes);
  await createNotification({
    receiver_id: userId,
    title: 'Payment Rejected',
    message: `Your InstaPay payment was rejected. Reason: ${adminNotes}`,
    booking_id: bookingId ?? undefined,
  });
}

// ─── Worker Documents ─────────────────────────────────────────────────────────

export const uploadWorkerDocument = async (
  workerId: string,
  documentType: 'national_id' | 'driving_license',
  file: File,
  side: 'front' | 'back',
): Promise<string> => {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${workerId}/${documentType}_${side}.${ext}`;
  const { error } = await supabase.storage
    .from('worker-docs')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('worker-docs').getPublicUrl(path);
  return data.publicUrl;
};

export const saveWorkerDocumentRecord = async (record: {
  worker_id: string;
  document_type: 'national_id' | 'driving_license';
  front_url: string;
  back_url?: string;
}): Promise<void> => {
  const { error } = await supabase
    .from('admin_worker_documents')
    .upsert(
      {
        worker_id: record.worker_id,
        document_type: record.document_type,
        front_url: record.front_url,
        back_url: record.back_url ?? null,
      },
      { onConflict: 'worker_id,document_type' },
    );
  if (error) throw error;

  if (record.document_type === 'national_id' && record.front_url) {
    await supabase
      .from('workers')
      .update({ documents_submitted: true })
      .eq('id', record.worker_id);
  }
};

export const getWorkerDocuments = async (workerId: string) => {
  const { data, error } = await supabase
    .from('admin_worker_documents')
    .select('document_type, front_url, back_url')
    .eq('worker_id', workerId);
  if (error) throw error;
  return (data ?? []) as { document_type: string; front_url: string | null; back_url: string | null }[];
};

// ─── Deposit Refunds ──────────────────────────────────────────────────────────

export interface RefundQueueRow {
  id: string;
  user_id: string;
  total_price: number | null;
  created_at: string;
  deposit_refund_status: string;
  user: { full_name: string | null; email: string | null } | null;
}

export async function getRefundQueue(): Promise<RefundQueueRow[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, user_id, total_price, created_at, deposit_refund_status,
      user:profiles!bookings_user_id_fkey(full_name, email)
    `)
    .eq('deposit_refund_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as RefundQueueRow[];
}

export async function markRefundProcessed(bookingId: string): Promise<void> {
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('user_id, total_price')
    .eq('id', bookingId)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from('bookings')
    .update({ deposit_refund_status: 'processed' })
    .eq('id', bookingId);

  if (error) throw error;

  if (booking?.user_id) {
    const depositAmount = Math.ceil((booking.total_price ?? 0) * 0.2);
    await createNotification({
      receiver_id: booking.user_id,
      title: 'Deposit Refunded',
      message: `Your 20% deposit of ${depositAmount} EGP has been refunded successfully.`,
      booking_id: bookingId,
    });
  }
}
