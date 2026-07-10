-- ══════════════════════════════════════════════════════════════
--  ARC — Diagnostic inscription publique
--  Exécuter dans Supabase > SQL Editor AVANT le fix
--  Lecture seule, sans danger.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Le trigger on_auth_user_created existe-t-il ? ────────
SELECT
  trigger_name,
  event_object_schema AS schema,
  event_object_table  AS table,
  action_timing,
  event_manipulation  AS event
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
-- Attendu : 1 ligne (schema=auth, table=users, timing=AFTER, event=INSERT)
-- Si 0 ligne → trigger absent → handle_new_user ne s'exécute jamais


-- ── 2. La fonction handle_new_user() existe-t-elle ? ────────
SELECT
  routine_name,
  routine_schema,
  security_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
  AND routine_schema = 'public';
-- Attendu : 1 ligne, security_type=DEFINER


-- ── 3. Toutes les politiques RLS sur profiles ────────────────
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
-- Vérifier : certaines politiques SELECT font-elles un EXISTS(SELECT ... FROM profiles) ?
-- Si oui → récursion infinie possible (erreur 42P17)


-- ── 4. Utilisateurs auth sans profil (inscriptions cassées) ──
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;
-- Si des lignes apparaissent → le trigger ne s'est pas exécuté
-- Ces utilisateurs ont un compte auth mais aucun profil → espace-membres cassé pour eux


-- ── 5. Derniers utilisateurs créés (pour voir les tentatives) ─
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'first_name' AS first_name,
  raw_user_meta_data->>'last_name'  AS last_name,
  raw_user_meta_data->>'country'    AS country
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;


-- ── 6. Fonctions SECURITY DEFINER helpers (post-fix attendu) ──
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_name IN ('get_my_role', 'get_my_groups', 'is_validated_member', 'handle_new_user')
  AND routine_schema = 'public';
-- Si get_my_role / get_my_groups absents → fix-inscription-v2.sql pas encore appliqué
