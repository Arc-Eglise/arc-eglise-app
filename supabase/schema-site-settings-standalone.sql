-- ──────────────────────────────────────────────────────────────────
--  ARC — site_settings : création + RLS + valeurs initiales + contact
--  Script autonome et idempotent (safe à ré-exécuter)
--  Supabase Dashboard > SQL Editor > New Query > Run
-- ──────────────────────────────────────────────────────────────────

-- 1. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Activer RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 3. Policies (drop + recreate pour idempotence)
DROP POLICY IF EXISTS "Paramètres lisibles par tous"    ON site_settings;
DROP POLICY IF EXISTS "Admin — modifier paramètres"     ON site_settings;
DROP POLICY IF EXISTS "Admin — insérer paramètres"      ON site_settings;

CREATE POLICY "Paramètres lisibles par tous"
  ON site_settings FOR SELECT USING (true);

CREATE POLICY "Admin — modifier paramètres"
  ON site_settings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin','pasteur')
  ));

CREATE POLICY "Admin — insérer paramètres"
  ON site_settings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin','pasteur')
  ));

-- 4. Valeurs initiales (ON CONFLICT DO NOTHING = safe si déjà présentes)
INSERT INTO site_settings (key, value) VALUES
  ('verset_du_jour',   'Car Dieu a tant aimé le monde qu''il a donné son Fils unique... — Jean 3:16'),
  ('verset_reference', 'Jean 3:16'),
  ('hero_subtitle',    'Une communauté évangélique vivante, fondée sur la Parole de Dieu, ouverte à toutes les nations.'),
  ('culte_1_label',    'Dimanche 09h30 — Culte principal'),
  ('culte_2_label',    'Dimanche 17h00 — Culte du soir'),
  ('culte_3_label',    'Mercredi 19h00 — Prière & Parole')
ON CONFLICT (key) DO NOTHING;

-- 5. Coordonnées et réseaux sociaux (nouvelles clés)
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
