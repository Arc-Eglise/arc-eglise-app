-- Rollback messagerie pièces jointes (M2)

DROP POLICY IF EXISTS "msg_attach_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "msg_attach_public_read" ON storage.objects;
DROP POLICY IF EXISTS "msg_attach_auth_upload" ON storage.objects;
-- Le bucket et les objets ne sont pas supprimés automatiquement (données).
ALTER TABLE messages DROP COLUMN IF EXISTS attachment_name;
ALTER TABLE messages DROP COLUMN IF EXISTS attachment_type;
ALTER TABLE messages DROP COLUMN IF EXISTS attachment_url;
