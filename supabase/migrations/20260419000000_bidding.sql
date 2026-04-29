-- supabase/migrations/20260419000000_bidding.sql

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE bidding_requests (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type   text        NOT NULL,
  title          text        NOT NULL,
  description    text        NOT NULL,
  booking_date   date        NOT NULL,
  start_time     time        NOT NULL,
  duration_hours numeric     NOT NULL,
  address        text        NOT NULL,
  status         text        NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open', 'accepted', 'cancelled')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bids (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     uuid        NOT NULL REFERENCES bidding_requests(id) ON DELETE CASCADE,
  worker_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proposed_price numeric     NOT NULL,
  message        text,
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, worker_id)
);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE bidding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids             ENABLE ROW LEVEL SECURITY;

-- Users: read & manage their own requests
CREATE POLICY "users_select_own_requests"
  ON bidding_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_requests"
  ON bidding_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_requests"
  ON bidding_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status IN ('open', 'cancelled'));

-- Workers: read open requests (any service type)
CREATE POLICY "workers_select_open_requests"
  ON bidding_requests FOR SELECT
  USING (status = 'open');

-- Bids: workers manage their own bids
CREATE POLICY "workers_insert_bids"
  ON bids FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "workers_select_own_bids"
  ON bids FOR SELECT
  USING (auth.uid() = worker_id);

-- Users: read bids on their own requests
CREATE POLICY "users_select_bids_on_own_requests"
  ON bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bidding_requests
      WHERE id = request_id AND user_id = auth.uid()
    )
  );

-- Users/system: update bids on their own requests (for reject-on-cancel)
CREATE POLICY "users_update_bids_on_own_requests"
  ON bids FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bidding_requests
      WHERE id = request_id AND user_id = auth.uid()
    )
  );

-- ── RPC: accept_bid (atomic: accept + reject others + create booking) ─────────
-- Security fixes applied:
--   1. Ownership check: only the request owner can accept a bid
--   2. Concurrency lock: FOR UPDATE on request row prevents duplicate bookings
--   3. Correct INSERT order: UPDATEs first, then INSERT (no orphaned bookings)
--   4. search_path: hardened against search_path hijacking

CREATE OR REPLACE FUNCTION accept_bid(p_bid_id uuid, p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_bid     bids%ROWTYPE;
  v_req     bidding_requests%ROWTYPE;
  v_book_id uuid;
BEGIN
  -- Lock the request row to prevent concurrent accepts
  SELECT * INTO v_req FROM bidding_requests WHERE id = p_request_id FOR UPDATE;
  SELECT * INTO v_bid FROM bids WHERE id = p_bid_id;

  IF v_bid.id IS NULL THEN
    RAISE EXCEPTION 'bid % not found', p_bid_id;
  END IF;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'bidding_request % not found', p_request_id;
  END IF;
  IF v_bid.request_id != p_request_id THEN
    RAISE EXCEPTION 'bid % does not belong to request %', p_bid_id, p_request_id;
  END IF;
  IF v_req.user_id != auth.uid() THEN
    RAISE EXCEPTION 'only the request owner can accept a bid';
  END IF;
  IF v_req.status != 'open' THEN
    RAISE EXCEPTION 'request % is no longer open', p_request_id;
  END IF;

  -- Update statuses first, then create booking
  UPDATE bids SET status = 'accepted' WHERE id = p_bid_id;
  UPDATE bids SET status = 'rejected' WHERE request_id = p_request_id AND id != p_bid_id;
  UPDATE bidding_requests SET status = 'accepted' WHERE id = p_request_id;

  INSERT INTO bookings (
    user_id, worker_id, booking_date, start_time,
    duration_hours, total_price, status, booking_type, address, management_fee
  ) VALUES (
    v_req.user_id, v_bid.worker_id, v_req.booking_date, v_req.start_time,
    v_req.duration_hours, v_bid.proposed_price, 'pending', 'hour', v_req.address, 50
  )
  RETURNING id INTO v_book_id;

  RETURN v_book_id;
END;
$$;
