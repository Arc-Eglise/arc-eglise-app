-- ══════════════════════════════════════════════════════════════
--  ARC — Fix Auth Admin (v2)
--  À exécuter dans : Supabase > SQL Editor > New Query
-- ══════════════════════════════════════════════════════════════

-- 1. Débloquer immédiatement le compte admin
UPDATE profiles
SET validated   = true,
    role        = 'admin',
    validated_at = NOW()
WHERE email = 'jaise.buka.dilu@gmail.com';

-- 2. Trigger : auto-valider admin et pasteur sans validation manuelle
CREATE OR REPLACE FUNCTION auto_validate_privileged_roles()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Admin et Pasteur ne passent jamais par la validation manuelle
  IF NEW.role IN ('admin', 'pasteur') THEN
    NEW.validated    := true;
    NEW.validated_at := COALESCE(NEW.validated_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_auto_validate ON profiles;
CREATE TRIGGER profiles_auto_validate
  BEFORE INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION auto_validate_privileged_roles();

-- 3. Corriger tous les admin/pasteur existants non validés
UPDATE profiles
SET validated    = true,
    validated_at = COALESCE(validated_at, NOW())
WHERE role IN ('admin', 'pasteur')
  AND validated = false;
