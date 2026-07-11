-- ══════════════════════════════════════════════════════════════
--  ARC — Fix Kylian Luzolo
--  UID  : bebe2fa4-2ca9-4b0d-85fe-34407e5fc215
--  Email: kylianluzolo77@gmail.com
--  Cible: role=membre, validated=true, groups=[jeunesse, chorale]
--  À exécuter dans : Supabase > SQL Editor > New Query
-- ══════════════════════════════════════════════════════════════

BEGIN;

UPDATE profiles
SET
  role         = 'membre',
  validated    = true,
  validated_at = NOW(),
  groups       = ARRAY['jeunesse', 'chorale']
WHERE id = 'bebe2fa4-2ca9-4b0d-85fe-34407e5fc215';

-- Vérification immédiate
SELECT id, first_name, last_name, email, role, groups, validated, validated_at
FROM profiles
WHERE id = 'bebe2fa4-2ca9-4b0d-85fe-34407e5fc215';

COMMIT;
