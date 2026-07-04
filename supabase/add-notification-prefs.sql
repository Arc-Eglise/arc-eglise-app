-- Ajouter les préférences de notifications au profil utilisateur
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{
    "dm": true,
    "culte": true,
    "priere": true,
    "verset": true,
    "events": true
  }'::jsonb;
