/* 
# Shipment Manifest Cleanup
1. Purpose
  - Removes all "dump data" (SITC NAGOYA, ONE MANHATTAN, etc.) to allow for a clean user-only manifest.
  - Ensures schema is ready for manual entry.
*/

-- Clear all existing records so only user-entered data remains
TRUNCATE TABLE shipment_units_20240218 CASCADE;
TRUNCATE TABLE shipment_headers_20240218 CASCADE;

-- Ensure RLS is active
ALTER TABLE shipment_headers_20240218 ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_units_20240218 ENABLE ROW LEVEL SECURITY;