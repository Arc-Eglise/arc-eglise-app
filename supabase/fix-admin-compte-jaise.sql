-- ══════════════════════════════════════════════════════════════
--  FIX PRIORITAIRE — Compte Admin jaise.buka.dilu@gmail.com
--  À exécuter dans : Supabase > SQL Editor > New Query
--
--  Ce script est un UPSERT : il crée le profil s'il n'existe pas,
--  ou le met à jour s'il existe déjà. Aucun risque de doublon.
--  Idempotent : peut être rejoué sans danger.
-- ══════════════════════════════════════════════════════════════

-- ── Étape 1 : UPSERT profil admin ───────────────────────────
-- Insère le profil si absent, ou met à jour role+validated si présent.

INSERT INTO profiles (id, email, first_name, last_name, role, validated, validated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', ''),
  COALESCE(u.raw_user_meta_data->>'last_name',  ''),
  'admin',
  true,
  NOW()
FROM auth.users u
WHERE u.email = 'jaise.buka.dilu@gmail.com'
ON CONFLICT (id) DO UPDATE
  SET role         = 'admin',
      validated    = true,
      validated_at = COALESCE(profiles.validated_at, NOW());

-- ── Étape 2 : Vérification ───────────────────────────────────
-- Ce SELECT doit retourner 1 ligne avec role='admin' et validated=true.
-- Si 0 lignes : l'utilisateur n'existe pas encore dans auth.users
-- (il doit d'abord compléter son inscription et confirmer son email).

SELECT
  id,
  email,
  role,
  validated,
  validated_at,
  created_at
FROM profiles
WHERE email = 'jaise.buka.dilu@gmail.com';

-- ── Étape 3 : Corriger tous les admin/pasteur non validés ────
-- Couvre les autres comptes privilégiés éventuellement bloqués.

UPDATE profiles
SET validated    = true,
    validated_at = COALESCE(validated_at, NOW())
WHERE role::text IN ('admin', 'pasteur')
  AND validated = false;

-- ── FIN ─────────────────────────────────────────────────────
