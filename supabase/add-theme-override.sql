-- ═══════════════════════════════════════════════════════════════
--  ARC — Thème de couleur temporaire du site vitrine
--  À exécuter dans : Supabase > SQL Editor > New Query
-- ═══════════════════════════════════════════════════════════════

INSERT INTO site_settings (key, value) VALUES
  ('theme_accent_color', ''),
  ('theme_accent_until', '')
ON CONFLICT (key) DO NOTHING;
