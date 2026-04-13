/* 
  # Fix Campaign Date Schema
  1. Changes
    - Modify `fb_campaigns_2024` table to make `end_date` nullable.
    - This prevents 'invalid input syntax' errors when a campaign doesn't have a specific end date.
*/

DO $$ 
BEGIN 
  ALTER TABLE fb_campaigns_2024 ALTER COLUMN end_date DROP NOT NULL;
END $$;