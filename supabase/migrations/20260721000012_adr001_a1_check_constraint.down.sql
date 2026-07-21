-- ═══════════════════════════════════════════════════════════════════════
--  ADR-001 · Chantier A1 · Migration 3/3 · DOWN
--  Rollback : suppression des contraintes d'intégrité
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_role_valid;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_groups_valid;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_managed_groups_valid;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_pastoral_stage_valid;

COMMIT;
