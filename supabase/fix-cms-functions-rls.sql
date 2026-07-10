-- ──────────────────────────────────────────────────────────────────────────
--  ARC — CMS : accès Communication & Média + valeurs initiales site_settings
--  Safe à ré-exécuter (DROP IF EXISTS + ON CONFLICT DO NOTHING)
--  Supabase Dashboard > SQL Editor > New Query > Run
-- ──────────────────────────────────────────────────────────────────────────

-- 1. Fonction helper : renvoie true si l'utilisateur connecté peut éditer le CMS
--    (admin, pasteur, ou fonction communication / media)
CREATE OR REPLACE FUNCTION is_cms_member() RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (
        role IN ('admin', 'pasteur')
        OR 'communication' = ANY(groups)
        OR 'media' = ANY(groups)
      )
  );
$$;

-- 2. RLS site_settings — ouvrir l'écriture aux fonctions communication / media
DROP POLICY IF EXISTS "Admin — modifier paramètres"    ON site_settings;
DROP POLICY IF EXISTS "Admin — insérer paramètres"     ON site_settings;
DROP POLICY IF EXISTS "CMS — modifier paramètres"      ON site_settings;
DROP POLICY IF EXISTS "CMS — insérer paramètres"       ON site_settings;

CREATE POLICY "CMS — modifier paramètres"
  ON site_settings FOR UPDATE
  USING (is_cms_member())
  WITH CHECK (is_cms_member());

CREATE POLICY "CMS — insérer paramètres"
  ON site_settings FOR INSERT
  WITH CHECK (is_cms_member());

-- 3. RLS team_members — ouvrir la gestion aux fonctions communication / media
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin — gérer équipe"          ON team_members;
DROP POLICY IF EXISTS "CMS — gérer équipe"            ON team_members;
DROP POLICY IF EXISTS "Équipe lisible par tous"        ON team_members;

CREATE POLICY "Équipe lisible par tous"
  ON team_members FOR SELECT USING (true);

CREATE POLICY "CMS — gérer équipe"
  ON team_members FOR ALL
  USING (is_cms_member())
  WITH CHECK (is_cms_member());

-- 4. RLS testimonials — ouvrir aux fonctions communication / media
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Témoignages publiés lisibles"   ON testimonials;
DROP POLICY IF EXISTS "Admin — gérer témoignages"      ON testimonials;
DROP POLICY IF EXISTS "CMS — gérer témoignages"        ON testimonials;

CREATE POLICY "Témoignages publiés lisibles"
  ON testimonials FOR SELECT
  USING (is_published = true OR is_cms_member());

CREATE POLICY "CMS — gérer témoignages"
  ON testimonials FOR ALL
  USING (is_cms_member())
  WITH CHECK (is_cms_member());

-- 5. Valeurs initiales pour les nouvelles clés (n'écrase pas l'existant)
INSERT INTO site_settings (key, value) VALUES
  ('histoire_p1',
   'Fondée en 2018 par le Pasteur Pedro Obova, l''Ambassade du Royaume de Christ est une communauté évangélique multiraciale et dynamique établie au cœur de La Chaux-de-Fonds.'),
  ('histoire_p2',
   'Nous croyons en une foi authentique, pratique et transformatrice. Notre vision est de voir chaque personne rencontrer Dieu, être équipée et impacter sa génération pour l''Évangile.'),
  ('histoire_citation',
   '« Construisons des générations de disciples qui influencent positivement leur environnement. »'),
  ('votre_impact_intro',
   'Vos contributions soutiennent directement la mission de l''ARC : l''évangélisation, la formation et l''aide aux familles dans le besoin.'),
  ('decouvrir_1_text',
   'Retrouvez tous nos messages en vidéo, audio et transcription dès le lundi.'),
  ('decouvrir_2_text',
   'Rejoignez notre communauté évangélique ouverte à tous, issus de toutes les nations.'),
  ('decouvrir_3_text',
   'Consultez notre agenda, réservez vos places pour nos soirées spéciales.'),
  ('decouvrir_4_text',
   'Participez à l''œuvre de Dieu via TWINT, carte bancaire ou PostFinance.')
ON CONFLICT (key) DO NOTHING;
