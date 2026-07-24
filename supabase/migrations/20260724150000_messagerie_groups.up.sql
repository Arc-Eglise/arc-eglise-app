-- Messagerie — conversations de groupe (M4)
-- Colonnes sur conversations (nom + drapeau groupe). N participants déjà supportés
-- par conversation_participants.

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS name       TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
