-- ──────────────────────────────────────────────────────────────────
--  ARC — testimonials : création + RLS + données seed
--  Script autonome et idempotent (safe à ré-exécuter)
--  Supabase Dashboard > SQL Editor > New Query > Run
--  Prérequis : table profiles doit exister (schema.sql appliqué)
-- ──────────────────────────────────────────────────────────────────

-- 1. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS testimonials (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name  TEXT NOT NULL,
  author_role  TEXT,
  content      TEXT NOT NULL,
  avatar_url   TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT NOT NULL DEFAULT 0,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Activer RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- 3. Policies (drop + recreate pour idempotence)
DROP POLICY IF EXISTS "Témoignages publiés lisibles par tous" ON testimonials;
DROP POLICY IF EXISTS "CMS — gérer témoignages"              ON testimonials;

CREATE POLICY "Témoignages publiés lisibles par tous"
  ON testimonials FOR SELECT
  USING (is_published = true);

CREATE POLICY "CMS — gérer témoignages"
  ON testimonials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (
          role IN ('admin', 'pasteur')
          OR 'communication' = ANY(COALESCE(groups, '{}'))
          OR 'media'         = ANY(COALESCE(groups, '{}'))
        )
    )
  );

-- 4. Données seed (ON CONFLICT DO NOTHING = safe si déjà présentes)
INSERT INTO testimonials (author_name, author_role, content, sort_order) VALUES
  ('Miriam K.',      'Membre depuis 2021',
   'Depuis que j''ai rejoint l''ARC, ma vie a été transformée. L''enseignement de la Parole est profond et vivant. Je me sens vraiment chez moi dans cette famille spirituelle.',
   1),
  ('Jean-Claude M.', 'Visiteur devenu membre',
   'J''hésitais à entrer dans une église. Mais l''accueil chaleureux et l''authenticité des membres m''ont touché. Aujourd''hui, ma foi est plus forte que jamais.',
   2),
  ('Esther N.',      'Membre depuis 2023',
   'Le ministère de louange à l''ARC m''a aidée à retrouver la joie. Chaque culte est un moment de rencontre authentique avec Dieu. Je recommande cette communauté à tous.',
   3)
ON CONFLICT DO NOTHING;
