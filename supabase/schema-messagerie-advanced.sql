-- ─────────────────────────────────────────────────────────
-- Messagerie avancée : épinglage + réactions
-- ─────────────────────────────────────────────────────────

-- 1. Colonne is_pinned sur messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

-- 2. Table réactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL CHECK (char_length(emoji) <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select" ON public.message_reactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reactions_insert" ON public.message_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reactions_delete" ON public.message_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reactions_message_idx ON public.message_reactions (message_id);

-- 3. Realtime sur les deux tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- public.messages est déjà membre, pas besoin de le rajouter
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 4. RLS UPDATE sur messages pour epinglage
-- (les participants d'une conversation peuvent modifier is_pinned)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='messages_update_pinned'
  ) THEN
    EXECUTE '
      CREATE POLICY "messages_update_pinned" ON public.messages
        FOR UPDATE TO authenticated
        USING (
          conversation_id IN (
            SELECT conversation_id FROM public.conversation_participants
            WHERE user_id = auth.uid()
          )
        )
        WITH CHECK (
          conversation_id IN (
            SELECT conversation_id FROM public.conversation_participants
            WHERE user_id = auth.uid()
          )
        )
    ';
  END IF;
END;
$$;
