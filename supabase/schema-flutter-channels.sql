-- Flutter Phase 4 — Canaux de groupe + messages temps réel
-- À exécuter dans Supabase → SQL Editor

-- ── Canaux de groupe ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.channels (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        NOT NULL UNIQUE,
  description text,
  icon        text        NOT NULL DEFAULT '💬',
  min_role    text        NOT NULL DEFAULT 'membre',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membres voient les canaux" ON public.channels;
CREATE POLICY "Membres voient les canaux"
ON public.channels FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin gère les canaux" ON public.channels;
CREATE POLICY "Admin gère les canaux"
ON public.channels FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── Messages des canaux ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.channel_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid        NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS channel_messages_channel_idx
  ON public.channel_messages(channel_id, created_at DESC);

DROP POLICY IF EXISTS "Membres lisent les messages canaux" ON public.channel_messages;
CREATE POLICY "Membres lisent les messages canaux"
ON public.channel_messages FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND validated = true)
);

DROP POLICY IF EXISTS "Membres envoient dans les canaux" ON public.channel_messages;
CREATE POLICY "Membres envoient dans les canaux"
ON public.channel_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND validated = true)
);

-- Activer Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;

-- ── Canaux prédéfinis ────────────────────────────────────────────────────────
INSERT INTO public.channels (name, slug, description, icon, min_role) VALUES
  ('Infos Général',  'general',  'Annonces et informations de l''église', '📢', 'visiteur'),
  ('Canal Pasteurs', 'pasteurs', 'Réservé à l''équipe pastorale',         '👑', 'pasteur'),
  ('Équipe Média',   'media',    'Coordination streaming et médias',       '📹', 'membre'),
  ('Chorale',        'chorale',  'Équipe musicale',                        '🎵', 'membre'),
  ('La Jeunesse',    'jeunesse', 'Activités et annonces jeunesse',         '🔥', 'membre')
ON CONFLICT (slug) DO NOTHING;
