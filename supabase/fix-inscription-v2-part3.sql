-- ══════════════════════════════════════════════════════════════
--  ARC — Fix inscription v2 — PARTIE 3/3 : Backfill + Validation
--  Exécuter APRÈS la partie 2.
-- ══════════════════════════════════════════════════════════════

-- Créer les profils manquants pour les utilisateurs auth sans profil
-- (inscriptions passées où le trigger était absent ou avait échoué)
INSERT INTO profiles (id, email, first_name, last_name, country)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', ''),
  COALESCE(u.raw_user_meta_data->>'last_name',  ''),
  COALESCE(u.raw_user_meta_data->>'country',    '')
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Valider les admin/pasteur existants non encore validés
UPDATE profiles
SET validated    = true,
    validated_at = COALESCE(validated_at, NOW())
WHERE role::text IN ('admin', 'pasteur')
  AND validated = false;

-- Résultat final
SELECT 'Profils créés (backfill)' AS info,
       count(*)::text AS valeur
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NOT NULL

UNION ALL

SELECT 'Utilisateurs encore sans profil', count(*)::text
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL

UNION ALL

SELECT 'Admin/Pasteur validés', count(*)::text
FROM profiles
WHERE role::text IN ('admin', 'pasteur') AND validated = true;
