-- ARC Église AI — Phase 3
-- Progression individuelle sur plans collectifs

CREATE TABLE IF NOT EXISTS public.ai_plan_member_progress (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      uuid        NOT NULL REFERENCES public.ai_reading_plans(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_number   int         NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, user_id, day_number)
);

ALTER TABLE public.ai_plan_member_progress ENABLE ROW LEVEL SECURITY;

-- Chaque membre voit sa propre progression et celle des autres membres du même groupe
CREATE POLICY "Membres voient la progression du groupe"
ON public.ai_plan_member_progress FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.ai_reading_plans rp
    JOIN public.ai_study_group_members sgm ON sgm.group_id = rp.group_id
    WHERE rp.id = ai_plan_member_progress.plan_id
      AND sgm.user_id = auth.uid()
  )
);

-- Chaque membre insère sa propre progression
CREATE POLICY "Membres enregistrent leur progression"
ON public.ai_plan_member_progress FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Upsert nécessite aussi UPDATE
CREATE POLICY "Membres mettent à jour leur progression"
ON public.ai_plan_member_progress FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS ai_plan_progress_plan_user_idx
  ON public.ai_plan_member_progress(plan_id, user_id);
