import { supabase } from '../lib/supabaseClient.js';

export interface DonationInstitute {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  city: string | null;
  contact_info: string | null;
  type: string;
  created_at: string;
}

export interface Donation {
  id: string;
  user_id: string;
  institute_id: string | null;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  donation_institutes?: Pick<DonationInstitute, 'name'>;
}

// Prefix used when we store Supabase storage paths in the DB.
const STORAGE_PATH_PREFIX = 'storage://institutes/';
// Legacy: old uploads stored the full public URL directly.
const LEGACY_PUBLIC_PREFIX = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/institutes/`;

export async function uploadInstitutePhoto(file: File): Promise<string> {
  const mimeType = file.type === 'image/jpeg' || file.type === '' ? 'image/jpeg' : file.type;
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const ext = extMap[mimeType] ?? 'jpg';
  const path = `${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('institutes').upload(path, file, {
    upsert: true,
    contentType: mimeType,
  });
  if (error) throw error;
  // Store a portable path reference instead of the public URL so we can
  // generate signed URLs later regardless of bucket visibility.
  return `${STORAGE_PATH_PREFIX}${path}`;
}

export async function getInstitutes(): Promise<DonationInstitute[]> {
  const { data, error } = await supabase
    .from('donation_institutes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const institutes = data ?? [];

  // Extract storage path from either the new portable format or the legacy public URL.
  const extractPath = (url: string): string | null => {
    if (url.startsWith(STORAGE_PATH_PREFIX)) return url.slice(STORAGE_PATH_PREFIX.length);
    if (url.startsWith(LEGACY_PUBLIC_PREFIX)) return url.slice(LEGACY_PUBLIC_PREFIX.length);
    return null;
  };

  const storagePaths = institutes
    .map(i => (i.photo_url ? extractPath(i.photo_url) : null))
    .filter((p): p is string => p !== null);

  if (storagePaths.length === 0) return institutes;

  const { data: signed } = await supabase.storage
    .from('institutes')
    .createSignedUrls(storagePaths, 3600);

  const signedMap = new Map((signed ?? []).map(s => [s.path, s.signedUrl]));

  return institutes.map(inst => {
    const path = inst.photo_url ? extractPath(inst.photo_url) : null;
    if (!path) return inst;
    return { ...inst, photo_url: signedMap.get(path) ?? null };
  });
}

export async function addInstitute(data: Omit<DonationInstitute, 'id' | 'created_at'>): Promise<void> {
  const { error } = await supabase.from('donation_institutes').insert(data);
  if (error) throw error;
}

export async function updateInstitute(id: string, data: Partial<Omit<DonationInstitute, 'id' | 'created_at'>>): Promise<void> {
  const { error } = await supabase.from('donation_institutes').update(data).eq('id', id);
  if (error) throw error;
}

export async function deleteInstitute(id: string): Promise<void> {
  const { error } = await supabase.from('donation_institutes').delete().eq('id', id);
  if (error) throw error;
}

export async function donate(userId: string, instituteId: string, amount: number): Promise<void> {
  const { error } = await supabase.from('donations').insert({
    user_id: userId,
    institute_id: instituteId,
    amount,
    payment_method: 'card',
    status: 'completed',
  });
  if (error) throw error;
}

export async function getUserDonations(userId: string): Promise<Donation[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('*, donation_institutes(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
