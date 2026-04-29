-- ============================================================
-- Migration: 20260422000000_feature_batch.sql
-- Description: Feature batch — service type rename, overnight
--              bookings, worker docs, user coupons
-- ============================================================

-- ============================================================
-- 1. Rename nanny → maid in workers.service_type CHECK
-- ============================================================

-- Drop old constraint (name may vary — cover both)
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_service_type_check;
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_service_type_check1;

-- Update existing nanny rows to maid
UPDATE workers SET service_type = 'maid' WHERE service_type = 'nanny';

-- Re-add constraint with 'maid' replacing 'nanny'
ALTER TABLE workers
  ADD CONSTRAINT workers_service_type_check
  CHECK (service_type IN ('chef', 'driver', 'babysitter', 'maid', 'caregiver'));

-- ============================================================
-- 2. Add overnight_available boolean column to workers
-- ============================================================

ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS overnight_available boolean NOT NULL DEFAULT false;

-- ============================================================
-- 3. Update bookings.booking_type CHECK to include 'day' and 'emergency'
-- ============================================================

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_type_check;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_type_check1;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_booking_type_check
  CHECK (booking_type IN ('hour', 'package', 'day', 'emergency'));

-- ============================================================
-- 4. Add booking_extra_details jsonb column to bookings
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_extra_details jsonb;

-- ============================================================
-- 5. Add license columns to workers IF NOT EXISTS
--    (these may already exist in the live DB)
-- ============================================================

ALTER TABLE workers ADD COLUMN IF NOT EXISTS license_number        text;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS license_expiry        date;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS license_categories    text[];
ALTER TABLE workers ADD COLUMN IF NOT EXISTS national_id_verified  boolean NOT NULL DEFAULT false;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS license_verified      boolean NOT NULL DEFAULT false;

-- ============================================================
-- 6. Create worker_documents table IF NOT EXISTS
-- ============================================================

CREATE TABLE IF NOT EXISTS worker_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id     uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('national_id', 'driving_license')),
  front_url     text NOT NULL,
  back_url      text,
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  verified      boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE worker_documents ENABLE ROW LEVEL SECURITY;

-- Workers can SELECT their own documents
DROP POLICY IF EXISTS "worker_documents_select_own" ON worker_documents;
CREATE POLICY "worker_documents_select_own"
  ON worker_documents FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

-- Workers can INSERT their own documents
DROP POLICY IF EXISTS "worker_documents_insert_own" ON worker_documents;
CREATE POLICY "worker_documents_insert_own"
  ON worker_documents FOR INSERT
  TO authenticated
  WITH CHECK (worker_id = auth.uid());

-- Workers can UPDATE their own documents
DROP POLICY IF EXISTS "worker_documents_update_own" ON worker_documents;
CREATE POLICY "worker_documents_update_own"
  ON worker_documents FOR UPDATE
  TO authenticated
  USING (worker_id = auth.uid())
  WITH CHECK (worker_id = auth.uid());

-- Admins can manage ALL documents
DROP POLICY IF EXISTS "worker_documents_admin_all" ON worker_documents;
CREATE POLICY "worker_documents_admin_all"
  ON worker_documents FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- 7. Create user_coupons table
-- ============================================================

CREATE TABLE IF NOT EXISTS user_coupons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  discount_percent    int NOT NULL DEFAULT 10,
  points_spent        int NOT NULL DEFAULT 2500,
  is_used             boolean NOT NULL DEFAULT false,
  used_at             timestamptz,
  used_on_booking_id  uuid REFERENCES bookings(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_used_consistency CHECK (
    (is_used = false AND used_at IS NULL) OR
    (is_used = true  AND used_at IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

-- Users can SELECT their own coupons
DROP POLICY IF EXISTS "user_coupons_select_own" ON user_coupons;
CREATE POLICY "user_coupons_select_own"
  ON user_coupons FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can INSERT their own coupons (redeeming points)
DROP POLICY IF EXISTS "user_coupons_insert_own" ON user_coupons;
CREATE POLICY "user_coupons_insert_own"
  ON user_coupons FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can only "claim" their own coupon (unclaimed → claimed with timestamp)
DROP POLICY IF EXISTS "user_coupons_update_own" ON user_coupons;
CREATE POLICY "user_coupons_update_own"
  ON user_coupons FOR UPDATE
  TO authenticated
  USING  (user_id = auth.uid() AND is_used = false)
  WITH CHECK (user_id = auth.uid() AND is_used = true AND used_at IS NOT NULL);

-- Admins can manage ALL coupons
DROP POLICY IF EXISTS "user_coupons_admin_all" ON user_coupons;
CREATE POLICY "user_coupons_admin_all"
  ON user_coupons FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Indexes for new FK columns
CREATE INDEX IF NOT EXISTS idx_worker_documents_worker_id ON worker_documents(worker_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id       ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_booking_id    ON user_coupons(used_on_booking_id);
