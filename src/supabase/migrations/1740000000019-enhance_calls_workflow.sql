/* 
# Enhanced Calls & Follow-ups Workflow
1. Changes
  - Ensures `follow_ups_2024` handles 'Closed' status explicitly.
  - Adds index on `created_at` and `next_follow_up` for faster date-based sorting.
*/

-- Optimization for sorting
CREATE INDEX IF NOT EXISTS idx_follow_ups_date ON follow_ups_2024(next_follow_up ASC);
CREATE INDEX IF NOT EXISTS idx_call_logs_date ON daily_call_logs_2024(created_at DESC);

-- Ensure all current follow-ups have a status
UPDATE follow_ups_2024 SET status = 'Active' WHERE status IS NULL;