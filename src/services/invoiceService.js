import { supabase } from '../lib/supabaseClient.js';

/**
 * @param {{ booking_id: string, user_id: string, amount: number, payment_type?: 'deposit' | 'balance' }} payload
 */
export async function createInvoice({ booking_id, user_id, amount, payment_type = 'deposit' }) {
  const { data, error } = await supabase
    .from('invoices')
    .insert({ booking_id, user_id, amount, status: 'unpaid', payment_type })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
