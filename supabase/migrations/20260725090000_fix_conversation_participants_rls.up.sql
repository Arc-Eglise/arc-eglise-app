-- Correctif RLS conversation_participants (cause du 404 à l'ouverture d'une conversation)
-- Remplace les policies SELECT récursives/trop restrictives par une policy propre
-- basée sur une fonction SECURITY DEFINER (anti-récursion). APPLIQUÉ en prod 2026-07-25.

CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$fn$;

DROP POLICY IF EXISTS "Membres validés lisent leurs participations" ON conversation_participants;
DROP POLICY IF EXISTS "Participants voient les membres des conversations" ON conversation_participants;

CREATE POLICY cp_select_clean ON conversation_participants
  FOR SELECT USING (user_id = auth.uid() OR is_conversation_participant(conversation_id));
