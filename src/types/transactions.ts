export type TransactionStatus = 'pending' | 'approved' | 'rejected' | string;

export interface Transaction {
  id: string;
  invoice_id: string | null;
  user_id: string;
  payment_method: string | null;
  screenshot_url: string | null;
  status: TransactionStatus;
  created_at: string;
  admin_notes: string | null;
}

export interface NewTransactionPayload {
  invoice_id?: string | null;
  user_id: string;
  payment_method?: string | null;
  screenshot_url?: string | null;
  status?: TransactionStatus;
  admin_notes?: string | null;
}

