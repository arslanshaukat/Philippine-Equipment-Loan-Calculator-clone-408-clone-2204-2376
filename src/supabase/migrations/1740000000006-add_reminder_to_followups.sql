/* 
# Add Reminder Support to Follow-Ups
1. New Columns
  - `next_follow_up` (date): Stores the next scheduled interaction date for quick sorting and badging.
2. Changes
  - The `history` JSONB array will now also store `reminder_date` per entry.
3. Purpose
  - Allows staff to see at a glance who needs to be called or visited today.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'follow_ups_2024' AND column_name = 'next_follow_up'
  ) THEN 
    ALTER TABLE follow_ups_2024 ADD COLUMN next_follow_up date;
  END IF;
END $$;