-- Enable REPLICA IDENTITY FULL on bookings so that Supabase Realtime UPDATE
-- events include all columns in the payload. Without this, only changed columns
-- are sent, which means the worker_id filter on the subscription cannot be
-- evaluated and UPDATE events (e.g. status → deposit_paid) are silently dropped.
ALTER TABLE bookings REPLICA IDENTITY FULL;
