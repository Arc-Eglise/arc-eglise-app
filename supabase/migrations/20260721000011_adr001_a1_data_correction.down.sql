-- ═══════════════════════════════════════════════════════════════════════
--  ADR-001 · Chantier A1 · Migration 2/3 · DOWN
--  Rollback : les corrections de données sont irréversibles par nature.
--
--  Si un rollback est nécessaire, restaurer depuis la sauvegarde complète
--  effectuée avant l'exécution de la migration 1/3.
-- ═══════════════════════════════════════════════════════════════════════

-- Aucune action automatique possible — données corrigées ne peuvent pas
-- être "décorrigées" sans sauvegarde. Voir procédure de rollback dans
-- Documentation technique/AVANCEMENT-ADR-001.md.

SELECT 'rollback manuel requis — restaurer depuis sauvegarde' AS message;
