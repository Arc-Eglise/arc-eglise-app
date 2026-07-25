DROP POLICY IF EXISTS "messages_update_pinned" ON public.messages;
ALTER TABLE public.messages DROP COLUMN IF EXISTS is_pinned;
