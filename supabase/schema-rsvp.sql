-- ─────────────────────────────────────────────────────────
-- Migration : events + event_rsvp
-- À exécuter dans Supabase SQL Editor
-- ─────────────────────────────────────────────────────────

-- 0. Fonction update_updated_at (si inexistante)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 1. Table events
CREATE TABLE IF NOT EXISTS public.events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  date         DATE NOT NULL,
  time_start   TIME NOT NULL DEFAULT '09:30',
  time_end     TIME,
  location     TEXT NOT NULL DEFAULT 'Av. Charles-Naine 39, La Chaux-de-Fonds',
  capacity     INT,
  price_chf    NUMERIC(8,2) DEFAULT 0,
  tags         TEXT[] DEFAULT '{}',
  is_public    BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'events_updated_at') THEN
    CREATE TRIGGER events_updated_at
      BEFORE UPDATE ON public.events
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='events' AND policyname='events_public_read') THEN
    CREATE POLICY "events_public_read" ON public.events
      FOR SELECT USING (is_published = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='events' AND policyname='events_admin_all') THEN
    CREATE POLICY "events_admin_all" ON public.events
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role::text IN ('admin','pasteur')
      ));
  END IF;
END $$;

-- 2. Table event_rsvp
CREATE TABLE IF NOT EXISTS public.event_rsvp (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('going','maybe','declined')),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'event_rsvp_updated_at') THEN
    CREATE TRIGGER event_rsvp_updated_at
      BEFORE UPDATE ON public.event_rsvp
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

ALTER TABLE public.event_rsvp ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_rsvp' AND policyname='rsvp_select') THEN
    CREATE POLICY "rsvp_select" ON public.event_rsvp
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_rsvp' AND policyname='rsvp_insert') THEN
    CREATE POLICY "rsvp_insert" ON public.event_rsvp
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_rsvp' AND policyname='rsvp_update') THEN
    CREATE POLICY "rsvp_update" ON public.event_rsvp
      FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_rsvp' AND policyname='rsvp_delete') THEN
    CREATE POLICY "rsvp_delete" ON public.event_rsvp
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
