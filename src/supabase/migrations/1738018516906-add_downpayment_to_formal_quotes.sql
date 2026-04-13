/* 
# Add Down Payment to Formal Quotations
1. Changes
  - Add `down_payment` column to `formal_quotations_2024` table.
2. Purpose
  - To allow staff to record initial payments and show the remaining balance on formal quotations.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'formal_quotations_2024' AND column_name = 'down_payment'
  ) THEN 
    ALTER TABLE formal_quotations_2024 ADD COLUMN down_payment numeric DEFAULT 0;
  END IF;
END $$;