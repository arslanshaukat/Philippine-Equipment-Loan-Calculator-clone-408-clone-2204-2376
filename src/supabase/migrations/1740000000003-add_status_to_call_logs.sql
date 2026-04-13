/* 
# Add Call Status to Daily Logs
1. New Columns
  - `status` (text): Tracks if the call is 'Answered', 'No Answer', or 'To Call'.
2. Purpose
  - Enables priority queueing for Carmelita and Arslan to encode leads for other staff.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_call_logs_2024' AND column_name='status') THEN
    ALTER TABLE daily_call_logs_2024 ADD COLUMN status text DEFAULT 'Answered';
  END IF;
END $$;