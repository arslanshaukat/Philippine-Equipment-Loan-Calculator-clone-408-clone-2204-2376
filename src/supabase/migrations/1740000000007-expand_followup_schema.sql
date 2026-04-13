/* 
# Expand CRM Capabilities
1. New Columns
  - `temperature` (text): 'Hot', 'Warm', 'Cold' for lead scoring.
  - `lead_type` (text): 'Inquiry', 'Prospect', 'Client' for clear differentiation.
  - `lead_source` (text): 'Facebook', 'Walk-in', 'Referral', 'Website'.
  - `rating` (integer): 1-5 star quality rating.
  - `last_contacted_at` (timestamptz): Auto-updated on every remark.
  - `next_action_type` (text): 'Call', 'Visit', 'Document', 'Payment'.
2. Purpose
  - Allows staff to prioritize "Hot Prospects" over general "Inquiries".
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follow_ups_2024' AND column_name = 'temperature') THEN 
    ALTER TABLE follow_ups_2024 
    ADD COLUMN temperature text DEFAULT 'Warm',
    ADD COLUMN lead_type text DEFAULT 'Inquiry',
    ADD COLUMN lead_source text DEFAULT 'Call-in',
    ADD COLUMN rating integer DEFAULT 3,
    ADD COLUMN last_contacted_at timestamptz DEFAULT now(),
    ADD COLUMN next_action_type text DEFAULT 'Call';
  END IF;
END $$;