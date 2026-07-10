-- ══════════════════════════════════════════════════════════════
--  ARC — Fix inscription v2 — PARTIE 1/3 : Fonctions + Triggers
--  Exécuter en premier, attendre "Success", puis partie 2.
-- ══════════════════════════════════════════════════════════════

-- Helper : rôle de l'utilisateur courant (bypasse RLS)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid();
$$;

-- Helper : fonctions de l'utilisateur courant (bypasse RLS)
CREATE OR REPLACE FUNCTION public.get_my_groups()
RETURNS TEXT[] LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT COALESCE(groups, '{}') FROM profiles WHERE id = auth.uid();
$$;

-- Helper : est-ce que l'utilisateur courant est membre validé ?
CREATE OR REPLACE FUNCTION public.is_validated_member()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT COALESCE(validated, false) FROM profiles WHERE id = auth.uid();
$$;

-- Trigger inscription : crée le profil quand un user s'inscrit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name, country)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',  ''),
    COALESCE(NEW.raw_user_meta_data->>'country',    '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger : auto-valider admin/pasteur sans intervention manuelle
CREATE OR REPLACE FUNCTION public.auto_validate_privileged_roles()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role::text IN ('admin', 'pasteur') THEN
    NEW.validated    := true;
    NEW.validated_at := COALESCE(NEW.validated_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_auto_validate ON profiles;
CREATE TRIGGER profiles_auto_validate
  BEFORE INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_validate_privileged_roles();

-- Vérification
SELECT 'handle_new_user' AS fn, security_type FROM information_schema.routines WHERE routine_name='handle_new_user' AND routine_schema='public'
UNION ALL
SELECT 'get_my_role', security_type FROM information_schema.routines WHERE routine_name='get_my_role' AND routine_schema='public'
UNION ALL
SELECT 'trigger on_auth_user_created', action_timing::text FROM information_schema.triggers WHERE trigger_name='on_auth_user_created';
