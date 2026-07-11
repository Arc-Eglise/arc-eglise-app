-- Lot 28 : entrées site_settings pour la photo vitrine
-- À exécuter dans le SQL Editor Supabase : https://supabase.com/dashboard/project/fobyvhulyjxwbhusouqz/sql

INSERT INTO site_settings (key, value)
VALUES
  ('about_photo_url',     ''),
  ('about_photo_caption', 'Photo — Pasteur Pedro Obova & l''équipe')
ON CONFLICT (key) DO NOTHING;
