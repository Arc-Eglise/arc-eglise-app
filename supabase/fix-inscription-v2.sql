-- ══════════════════════════════════════════════════════════════
--  ARC — Fix inscription publique v2 (COMPLET + IDEMPOTENT)
--  Problème : politiques RLS profiles auto-référentielles →
--             récursion infinie 42P17 → signUp échoue
--  Exécuter dans : Supabase > SQL Editor > New Query > Run
-- ══════════════════════════════════════════════════════════════

-- ── 1. Fonctions helpers SECURITY DEFINER ───────────────────
-- Bypasse le RLS sur profiles → pas de récursion possible

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_groups()
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(groups, '{}') FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_validated_member()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(validated, false) FROM profiles WHERE id = auth.uid();
$$;


-- ── 2. Trigger création de profil (inscription publique) ────
-- SECURITY DEFINER + SET search_path + ON CONFLICT → idempotent

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name, country)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',  ''),
    COALESCE(NEW.raw_user_meta_data->>'country',    '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ── 3. Trigger auto-validation admin/pasteur ────────────────

CREATE OR REPLACE FUNCTION public.auto_validate_privileged_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role::text IN ('admin', 'pasteur') THEN
    NEW.validated    := true;
    NEW.validated_at := COALESCE(NEW.validated_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_auto_validate ON profiles;
CREATE TRIGGER profiles_auto_validate
  BEFORE INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_validate_privileged_roles();


-- ── 4. Suppression de TOUTES les politiques RLS profiles ────
-- Inclut les politiques récursives de schema.sql non encore supprimées

DROP POLICY IF EXISTS "Lire son propre profil"                  ON profiles;
DROP POLICY IF EXISTS "Modifier son propre profil"              ON profiles;
DROP POLICY IF EXISTS "Admin — lire tous les profils"           ON profiles;
DROP POLICY IF EXISTS "Admin — modifier tous les profils"       ON profiles;
DROP POLICY IF EXISTS "Pasteur — lire tous les profils"         ON profiles;
DROP POLICY IF EXISTS "Support — lire tous les profils"         ON profiles;
DROP POLICY IF EXISTS "Membres — voir les autres membres"       ON profiles;
DROP POLICY IF EXISTS "Admin/Pasteur/Support — lire"            ON profiles;
DROP POLICY IF EXISTS "Admin/Pasteur/Support — modifier"        ON profiles;
DROP POLICY IF EXISTS "Privilégiés — lire tous les profils"     ON profiles;
DROP POLICY IF EXISTS "Privilégiés — modifier les profils"      ON profiles;
DROP POLICY IF EXISTS "Membres validés — voir les autres"       ON profiles;


-- ── 5. Recréation des politiques RLS profiles (sans récursion) ──

-- Chaque utilisateur lit/modifie son propre profil (non récursif)
CREATE POLICY "Lire son propre profil"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Modifier son propre profil"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Admin / Pasteur / Support voient tous les profils (via SECURITY DEFINER)
CREATE POLICY "Privilégiés — lire tous les profils"
  ON profiles FOR SELECT TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'pasteur')
    OR public.get_my_groups() @> ARRAY['support']
  );

-- Admin / Pasteur / Support modifient tous les profils
CREATE POLICY "Privilégiés — modifier les profils"
  ON profiles FOR UPDATE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'pasteur')
    OR public.get_my_groups() @> ARRAY['support']
  );

-- Membres validés voient les autres membres validés (pour messagerie/annuaire)
CREATE POLICY "Membres validés — voir les autres"
  ON profiles FOR SELECT TO authenticated
  USING (
    validated = true
    AND public.is_validated_member()
  );


-- ── 6. Backfill : profils manquants ─────────────────────────
-- Crée un profil pour chaque utilisateur auth sans profil existant

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


-- ── 7. Corriger les admin/pasteur existants non validés ─────

UPDATE profiles
SET validated    = true,
    validated_at = COALESCE(validated_at, NOW())
WHERE role::text IN ('admin', 'pasteur')
  AND validated = false;


-- ── FIN — Vérification ──────────────────────────────────────
SELECT 'Trigger' AS check, trigger_name AS result
  FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created'
UNION ALL
SELECT 'Fonction handle_new_user', routine_name
  FROM information_schema.routines WHERE routine_name = 'handle_new_user' AND routine_schema = 'public'
UNION ALL
SELECT 'Fonction get_my_role', routine_name
  FROM information_schema.routines WHERE routine_name = 'get_my_role' AND routine_schema = 'public'
UNION ALL
SELECT 'Politique count', count(*)::text
  FROM pg_policies WHERE tablename = 'profiles';
