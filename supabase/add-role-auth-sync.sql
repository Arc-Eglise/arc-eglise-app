-- Synchronisation bidirectionnelle profiles.role ↔ auth.users.raw_app_meta_data
-- Après exécution : le rôle est visible et modifiable depuis
-- Supabase Dashboard → Authentication → Users → clic sur un user → App metadata

-- ── 1. profiles → auth (changement de rôle dans l'app) ─────────
CREATE OR REPLACE FUNCTION sync_role_to_auth_metadata()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role::text)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_role_to_auth ON profiles;
CREATE TRIGGER trg_sync_role_to_auth
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_to_auth_metadata();

-- ── 2. auth → profiles (changement depuis le dashboard Supabase) ─
CREATE OR REPLACE FUNCTION sync_auth_metadata_to_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_role TEXT;
BEGIN
  new_role := NEW.raw_app_meta_data->>'role';
  IF new_role IS NOT NULL
     AND new_role IS DISTINCT FROM (OLD.raw_app_meta_data->>'role') THEN
    BEGIN
      UPDATE profiles
      SET role = new_role::user_role
      WHERE id = NEW.id;
    EXCEPTION WHEN invalid_text_representation THEN
      NULL; -- valeur invalide ignorée (ex: faute de frappe)
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_auth_to_role ON auth.users;
CREATE TRIGGER trg_sync_auth_to_role
  AFTER UPDATE OF raw_app_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_metadata_to_role();

-- ── 3. Synchronisation initiale de tous les profils existants ───
UPDATE auth.users u
SET raw_app_meta_data =
  COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role::text)
FROM profiles p
WHERE u.id = p.id;
