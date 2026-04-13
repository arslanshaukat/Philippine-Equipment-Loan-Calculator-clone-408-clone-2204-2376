/* 
# Add Remarks to Price List
1. Changes
  - Add `remarks` column to `price_list_2024` table to store extra information about inventory items.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'price_list_2024' AND column_name = 'remarks'
  ) THEN 
    ALTER TABLE price_list_2024 ADD COLUMN remarks text DEFAULT '';
  END IF;
END $$;