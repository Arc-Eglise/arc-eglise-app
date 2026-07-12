-- ──────────────────────────────────────────────────────────────────
--  ARC — Bannière d'annonce : paramètres personnalisables
--  Script idempotent (safe à ré-exécuter)
-- ──────────────────────────────────────────────────────────────────

INSERT INTO site_settings (key, value) VALUES
  ('announcement_enabled',         'true'),
  ('announcement_welcome',         'Bienvenue à l''ARC — venez tels que vous êtes'),
  ('announcement_show_schedules',  'true'),
  ('announcement_show_events',     'true'),
  ('announcement_show_verset',     'true')
ON CONFLICT (key) DO NOTHING;
