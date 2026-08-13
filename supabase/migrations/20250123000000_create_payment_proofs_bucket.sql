/*
  # Create storage bucket for payment proofs

  1. Storage Setup
    - Create 'payment-proofs' bucket for storing customer payment screenshots
    - Set bucket to be publicly accessible for reading (so admins can see them)
    - Allow public uploads (so unauthenticated customers can upload)

  2. Security
    - Public insert access (Guest Checkout)
    - Public read access (Admin verification)
*/

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
) ON CONFLICT (id) DO NOTHING;

-- Allow public uploads (Guest Checkout)
DROP POLICY IF EXISTS "Public can upload payment proofs" ON storage.objects;
CREATE POLICY "Public can upload payment proofs"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'payment-proofs');

-- Allow public read access
DROP POLICY IF EXISTS "Public read access for payment proofs" ON storage.objects;
CREATE POLICY "Public read access for payment proofs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'payment-proofs');

-- Allow authenticated users (Admins) to delete/update if needed
DROP POLICY IF EXISTS "Authenticated users can delete payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can delete payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Authenticated users can update payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can update payment proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs');
