-- ─────────────────────────────────────────────────────────
-- Présences événements (2.3.5 / 2.3.6)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_attendance (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_in_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_by  UUID        REFERENCES public.profiles(id),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

-- Membres voient leurs propres présences
CREATE POLICY "attendance_select_own" ON public.event_attendance
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Admin/Pasteur voient toutes les présences
CREATE POLICY "attendance_select_admin" ON public.event_attendance
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text IN ('admin','pasteur')
  ));

-- Membres s'auto-checkin
CREATE POLICY "attendance_insert_self" ON public.event_attendance
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Admin peut checker n'importe qui
CREATE POLICY "attendance_insert_admin" ON public.event_attendance
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text IN ('admin','pasteur')
  ));

-- Suppression : proprio ou admin
CREATE POLICY "attendance_delete" ON public.event_attendance
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','pasteur'))
  );

CREATE INDEX IF NOT EXISTS attendance_event_idx ON public.event_attendance (event_id);
CREATE INDEX IF NOT EXISTS attendance_user_idx  ON public.event_attendance (user_id);
