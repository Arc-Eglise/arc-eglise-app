-- Phase 2 : Espace membres
-- À exécuter dans Supabase → SQL Editor

-- 1. Colonnes manquantes sur profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone      TEXT;

-- 2. Table demandes de prière
CREATE TABLE IF NOT EXISTS prayer_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL CHECK (char_length(title) <= 200),
  description  TEXT        CHECK (char_length(description) <= 1000),
  is_anonymous BOOLEAN     NOT NULL DEFAULT false,
  is_answered  BOOLEAN     NOT NULL DEFAULT false,
  prayer_count INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

-- Fonction updated_at générique
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER prayer_updated_at
  BEFORE UPDATE ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Policies
CREATE POLICY "Membres voient toutes les prières"
ON prayer_requests FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (validated = true OR role IN ('admin', 'pasteur'))
  )
);

CREATE POLICY "Membres créent leurs prières"
ON prayer_requests FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (validated = true OR role IN ('admin', 'pasteur'))
  )
);

CREATE POLICY "Auteurs modifient leurs prières"
ON prayer_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Auteurs suppriment leurs prières"
ON prayer_requests FOR DELETE TO authenticated
USING (user_id = auth.uid());
