/* 
# Seed Shipment Manifest Data
1. Purpose
  - Populates the `shipments_2024` table with initial historical records.
  - Ensures the "last version" of the Shipment Manifest has visible data.
2. Data Included
  - Multiple chassis entries with diverse vessel info, weights, and payment statuses.
*/

INSERT INTO shipments_2024 (
  soa_date, 
  chassis_no, 
  description, 
  amount_php, 
  bl_no, 
  vessel_name, 
  voyage_no, 
  kgs, 
  cbm, 
  duties_taxes, 
  is_paid, 
  payment_date
) VALUES 
(
  '2024-02-15', 
  'CXZ51K-3001234', 
  'ISUZU GIGA 10W DUMP TRUCK - 6WF1', 
  2450000, 
  'SITC2402001', 
  'SITC NAGOYA', 
  '2405N', 
  9800, 
  45.5, 
  285000, 
  true, 
  '2024-02-18'
),
(
  '2024-02-16', 
  'FV517-5400981', 
  'FUSO SUPER GREAT TRACTOR HEAD - 6D40', 
  1850000, 
  'ONE-TYO-992', 
  'OCEAN NETWORK EXPRESS', 
  '088W', 
  7200, 
  32.2, 
  195000, 
  false, 
  NULL
),
(
  '2024-02-18', 
  'FRR35-7002233', 
  'ISUZU FORWARD 6W WINGVAN - 6HL1', 
  1350000, 
  'MAEU-SUB-112', 
  'MAERSK SEOUL', 
  '402S', 
  5400, 
  28.8, 
  142000, 
  true, 
  '2024-02-20'
),
(
  '2024-02-20', 
  'NKR81-8822334', 
  'ISUZU ELF 4W REEFER - 4HL1', 
  950000, 
  'TSL-2024-009', 
  'TS YOKOHAMA', 
  'V2401', 
  3800, 
  18.5, 
  98000, 
  false, 
  NULL
);