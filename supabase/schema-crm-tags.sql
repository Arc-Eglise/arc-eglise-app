-- CRM : ajout colonne tags sur les profils membres
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crm_tags TEXT[] DEFAULT '{}';

-- Politique UPDATE pour que admin/pasteur puisse modifier les tags CRM
-- (sans toucher au UPDATE existant qui laisse chaque user modifier son propre profil)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='profiles' AND policyname='profiles_update_crm_admin'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "profiles_update_crm_admin" ON public.profiles
        FOR UPDATE TO authenticated
        USING (EXISTS (
          SELECT 1 FROM public.profiles p2
          WHERE p2.id = auth.uid() AND p2.role::text IN ('admin','pasteur')
        ))
    $p$;
  END IF;
END;
$$;
