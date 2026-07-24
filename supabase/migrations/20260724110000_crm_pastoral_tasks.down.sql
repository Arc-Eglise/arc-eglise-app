-- Rollback CRM pastoral — Tâches & rappels (Phase 2)

DROP POLICY IF EXISTS pastoral_tasks_delete ON pastoral_tasks;
DROP POLICY IF EXISTS pastoral_tasks_update ON pastoral_tasks;
DROP POLICY IF EXISTS pastoral_tasks_insert ON pastoral_tasks;
DROP POLICY IF EXISTS pastoral_tasks_select ON pastoral_tasks;
DROP INDEX  IF EXISTS idx_pastoral_tasks_member;
DROP INDEX  IF EXISTS idx_pastoral_tasks_assignee;
DROP TABLE  IF EXISTS pastoral_tasks;
