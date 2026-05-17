-- Fix payment approval triggers
-- Problem: on_deposit_approved trigger set deposit_refund_status = 'paid'
--          which violates the check constraint (only 'pending'/'processed' valid).
--          Also fixed handle_payment_success to not double-credit wallet for deposits.

-- 1. Drop the broken on_deposit_approved trigger.
--    The booking status update it attempted is already handled by approveTransaction().
DROP TRIGGER IF EXISTS on_deposit_approved ON transactions;
DROP FUNCTION IF EXISTS handle_deposit_approval();

-- 2. Fix handle_payment_success to only run for wallet top-ups.
--    For booking payments the app code handles wallet crediting;
--    running the trigger too would double-credit the user's balance.
CREATE OR REPLACE FUNCTION handle_payment_success()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    payment_amount NUMERIC;
    v_booking_id   UUID;
BEGIN
    IF (NEW.status = 'approved' AND OLD.status = 'pending') THEN
        SELECT amount, booking_id
          INTO payment_amount, v_booking_id
          FROM invoices
         WHERE id = NEW.invoice_id;

        -- Skip if this is a booking deposit/balance payment
        IF v_booking_id IS NOT NULL THEN
            RETURN NEW;
        END IF;

        -- Credit wallet balance for top-ups
        UPDATE profiles
           SET wallet_balance = wallet_balance + payment_amount
         WHERE id = NEW.user_id;

        -- Record points history for top-up
        IF payment_amount IS NOT NULL THEN
            INSERT INTO points_history (user_id, amount, description)
            VALUES (NEW.user_id, payment_amount::integer, 'Earned from wallet top-up approval');
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
