-- ═══════════════════════════════════════════════════════════════
--  Migration : Suppression du RÔLE 'support' de l'enum user_role
--  CDC v3.5 — Juillet 2026
--  'support' reste une FONCTION (profiles.groups[]), pas un rôle.
--
--  ⚠ AVANT D'APPLIQUER : vérifier qu'aucun compte a role='support'
--    SELECT id, email, role FROM profiles WHERE role = 'support';
--  Si des comptes existent → migrer vers 'membre' ou 'visiteur' selon
--  le cas, puis relancer cette migration.
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- 1. Migrer les comptes restants (sécurité — normalement 0)
UPDATE profiles
SET role = 'membre'::text::user_role
WHERE role = 'support'::text::user_role;

-- 2. Créer le nouveau type sans 'support'
CREATE TYPE user_role_new AS ENUM ('admin', 'pasteur', 'membre', 'visiteur');

-- 3. Basculer la colonne vers le nouveau type
ALTER TABLE profiles
  ALTER COLUMN role TYPE user_role_new
  USING role::text::user_role_new;

-- 4. Supprimer l'ancien type et renommer
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- 5. Mettre à jour la valeur par défaut
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'visiteur';

COMMIT;
