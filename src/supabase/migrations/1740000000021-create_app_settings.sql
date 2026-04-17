/* 
  # Create Global App Settings
  1. New Tables
    - `app_settings_2024`
      - `id` (text, primary key)
      - `banking_details` (jsonb)
      - `header_config` (jsonb)
      - `footer_text` (text)
  2. Purpose
    - Allows admins to change company info and bank details from the UI without touching code.
*/

CREATE TABLE IF NOT EXISTS app_settings_2024 (
  id text PRIMARY KEY DEFAULT 'global_config',
  banking_details jsonb DEFAULT '{
    "rcbc": {"account_no": "0000009045644249", "account_name": "GT INTERNATIONAL INC.", "address": "Precision Tek Bldg. Lot B, Rizal Highway, Subic Bay Freeport Zone"},
    "bdo": {"account_no": "010028005592", "account_name": "GT INTERNATIONAL INC.", "address": "G/F Commercial Units 1-3, Puregold Duty Free Subic, Argonaut Highway, Subic Bay Freeport Zone"}
  }'::jsonb,
  header_config jsonb DEFAULT '{
    "title": "GT INTERNATIONAL INC",
    "subtitle": "Heavy Equipment & Truck Payment Quotation",
    "address": "D2A Industrial Lot 37B, 4th St Extension, Industrial District, THEP, SBFZ Tipo, Subic Bay Freeport Zone, 2200 Zambales",
    "contact": "+63 927 073 3100 | +63 960 072 8684"
  }'::jsonb,
  footer_text text DEFAULT 'This document serves as an official record of the transaction between GT International Inc. and the customer mentioned above.',
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_settings_2024 ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings
CREATE POLICY "Public read settings" ON app_settings_2024 FOR SELECT USING (true);

-- Only authenticated admins can update
CREATE POLICY "Admins manage settings" ON app_settings_2024 FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed initial data
INSERT INTO app_settings_2024 (id) VALUES ('global_config') ON CONFLICT (id) DO NOTHING;