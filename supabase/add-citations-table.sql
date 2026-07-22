-- Table citations — citation affichée sur la page de connexion
CREATE TABLE IF NOT EXISTS citations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  texte        TEXT NOT NULL,
  auteur       TEXT NOT NULL,
  role_mention TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT false,
  ordre        INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_by   UUID REFERENCES auth.users(id)
);

ALTER TABLE citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "citations_public_read" ON citations FOR SELECT USING (true);

-- Seed — citation initiale (migrée depuis le code en dur)
INSERT INTO citations (texte, auteur, role_mention, is_active, ordre) VALUES (
  'Construisons des générations de disciples qui influencent positivement leur environnement.',
  'Pasteur Pedro Obova',
  'Fondateur ARC',
  true,
  0
);

-- Nouvelles clés site_settings pour la section Notre Histoire
INSERT INTO site_settings (key, value) VALUES
  ('histoire_titre',     'Une église enracinée'),
  ('histoire_titre_em',  'dans la Parole'),
  ('valeur_1_icon',  'la-parole'),
  ('valeur_1_titre', 'La Parole'),
  ('valeur_1_texte', 'La Bible est notre autorité absolue et notre guide quotidien.'),
  ('valeur_2_icon',  'priere-bible'),
  ('valeur_2_titre', 'La Prière'),
  ('valeur_2_texte', 'Nous sommes une maison de prière et d''intercession.'),
  ('valeur_3_icon',  'amour'),
  ('valeur_3_titre', 'L''Amour'),
  ('valeur_3_texte', 'Nous nous aimons comme Christ nous a aimés, sans conditions.'),
  ('valeur_4_icon',  'rejoindre-famille'),
  ('valeur_4_titre', 'La Mission'),
  ('valeur_4_texte', 'Nous allons vers toutes les nations pour proclamer l''Évangile.')
ON CONFLICT (key) DO NOTHING;
