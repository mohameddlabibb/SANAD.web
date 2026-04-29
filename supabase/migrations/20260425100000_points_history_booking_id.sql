-- Link points_history rows to their source booking so we can reverse them on cancellation
ALTER TABLE points_history
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_points_history_booking_id ON points_history(booking_id);
