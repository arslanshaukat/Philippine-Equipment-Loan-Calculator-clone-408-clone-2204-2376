/* 
# Complete Shipment Manifest System
1. New Tables
  - `shipment_headers_20240218`: Master shipping records (B/L, Vessel, Voyage)
  - `shipment_units_20240218`: Detailed unit records (Chassis, Description, Duties)
2. Security
  - RLS enabled for both tables.
  - Authenticated staff policies for full CRUD access.
3. Data Seeding
  - Populates 5 major shipments with 12 individual units for a "Detailed View".
*/

-- 1. Create Tables
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

-- 2. Security Configuration
ALTER TABLE shipment_headers_20240218 ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_units_20240218 ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage headers') THEN
    CREATE POLICY "Staff manage headers" ON shipment_headers_20240218 FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage units') THEN
    CREATE POLICY "Staff manage units" ON shipment_units_20240218 FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Seed Data Restoration
DELETE FROM shipment_units_20240218;
DELETE FROM shipment_headers_20240218;

-- SHIPMENT 1: SITC NAGOYA
WITH h1 AS (
  INSERT INTO shipment_headers_20240218 (soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid, payment_date)
  VALUES ('2024-02-01', 'SITC2402001', 'SITC NAGOYA', '2405N', 32000, 145.5, 7500000, true, '2024-02-05')
  RETURNING id
)
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
SELECT id, 'CXZ51K-3001234', 'ISUZU GIGA 10W DUMP TRUCK - 6WF1', 2450000, 285000 FROM h1
UNION ALL
SELECT id, 'FV517-5400981', 'FUSO SUPER GREAT TRACTOR - 6D40', 1850000, 195000 FROM h1
UNION ALL
SELECT id, 'NKR81-8822334', 'ISUZU ELF 4W REEFER - 4HL1', 1500000, 120000 FROM h1;

-- SHIPMENT 2: OCEAN NETWORK EXPRESS
WITH h2 AS (
  INSERT INTO shipment_headers_20240218 (soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid)
  VALUES ('2024-02-05', 'ONE-SUB-882', 'ONE MANHATTAN', '092W', 12500, 58.2, 3850000, false)
  RETURNING id
)
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
SELECT id, 'FRR35-7002233', 'ISUZU FORWARD 6W WINGVAN - 6HL1', 2100000, 180000 FROM h2
UNION ALL
SELECT id, 'NKR66-7112233', 'ISUZU ELF 4W DROPSIDE - 4HF1', 1750000, 145000 FROM h2;

-- SHIPMENT 3: MAERSK SEOUL
WITH h3 AS (
  INSERT INTO shipment_headers_20240218 (soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid, payment_date)
  VALUES ('2024-02-08', 'MAEU-9921-X', 'MAERSK SEOUL', '402S', 8500, 32.0, 2950000, true, '2024-02-12')
  RETURNING id
)
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
SELECT id, 'XZU411-0012233', 'HINO DUTRO 4W DUMP - S05D', 1450000, 115000 FROM h3
UNION ALL
SELECT id, 'FE70EB-5200112', 'FUSO CANTER 4W REEFER - 4M51', 1500000, 122000 FROM h3;

-- SHIPMENT 4: TS YOKOHAMA
WITH h4 AS (
  INSERT INTO shipment_headers_20240218 (soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid)
  VALUES ('2024-02-12', 'TSL-SUB-009', 'TS YOKOHAMA', 'V2401', 45000, 188.4, 9200000, false)
  RETURNING id
)
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
SELECT id, 'CYL51V-3001122', 'ISUZU GIGA TRACTOR HEAD - 6WG1', 3200000, 345000 FROM h4
UNION ALL
SELECT id, 'FS54JV-5409988', 'FUSO SUPER GREAT 10W WINGVAN', 2850000, 312000 FROM h4
UNION ALL
SELECT id, 'NPR81-7001199', 'ISUZU ELF 6W WIDE REEFER', 1850000, 165000 FROM h4;

-- SHIPMENT 5: EVERGREEN
WITH h5 AS (
  INSERT INTO shipment_headers_20240218 (soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid, payment_date)
  VALUES ('2024-02-15', 'EGLV2402-11', 'EVER GLORY', '1102-045B', 15200, 64.5, 4100000, true, '2024-02-18')
  RETURNING id
)
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
SELECT id, 'FRR90-7001122', 'ISUZU FORWARD 6W CHASSIS - 4HK1', 1950000, 168000 FROM h5
UNION ALL
SELECT id, 'NKR71-7442233', 'ISUZU ELF 4W HIGH ROOF', 2150000, 185000 FROM h5;