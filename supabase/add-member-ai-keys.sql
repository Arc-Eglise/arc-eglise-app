-- Migration : ajout des clés IA personnelles aux profils membres
-- À exécuter dans Supabase → SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_claude_key      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_openai_key      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_gemini_key      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_provider_pref   TEXT DEFAULT 'auto';

-- RLS : seul le serveur (service_role) peut lire ces colonnes
-- Les clés sont chiffrées AES-256 côté application avant stockage
COMMENT ON COLUMN profiles.ai_claude_key    IS 'Clé Anthropic chiffrée AES-256 (usage personnel membre)';
COMMENT ON COLUMN profiles.ai_openai_key    IS 'Clé OpenAI chiffrée AES-256 (usage personnel membre)';
COMMENT ON COLUMN profiles.ai_gemini_key    IS 'Clé Google Gemini chiffrée AES-256 (usage personnel membre)';
COMMENT ON COLUMN profiles.ai_provider_pref IS 'Provider préféré : auto | claude | openai | gemini';
