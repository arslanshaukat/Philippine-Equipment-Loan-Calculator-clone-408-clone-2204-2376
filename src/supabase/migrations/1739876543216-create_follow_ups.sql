/* 
# Create Follow-Ups Tracking System
1. New Tables
  - `follow_ups_2024`
    - `id` (uuid, primary key)
    - `customer_name` (text)
    - `phone_number` (text)
    - `original_reason` (text)
    - `status` (text) - default 'Active'
    - `history` (jsonb) - Array of {date, comment, staff}
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
2. Security
  - Enable RLS
  - Add policy for authenticated staff to manage follow-ups
*/

CREATE TABLE IF NOT EXISTS follow_ups_2024 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone_number text NOT NULL,
  original_reason text,
  status text DEFAULT 'Active',
  history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE follow_ups_2024 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage follow-ups" ON follow_ups_2024
  FOR ALL TO authenticated USING (true) WITH CHECK (true);