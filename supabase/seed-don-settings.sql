-- Lot 29 — Coordonnées de don (site_settings)
-- À exécuter dans le SQL Editor Supabase :
-- https://supabase.com/dashboard/project/fobyvhulyjxwbhusouqz/sql
--
-- Remplacer les valeurs par les vraies coordonnées avant d'exécuter.
-- Ces valeurs sont stockées côté serveur uniquement et jamais exposées
-- dans le code source.

INSERT INTO site_settings (key, value)
VALUES
  ('don_twint_numero', ''),   -- ex: +41 79 123 45 67
  ('don_iban',         '')    -- ex: CH56 0483 5012 3456 7800 9
ON CONFLICT (key) DO NOTHING;
