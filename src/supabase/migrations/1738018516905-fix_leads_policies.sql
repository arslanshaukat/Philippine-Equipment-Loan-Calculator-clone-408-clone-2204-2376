/* 
# Fix Policies for Calculator Leads
1. Security Changes
  - Add DELETE policy for authenticated users on `quotations_20240522`
  - Add UPDATE policy for authenticated users on `quotations_20240522` (needed for mark as read)
2. Purpose
  - Ensures that deletions and status updates made in the Admin Dashboard are persisted to the database.
*/

-- Allow authenticated users to delete leads
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quotations_20240522' 
        AND policyname = 'Staff can delete leads'
    ) THEN
        CREATE POLICY "Staff can delete leads" 
        ON quotations_20240522 
        FOR DELETE 
        TO authenticated 
        USING (true);
    END IF;
END $$;

-- Allow authenticated users to update leads (marking as read/viewed)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quotations_20240522' 
        AND policyname = 'Staff can update leads'
    ) THEN
        CREATE POLICY "Staff can update leads" 
        ON quotations_20240522 
        FOR UPDATE 
        TO authenticated 
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;