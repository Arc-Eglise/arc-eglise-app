-- Ajout des colonnes manquantes dans profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name  TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone      TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country    TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS groups     TEXT[] DEFAULT '{}';

-- Migrer les données existantes
UPDATE profiles SET first_name = nom       WHERE first_name IS NULL AND nom       IS NOT NULL;
UPDATE profiles SET phone      = telephone WHERE phone      IS NULL AND telephone IS NOT NULL;
