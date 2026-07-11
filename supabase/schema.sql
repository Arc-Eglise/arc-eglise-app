-- ═══════════════════════════════════════════════════════════════
--  ARC — Ambassade du Royaume de Christ
--  Schéma Supabase — Version 1.0
--  À exécuter dans : Supabase > SQL Editor > New Query
-- ═══════════════════════════════════════════════════════════════

-- ── 1. ENUM rôle ────────────────────────────────────────────────
-- Rôles (1 seul par membre, 4 niveaux) : visiteur | membre | pasteur | admin
-- Fonctions (rôle membre uniquement, multiples, dans groups[]) : pasteur | chorale | media | social | sanitaire | finance | support | jeunesse | femmes | ecodim | suivi | communication
-- NB : 'support' est une FONCTION (dans groups[]), pas un rôle. Géré exclusivement par Admin.
CREATE TYPE user_role AS ENUM ('admin', 'pasteur', 'membre', 'visiteur');
-- ⚠ Migration requise si des comptes ont encore role='support' : voir supabase/migrations/remove-support-role.sql

-- ── 2. TABLE profiles ───────────────────────────────────────────
-- Étend auth.users de Supabase (1 profil par utilisateur)
CREATE TABLE profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT NOT NULL,
  first_name     TEXT,
  last_name      TEXT,
  role           user_role NOT NULL DEFAULT 'visiteur',
  groups         TEXT[]    NOT NULL DEFAULT '{}',  -- fonctions (rôle membre uniquement) : pasteur | chorale | media | social | sanitaire | finance | support | jeunesse | femmes | ecodim | suivi | communication
  validated      BOOLEAN   NOT NULL DEFAULT false,
  validated_by   UUID REFERENCES profiles(id),
  validated_at   TIMESTAMPTZ,
  phone          TEXT,
  country        TEXT,
  city           TEXT,
  avatar_url     TEXT,
  bio            TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. TRIGGER — mise à jour updated_at ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 4. TRIGGER — création automatique du profil à l'inscription ─
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',  '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 5. ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur peut lire son propre profil
CREATE POLICY "Lire son propre profil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Chaque utilisateur peut modifier son propre profil (champs limités)
CREATE POLICY "Modifier son propre profil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin peut tout lire
CREATE POLICY "Admin — lire tous les profils"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin peut tout modifier
CREATE POLICY "Admin — modifier tous les profils"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Pasteur peut lire tous les profils (pour CRM)
CREATE POLICY "Pasteur — lire tous les profils"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'pasteur')
  );

-- Membres validés peuvent se voir entre eux (pour messagerie)
CREATE POLICY "Membres — voir les autres membres"
  ON profiles FOR SELECT
  USING (
    validated = true
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND validated = true)
  );

-- ── 6. INDEX ────────────────────────────────────────────────────
CREATE INDEX profiles_role_idx      ON profiles(role);
CREATE INDEX profiles_validated_idx ON profiles(validated);
CREATE INDEX profiles_email_idx     ON profiles(email);

-- ── 7. Admin initial — remplace par ton UUID Supabase ───────────
-- À exécuter APRÈS que arceglise.cdf@gmail.com soit inscrit via l'interface
-- UPDATE profiles SET role = 'admin' WHERE email = 'arceglise.cdf@gmail.com';

-- ── FIN ─────────────────────────────────────────────────────────
