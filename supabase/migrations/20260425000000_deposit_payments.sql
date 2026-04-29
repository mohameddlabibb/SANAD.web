-- ============================================================
-- Migration: 20260425000000_deposit_payments.sql
-- Description: Two-stage deposit-based payment system
--   - invoices.payment_type: 'deposit' | 'balance'
--   - bookings.deposit_refund_status: tracks cancelled-with-deposit refunds
-- ============================================================

-- 1. Add payment_type to invoices
--    Default 'deposit' so existing invoices are treated as deposit-type
--    (they were single full payments, but 'deposit' is harmless for display)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'deposit'
  CHECK (payment_type IN ('deposit', 'balance'));

-- 2. Add deposit_refund_status to bookings
--    Set to 'pending' when a booking is cancelled after deposit was paid.
--    Admin sets to 'processed' once the physical refund is done.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS deposit_refund_status text
  CHECK (deposit_refund_status IN ('pending', 'processed'));

-- Index for fast admin refund queue lookup
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_refund_status
  ON bookings (deposit_refund_status)
  WHERE deposit_refund_status IS NOT NULL;
