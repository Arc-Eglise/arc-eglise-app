-- Phase 2 — Activité et progression utilisateur
-- ARC Église · User Personalization Engine
-- À exécuter dans Supabase SQL Editor

-- Historique de lecture chapitre par chapitre
CREATE TABLE IF NOT EXISTS public.bible_reading_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bible_id     TEXT NOT NULL,
  book_id      TEXT NOT NULL,
  chapter_id   TEXT NOT NULL,
  chapter_num  INTEGER,
  read_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_sec INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_history_unique
  ON bible_reading_history (user_id, chapter_id, (read_at::DATE));

CREATE INDEX IF NOT EXISTS idx_reading_history_user
  ON bible_reading_history (user_id, read_at DESC);

CREATE INDEX IF NOT EXISTS idx_reading_history_book
  ON bible_reading_history (user_id, book_id);

-- Log d'activité granulaire
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action         TEXT NOT NULL CHECK (action IN (
    'bible_read','ai_chat','journal_entry','plan_day_completed','prayer_request',
    'note_created','bookmark_added','meditation','theology_query','search',
    'media_saved','recommendation_clicked'
  )),
  resource_type  TEXT,
  resource_id    TEXT,
  resource_label TEXT,
  duration_sec   INTEGER,
  metadata       JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user_date
  ON user_activity_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_action
  ON user_activity_log (user_id, action);

-- Streaks d'engagement
CREATE TABLE IF NOT EXISTS public.study_streaks (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak    INTEGER NOT NULL DEFAULT 0,
  longest_streak    INTEGER NOT NULL DEFAULT 0,
  last_activity     DATE,
  total_days_active INTEGER NOT NULL DEFAULT 0,
  freeze_remaining  INTEGER NOT NULL DEFAULT 1,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS sur les 3 tables
ALTER TABLE public.bible_reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_streaks         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_reading_history"
  ON public.bible_reading_history FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_own_activity_log"
  ON public.user_activity_log FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_own_streaks"
  ON public.study_streaks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
