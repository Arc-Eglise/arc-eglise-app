-- Migration : mode du verset du jour (automatique ou manuel)
-- À exécuter dans : https://supabase.com/dashboard/project/fobyvhulyjxwbhusouqz/sql

INSERT INTO site_settings (key, value) VALUES
  ('verset_mode',          'auto'),   -- 'auto' | 'manuel'
  ('verset_auto_interval', '24')      -- '24' | '48' (heures)
ON CONFLICT (key) DO NOTHING;
