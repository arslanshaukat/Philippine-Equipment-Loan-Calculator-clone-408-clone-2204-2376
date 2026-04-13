/* 
# Add Multi-Photo Support to CRM
1. New Columns
  - `attachment_urls` (jsonb): Array of strings to store multiple image URLs.
2. Changes
  - Default value is an empty JSON array `[]`.
3. Security
  - Maintains existing RLS policies.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visit_schedules_2024' AND column_name = 'attachment_urls'
  ) THEN 
    ALTER TABLE visit_schedules_2024 ADD COLUMN attachment_urls jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;