-- Migration : table reading_preferences
-- À exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS public.reading_preferences (
  user_id       UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  font_size_px  INTEGER NOT NULL DEFAULT 16 CHECK (font_size_px BETWEEN 13 AND 26),
  line_height   NUMERIC NOT NULL DEFAULT 1.6 CHECK (line_height BETWEEN 1.4 AND 2.4),
  font_family   TEXT    NOT NULL DEFAULT 'manrope'
                CHECK (font_family IN ('manrope','cormorant','georgia','system')),
  high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
  low_vision    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reading_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own reading prefs" ON public.reading_preferences;
CREATE POLICY "Users manage own reading prefs"
  ON public.reading_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_reading_prefs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_reading_prefs_ts ON public.reading_preferences;
CREATE TRIGGER trg_reading_prefs_ts
  BEFORE UPDATE ON public.reading_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_reading_prefs_updated_at();
