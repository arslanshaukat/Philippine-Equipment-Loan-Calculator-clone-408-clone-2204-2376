/* 
# 2026 Shipment Registry Restoration
1. Purpose
  - Updates the shipment manifest to the 2026 operational year.
  - Ensures relational integrity between headers and units.
2. Tables
  - `shipment_headers_20240218` (Master)
  - `shipment_units_20240218` (Detail)
*/

-- Ensure tables exist with correct columns
CREATE TABLE IF NOT EXISTS shipment_headers_20240218 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soa_date date NOT NULL,
  bl_no text NOT NULL DEFAULT '',
  vessel_name text NOT NULL DEFAULT '',
  voyage_no text NOT NULL DEFAULT '',
  kgs numeric DEFAULT 0,
  cbm numeric DEFAULT 0,
  amount_php numeric DEFAULT 0,
  is_paid boolean DEFAULT false,
  payment_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipment_units_20240218 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES shipment_headers_20240218(id) ON DELETE CASCADE,
  chassis_no text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount_php numeric DEFAULT 0,
  duties_taxes numeric DEFAULT 0
);

-- Clear existing data to avoid confusion with mismatched years
DELETE FROM shipment_units_20240218;
DELETE FROM shipment_headers_20240218;

-- Insert 2026 Records
WITH h1 AS (
  INSERT INTO shipment_headers_20240218 (soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid, payment_date)
  VALUES ('2026-01-15', 'SITC26-001-NAG', 'SITC NAGOYA', '2601N', 42000, 195.5, 9500000, true, '2026-01-20')
  RETURNING id
)
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
SELECT id, 'CXZ51K-5009988', 'ISUZU GIGA 10W DUMP TRUCK - 6WF1-TC', 3200000, 385000 FROM h1
UNION ALL
SELECT id, 'FV517-7200112', 'FUSO SUPER GREAT TRACTOR - 6D40-TURBO', 2850000, 312000 FROM h1;

WITH h2 AS (
  INSERT INTO shipment_headers_20240218 (soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid)
  VALUES ('2026-02-10', 'ONE-SUB-26-X', 'ONE MANHATTAN', '2602W', 18500, 88.2, 5200000, false)
  RETURNING id
)
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
SELECT id, 'FRR35-9002233', 'ISUZU FORWARD 6W WINGVAN - 6HL1', 2600000, 245000 FROM h2
UNION ALL
SELECT id, 'NKR66-8112233', 'ISUZU ELF 4W DROPSIDE - 4HF1-NEW', 2600000, 245000 FROM h2;

WITH h3 AS (
  INSERT INTO shipment_headers_20240218 (soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid, payment_date)
  VALUES ('2026-03-05', 'MSK-26-9921', 'MAERSK SEOUL', '405S', 12500, 48.0, 4150000, true, '2026-03-10')
  RETURNING id
)
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
SELECT id, 'XZU411-2001122', 'HINO DUTRO 4W DUMP - S05D ENGINE', 2150000, 185000 FROM h3
UNION ALL
SELECT id, 'FE71EB-6200112', 'FUSO CANTER 4W REEFER - 4M51-TURBO', 2000000, 165000 FROM h3;

-- Enable RLS (Safety Check)
ALTER TABLE shipment_headers_20240218 ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_units_20240218 ENABLE ROW LEVEL SECURITY;