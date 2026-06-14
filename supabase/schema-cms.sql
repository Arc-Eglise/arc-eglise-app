-- ═══════════════════════════════════════════════════════════════
--  ARC — Schéma CMS (Contenu dynamique)
--  À exécuter dans : Supabase > SQL Editor > New Query
--  Après avoir exécuté schema.sql
-- ═══════════════════════════════════════════════════════════════

-- ── 1. TABLE sermons ────────────────────────────────────────────
CREATE TABLE sermons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  pastor       TEXT NOT NULL DEFAULT 'Past. Pedro Obova',
  reference    TEXT,                         -- ex: "1 Corinthiens 13"
  series       TEXT,
  excerpt      TEXT,
  youtube_id   TEXT,                         -- ID vidéo YouTube (pas l'URL complète)
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  is_featured  BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER sermons_updated_at
  BEFORE UPDATE ON sermons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. TABLE events ─────────────────────────────────────────────
CREATE TABLE events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  date         DATE NOT NULL,
  time_start   TIME NOT NULL DEFAULT '09:30',
  time_end     TIME,
  location     TEXT NOT NULL DEFAULT 'Av. Charles-Naine 39, La Chaux-de-Fonds',
  capacity     INT,
  price_chf    NUMERIC(8,2) DEFAULT 0,
  tags         TEXT[] DEFAULT '{}',          -- ex: ['Gratuit', 'Live']
  is_public    BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 3. TABLE event_registrations ────────────────────────────────
CREATE TABLE event_registrations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id),
  first_name TEXT,
  last_name  TEXT,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, email)
);

-- ── 4. TABLE team_members ───────────────────────────────────────
CREATE TABLE team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  role_label  TEXT NOT NULL,                 -- "Pasteur Principal"
  bio         TEXT,
  initials    TEXT NOT NULL,                 -- "PO"
  avatar_url  TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. TABLE site_settings ──────────────────────────────────────
CREATE TABLE site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (key, value) VALUES
  ('verset_du_jour', 'Car Dieu a tant aimé le monde qu''il a donné son Fils unique... — Jean 3:16'),
  ('verset_reference', 'Jean 3:16'),
  ('hero_subtitle', 'Une communauté évangélique vivante, fondée sur la Parole de Dieu, ouverte à toutes les nations.'),
  ('culte_1_label', 'Dimanche 09h30 — Culte principal'),
  ('culte_2_label', 'Dimanche 17h00 — Culte du soir'),
  ('culte_3_label', 'Mercredi 19h00 — Prière & Parole');

-- ── 6. RLS — sermons ────────────────────────────────────────────
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sermons publics lisibles par tous"
  ON sermons FOR SELECT
  USING (is_published = true);

CREATE POLICY "CMS — créer sermon"
  ON sermons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role IN ('admin','pasteur') OR 'media' = ANY(groups) OR 'communication' = ANY(groups))
    )
  );

CREATE POLICY "CMS — modifier sermon"
  ON sermons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role IN ('admin','pasteur') OR 'media' = ANY(groups) OR 'communication' = ANY(groups))
    )
  );

CREATE POLICY "CMS — supprimer sermon"
  ON sermons FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','pasteur'))
  );

-- ── 7. RLS — events ─────────────────────────────────────────────
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Événements publics lisibles par tous"
  ON events FOR SELECT
  USING (is_published = true AND is_public = true);

CREATE POLICY "Membres voient tous les événements"
  ON events FOR SELECT
  USING (
    is_published = true
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND validated = true)
  );

CREATE POLICY "CMS — créer événement"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role IN ('admin','pasteur') OR 'media' = ANY(groups) OR 'communication' = ANY(groups))
    )
  );

CREATE POLICY "CMS — modifier événement"
  ON events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role IN ('admin','pasteur') OR 'media' = ANY(groups) OR 'communication' = ANY(groups))
    )
  );

-- ── 8. RLS — team_members ───────────────────────────────────────
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Équipe lisible par tous"
  ON team_members FOR SELECT
  USING (is_active = true);

CREATE POLICY "CMS — gérer équipe"
  ON team_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','pasteur'))
  );

-- ── 9. RLS — event_registrations ────────────────────────────────
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inscrire à un événement"
  ON event_registrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Voir ses propres inscriptions"
  ON event_registrations FOR SELECT
  USING (user_id = auth.uid() OR email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- ── 10. RLS — site_settings ─────────────────────────────────────
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paramètres lisibles par tous"
  ON site_settings FOR SELECT USING (true);

CREATE POLICY "Admin — modifier paramètres"
  ON site_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','pasteur')));

-- ── 11. Données de démonstration ────────────────────────────────
INSERT INTO sermons (title, pastor, reference, series, excerpt, youtube_id, date, is_featured) VALUES
  ('L''amour désintéressé',   'Past. Pedro Obova',  '1 Corinthiens 13', 'L''amour de Dieu', 'Un message puissant sur l''amour agapè, fondement de toute vie chrétienne.', NULL, CURRENT_DATE,     true),
  ('Marcher dans la foi',     'Past. Joseph Kanda', 'Hébreux 11',        'La foi en action', 'Découvrir comment les héros de la foi ont avancé malgré les obstacles.',      NULL, CURRENT_DATE - 7,  false),
  ('La grâce suffisante',     'Past. Pedro Obova',  '2 Corinthiens 12',  NULL,               'La grâce de Dieu est toujours suffisante, même dans nos faiblesses.',         NULL, CURRENT_DATE - 14, false),
  ('Être sel et lumière',     'Past. Daniel Mwamba','Matthieu 5',         NULL,               'Notre appel à influencer positivement notre génération pour l''Évangile.',    NULL, CURRENT_DATE - 21, false);

INSERT INTO events (title, description, date, time_start, time_end, capacity, price_chf, tags) VALUES
  ('Culte dominical',        'Culte principal du dimanche matin. Accueil, louange et prédication.', CURRENT_DATE + 8,  '09:30', '11:30', 200, 0,  ARRAY['Live','Gratuit']),
  ('Soirée Gospel & Dîner', 'Soirée musicale et dîner communautaire. Places limitées.',             CURRENT_DATE + 13, '18:00', '22:00', 60,  25, ARRAY['CHF 25']),
  ('Culte de prière',        'Soirée de prière et d''intercession pour l''église et les nations.',   CURRENT_DATE + 20, '19:00', '21:00', 80,  0,  ARRAY['Membres','Gratuit']);

INSERT INTO team_members (name, role_label, bio, initials, sort_order) VALUES
  ('Pedro Obova',    'Pasteur Principal',      'Fondateur de l''ARC, Pedro Obova guide la communauté depuis 2018 avec une vision prophétique et apostolique.', 'PO', 1),
  ('Joseph Kanda',   'Pasteur Collaborateur',  'Responsable de l''enseignement et de la formation des disciples au sein de la communauté ARC.',                 'JK', 2),
  ('Daniel Mwamba',  'Pasteur Collaborateur',  'En charge du suivi pastoral et de l''accompagnement spirituel des membres et visiteurs.',                       'DM', 3),
  ('Emmanuel Bola',  'Pasteur Collaborateur',  'Responsable de l''évangélisation et des relations avec les communautés des nations.',                            'EB', 4);

-- ── FIN ─────────────────────────────────────────────────────────
