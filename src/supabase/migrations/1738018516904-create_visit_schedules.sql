/* 
# Create Visit Schedules Table
1. New Tables
  - `visit_schedules_2024`
    - `id` (uuid, primary key)
    - `client_name` (text)
    - `contact_number` (text)
    - `address` (text)
    - `fb_messenger` (text)
    - `unit_name` (text)
    - `unit_price` (numeric)
    - `unit_engine` (text)
    - `description` (text)
    - `scheduled_date` (date)
    - `is_completed` (boolean)
    - `created_at` (timestamptz)
2. Security
  - Enable RLS
  - Add policy for staff to manage all entries
*/

CREATE TABLE IF NOT EXISTS visit_schedules_2024 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL DEFAULT '',
  contact_number text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  fb_messenger text DEFAULT '',
  unit_name text NOT NULL DEFAULT '',
  unit_price numeric NOT NULL DEFAULT 0,
  unit_engine text NOT NULL DEFAULT '',
  description text DEFAULT '',
  scheduled_date date NOT NULL,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE visit_schedules_2024 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage visit schedules" 
ON visit_schedules_2024 
FOR ALL TO authenticated 
USING (true) 
WITH CHECK (true);