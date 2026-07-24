-- Rollback ADR-001 Chantier B / B3 — socle quotas + journalisation

DROP POLICY IF EXISTS "arc_api_log_admin_read" ON arc_api_log;
DROP INDEX  IF EXISTS idx_arc_api_log_user_id;
DROP INDEX  IF EXISTS idx_arc_api_log_created_at;
DROP TABLE  IF EXISTS arc_api_log;

DROP FUNCTION IF EXISTS arc_api_increment_rate_limit(TEXT, TEXT);
DROP TABLE    IF EXISTS arc_api_rate_limit;
