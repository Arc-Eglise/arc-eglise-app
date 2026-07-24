-- CRM pastoral — Journal d'interactions (Phase 1)
-- Enregistre chaque contact avec un membre (appel, visite, email, WhatsApp…).
-- Accès aligné sur l'équipe pastorale (admin | pasteur | fonction suivi), comme member_notes.

CREATE TABLE IF NOT EXISTS member_interactions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_id    UUID                 REFERENCES profiles(id) ON DELETE SET NULL,
  type         TEXT        NOT NULL DEFAULT 'appel',
  direction    TEXT        NOT NULL DEFAULT 'sortant',
  subject      TEXT,
  content      TEXT,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_interaction_type      CHECK (type IN ('appel','visite','email','whatsapp','sms','rencontre','autre')),
  CONSTRAINT chk_interaction_direction CHECK (direction IN ('entrant','sortant'))
);

CREATE INDEX IF NOT EXISTS idx_member_interactions_member
  ON member_interactions (member_id, occurred_at DESC);

ALTER TABLE member_interactions ENABLE ROW LEVEL SECURITY;

-- Prédicat commun : appartenir à l'équipe pastorale.
-- (admin/pasteur, ou fonction "suivi" dans profiles.groups[])
CREATE POLICY member_interactions_select ON member_interactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('admin','pasteur') OR 'suivi' = ANY(p.groups))
    )
  );

CREATE POLICY member_interactions_insert ON member_interactions
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('admin','pasteur') OR 'suivi' = ANY(p.groups))
    )
  );

-- Suppression : l'auteur de l'interaction uniquement.
CREATE POLICY member_interactions_delete ON member_interactions
  FOR DELETE USING (author_id = auth.uid());
