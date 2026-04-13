/* 
# Add Logged By to CRM
1. New Columns
  - `logged_by` (text): Tracks which staff member (Rhea, Mel, or Carmalita) created the entry.
2. Purpose
  - Ensures accountability and identification of who processed each inquiry.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visit_schedules_2024' AND column_name='logged_by') THEN
    ALTER TABLE visit_schedules_2024 ADD COLUMN logged_by text DEFAULT 'RHEA';
  END IF;
END $$;