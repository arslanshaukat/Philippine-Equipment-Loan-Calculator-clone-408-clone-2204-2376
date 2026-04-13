/* 
# Create Price List Table
1. New Tables
  - `price_list_2024`
    - `id` (uuid, primary key)
    - `key_no` (text)
    - `type` (text)
    - `make` (text)
    - `model_engine` (text)
    - `colour` (text)
    - `body` (text)
    - `price` (numeric)
    - `sale_price` (numeric)
    - `created_at` (timestamptz)
2. Security
  - Enable RLS
  - Add policy for authenticated staff to manage list
*/

CREATE TABLE IF NOT EXISTS price_list_2024 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_no text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT '',
  make text NOT NULL DEFAULT '',
  model_engine text NOT NULL DEFAULT '',
  colour text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE price_list_2024 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage price list" 
  ON price_list_2024 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);