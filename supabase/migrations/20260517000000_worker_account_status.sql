ALTER TABLE workers
  ADD COLUMN account_status text NOT NULL DEFAULT 'pending'
    CHECK (account_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN rejection_reason text;

-- Workers that are already visible (not hidden) are considered approved
UPDATE workers SET account_status = 'approved' WHERE is_hidden = false;
