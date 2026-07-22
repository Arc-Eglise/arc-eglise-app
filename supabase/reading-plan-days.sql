-- ═══════════════════════════════════════════════════════════════
--  Migration : Table reading_plan_days — contenu quotidien
--  Supabase SQL Editor :
--  https://supabase.com/dashboard/project/fobyvhulyjxwbhusouqz/sql
--  Date : 2026-07-21
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reading_plan_days (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID        NOT NULL REFERENCES reading_plans(id) ON DELETE CASCADE,
  day_number  INTEGER     NOT NULL,
  title       TEXT,
  passages    TEXT[]      NOT NULL DEFAULT '{}',
  reflection  TEXT,
  prayer_guide TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, day_number)
);

ALTER TABLE reading_plan_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reading_plan_days_select"
  ON reading_plan_days FOR SELECT
  USING (true);

-- Aussi ajouter une colonne focus/thème sur reading_plans si absente
ALTER TABLE reading_plans ADD COLUMN IF NOT EXISTS focus TEXT;
ALTER TABLE reading_plans ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'fr';

-- Index de performance
CREATE INDEX IF NOT EXISTS idx_rpd_plan_day ON reading_plan_days(plan_id, day_number);
