/* 
# Master-Detail Shipment Seeding
1. Purpose
  - Fills the relational shipment tables with comprehensive historical data.
  - Groups multiple units under single B/L entries for the "Detailed View".
2. Tables Affected
  - `shipment_headers_20240218`
  - `shipment_units_20240218`
*/

-- Clear existing to prevent duplicates if re-run
DELETE FROM shipment_units_20240218;
DELETE FROM shipment_headers_20240218;

-- Insert Headers
WITH ins_headers AS (
  INSERT INTO shipment_headers_20240218 (id, soa_date, bl_no, vessel_name, voyage_no, kgs, cbm, amount_php, is_paid, payment_date)
  VALUES 
    ('11111111-1111-1111-1111-111111111111', '2024-02-10', 'SITC2402001', 'SITC NAGOYA', '2405N', 25000, 120.5, 5800000, true, '2024-02-15'),
    ('22222222-2222-2222-2222-222222222222', '2024-02-12', 'ONE-SUB-992', 'OCEAN NETWORK EXPRESS', '088W', 18500, 85.2, 4200000, false, NULL),
    ('33333333-3333-3333-3333-333333333333', '2024-02-14', 'MAEU-7721-A', 'MAERSK SEOUL', '402S', 12000, 45.0, 2950000, true, '2024-02-18')
  RETURNING id, bl_no
)
-- Insert Units for SITC Shipment
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'CXZ51K-3001234', 'ISUZU GIGA 10W DUMP TRUCK', 2450000, 285000),
  ('11111111-1111-1111-1111-111111111112', 'FV517-5400981', 'FUSO SUPER GREAT TRACTOR', 1850000, 195000),
  ('11111111-1111-1111-1111-111111111113', 'NKR81-8822334', 'ISUZU ELF 4W REEFER', 1500000, 120000);

-- Insert Units for ONE Shipment
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'FRR35-7002233', 'ISUZU FORWARD 6W WINGVAN', 2100000, 180000),
  ('22222222-2222-2222-2222-222222222223', 'NKR66-7112233', 'ISUZU ELF 4W DROPSIDE', 2100000, 180000);

-- Insert Units for MAERSK Shipment
INSERT INTO shipment_units_20240218 (shipment_id, chassis_no, description, amount_php, duties_taxes)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'XZU411-0012233', 'HINO DUTRO 4W DUMP', 2950000, 310000);