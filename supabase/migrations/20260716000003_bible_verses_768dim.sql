-- =============================================================================
-- ARC AI — Migration : bible_verses embedding 1536 → 768 dim
-- Raison : utilisation de nomic-embed-text (Ollama local, gratuit) au lieu
--          de text-embedding-3-small (OpenAI, payant)
-- nomic-embed-text produit des vecteurs de 768 dimensions
-- =============================================================================

-- 1. Supprimer l'index HNSW existant (il dépend de la dimension)
DROP INDEX IF EXISTS public.bible_verses_embedding_hnsw_idx;

-- 2. Recréer la colonne embedding en 768 dimensions
--    (ALTER COLUMN TYPE ne fonctionne pas pour changer la dim d'un VECTOR)
ALTER TABLE public.bible_verses DROP COLUMN IF EXISTS embedding;
ALTER TABLE public.bible_verses ADD COLUMN embedding VECTOR(768);

-- 3. Recréer l'index HNSW adapté aux vecteurs 768-dim de nomic-embed-text
CREATE INDEX bible_verses_embedding_hnsw_idx
  ON public.bible_verses
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Mettre à jour la fonction arc_search_bible() pour VECTOR(768)
--    Pattern HNSW-friendly : ORDER BY <=> LIMIT n dans le sous-SELECT,
--    filtres version/livre appliqués après pour que l'index soit utilisé.
CREATE OR REPLACE FUNCTION arc_search_bible(
  query_embedding VECTOR(768),
  version_filter  TEXT     DEFAULT NULL,
  book_filter     TEXT     DEFAULT NULL,
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
LANGUAGE PLPGSQL STABLE AS $func$
BEGIN
  RETURN QUERY
  SELECT sub.id, sub.book_name, sub.chapter, sub.verse,
         sub.text, sub.version_id, sub.similarity
  FROM (
    SELECT bv.id, bv.book_name, bv.chapter, bv.verse, bv.text, bv.version_id,
           (1 - (bv.embedding <=> query_embedding))::FLOAT AS similarity
    FROM public.bible_verses bv
    WHERE bv.embedding IS NOT NULL
    ORDER BY bv.embedding <=> query_embedding
    LIMIT match_count * 10
  ) sub
  WHERE sub.similarity > match_threshold
    AND (version_filter IS NULL OR sub.version_id = version_filter)
    AND (book_filter    IS NULL OR sub.book_name ILIKE book_filter)
  ORDER BY sub.similarity DESC
  LIMIT match_count;
END;
$func$;
