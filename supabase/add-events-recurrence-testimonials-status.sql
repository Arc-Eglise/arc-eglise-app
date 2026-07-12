-- Migration : récurrence événements + statut témoignages membres
-- À exécuter dans : https://supabase.com/dashboard/project/fobyvhulyjxwbhusouqz/sql

-- ── Événements récurrents ────────────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_type     TEXT    DEFAULT 'none';
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;

-- Contrainte optionnelle
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_recurrence_type_check;
ALTER TABLE events ADD CONSTRAINT events_recurrence_type_check
  CHECK (recurrence_type IN ('none','daily','weekly','monthly','yearly','indefinite'));

-- ── Témoignages — soumission membre + statut validation ─────────────────────
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'approved';
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Les témoignages existants restent approuvés
UPDATE testimonials SET status = 'approved' WHERE status IS NULL;
