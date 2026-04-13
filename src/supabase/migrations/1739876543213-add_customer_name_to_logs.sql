/* 
# Add Customer Name to Call Logs
1. Changes
  - Add `customer_name` column to `daily_call_logs_2024` table.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_call_logs_2024' AND column_name = 'customer_name'
  ) THEN 
    ALTER TABLE daily_call_logs_2024 ADD COLUMN customer_name text DEFAULT '';
  END IF;
END $$;