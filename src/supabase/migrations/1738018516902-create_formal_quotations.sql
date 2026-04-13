/* 
# Create Formal Quotations Table
1. New Tables
  - `formal_quotations_2024`
    - `id` (uuid, primary key)
    - `date` (date)
    - `customer_name` (text)
    - `address` (text)
    - `contact_number` (text)
    - `maker` (text)
    - `body_type` (text)
    - `engine_model` (text)
    - `remarks` (text)
    - `price` (numeric)
    - `created_at` (timestamptz)
2. Security
  - Enable RLS
  - Add policy for authenticated users (Staff) to perform all CRUD operations
*/

CREATE TABLE IF NOT EXISTS formal_quotations_2024 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  customer_name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  contact_number text NOT NULL DEFAULT '',
  maker text NOT NULL DEFAULT '',
  body_type text NOT NULL DEFAULT '',
  engine_model text NOT NULL DEFAULT '',
  remarks text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE formal_quotations_2024 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage formal quotations" 
  ON formal_quotations_2024 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);