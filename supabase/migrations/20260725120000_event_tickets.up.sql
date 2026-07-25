-- Billetterie événements — QR codes (réservations gratuites RSVP ; achats payants
-- viendront après le 3 août, gel Stripe). Un billet = un QR = une place.
-- Aucune donnée existante touchée.

CREATE TABLE IF NOT EXISTS public.event_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,  -- membre ayant réservé
  holder_name TEXT NOT NULL,                 -- nom du participant imprimé sur le billet
  email       TEXT NOT NULL,                 -- destinataire du mail QR
  code        TEXT NOT NULL UNIQUE,          -- jeton encodé dans le QR (URL de vérif)
  seat_index  INT NOT NULL DEFAULT 1,        -- n° de place dans la réservation (1..N)
  status      TEXT NOT NULL DEFAULT 'valid'  -- valid | used | cancelled
              CHECK (status IN ('valid','used','cancelled')),
  used_at     TIMESTAMPTZ,
  used_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,  -- qui a scanné
  source      TEXT NOT NULL DEFAULT 'rsvp'   -- rsvp | registration | purchase
              CHECK (source IN ('rsvp','registration','purchase')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_tickets_event_idx ON public.event_tickets (event_id);
CREATE INDEX IF NOT EXISTS event_tickets_user_idx  ON public.event_tickets (user_id);

ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;

-- Le membre voit ses propres billets ; l'équipe (admin/pasteur) voit et gère tout.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_tickets' AND policyname='tickets_select_own_or_staff') THEN
    CREATE POLICY "tickets_select_own_or_staff" ON public.event_tickets
      FOR SELECT TO authenticated
      USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','pasteur'))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_tickets' AND policyname='tickets_staff_write') THEN
    CREATE POLICY "tickets_staff_write" ON public.event_tickets
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','pasteur')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('admin','pasteur')));
  END IF;
END $$;
