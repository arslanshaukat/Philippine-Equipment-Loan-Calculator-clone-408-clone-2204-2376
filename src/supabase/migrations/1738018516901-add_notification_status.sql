/* 
# Add Notification and Email Tracking
1. Changes
  - Add `is_emailed` (boolean) to track if the quotation was sent to the customer.
  - Add `is_read` (boolean) to track if the admin has viewed the lead.
2. Purpose
  - Enables the notification system in the Admin Dashboard.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations_20240522' AND column_name = 'is_emailed'
  ) THEN 
    ALTER TABLE quotations_20240522 ADD COLUMN is_emailed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations_20240522' AND column_name = 'is_read'
  ) THEN 
    ALTER TABLE quotations_20240522 ADD COLUMN is_read boolean DEFAULT false;
  END IF;
END $$;