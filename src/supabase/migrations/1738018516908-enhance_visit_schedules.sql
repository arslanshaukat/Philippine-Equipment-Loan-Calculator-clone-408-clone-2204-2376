/* 
# Enhance Visit Schedules with Call Logs and Status
1. New Columns
  - `status`: Tracks lead state ('Interested', 'Not Interested', 'Bought Another Unit', 'Pending')
  - `call_logs`: JSONB array to store history of comments and interactions
  - `offered_price`: Numeric field for personalized pricing
2. Changes
  - Default status is 'Pending'
  - call_logs initialized as empty array
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visit_schedules_2024' AND column_name = 'status') THEN 
    ALTER TABLE visit_schedules_2024 ADD COLUMN status text DEFAULT 'Pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visit_schedules_2024' AND column_name = 'call_logs') THEN 
    ALTER TABLE visit_schedules_2024 ADD COLUMN call_logs jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visit_schedules_2024' AND column_name = 'offered_price') THEN 
    ALTER TABLE visit_schedules_2024 ADD COLUMN offered_price numeric DEFAULT 0;
  END IF;
END $$;