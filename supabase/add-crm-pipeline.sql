-- CRM : pipeline pastoral + relances
-- https://supabase.com/dashboard/project/fobyvhulyjxwbhusouqz/sql

-- 1. Étape de suivi pastoral sur les profils
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pastoral_stage TEXT DEFAULT 'visiteur';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_pastoral_stage_check'
      AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_pastoral_stage_check
      CHECK (pastoral_stage IN ('visiteur','integration','actif','formation','responsable'));
  END IF;
END$$;

-- Membres validés existants → 'actif' par défaut
UPDATE profiles SET pastoral_stage = 'actif'
  WHERE validated = true AND (pastoral_stage IS NULL OR pastoral_stage = 'visiteur');

-- 2. Date de relance sur les notes pastorales
ALTER TABLE member_notes ADD COLUMN IF NOT EXISTS followup_date DATE;
