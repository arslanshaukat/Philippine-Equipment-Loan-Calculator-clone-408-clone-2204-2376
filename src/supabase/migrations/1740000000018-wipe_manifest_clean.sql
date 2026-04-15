/* 
# Final Registry Wipe
1. Purpose
  - Removes the 5 specific records previously managed.
  - Clears all relational unit data.
2. Result
  - A 100% blank Shipment Manifest.
*/

-- Wipe all shipment headers and their associated units automatically
TRUNCATE TABLE shipment_headers_20240218 CASCADE;

-- Ensure RLS is still active
ALTER TABLE shipment_headers_20240218 ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_units_20240218 ENABLE ROW LEVEL SECURITY;