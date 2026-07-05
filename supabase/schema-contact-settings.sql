-- Contact, horaires et réseaux sociaux dans site_settings
-- À appliquer dans Supabase Dashboard SQL Editor
-- (ON CONFLICT DO NOTHING = sûr à ré-exécuter)

INSERT INTO site_settings (key, value) VALUES
  ('contact_address',  'Av. Charles-Naine 39
2300 La Chaux-de-Fonds, Suisse'),
  ('contact_email',    'contact@arc-eglise.ch'),
  ('contact_horaires', 'Dimanche 09h30 & 17h00
Mercredi 19h00 — Prière & Parole'),
  ('contact_map_url',  'https://maps.google.com/?q=Av+Charles-Naine+39+La+Chaux-de-Fonds'),
  ('social_facebook',  'https://www.facebook.com/ARCEgliseCDF'),
  ('social_instagram', 'https://www.instagram.com/arc.eglise'),
  ('social_youtube',   'https://www.youtube.com/@ARCEglise'),
  ('social_whatsapp',  'https://wa.me/41000000000')
ON CONFLICT (key) DO NOTHING;
