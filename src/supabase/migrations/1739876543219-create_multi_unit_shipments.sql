/* 
# Upgrade Shipments to Multi-Unit Structure
1. New Tables
  - `shipment_headers_20240218` (Main shipment info)
    - `id` (uuid, primary key)
    - `soa_date` (date)
    - `bl_no` (text)
    - `vessel_name` (text)
    - `voyage_no` (text)
    - `kgs` (numeric)
    - `cbm` (numeric)
    - `is_paid` (boolean)
    - `payment_date` (date)
    - `created_at` (timestamptz)

  - `shipment_units_20240218` (Individual units per shipment)
    - `id` (uuid, primary key)
    - `shipment_id` (uuid, foreign key)
    - `chassis_no` (text)
    - `description` (text)
    - `amount_php` (numeric)
    - `duties_taxes` (numeric)

2. Security
  - Enable RLS on both tables
  - Add policies for authenticated staff
*/

-- Header Table
CREATE TABLE IF NOT EXISTS shipment_headers_20240218 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soa_date date NOT NULL,
  bl_no text NOT NULL DEFAULT '',
  vessel_name text NOT NULL DEFAULT '',
  voyage_no text NOT NULL DEFAULT '',
  kgs numeric DEFAULT 0,
  cbm numeric DEFAULT 0,
  is_paid boolean DEFAULT false,
  payment_date date,
  created_at timestamptz DEFAULT now()
);

-- Units Table
CREATE TABLE IF NOT EXISTS shipment_units_20240218 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipment_headers_20240218(id) ON DELETE CASCADE,
  chassis_no text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount_php numeric DEFAULT 0,
  duties_taxes numeric DEFAULT 0
);

-- Enable RLS
ALTER TABLE shipment_headers_20240218 ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_units_20240218 ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff manage headers" ON shipment_headers_20240218 FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Staff manage units" ON shipment_units_20240218 FOR ALL TO authenticated USING (true) WITH CHECK (true);