-- Rollback messagerie groupes (M4)

ALTER TABLE conversations DROP COLUMN IF EXISTS created_by;
ALTER TABLE conversations DROP COLUMN IF EXISTS is_group;
ALTER TABLE conversations DROP COLUMN IF EXISTS name;
