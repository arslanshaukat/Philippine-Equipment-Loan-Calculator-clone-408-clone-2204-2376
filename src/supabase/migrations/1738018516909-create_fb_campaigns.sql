/* 
# Facebook Campaign Tracking System
1. New Tables
  - `fb_campaigns_2024`: Stores metadata for social media ad runs
    - `id` (uuid, primary key)
    - `campaign_name` (text): e.g. "Giga 10W - March Promo"
    - `unit_name` (text): The specific unit being advertised
    - `start_date` (date)
    - `end_date` (date)
    - `budget` (numeric)
    - `created_at` (timestamptz)
2. Table Alterations
  - Add `campaign_id` to `visit_schedules_2024` to link leads to specific ads.
*/

CREATE TABLE IF NOT EXISTS fb_campaigns_2024 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name text NOT NULL,
  unit_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  budget numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fb_campaigns_2024 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage fb campaigns" ON fb_campaigns_2024 FOR ALL TO authenticated USING (true) WITH CHECK (true);

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visit_schedules_2024' AND column_name = 'campaign_id') THEN 
    ALTER TABLE visit_schedules_2024 ADD COLUMN campaign_id uuid REFERENCES fb_campaigns_2024(id) ON DELETE SET NULL;
  END IF;
END $$;