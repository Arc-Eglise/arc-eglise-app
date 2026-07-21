-- ═══════════════════════════════════════════════════════════════
--  Migration : Ajouter started_at aux plans de lecture
--  Supabase SQL Editor :
--  https://supabase.com/dashboard/project/fobyvhulyjxwbhusouqz/sql
--  Date : 2026-07-21
-- ═══════════════════════════════════════════════════════════════

-- Ajouter la colonne started_at (NULL = plan non encore démarré)
ALTER TABLE ai_reading_plans
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Index pour accélérer la requête "plans en cours de l'utilisateur"
CREATE INDEX IF NOT EXISTS ai_plans_started_idx
  ON ai_reading_plans(user_id, started_at)
  WHERE started_at IS NOT NULL AND is_active = true;
