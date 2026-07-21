-- ═══════════════════════════════════════════════════════════════════════
--  ADR-001 · Chantier A1 · Migration 1/3 · DOWN
--  Rollback : suppression des tables de référence
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

DROP TABLE IF EXISTS arc_referentiel_pipeline;
DROP TABLE IF EXISTS arc_referentiel_functions;
DROP TABLE IF EXISTS arc_referentiel_roles;

COMMIT;
