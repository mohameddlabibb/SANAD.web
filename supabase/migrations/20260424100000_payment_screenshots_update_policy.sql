-- Allow authenticated users to overwrite their own payment screenshots (needed for re-payment after rejection)
CREATE POLICY "users_update_payment_screenshots"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'payment-screenshots'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'payment-screenshots'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
