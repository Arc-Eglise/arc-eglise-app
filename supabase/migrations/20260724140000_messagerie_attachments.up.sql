-- Messagerie — pièces jointes (M2)
-- Colonnes sur messages + bucket Storage public en lecture, upload authentifié.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url  TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT;  -- 'image' | 'file'
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Bucket de stockage
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques Storage
DO $$ BEGIN
  CREATE POLICY "msg_attach_auth_upload" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'message-attachments');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "msg_attach_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'message-attachments');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "msg_attach_owner_delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'message-attachments' AND owner = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
