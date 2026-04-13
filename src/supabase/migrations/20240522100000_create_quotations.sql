/* 
# Create Quotations Tracking System
1. New Tables
  - `quotations_20240522`
    - `id` (uuid, primary key)
    - `customer_name` (text)
    - `contact_number` (text)
    - `unit_details` (text)
    - `equipment_price` (numeric)
    - `down_payment` (numeric)
    - `interest_rate` (numeric)
    - `lease_term` (integer)
    - `monthly_payment` (numeric)
    - `total_investment` (numeric)
    - `created_at` (timestamp with time zone)
2. Security
  - Enable RLS on `quotations_20240522`
  - Policy: "Allow public to insert quotations" (for the public tool)
  - Policy: "Allow authenticated admins to read all quotations" (for the dashboard)
*/

CREATE TABLE IF NOT EXISTS quotations_20240522 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL DEFAULT '',
  contact_number text NOT NULL DEFAULT '',
  unit_details text NOT NULL DEFAULT '',
  equipment_price numeric NOT NULL DEFAULT 0,
  down_payment numeric NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 0,
  lease_term integer NOT NULL DEFAULT 0,
  monthly_payment numeric NOT NULL DEFAULT 0,
  total_investment numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quotations_20240522 ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit a quotation (Public Tool)
CREATE POLICY "Enable insert for everyone" 
ON quotations_20240522 FOR INSERT 
WITH CHECK (true);

-- Only authenticated users (Admins) can view the data
CREATE POLICY "Enable read for authenticated users only" 
ON quotations_20240522 FOR SELECT 
TO authenticated 
USING (true);