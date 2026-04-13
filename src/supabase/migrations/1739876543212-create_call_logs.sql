/* 
# Create Daily Call Logs Table
1. New Tables
  - `daily_call_logs_2024`
    - `id` (uuid, primary key)
    - `staff_name` (text): Name of the staff who made the call
    - `phone_number` (text): The number dialed
    - `reason` (text): Reason for the call (e.g., Follow-up, New Lead)
    - `is_answered` (boolean): Whether the call was picked up
    - `comment` (text): Discussion details if answered
    - `created_at` (timestamptz): Timestamp of the call
2. Security
  - Enable RLS
  - Policy for staff to manage all entries
*/

CREATE TABLE IF NOT EXISTS daily_call_logs_2024 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name text NOT NULL,
  phone_number text NOT NULL,
  reason text NOT NULL,
  is_answered boolean DEFAULT false,
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_call_logs_2024 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage call logs" 
ON daily_call_logs_2024 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);