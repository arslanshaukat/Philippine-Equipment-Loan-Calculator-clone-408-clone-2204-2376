/* 
# Add Representative Column
1. Changes
  - Add `representative` column to `formal_quotations_2024` table to match the new layout requirements.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'formal_quotations_2024' 
    AND column_name = 'representative'
  ) THEN 
    ALTER TABLE formal_quotations_2024 ADD COLUMN representative text NOT NULL DEFAULT '';
  END IF;
END $$;