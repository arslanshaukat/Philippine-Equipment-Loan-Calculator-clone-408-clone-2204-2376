/* 
# Finalized User Manifest (2026)
1. Cleanup
  - TRUNCATE all tables to remove any generated/dump data.
2. User Records
  - Re-inserts exactly the 5 records entered by the user.
*/

-- 1. CLEAN SLATE
TRUNCATE TABLE shipment_units_20240218 CASCADE;
TRUNCATE TABLE shipment_headers_20240218 CASCADE;

-- 2. RECORD 1: Jan 12, 2026 (PAID)
WITH h1 AS (
  INSERT INTO shipment_headers_20240218 (soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid, payment_date)
  VALUES ('2026-01-12', 'SITC26-0112-PH', 'SITC NAGOYA', '2601N', 38500, 165.2, 8200000, true, '2026-01-15')
  RETURNING id
)
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
SELECT id, 'CXZ51K-5001122', 'ISUZU GIGA 10W DUMP TRUCK - 6WF1-TC', 2850000, 312000 FROM h1
UNION ALL
SELECT id, 'FRR35-7001122', 'ISUZU FORWARD 6W WINGVAN - 6HL1', 2200000, 245000 FROM h1;

-- 3. RECORD 2: Jan 28, 2026 (UNPAID)
WITH h2 AS (
  INSERT INTO shipment_headers_20240218 (soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid)
  VALUES ('2026-01-28', 'ONE-SUB-0988', 'ONE MANHATTAN', '095W', 14200, 62.5, 4150000, false)
  RETURNING id
)
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
SELECT id, 'FV517-7200998', 'FUSO SUPER GREAT TRACTOR HEAD - 6D40', 2150000, 195000 FROM h2
UNION ALL
SELECT id, 'NKR66-8110022', 'ISUZU ELF 4W DROPSIDE - 4HF1-NEW', 1850000, 162000 FROM h2;

-- 4. RECORD 3: Feb 14, 2026 (PAID)
WITH h3 AS (
  INSERT INTO shipment_headers_20240218 (soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid, payment_date)
  VALUES ('2026-02-14', 'MSK-26-408S', 'MAERSK SEOUL', '408S', 22500, 95.8, 5950000, true, '2026-02-18')
  RETURNING id
)
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
SELECT id, 'XZU411-2009911', 'HINO DUTRO 4W DUMP - S05D ENGINE', 2350000, 212000 FROM h3
UNION ALL
SELECT id, 'CYL51V-5001122', 'ISUZU GIGA TRACTOR HEAD - 6WG1-TC', 3450000, 385000 FROM h3;

-- 5. RECORD 4: Feb 25, 2026 (UNPAID)
WITH h4 AS (
  INSERT INTO shipment_headers_20240218 (soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid)
  VALUES ('2026-02-25', 'SITC-OSA-26X', 'SITC OSAKA', '2602N', 9200, 38.5, 2450000, false)
  RETURNING id
)
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
SELECT id, 'FE71EB-6200998', 'FUSO CANTER 4W REEFER - 4M51-TURBO', 2250000, 198000 FROM h4;

-- 6. RECORD 5: Mar 05, 2026 (PAID)
WITH h5 AS (
  INSERT INTO shipment_headers_20240218 (soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid, payment_date)
  VALUES ('2026-03-05', 'EGLV-26-1120', 'EVER GLORY', '1120-04', 12800, 54.2, 3800000, true, '2026-03-10')
  RETURNING id
)
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
SELECT id, 'FRR90-7009911', 'ISUZU FORWARD 6W CHASSIS - 4HK1-TC', 1950000, 165000 FROM h5
UNION ALL
SELECT id, 'NPR81-7008822', 'ISUZU ELF 6W WIDE REEFER - 4HL1', 1750000, 152000 FROM h5;