-- ======================================================================
-- ARC Église — Managers de groupes de fonction
-- À exécuter dans : Supabase > SQL Editor
-- ======================================================================

-- Colonne managed_groups : groupes dont le membre est manager (max 2 / groupe)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS managed_groups TEXT[] NOT NULL DEFAULT '{}';

-- Index GIN pour les requêtes "qui sont les managers de ce groupe ?"
CREATE INDEX IF NOT EXISTS idx_profiles_managed_groups
  ON profiles USING GIN(managed_groups);
