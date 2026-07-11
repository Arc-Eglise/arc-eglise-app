-- ══════════════════════════════════════════════════════════════
--  ARC — Diagnostic Emerance Obova
--  UID : 593b90b5-b75f-42a7-adc8-4bf384345c4b
--  À exécuter dans : Supabase > SQL Editor > New Query
-- ══════════════════════════════════════════════════════════════

-- 1. Vérifier que la ligne membre existe dans profiles
SELECT
  id,
  first_name || ' ' || COALESCE(last_name, '') AS full_name,
  email,
  role,
  groups,
  validated,
  validated_at,
  created_at
FROM profiles
WHERE id = '593b90b5-b75f-42a7-adc8-4bf384345c4b';

-- 2. Vérifier que l'utilisateur existe dans auth.users
SELECT
  id,
  email,
  created_at,
  banned_until,
  last_sign_in_at
FROM auth.users
WHERE id = '593b90b5-b75f-42a7-adc8-4bf384345c4b';

-- 3. Tester la fonction helper CMS (simule is_cms_member pour cet uid)
--    Résultat attendu : true si role IN ('admin','pasteur') OU groups contient 'communication'|'media'
SELECT
  role,
  groups,
  (
    role IN ('admin', 'pasteur')
    OR 'communication' = ANY(groups)
    OR 'media' = ANY(groups)
  ) AS would_pass_is_cms_member
FROM profiles
WHERE id = '593b90b5-b75f-42a7-adc8-4bf384345c4b';

-- 4. Lister toutes les policies actives sur la table profiles
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
