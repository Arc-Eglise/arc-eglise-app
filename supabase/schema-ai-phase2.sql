-- ARC Église AI — Phase 2
-- Messages groupes d'étude + résumés IA de sermons

-- ── Messages des groupes d'étude ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_group_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid        NOT NULL REFERENCES public.ai_study_groups(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) <= 2000),
  verse_refs text[]      DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres du groupe voient les messages"
ON public.ai_group_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ai_study_group_members
    WHERE group_id = ai_group_messages.group_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Membres du groupe postent des messages"
ON public.ai_group_messages FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.ai_study_group_members
    WHERE group_id = ai_group_messages.group_id AND user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS ai_group_messages_group_idx
  ON public.ai_group_messages(group_id, created_at DESC);

-- ── Résumés IA de sermons ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sermon_ai_summaries (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sermon_id    uuid        NOT NULL UNIQUE REFERENCES public.sermons(id) ON DELETE CASCADE,
  summary      text        NOT NULL,
  key_verses   text[]      DEFAULT '{}',
  themes       text[]      DEFAULT '{}',
  generated_by uuid        REFERENCES public.profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sermon_ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres validés voient les résumés"
ON public.sermon_ai_summaries FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND validated = true)
);

CREATE POLICY "Staff insère les résumés"
ON public.sermon_ai_summaries FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','pasteur','ancien','diacre','membre')
  )
);
