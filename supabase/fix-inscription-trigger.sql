-- Mise à jour du trigger handle_new_user pour inclure le champ country
-- À exécuter dans Supabase Dashboard > SQL Editor

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
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
