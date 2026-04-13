/* 
# Add Interaction Logs to Calculator Leads
1. Changes
  - Add `call_logs` (JSONB) to `quotations_20240522` to store follow-up history.
  - Add `status` (text) to `quotations_20240522` to track lead progress.
  - Set default status to 'New'.
2. Security
  - Policies already allow authenticated updates via existing migrations.
*/

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotations_20240522' AND column_name='call_logs') THEN
    ALTER TABLE quotations_20240522 ADD COLUMN call_logs jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quotations_20240522' AND column_name='status') THEN
    ALTER TABLE quotations_20240522 ADD COLUMN status text NOT NULL DEFAULT 'New';
  END IF;
END $$;