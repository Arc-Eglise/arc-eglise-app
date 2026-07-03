-- Fix : forcer validated=true et role='admin' pour le compte admin
UPDATE profiles
SET validated = true,
    role      = 'admin'
WHERE email = 'jaise.buka.dilu@gmail.com';

-- Recréer le trigger auto-validation au cas où il manque
CREATE OR REPLACE FUNCTION auto_validate_special_roles()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role = 'admin' OR ('support' = ANY(COALESCE(NEW.groups, '{}'::text[]))) THEN
    NEW.validated := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_auto_validate ON profiles;
CREATE TRIGGER profiles_auto_validate
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION auto_validate_special_roles();

-- Valider tous les comptes admin et support existants
UPDATE profiles
SET validated = true
WHERE role = 'admin'
   OR 'support' = ANY(COALESCE(groups, '{}'::text[]));
