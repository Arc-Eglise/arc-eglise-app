-- Initialisation et mise à jour des liens réseaux sociaux
-- Exécuter dans le SQL Editor Supabase :
-- https://supabase.com/dashboard/project/fobyvhulyjxwbhusouqz/sql

INSERT INTO site_settings (key, value) VALUES
  ('social_facebook',     'https://www.facebook.com/royaumedechrist/?locale=fr_FR'),
  ('social_instagram',    'https://www.instagram.com/arceglise?igsh=MXVieDl6cXU4aGhocQ=='),
  ('social_youtube',      ''),
  ('social_whatsapp',     ''),
  ('social_zoom',         ''),
  ('social_custom_links', '[]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  WHERE site_settings.key IN ('social_facebook','social_instagram')
     OR site_settings.value = '';
