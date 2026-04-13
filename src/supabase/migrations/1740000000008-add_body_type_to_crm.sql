/* 
# Add Body Type and Engine Schema to CRM
1. Modified Tables
  - `visit_schedules_2024`
2. Changes
  - Added `body_type` column (text)
3. Security
  - Maintains existing RLS policies
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visit_schedules_2024' AND column_name = 'body_type'
  ) THEN 
    ALTER TABLE visit_schedules_2024 ADD COLUMN body_type text DEFAULT '';
  END IF;
END $$;