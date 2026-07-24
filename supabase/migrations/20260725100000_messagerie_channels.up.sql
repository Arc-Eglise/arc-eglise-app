-- Messagerie unifiée — canaux communautaires (évolution du panneau existant)
-- Un "canal" est une conversation partagée identifiée par channel_key (unique).

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_channel_key
  ON conversations (channel_key) WHERE channel_key IS NOT NULL;
