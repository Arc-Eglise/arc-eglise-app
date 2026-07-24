-- Rollback CRM pastoral — Journal d'interactions (Phase 1)

DROP POLICY IF EXISTS member_interactions_delete ON member_interactions;
DROP POLICY IF EXISTS member_interactions_insert ON member_interactions;
DROP POLICY IF EXISTS member_interactions_select ON member_interactions;
DROP INDEX  IF EXISTS idx_member_interactions_member;
DROP TABLE  IF EXISTS member_interactions;
