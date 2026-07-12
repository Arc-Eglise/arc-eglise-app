-- Ajoute une colonne full_name générée automatiquement depuis first_name + last_name
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name TEXT GENERATED ALWAYS AS (
  TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
) STORED;
