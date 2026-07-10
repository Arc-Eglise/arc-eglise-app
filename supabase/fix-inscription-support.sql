-- ══════════════════════════════════════════════════════════════
--  ARC — Fix inscription publique + accès fonction Support
--  À exécuter dans : Supabase > SQL Editor > New Query
--  Idempotent : peut être rejoué sans danger.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Fonctions SECURITY DEFINER (contournement récursion RLS) ──
-- Ces fonctions bypasse le RLS sur profiles, évitant toute récursion infinie.

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

-- ── 2. Trigger création de profil (inscription publique) ────────
-- Recrée le trigger de façon idempotente.
-- ON CONFLICT (id) DO NOTHING évite les erreurs de doublon.

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

-- ── 3. Backfill : profils manquants ─────────────────────────────
-- Crée un profil pour chaque utilisateur auth sans profil.
-- Couvre les inscriptions passées où le trigger était absent/cassé.

INSERT INTO profiles (id, email, first_name, last_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', ''),
  COALESCE(u.raw_user_meta_data->>'last_name',  '')
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ── 4. Mise à jour RLS profiles ──────────────────────────────────
-- Remplace les politiques auto-référentielles (récursion infinie)
-- par des politiques utilisant les fonctions SECURITY DEFINER.

-- Supprimer les anciennes politiques problématiques
DROP POLICY IF EXISTS "Admin — lire tous les profils"           ON profiles;
DROP POLICY IF EXISTS "Admin — modifier tous les profils"       ON profiles;
DROP POLICY IF EXISTS "Pasteur — lire tous les profils"         ON profiles;
DROP POLICY IF EXISTS "Support — lire tous les profils"         ON profiles;
DROP POLICY IF EXISTS "Admin/Pasteur/Support — lire"           ON profiles;
DROP POLICY IF EXISTS "Admin/Pasteur/Support — modifier"       ON profiles;

-- Politique lecture : admin, pasteur, ou fonction support
CREATE POLICY "Privilégiés — lire tous les profils"
  ON profiles FOR SELECT
  USING (
    public.get_my_role() IN ('admin', 'pasteur')
    OR public.get_my_groups() @> ARRAY['support']
  );

-- Politique modification : admin, pasteur, ou fonction support
CREATE POLICY "Privilégiés — modifier les profils"
  ON profiles FOR UPDATE
  USING (
    public.get_my_role() IN ('admin', 'pasteur')
    OR public.get_my_groups() @> ARRAY['support']
  );

-- ── 5. RLS member_notes : ajouter support ───────────────────────

DROP POLICY IF EXISTS "Admin/Pasteur voient les notes"          ON member_notes;
DROP POLICY IF EXISTS "Admin/Pasteur créent des notes"          ON member_notes;

CREATE POLICY "Privilégiés voient les notes"
  ON member_notes FOR SELECT TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'pasteur')
    OR public.get_my_groups() @> ARRAY['support']
  );

CREATE POLICY "Privilégiés créent des notes"
  ON member_notes FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.get_my_role() IN ('admin', 'pasteur')
      OR public.get_my_groups() @> ARRAY['support']
    )
  );

-- ── 6. Auto-validate : trigger mis à jour ───────────────────────
-- Admin et Pasteur ne nécessitent jamais de validation manuelle.
-- (Support est une fonction, pas un rôle : géré par l'app.)

CREATE OR REPLACE FUNCTION public.auto_validate_privileged_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Corriger les admin/pasteur existants non validés
UPDATE profiles
SET validated = true, validated_at = COALESCE(validated_at, NOW())
WHERE role::text IN ('admin', 'pasteur')
  AND validated = false;

-- ── FIN ─────────────────────────────────────────────────────────
