-- Migration : table contact_messages (formulaire de contact public)
-- À exécuter via: node scripts/supabase-sql.cjs supabase/create-contact-messages.sql

CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT        NOT NULL CHECK (char_length(first_name) <= 100),
  last_name  TEXT        NOT NULL CHECK (char_length(last_name)  <= 100),
  email      TEXT        NOT NULL CHECK (char_length(email)      <= 255),
  subject    TEXT        NOT NULL DEFAULT 'Information générale',
  message    TEXT        NOT NULL CHECK (char_length(message)    <= 5000),
  read       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins voient les messages de contact" ON contact_messages;
CREATE POLICY "Admins voient les messages de contact"
ON contact_messages FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins marquent comme lu" ON contact_messages;
CREATE POLICY "Admins marquent comme lu"
ON contact_messages FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
