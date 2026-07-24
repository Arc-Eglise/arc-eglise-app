-- Rollback CRM pastoral — Support enrichi (Phase 7)

DROP INDEX IF EXISTS idx_grievances_priority_status;
ALTER TABLE grievances DROP CONSTRAINT IF EXISTS chk_grievance_satisfaction;
ALTER TABLE grievances DROP CONSTRAINT IF EXISTS chk_grievance_priority;
ALTER TABLE grievances DROP COLUMN IF EXISTS satisfaction_comment;
ALTER TABLE grievances DROP COLUMN IF EXISTS satisfaction;
ALTER TABLE grievances DROP COLUMN IF EXISTS resolved_at;
ALTER TABLE grievances DROP COLUMN IF EXISTS first_response_at;
ALTER TABLE grievances DROP COLUMN IF EXISTS priority;
