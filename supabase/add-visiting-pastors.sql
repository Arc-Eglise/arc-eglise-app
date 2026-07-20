-- ======================================================================
-- ARC Église — Pasteurs visiteurs + attribution de sermons
-- À exécuter dans : Supabase > SQL Editor
-- https://supabase.com/dashboard/project/fobyvhulyjxwwbhusouqz/sql
-- ======================================================================

-- 1. Table des pasteurs visiteurs
CREATE TABLE IF NOT EXISTS public.visiting_pastors (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text         NOT NULL,
  title       text         NOT NULL DEFAULT 'Pasteur',
  church      text,
  city        text,
  country     text         DEFAULT 'Suisse',
  notes       text,
  created_at  timestamptz  DEFAULT now(),
  created_by  uuid         REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Colonnes optionnelles sur sermons pour tracer la source du pasteur
ALTER TABLE public.sermons
  ADD COLUMN IF NOT EXISTS pastor_member_id  uuid REFERENCES public.profiles(id)         ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pastor_visitor_id uuid REFERENCES public.visiting_pastors(id) ON DELETE SET NULL;

-- 3. RLS — visiting_pastors
ALTER TABLE public.visiting_pastors ENABLE ROW LEVEL SECURITY;

-- Lecture : tout membre authentifié
CREATE POLICY "visiting_pastors_read"
  ON public.visiting_pastors FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Écriture : admin ou pasteur uniquement
CREATE POLICY "visiting_pastors_write"
  ON public.visiting_pastors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'pasteur')
    )
  );

-- 4. Index utiles
CREATE INDEX IF NOT EXISTS idx_visiting_pastors_name ON public.visiting_pastors (name);
CREATE INDEX IF NOT EXISTS idx_sermons_pastor_member  ON public.sermons (pastor_member_id);
CREATE INDEX IF NOT EXISTS idx_sermons_pastor_visitor ON public.sermons (pastor_visitor_id);
