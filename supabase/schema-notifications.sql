-- ─────────────────────────────────────────────────────────
-- Table notifications — ARC Église
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'system',  -- message | prayer | event | rsvp | system
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Chaque membre gère uniquement ses propres notifications
CREATE POLICY "notif_select" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "notif_update" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Seul le service role peut insérer des notifications (server-side)
CREATE POLICY "notif_insert_service" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS notif_user_created ON public.notifications (user_id, created_at DESC);

-- Activer Realtime sur la table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
