/* 
# Create Shipments Tracking System
1. New Tables
  - `shipments_2024`
    - `id` (uuid, primary key)
    - `soa_date` (date): Statement of Account date
    - `chassis_no` (text): Unique vehicle identifier
    - `description` (text): Unit details
    - `amount_php` (numeric): Total value
    - `bl_no` (text): Bill of Lading number
    - `vessel_name` (text)
    - `voyage_no` (text)
    - `kgs` (numeric): Weight in Kilograms
    - `cbm` (numeric): Volume in Cubic Meters
    - `duties_taxes` (numeric): Tax amount to be paid
    - `is_paid` (boolean): Payment status
    - `payment_date` (date): Date when duties were settled
    - `created_at` (timestamptz)

2. Security
  - Enable RLS on `shipments_2024`
  - Add policy for authenticated staff to manage shipments
*/

CREATE TABLE IF NOT EXISTS shipments_2024 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soa_date date,
  chassis_no text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount_php numeric DEFAULT 0,
  bl_no text NOT NULL DEFAULT '',
  vessel_name text NOT NULL DEFAULT '',
  voyage_no text NOT NULL DEFAULT '',
  kgs numeric DEFAULT 0,
  cbm numeric DEFAULT 0,
  duties_taxes numeric DEFAULT 0,
  is_paid boolean DEFAULT false,
  payment_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shipments_2024 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage shipments" 
ON shipments_2024 FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);