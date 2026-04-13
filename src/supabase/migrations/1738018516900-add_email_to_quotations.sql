/* 
# Add Email Column to Quotations
1. Changes
  - Add `customer_email` column to `quotations_20240522` table to store customer contact email.
2. Purpose
  - Allows the system to track where quotations were sent and enables the email feature.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotations_20240522' AND column_name = 'customer_email'
  ) THEN 
    ALTER TABLE quotations_20240522 ADD COLUMN customer_email text NOT NULL DEFAULT '';
  END IF;
END $$;