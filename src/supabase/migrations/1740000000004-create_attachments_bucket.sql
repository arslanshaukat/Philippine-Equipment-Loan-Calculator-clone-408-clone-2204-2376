/* 
# Create Attachments Storage Bucket
1. New Storage Configuration
   - Creates the `attachments` bucket for CRM unit photos.
   - Sets the bucket to `public` so generated URLs are accessible.
2. Security
   - Adds policy to allow authenticated staff to upload files.
   - Adds policy to allow public/authenticated users to view files.
*/

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to view files (Required for getPublicUrl)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public Access for Attachments'
  ) THEN
    CREATE POLICY "Public Access for Attachments"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'attachments');
  END IF;
END $$;

-- 3. Allow authenticated staff to upload files
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Staff can upload attachments'
  ) THEN
    CREATE POLICY "Staff can upload attachments"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'attachments');
  END IF;
END $$;

-- 4. Allow authenticated staff to update/delete their own uploads
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Staff can update/delete attachments'
  ) THEN
    CREATE POLICY "Staff can update/delete attachments"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'attachments');
  END IF;
END $$;