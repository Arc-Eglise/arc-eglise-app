-- Messagerie — répondre / éditer / supprimer (M1b)
-- Colonnes ajoutées à messages (aucune donnée touchée).

ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at   TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages (reply_to_id);
