/* 
# Refine Shipment Schema
1. Changes
  - Add `amount_php` to `shipment_headers_20240218` (Total shipment value).
2. Purpose
  - Moves the financial total to the header level as requested.
  - Keeps individual unit tracking for Chassis and Duties.
*/

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipment_headers_20240218' 
        AND column_name = 'amount_php'
    ) THEN 
        ALTER TABLE shipment_headers_20240218 ADD COLUMN amount_php numeric DEFAULT 0;
    END IF;
END $$;