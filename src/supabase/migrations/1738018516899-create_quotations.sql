/* 
# Create Quotations Tracking System

1. New Tables
  - `quotations_20240522`
    - `id` (uuid, primary key): Unique identifier for each quote
    - `customer_name` (text): Name of the interested customer
    - `contact_number` (text): Customer's phone/mobile number
    - `unit_details` (text): Description of the truck or equipment
    - `equipment_price` (numeric): Total price of the unit
    - `down_payment` (numeric): Initial payment made
    - `interest_rate` (numeric): Monthly interest percentage
    - `lease_term` (integer): Duration in months
    - `monthly_payment` (numeric): Calculated monthly amortization
    - `total_investment` (numeric): Total cost including interest
    - `created_at` (timestamptz): Timestamp of when the quote was generated

2. Security
  - Enable Row Level Security (RLS)
  - Policy: "Allow public to insert" - Anyone using the calculator can save a quote record
  - Policy: "Allow admins to select" - Only authenticated users (admins) can view the records in the dashboard
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

-- Enable RLS
ALTER TABLE quotations_20240522 ENABLE ROW LEVEL SECURITY;

-- Public Policy: Allow any visitor to save their quote
CREATE POLICY "Public can insert quotes" 
ON quotations_20240522 
FOR INSERT 
WITH CHECK (true);

-- Admin Policy: Only logged-in users can see the records
CREATE POLICY "Admins can view all quotes" 
ON quotations_20240522 
FOR SELECT 
TO authenticated 
USING (true);