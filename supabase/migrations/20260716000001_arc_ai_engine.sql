-- =============================================================================
-- ARC Église AI Engine — Migration
-- Tables : knowledge chunks (RAG), learnings (mémoire évolutive), conversations
-- Exécuter dans : SQL Editor Supabase
-- =============================================================================

-- Extension pgvector (si pas déjà activée)
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- 1. Base de connaissances RAG (Bible, sermons, doctrine, constitution)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.arc_knowledge_chunks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content        TEXT NOT NULL,
  source         TEXT NOT NULL,                  -- nom du document source
  source_type    TEXT NOT NULL DEFAULT 'other',  -- bible | sermon | document | constitution | commentary | other
  church_id      UUID,                           -- null = global
  embedding      VECTOR(1536),                   -- text-embedding-3-small
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS arc_knowledge_chunks_embedding_idx
  ON public.arc_knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS arc_knowledge_chunks_source_type_idx
  ON public.arc_knowledge_chunks (source_type);

ALTER TABLE public.arc_knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge chunks lisibles par tous les authentifiés"
  ON public.arc_knowledge_chunks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "knowledge chunks écriture via service role uniquement"
  ON public.arc_knowledge_chunks FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Fonction de recherche vectorielle
CREATE OR REPLACE FUNCTION arc_match_knowledge(
  query_embedding     VECTOR(1536),
  match_threshold     FLOAT    DEFAULT 0.72,
  match_count         INT      DEFAULT 6,
  filter_source_type  TEXT     DEFAULT NULL,
  filter_church_id    UUID     DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  content     TEXT,
  source      TEXT,
  source_type TEXT,
  similarity  FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    id,
    content,
    source,
    source_type,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.arc_knowledge_chunks
  WHERE
    1 - (embedding <=> query_embedding) > match_threshold
    AND (filter_source_type IS NULL OR source_type = filter_source_type)
    AND (filter_church_id IS NULL OR church_id = filter_church_id OR church_id IS NULL)
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- =============================================================================
-- 2. Mémoire évolutive (learnings)
-- L'IA mémorise ce qu'elle apprend de chaque interaction
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.arc_ai_learnings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic          TEXT NOT NULL,
  insight        TEXT NOT NULL,
  source_query   TEXT,
  confidence     FLOAT DEFAULT 0.8,
  embedding      VECTOR(1536),
  use_count      INT DEFAULT 0,
  last_used_at   TIMESTAMPTZ DEFAULT now(),
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (topic, insight)
);

CREATE INDEX IF NOT EXISTS arc_ai_learnings_embedding_idx
  ON public.arc_ai_learnings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

CREATE INDEX IF NOT EXISTS arc_ai_learnings_use_count_idx
  ON public.arc_ai_learnings (use_count DESC);

ALTER TABLE public.arc_ai_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learnings lisibles par tous les authentifiés"
  ON public.arc_ai_learnings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "learnings écriture via service role"
  ON public.arc_ai_learnings FOR ALL
  USING (auth.role() = 'service_role');

-- Fonction de recherche vectorielle des learnings
CREATE OR REPLACE FUNCTION arc_match_learnings(
  query_embedding  VECTOR(1536),
  match_threshold  FLOAT DEFAULT 0.75,
  match_count      INT   DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  topic       TEXT,
  insight     TEXT,
  confidence  FLOAT,
  use_count   INT,
  similarity  FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    id,
    topic,
    insight,
    confidence,
    use_count,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.arc_ai_learnings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- =============================================================================
-- 3. Conversations AI persistées (résumés pour mémoire long-terme)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.arc_ai_conversations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type     TEXT NOT NULL DEFAULT 'bible',
  summary        TEXT,
  message_count  INT DEFAULT 0,
  topics         TEXT[] DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS arc_ai_conversations_user_idx
  ON public.arc_ai_conversations (user_id, updated_at DESC);

ALTER TABLE public.arc_ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations propres à chaque utilisateur"
  ON public.arc_ai_conversations FOR ALL
  USING (auth.uid() = user_id);

-- =============================================================================
-- 4. Messages de conversation (historique)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.arc_ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.arc_ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  agent_used      TEXT,
  skill_used      TEXT,
  persona_used    TEXT,
  tokens_in       INT DEFAULT 0,
  tokens_out      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS arc_ai_messages_conversation_idx
  ON public.arc_ai_messages (conversation_id, created_at);

ALTER TABLE public.arc_ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages via conversation de l'utilisateur"
  ON public.arc_ai_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.arc_ai_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 5. Cache de recherche (évite de répéter les mêmes recherches)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.arc_search_cache (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash   TEXT NOT NULL UNIQUE,  -- hash SHA256 de la requête
  query_text   TEXT NOT NULL,
  result_json  JSONB NOT NULL,
  hit_count    INT DEFAULT 1,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS arc_search_cache_hash_idx
  ON public.arc_search_cache (query_hash);

CREATE INDEX IF NOT EXISTS arc_search_cache_expires_idx
  ON public.arc_search_cache (expires_at);

-- RLS désactivé (cache global, pas de données sensibles)

-- Nettoyage automatique du cache expiré (à lancer via cron Supabase ou pg_cron)
CREATE OR REPLACE FUNCTION arc_cleanup_expired_cache()
RETURNS INT LANGUAGE SQL AS $$
  WITH deleted AS (
    DELETE FROM public.arc_search_cache WHERE expires_at < now()
    RETURNING id
  )
  SELECT count(*)::INT FROM deleted;
$$;

-- =============================================================================
-- 6. Données initiales — Doctrine ARC (seed pour la Theology Engine)
-- =============================================================================

INSERT INTO public.arc_knowledge_chunks (content, source, source_type, metadata)
VALUES
  (
    'L''ARC Église croit en un seul Dieu subsistant en trois personnes coéternelles et coégales : le Père, le Fils (Jésus-Christ) et le Saint-Esprit. Cette doctrine fondamentale de la Trinité est affirmée dans les Confessions historiques (Nicée 325, Constantinople 381).',
    'Confession de Foi ARC — Trinité',
    'constitution',
    '{"doctrine": "trinité", "tradition": "réformée-évangélique"}'
  ),
  (
    'Le salut est accordé par la grâce seule (Sola Gratia), reçu par la foi seule (Sola Fide), en Christ seul (Solus Christus). La justification est déclarative : Dieu déclare le pécheur juste en imputant la justice de Christ. Éphésiens 2:8-9 : "C''est par la grâce que vous êtes sauvés, par le moyen de la foi. Et cela ne vient pas de vous, c''est le don de Dieu."',
    'Confession de Foi ARC — Salut',
    'constitution',
    '{"doctrine": "salut", "cles": ["sola-gratia", "sola-fide", "solus-christus"]}'
  ),
  (
    'La Bible (66 livres, Ancien et Nouveau Testament) est la Parole de Dieu inspirée et infaillible (Sola Scriptura). Elle est l''autorité suprême en matière de foi, de doctrine et de vie chrétienne. 2 Timothée 3:16 : "Toute Écriture est inspirée de Dieu et utile pour enseigner, pour convaincre, pour corriger, pour former à la justice."',
    'Confession de Foi ARC — Bible',
    'constitution',
    '{"doctrine": "bible", "cles": ["sola-scriptura", "inspiration", "infaillibilite"]}'
  ),
  (
    'L''ARC Église, Alliance Réconciliée en Christ, est une église évangélique réformée avec une sensibilité charismatique, fondée à La Chaux-de-Fonds, Suisse. Pasteur principal : Pedro Obova. Horaires : Culte principal dimanche 9h30, culte du soir dimanche 17h00, Prière & Parole mercredi 19h00. Adresse : Av. Charles-Naine 39, La Chaux-de-Fonds.',
    'Informations ARC Église',
    'document',
    '{"type": "informations-pratiques"}'
  ),
  (
    'L''ARC pratique le baptême des croyants (baptême des adultes ou des personnes ayant confessé leur foi), généralement par immersion. Le baptême est un acte public de témoignage de la foi, non un moyen de salut. Il suit la nouvelle naissance spirituelle. La Sainte-Cène est célébrée régulièrement comme mémorial du sacrifice de Christ (vue symbolique/mémorielle).',
    'Confession de Foi ARC — Sacrements',
    'constitution',
    '{"doctrine": "sacrements", "bapteme": "croyants", "cene": "memorielle"}'
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Triggers de mise à jour automatique
-- =============================================================================

CREATE TRIGGER set_updated_at_arc_knowledge
  BEFORE UPDATE ON public.arc_knowledge_chunks
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER set_updated_at_arc_conversations
  BEFORE UPDATE ON public.arc_ai_conversations
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
