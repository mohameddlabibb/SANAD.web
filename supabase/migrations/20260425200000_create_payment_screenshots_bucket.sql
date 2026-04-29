-- Create the payment-screenshots storage bucket (public so admin can view via URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own screenshots
CREATE POLICY "users_insert_payment_screenshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-screenshots'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Allow public read access so admins (and the View link) can see screenshots
CREATE POLICY "public_read_payment_screenshots"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'payment-screenshots');
