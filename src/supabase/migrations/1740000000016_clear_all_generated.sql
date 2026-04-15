/* 
# Final Cleanup: Remove All Generated Shipments
1. Purpose
  - Completely wipes the Shipment Header and Unit tables.
  - Removes all "SITC", "ONE", "MAERSK", and "EVERGREEN" placeholders.
2. Result
  - An empty registry ready for the user's 5 actual records.
*/

-- Wipe all shipment data
TRUNCATE TABLE shipment_units_20240218 CASCADE;
TRUNCATE TABLE shipment_headers_20240218 CASCADE;

-- Ensure RLS is still active for security
ALTER TABLE shipment_headers_20240218 ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_units_20240218 ENABLE ROW LEVEL SECURITY;