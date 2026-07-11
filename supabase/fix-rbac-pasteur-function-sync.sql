-- ══════════════════════════════════════════════════════════════
--  ARC — Sync fonction 'pasteur' pour tous les profils rôle=pasteur
--  Règle RBAC : role=pasteur → groups doit toujours contenir 'pasteur'
--  Safe à ré-exécuter (array_append uniquement si absent)
--  À exécuter dans : Supabase > SQL Editor > New Query
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- Aperçu avant correction (combien de pasteurs sans la fonction)
SELECT
  id,
  first_name || ' ' || COALESCE(last_name, '') AS full_name,
  email,
  role,
  groups
FROM profiles
WHERE role = 'pasteur'
  AND NOT ('pasteur' = ANY(groups));

-- Correction : ajouter 'pasteur' à groups[] pour tous les pasteurs qui ne l'ont pas
UPDATE profiles
SET groups = array_append(groups, 'pasteur')
WHERE role = 'pasteur'
  AND NOT ('pasteur' = ANY(groups));

-- Vérification finale : tous les pasteurs avec leur functions
SELECT
  id,
  first_name || ' ' || COALESCE(last_name, '') AS full_name,
  email,
  role,
  groups,
  validated
FROM profiles
WHERE role = 'pasteur'
ORDER BY last_name;

COMMIT;
