/* 
  # Update Banking Details to Dynamic Array
  1. Changes
    - Converts the fixed `banking_details` object into a flexible JSONB array.
    - Ensures each bank object includes an `is_visible` flag.
  2. Tables
    - `app_settings_2024`
*/

-- Update the default value for the table
ALTER TABLE app_settings_2024 
ALTER COLUMN banking_details SET DEFAULT '[
  {
    "id": "bank_1",
    "bank_name": "RCBC",
    "account_no": "0000009045644249",
    "account_name": "GT INTERNATIONAL INC.",
    "address": "Precision Tek Bldg. Lot B, Rizal Highway, Subic Bay Freeport Zone",
    "is_visible": true
  },
  {
    "id": "bank_2",
    "bank_name": "BDO",
    "account_no": "010028005592",
    "account_name": "GT INTERNATIONAL INC.",
    "address": "G/F Commercial Units 1-3, Puregold Duty Free Subic, Argonaut Highway, Subic Bay Freeport Zone",
    "is_visible": true
  }
]'::jsonb;

-- Migrate existing data if necessary (resetting to array format for compatibility)
UPDATE app_settings_2024 
SET banking_details = '[
  {
    "id": "bank_1",
    "bank_name": "RCBC",
    "account_no": "0000009045644249",
    "account_name": "GT INTERNATIONAL INC.",
    "address": "Precision Tek Bldg. Lot B, Rizal Highway, Subic Bay Freeport Zone",
    "is_visible": true
  },
  {
    "id": "bank_2",
    "bank_name": "BDO",
    "account_no": "010028005592",
    "account_name": "GT INTERNATIONAL INC.",
    "address": "G/F Commercial Units 1-3, Puregold Duty Free Subic, Argonaut Highway, Subic Bay Freeport Zone",
    "is_visible": true
  }
]'::jsonb
WHERE id = 'global_config';