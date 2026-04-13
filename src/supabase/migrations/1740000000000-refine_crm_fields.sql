/* 
# Refine CRM/Lead Schema for Unit Database
1. New Columns
  - `make` (text): Brand of the unit (e.g., ISUZU)
  - `model` (text): Specific model (e.g., GIGA)
2. Changes
  - Ensures all CRM records track brand and model separately for the price database.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visit_schedules_2024' AND column_name='make') THEN
    ALTER TABLE visit_schedules_2024 ADD COLUMN make text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visit_schedules_2024' AND column_name='model') THEN
    ALTER TABLE visit_schedules_2024 ADD COLUMN model text DEFAULT '';
  END IF;
END $$;