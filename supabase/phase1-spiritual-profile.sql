-- Phase 1 — Profil spirituel utilisateur
-- ARC Église · User Personalization Engine
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.spiritual_profile (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profil déclaré
  profile_type         TEXT NOT NULL DEFAULT 'membre'
                       CHECK (profile_type IN (
                         'membre','nouveau_converti','jeunesse',
                         'famille','responsable','pasteur','enseignant'
                       )),
  profile_age_range    TEXT NOT NULL DEFAULT 'adulte'
                       CHECK (profile_age_range IN (
                         'enfant','adolescent','jeune_adulte','adulte','senior'
                       )),

  -- Intérêts spirituels (déclarés + inférés automatiquement)
  theological_focus    TEXT[] NOT NULL DEFAULT '{}',
  fav_ot_books         TEXT[] NOT NULL DEFAULT '{}',
  fav_nt_books         TEXT[] NOT NULL DEFAULT '{}',
  prayer_topics        TEXT[] NOT NULL DEFAULT '{}',
  study_themes         TEXT[] NOT NULL DEFAULT '{}',

  -- Maturité
  spiritual_maturity   TEXT NOT NULL DEFAULT 'intermediaire'
                       CHECK (spiritual_maturity IN (
                         'enfant','debutant','intermediaire','avance','enseignant'
                       )),
  growth_areas         TEXT[] NOT NULL DEFAULT '{}',

  -- Statistiques agrégées (mise à jour automatique)
  total_sessions       INTEGER NOT NULL DEFAULT 0,
  total_chapters       INTEGER NOT NULL DEFAULT 0,
  total_minutes        INTEGER NOT NULL DEFAULT 0,
  total_plans          INTEGER NOT NULL DEFAULT 0,
  total_prayers        INTEGER NOT NULL DEFAULT 0,

  -- Mémo contextuel IA (500 chars max, régénéré périodiquement)
  ai_context_memo      TEXT,
  ai_memo_updated_at   TIMESTAMPTZ,

  -- Configuration
  show_dashboard       BOOLEAN NOT NULL DEFAULT TRUE,
  enable_coach         BOOLEAN NOT NULL DEFAULT TRUE,
  daily_goal_minutes   INTEGER NOT NULL DEFAULT 15,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.spiritual_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_spiritual_profile"
  ON public.spiritual_profile
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.update_spiritual_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_spiritual_profile_updated_at ON public.spiritual_profile;
CREATE TRIGGER trg_spiritual_profile_updated_at
  BEFORE UPDATE ON public.spiritual_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.update_spiritual_profile_updated_at();
