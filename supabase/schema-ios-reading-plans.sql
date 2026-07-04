-- iOS App — Plans de lecture et progression
-- Tables : reading_plans + reading_plan_progress

CREATE TABLE IF NOT EXISTS public.reading_plans (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  titre       text        NOT NULL,
  description text,
  total_days  int         NOT NULL DEFAULT 30,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reading_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres authentifiés voient les plans actifs"
ON public.reading_plans FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Admins gèrent les plans"
ON public.reading_plans FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','pasteur'))
);

-- ── Progression individuelle ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reading_plan_progress (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid        NOT NULL REFERENCES public.reading_plans(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_day int         NOT NULL DEFAULT 1,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, user_id)
);

ALTER TABLE public.reading_plan_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chacun gère sa propre progression"
ON public.reading_plan_progress FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Accès lecture à tous les membres (pour le comptage des inscrits)
CREATE POLICY "Membres voient le nombre d'inscrits"
ON public.reading_plan_progress FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND validated = true)
);

-- ── Plans de départ ──────────────────────────────────────────────
INSERT INTO public.reading_plans (titre, description, total_days) VALUES
  ('Les Psaumes — 30 jours',   'Méditation quotidienne des Psaumes de David',              30),
  ('L''Évangile de Jean',       'Découvrir Jésus à travers les écrits de Jean',             21),
  ('La Bible en 1 an',          '365 jours pour lire la Bible dans son intégralité',       365),
  ('La Grâce en Romains',       'Étude approfondie de l''épître aux Romains',               16),
  ('Les Béatitudes',            'Le Sermon sur la Montagne — Matthieu 5-7',                  7)
ON CONFLICT DO NOTHING;
