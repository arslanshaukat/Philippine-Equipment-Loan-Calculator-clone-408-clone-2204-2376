/* 
# CRM Attachment Support
1. New Columns
  - `attachment_url` (text): Stores the link to the compressed unit photo or document.
2. Purpose
  - Allows staff to attach unit photos, ID copies, or specification sheets to CRM entries.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visit_schedules_2024' AND column_name='attachment_url') THEN
    ALTER TABLE visit_schedules_2024 ADD COLUMN attachment_url text;
  END IF;
END $$;