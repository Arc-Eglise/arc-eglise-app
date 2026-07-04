-- Migration : création des tables manquantes
-- À exécuter via: node scripts/supabase-sql.cjs supabase/migrate-missing-tables.sql

-- ── 1. TABLE prayer_requests ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS prayer_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL CHECK (char_length(title) <= 200),
  description  TEXT        CHECK (char_length(description) <= 1000),
  is_anonymous BOOLEAN     NOT NULL DEFAULT false,
  is_answered  BOOLEAN     NOT NULL DEFAULT false,
  prayer_count INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS prayer_updated_at ON prayer_requests;
CREATE TRIGGER prayer_updated_at
  BEFORE UPDATE ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP POLICY IF EXISTS "Membres voient toutes les prières" ON prayer_requests;
CREATE POLICY "Membres voient toutes les prières"
ON prayer_requests FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (validated = true OR role IN ('admin', 'pasteur'))
  )
);

DROP POLICY IF EXISTS "Membres créent leurs prières" ON prayer_requests;
CREATE POLICY "Membres créent leurs prières"
ON prayer_requests FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (validated = true OR role IN ('admin', 'pasteur'))
  )
);

DROP POLICY IF EXISTS "Auteurs modifient leurs prières" ON prayer_requests;
CREATE POLICY "Auteurs modifient leurs prières"
ON prayer_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Auteurs suppriment leurs prières" ON prayer_requests;
CREATE POLICY "Auteurs suppriment leurs prières"
ON prayer_requests FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ── 2. TABLE member_notes (CRM) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS member_notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES profiles(id),
  content    TEXT        NOT NULL CHECK (char_length(content) <= 2000),
  type       TEXT        NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE member_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/Pasteur voient les notes" ON member_notes;
CREATE POLICY "Admin/Pasteur voient les notes"
ON member_notes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','pasteur')));

DROP POLICY IF EXISTS "Admin/Pasteur créent des notes" ON member_notes;
CREATE POLICY "Admin/Pasteur créent des notes"
ON member_notes FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','pasteur')));

DROP POLICY IF EXISTS "Auteurs suppriment leurs notes" ON member_notes;
CREATE POLICY "Auteurs suppriment leurs notes"
ON member_notes FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- ── 3. TABLE conversations (messagerie) ──────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- ── 4. Remplacer l'ancienne table messages (0 données) ───────────
DROP TABLE IF EXISTS messages CASCADE;

CREATE TABLE messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES profiles(id),
  content         TEXT        NOT NULL CHECK (char_length(content) <= 2000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies conversations
DROP POLICY IF EXISTS "Participants voient leurs conversations" ON conversations;
CREATE POLICY "Participants voient leurs conversations"
ON conversations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = id AND user_id = auth.uid()));

-- Policies participants
DROP POLICY IF EXISTS "Participants voient les membres des conversations" ON conversation_participants;
CREATE POLICY "Participants voient les membres des conversations"
ON conversation_participants FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "Membres rejoignent une conversation" ON conversation_participants;
CREATE POLICY "Membres rejoignent une conversation"
ON conversation_participants FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (validated = true OR role IN ('admin','pasteur'))));

DROP POLICY IF EXISTS "Participants mettent à jour leur last_read" ON conversation_participants;
CREATE POLICY "Participants mettent à jour leur last_read"
ON conversation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Policies messages
DROP POLICY IF EXISTS "Participants lisent les messages" ON messages;
CREATE POLICY "Participants lisent les messages"
ON messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Participants envoient des messages" ON messages;
CREATE POLICY "Participants envoient des messages"
ON messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);

-- Activer Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
