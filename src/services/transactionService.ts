import { supabase } from '../lib/supabaseClient.js';
import type { NewTransactionPayload, Transaction, TransactionStatus } from '../types/transactions';

const TRANSACTIONS_TABLE = 'transactions';

export async function createTransaction(payload: NewTransactionPayload): Promise<Transaction> {
  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Transaction;
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Transaction[];
}

export async function updateTransactionStatus(
  id: string,
  status: TransactionStatus,
  adminNotes?: string | null
): Promise<Transaction> {
  const updatePayload: Partial<Pick<Transaction, 'status' | 'admin_notes'>> = {
    status,
  };

  if (adminNotes !== undefined) {
    updatePayload.admin_notes = adminNotes;
  }

  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Transaction;
}

