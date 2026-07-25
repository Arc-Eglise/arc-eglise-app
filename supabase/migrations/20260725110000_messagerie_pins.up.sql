-- Messagerie — épinglage des messages (finalisation messagerie unifiée)
-- Ajoute la colonne is_pinned + une policy UPDATE permettant à tout participant
-- de la conversation d'épingler / désépingler. La table message_reactions existe
-- déjà (réactions déjà fonctionnelles), donc rien à faire de ce côté.
-- Aucune donnée existante n'est touchée.

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

-- Tout participant peut épingler/désépingler (s'appuie sur la fonction
-- SECURITY DEFINER is_conversation_participant pour éviter toute récursion RLS).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages'
      AND policyname = 'messages_update_pinned'
  ) THEN
    EXECUTE '
      CREATE POLICY "messages_update_pinned" ON public.messages
        FOR UPDATE TO authenticated
        USING (public.is_conversation_participant(conversation_id))
        WITH CHECK (public.is_conversation_participant(conversation_id))
    ';
  END IF;
END;
$$;
