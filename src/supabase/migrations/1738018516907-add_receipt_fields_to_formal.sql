/* 
# Add Receipt Fields to Formal Quotations
1. Changes
  - Add `plate_no` column for vehicle identification.
  - Add `terms_conditions` column for delivery agreements.
  - Add `officer_name` and `officer_designation` for official signatures.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'formal_quotations_2024' AND column_name = 'plate_no') THEN 
    ALTER TABLE formal_quotations_2024 ADD COLUMN plate_no text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'formal_quotations_2024' AND column_name = 'terms_conditions') THEN 
    ALTER TABLE formal_quotations_2024 ADD COLUMN terms_conditions text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'formal_quotations_2024' AND column_name = 'officer_name') THEN 
    ALTER TABLE formal_quotations_2024 ADD COLUMN officer_name text DEFAULT 'MS. RHEA';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'formal_quotations_2024' AND column_name = 'officer_designation') THEN 
    ALTER TABLE formal_quotations_2024 ADD COLUMN officer_designation text DEFAULT 'Sales Manager';
  END IF;
END $$;