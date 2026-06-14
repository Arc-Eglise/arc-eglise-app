-- Auto-validation : Admin et groupe Support
-- À exécuter dans Supabase → SQL Editor

-- 1. Trigger : valide automatiquement quand role='admin' ou groups contient 'support'
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

-- 2. Valider les comptes existants Admin et Support
UPDATE profiles
SET validated = true
WHERE role = 'admin'
   OR 'support' = ANY(COALESCE(groups, '{}'::text[]));
