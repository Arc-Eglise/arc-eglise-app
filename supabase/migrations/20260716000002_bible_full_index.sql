-- =============================================================================
-- ARC AI — Index complet de la Bible avec embeddings (RAG sémantique)
-- La table bible_verses reçoit un champ embedding pour la recherche vectorielle
-- Compatible avec pgvector — toutes versions, toutes langues
-- =============================================================================

-- Créer la table bible_verses si elle n'existe pas encore
CREATE TABLE IF NOT EXISTS public.bible_verses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id  TEXT NOT NULL,
  book_name   TEXT NOT NULL,
  chapter     INT  NOT NULL,
  verse       INT  NOT NULL,
  text        TEXT NOT NULL,
  embedding   VECTOR(1536),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(version_id, book_name, chapter, verse)
);

-- Ajouter le champ embedding si pas déjà présent (idempotent)
ALTER TABLE public.bible_verses
  ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);  -- text-embedding-3-small

-- Index vectoriel sur les versets (hnsw = plus rapide que ivfflat pour les versets courts)
CREATE INDEX IF NOT EXISTS bible_verses_embedding_hnsw_idx
  ON public.bible_verses
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Index complémentaires pour la recherche rapide
CREATE INDEX IF NOT EXISTS bible_verses_version_book_idx
  ON public.bible_verses (version_id, book_name, chapter, verse);

CREATE INDEX IF NOT EXISTS bible_verses_fulltext_idx
  ON public.bible_verses
  USING gin (to_tsvector('french', text));

-- Ajouter index anglais aussi
CREATE INDEX IF NOT EXISTS bible_verses_fulltext_en_idx
  ON public.bible_verses
  USING gin (to_tsvector('english', text));

-- =============================================================================
-- Fonction de recherche sémantique ultra-rapide dans la Bible
-- =============================================================================

CREATE OR REPLACE FUNCTION arc_search_bible(
  query_embedding VECTOR(1536),
  version_filter  TEXT     DEFAULT NULL,   -- ex: 'LSG', 'NIV', 'KJV'
  book_filter     TEXT     DEFAULT NULL,   -- ex: 'Jean', 'Psaumes'
  match_threshold FLOAT    DEFAULT 0.70,
  match_count     INT      DEFAULT 10
)
RETURNS TABLE (
  id          UUID,
  book_name   TEXT,
  chapter     INT,
  verse       INT,
  text        TEXT,
  version_id  TEXT,
  similarity  FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    id,
    book_name,
    chapter,
    verse,
    text,
    version_id,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.bible_verses
  WHERE
    embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
    AND (version_filter IS NULL OR version_id = version_filter)
    AND (book_filter IS NULL OR book_name ILIKE book_filter)
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- =============================================================================
-- Table des versions Bible disponibles
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bible_versions (
  id              TEXT PRIMARY KEY,          -- ex: 'LSG', 'NIV', 'KJV', 'BDS'
  name            TEXT NOT NULL,
  language        TEXT NOT NULL,             -- ex: 'fr', 'en', 'es', 'ar', 'zh'
  language_name   TEXT NOT NULL,             -- ex: 'Français', 'English'
  year            INT,
  description     TEXT,
  is_indexed      BOOLEAN DEFAULT false,     -- true quand les embeddings sont chargés
  verse_count     INT DEFAULT 0,
  embedded_count  INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Versions pré-configurées (texte + embeddings à charger via script)
INSERT INTO public.bible_versions (id, name, language, language_name, year, description)
VALUES
  ('LSG',   'Louis Segond 1910',           'fr', 'Français',    1910, 'Version de référence historique française'),
  ('NEG',   'Nouvelle Édition de Genève',  'fr', 'Français',    1979, 'Version réformée suisse'),
  ('BDS',   'Bible du Semeur',             'fr', 'Français',    2000, 'Version contemporaine française'),
  ('BFC',   'Bible en Français Courant',   'fr', 'Français',    1997, 'Version facile d''accès'),
  ('LSG21', 'Segond 21',                   'fr', 'Français',    2007, 'Révision moderne du Segond'),
  ('KJV',   'King James Version',          'en', 'English',     1611, 'Version anglaise historique'),
  ('NIV',   'New International Version',   'en', 'English',     1978, 'Version anglaise populaire'),
  ('ESV',   'English Standard Version',    'en', 'English',     2001, 'Version anglaise réformée'),
  ('NASB',  'New American Standard Bible', 'en', 'English',     1971, 'Version anglaise littérale'),
  ('NLT',   'New Living Translation',      'en', 'English',     1996, 'Version anglaise contemporaine'),
  ('RVR60', 'Reina-Valera 1960',           'es', 'Español',     1960, 'Version espagnole de référence'),
  ('NVI',   'Nueva Versión Internacional', 'es', 'Español',     1979, 'NIV espagnol'),
  ('ACF',   'Almeida Corrigida Fiel',      'pt', 'Português',   1994, 'Version portugaise'),
  ('LUT',   'Luther Bibel',                'de', 'Deutsch',     2017, 'Bible luthérienne allemande'),
  ('SVD',   'Schlachter Bibel',            'de', 'Deutsch',     2000, 'Version allemande réformée'),
  ('SVRJ',  'Synodal Version',             'ru', 'Русский',     1876, 'Bible synodale russe'),
  ('LSB',   'La Sainte Bible (Congo)',     'fr', 'Français',    2005, 'Version francophone africaine'),
  ('SHB',   'Swahili Bible',               'sw', 'Kiswahili',   2014, 'Bible swahilie'),
  ('CUVS',  'Chinese Union Version',       'zh', 'Chinese',     1919, 'Version chinoise unifiée'),
  ('ARSVD', 'Arabic Smith-Van Dyke',       'ar', 'Arabic',      1860, 'Version arabe classique')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Fonction pour suivre la progression de l'indexation
-- =============================================================================

CREATE OR REPLACE FUNCTION arc_update_bible_index_stats()
RETURNS VOID LANGUAGE SQL AS $$
  UPDATE public.bible_versions bv
  SET
    verse_count     = (SELECT count(*) FROM public.bible_verses WHERE version_id = bv.id),
    embedded_count  = (SELECT count(*) FROM public.bible_verses WHERE version_id = bv.id AND embedding IS NOT NULL),
    is_indexed      = (
      (SELECT count(*) FROM public.bible_verses WHERE version_id = bv.id AND embedding IS NOT NULL) =
      (SELECT count(*) FROM public.bible_verses WHERE version_id = bv.id)
      AND (SELECT count(*) FROM public.bible_verses WHERE version_id = bv.id) > 0
    );
$$;

-- =============================================================================
-- Cache de versets fréquemment demandés (évite les re-embeddings coûteux)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.arc_bible_verse_cache (
  query_hash   TEXT PRIMARY KEY,
  query_text   TEXT NOT NULL,
  results_json JSONB NOT NULL,
  version_id   TEXT,
  hit_count    INT DEFAULT 1,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arc_bible_cache_expires_idx
  ON public.arc_bible_verse_cache (expires_at);
