import { supabase } from '../lib/supabaseClient.js';

const PROFILES_TABLE = 'profiles';

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

async function resolveEmail(identifier) {
  if (identifier.includes('@')) {
    return identifier;
  }

  // Username-based login: look up email from profiles by full_name
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select('email')
    .ilike('full_name', identifier)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.email) {
    throw new Error('No account found for that username.');
  }

  return data.email;
}

export async function signIn(identifier, password) {
  const email = await resolveEmail(identifier);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user ?? null;
}

export async function createProfile({
  id,
  name,
  email,
  phone,
  nationalId = '',
  walletBalance = 0,
}) {
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .upsert({
      id,
      full_name: name,
      email,
      phone_number: phone,
      national_id: nationalId,
      wallet_balance: walletBalance,
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


