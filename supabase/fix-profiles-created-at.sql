-- Ajout created_at dans profiles (la table réelle utilise cree_le)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
UPDATE profiles SET created_at = cree_le WHERE created_at IS NULL AND cree_le IS NOT NULL;
UPDATE profiles SET created_at = NOW() WHERE created_at IS NULL;

-- Ajout updated_at pour cohérence
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE profiles SET updated_at = COALESCE(maj_le, NOW()) WHERE updated_at IS NULL;
