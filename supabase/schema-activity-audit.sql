-- ── TABLE activity_feed ──────────────────────────────────────────
-- Feed d'activités de la communauté (actions visibles par les membres validés)
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  icon           text        NOT NULL DEFAULT '📋',
  text           text        NOT NULL,
  user_id        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_id uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Membres validés + admins voient le feed
CREATE POLICY "Voir le feed d'activités" ON public.activity_feed
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (validated = true OR role IN ('admin','pasteur'))
    )
  );

-- Seul le service role (admin client) peut insérer (via server actions)
CREATE POLICY "Système insère les activités" ON public.activity_feed
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Index pour les requêtes récentes
CREATE INDEX IF NOT EXISTS activity_feed_created_at_idx ON public.activity_feed(created_at DESC);

-- ── TABLE audit_log ───────────────────────────────────────────────
-- Journal d'audit pour les actions d'administration
CREATE TABLE IF NOT EXISTS public.audit_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action     text        NOT NULL,   -- ex: 'role_change', 'member_validate', 'permission_update'
  detail     text        NOT NULL,
  actor_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Seuls les admins voient le journal
CREATE POLICY "Admins voient l'audit" ON public.audit_log
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seul le service role peut insérer (server actions admin)
CREATE POLICY "Système insère dans l'audit" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log(created_at DESC);
