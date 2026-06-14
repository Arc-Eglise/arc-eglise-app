-- Phase 2 : CRM + Messagerie interne
-- À exécuter dans Supabase → SQL Editor

-- ── CRM : Notes pastorales ────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES profiles(id),
  content    TEXT        NOT NULL CHECK (char_length(content) <= 2000),
  type       TEXT        NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE member_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Pasteur voient les notes"
ON member_notes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','pasteur')));

CREATE POLICY "Admin/Pasteur créent des notes"
ON member_notes FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','pasteur')));

CREATE POLICY "Auteurs suppriment leurs notes"
ON member_notes FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- ── Messagerie ────────────────────────────────────────────────
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

CREATE TABLE IF NOT EXISTS messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES profiles(id),
  content         TEXT        NOT NULL CHECK (char_length(content) <= 2000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies conversations
CREATE POLICY "Participants voient leurs conversations"
ON conversations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = id AND user_id = auth.uid()));

-- Policies participants
CREATE POLICY "Participants voient les membres des conversations"
ON conversation_participants FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()));

CREATE POLICY "Membres rejoignent une conversation"
ON conversation_participants FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (validated = true OR role IN ('admin','pasteur'))));

CREATE POLICY "Participants mettent à jour leur last_read"
ON conversation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Policies messages
CREATE POLICY "Participants lisent les messages"
ON messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

CREATE POLICY "Participants envoient des messages"
ON messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);

-- Activer Realtime pour les messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
