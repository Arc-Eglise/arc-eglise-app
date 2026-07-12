-- Migration : mode du verset du jour (automatique ou manuel)
-- À exécuter dans : https://supabase.com/dashboard/project/fobyvhulyjxwbhusouqz/sql

INSERT INTO site_settings (key, value) VALUES
  ('verset_mode',              'auto'),  -- 'auto' | 'thematique' | 'manuel'
  ('verset_auto_interval',     '24'),   -- '24' | '48' (heures)
  ('verset_manuel_expires_at', ''),     -- ISO date — expiration du verset manuel
  ('verset_theme',             'foi'),  -- thème actif en mode thématique
  ('verset_theme_interval',    '24')    -- intervalle horaire du mode thématique (1–24 heures)
ON CONFLICT (key) DO NOTHING;
