-- Fix: users_update_own_requests WITH CHECK didn't include 'accepted', so when
-- accept_bid RPC ran UPDATE bidding_requests SET status = 'accepted', the RLS
-- policy silently suppressed it (0 rows updated), leaving the request stuck as 'open'.

DROP POLICY IF EXISTS "users_update_own_requests" ON bidding_requests;

CREATE POLICY "users_update_own_requests"
  ON bidding_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status IN ('open', 'accepted', 'cancelled'));

-- Restore accept_bid to its clean original form
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
