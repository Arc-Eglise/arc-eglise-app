-- Rollback canaux communautaires
DROP INDEX IF EXISTS uq_conversations_channel_key;
ALTER TABLE conversations DROP COLUMN IF EXISTS channel_key;
