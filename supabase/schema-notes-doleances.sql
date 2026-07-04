-- ─────────────────────────────────────────────────────────
-- Notes bibliques + Doléances
-- ─────────────────────────────────────────────────────────

-- 1. Notes bibliques (privées, par utilisateur)
CREATE TABLE IF NOT EXISTS public.biblical_notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL CHECK (char_length(title) <= 200),
  content    TEXT        NOT NULL CHECK (char_length(content) <= 5000),
  reference  TEXT        CHECK (char_length(reference) <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.biblical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select" ON public.biblical_notes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notes_insert" ON public.biblical_notes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "notes_update" ON public.biblical_notes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notes_delete" ON public.biblical_notes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS biblical_notes_updated_at ON public.biblical_notes;
CREATE TRIGGER biblical_notes_updated_at
  BEFORE UPDATE ON public.biblical_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Doléances (suggestions / préoccupations membres)
CREATE TABLE IF NOT EXISTS public.grievances (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL CHECK (char_length(title) <= 200),
  description    TEXT        NOT NULL CHECK (char_length(description) <= 2000),
  category       TEXT        NOT NULL DEFAULT 'autre'
                             CHECK (category IN ('pastoral','organisation','technique','autre')),
  status         TEXT        NOT NULL DEFAULT 'en_attente'
                             CHECK (status IN ('en_attente','en_cours','resolu')),
  is_anonymous   BOOLEAN     NOT NULL DEFAULT false,
  admin_response TEXT        CHECK (char_length(admin_response) <= 1000),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;

-- Membres voient uniquement leurs propres doléances
CREATE POLICY "grievances_select_own" ON public.grievances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin/Pasteur voient tout
CREATE POLICY "grievances_select_admin" ON public.grievances
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text IN ('admin','pasteur')
  ));

CREATE POLICY "grievances_insert" ON public.grievances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "grievances_delete_own" ON public.grievances
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Seul Admin/Pasteur peut mettre à jour le statut
CREATE POLICY "grievances_update_admin" ON public.grievances
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text IN ('admin','pasteur')
  ));

DROP TRIGGER IF EXISTS grievances_updated_at ON public.grievances;
CREATE TRIGGER grievances_updated_at
  BEFORE UPDATE ON public.grievances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
