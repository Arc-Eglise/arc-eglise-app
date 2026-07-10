-- ══════════════════════════════════════════════════════════════
--  ARC — Fix inscription v2 — PARTIE 2/3 : Politiques RLS profiles
--  Exécuter APRÈS la partie 1. Attendre "Success", puis partie 3.
-- ══════════════════════════════════════════════════════════════

-- Suppression de toutes les anciennes politiques (y compris les récursives)
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

-- Chaque utilisateur lit/modifie son propre profil (non récursif)
CREATE POLICY "Lire son propre profil"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Modifier son propre profil"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Admin / Pasteur / Fonction Support voient tous les profils
CREATE POLICY "Privilégiés — lire tous les profils"
  ON profiles FOR SELECT TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'pasteur')
    OR public.get_my_groups() @> ARRAY['support']
  );

-- Admin / Pasteur / Fonction Support modifient tous les profils
CREATE POLICY "Privilégiés — modifier les profils"
  ON profiles FOR UPDATE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'pasteur')
    OR public.get_my_groups() @> ARRAY['support']
  );

-- Membres validés voient les autres membres validés (messagerie / annuaire)
CREATE POLICY "Membres validés — voir les autres"
  ON profiles FOR SELECT TO authenticated
  USING (
    validated = true
    AND public.is_validated_member()
  );

-- Vérification : compter les politiques actives
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
