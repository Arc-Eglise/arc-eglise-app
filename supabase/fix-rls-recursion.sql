-- Fix: boucle infinie RLS sur conversation_participants
-- La politique originale se référençait elle-même → infinite recursion 42P17
-- Solution : fonction SECURITY DEFINER qui bypasse le RLS

CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

-- conversation_participants SELECT : supprime l'auto-référence
DROP POLICY IF EXISTS "Participants voient les membres des conversations" ON conversation_participants;
CREATE POLICY "Participants voient les membres des conversations"
ON conversation_participants FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id));

-- messages SELECT/INSERT : utilise la même fonction
DROP POLICY IF EXISTS "Participants lisent les messages" ON messages;
CREATE POLICY "Participants lisent les messages"
ON messages FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS "Participants envoient des messages" ON messages;
CREATE POLICY "Participants envoient des messages"
ON messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_conversation_participant(conversation_id));

-- conversations SELECT
DROP POLICY IF EXISTS "Participants voient leurs conversations" ON conversations;
CREATE POLICY "Participants voient leurs conversations"
ON conversations FOR SELECT TO authenticated
USING (public.is_conversation_participant(id));
