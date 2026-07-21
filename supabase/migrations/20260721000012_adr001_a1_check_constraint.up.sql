-- ═══════════════════════════════════════════════════════════════════════
--  ADR-001 · Chantier A1 · Migration 3/3 · UP
--  Contrainte d'intégrité sur profiles.groups[] et profiles.managed_groups[]
--
--  ⚠️  À EXÉCUTER UNIQUEMENT APRÈS la migration 2/3 (data_correction)
--  Si des valeurs non conformes subsistent en base, ALTER TABLE échouera
--  avec une violation de contrainte — ce comportement est intentionnel.
--
--  Critère de sortie ADR-001 A1 :
--    Une tentative d'insertion d'une valeur invalide est rejetée par la base.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Contrainte sur profiles.role ──────────────────────────────────────────
-- Protège l'enum des rôles (la colonne est TEXT, pas un vrai ENUM Postgres).
ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_role_valid
    CHECK (role IN ('visiteur', 'membre', 'pasteur', 'admin'));

-- ── Contrainte sur profiles.groups[] ─────────────────────────────────────
-- L'opérateur <@ signifie "est contenu dans" : vérifie que chaque valeur
-- du tableau appartient au référentiel officiel des 13 fonctions.
ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_groups_valid
    CHECK (
      "groups" <@ ARRAY[
        'pasteur', 'chorale', 'media', 'social', 'hospitalite', 'sanitaire',
        'finance', 'support', 'jeunesse', 'femmes', 'ecodim', 'suivi', 'communication'
      ]::text[]
    );

-- ── Contrainte sur profiles.managed_groups[] ─────────────────────────────
-- managed_groups peut être NULL (un membre sans rôle de manager).
-- Quand renseigné, ses valeurs doivent être un sous-ensemble des 13 fonctions.
ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_managed_groups_valid
    CHECK (
      managed_groups IS NULL
      OR managed_groups <@ ARRAY[
        'pasteur', 'chorale', 'media', 'social', 'hospitalite', 'sanitaire',
        'finance', 'support', 'jeunesse', 'femmes', 'ecodim', 'suivi', 'communication'
      ]::text[]
    );

-- ── Contrainte sur profiles.pastoral_stage ───────────────────────────────
-- Protège le pipeline pastoral (si la colonne existe).
-- La migration add-crm-pipeline.sql l'a créée sans contrainte.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'pastoral_stage'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT chk_profiles_pastoral_stage_valid
        CHECK (
          pastoral_stage IS NULL
          OR pastoral_stage IN ('visiteur', 'integration', 'actif', 'formation', 'responsable')
        );
  END IF;
END $$;

-- ── Vérification des RLS existantes ──────────────────────────────────────
-- Les policies RLS lisent profiles.role et profiles."groups" via sous-requêtes
-- EXISTS. L'ajout d'une contrainte CHECK n'affecte pas les lectures — seules
-- les écritures violant la contrainte sont rejetées. Les RLS restent fonctionnelles.

-- ── Test de validation (à exécuter après la migration) ───────────────────
-- Ces INSERT doivent retourner une erreur de contrainte :
--
-- INSERT INTO profiles (id, email, role, "groups")
--   VALUES (gen_random_uuid(), 'test@test.com', 'superadmin', '{}');
-- → doit échouer sur chk_profiles_role_valid
--
-- INSERT INTO profiles (id, email, role, "groups")
--   VALUES (gen_random_uuid(), 'test@test.com', 'membre', '{"diacre"}');
-- → doit échouer sur chk_profiles_groups_valid

COMMIT;
