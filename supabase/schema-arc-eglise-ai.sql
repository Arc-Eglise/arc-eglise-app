-- ═══════════════════════════════════════════════════════════════
--  ARC Église AI — Schéma base de données
--  À exécuter dans : Supabase → SQL Editor → New Query
--  Prérequis : schema.sql, schema-membres.sql, schema-cms.sql
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Groupes d'étude biblique ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_study_groups (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  description    TEXT,
  facilitator_id UUID        NOT NULL REFERENCES profiles(id),
  church_group   TEXT,
  language       TEXT        NOT NULL DEFAULT 'fr',
  level          TEXT        NOT NULL DEFAULT 'intermediaire',
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  max_members    INT         DEFAULT 20,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_study_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres validés voient les groupes actifs"
ON ai_study_groups FOR SELECT TO authenticated
USING (
  is_active = true AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND validated = true)
);

CREATE POLICY "Admin/Pasteur gèrent les groupes"
ON ai_study_groups FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','pasteur')));

CREATE POLICY "Facilitateur modifie son groupe"
ON ai_study_groups FOR UPDATE TO authenticated
USING (facilitator_id = auth.uid());

-- ── 2. Préférences IA utilisateur ────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_user_preferences (
  user_id              UUID    PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  language             TEXT    NOT NULL DEFAULT 'fr',
  level                TEXT    NOT NULL DEFAULT 'intermediaire',
  default_bible        TEXT    DEFAULT '61fd76eafa1ef5f7-01',
  fav_books            TEXT[]  DEFAULT '{}',
  fav_topics           TEXT[]  DEFAULT '{}',
  memory_enabled       BOOLEAN NOT NULL DEFAULT true,
  notification_plans   BOOLEAN NOT NULL DEFAULT true,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses préférences IA"
ON ai_user_preferences FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ── 3. Cache des réponses fréquentes ────────────────────────────
CREATE TABLE IF NOT EXISTS ai_response_cache (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key  TEXT        NOT NULL UNIQUE,
  response   TEXT        NOT NULL,
  mode       TEXT        NOT NULL,
  language   TEXT        NOT NULL DEFAULT 'fr',
  level      TEXT        NOT NULL DEFAULT 'intermediaire',
  hit_count  INT         NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_cache_key_idx     ON ai_response_cache(cache_key);
CREATE INDEX IF NOT EXISTS ai_cache_expires_idx ON ai_response_cache(expires_at);

ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache accessible aux authentifiés"
ON ai_response_cache FOR SELECT TO authenticated
USING (expires_at > NOW());

-- ── 4. Sessions de chat biblique ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_bible_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT,
  mode       TEXT        NOT NULL DEFAULT 'chat',
  language   TEXT        NOT NULL DEFAULT 'fr',
  level      TEXT        NOT NULL DEFAULT 'intermediaire',
  summary    TEXT,
  verse_refs TEXT[]      DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_sessions_user_idx ON ai_bible_sessions(user_id, created_at DESC);

ALTER TABLE ai_bible_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses sessions"
ON ai_bible_sessions FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ── 5. Messages des sessions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_session_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID        NOT NULL REFERENCES ai_bible_sessions(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('user','assistant','system')),
  content    TEXT        NOT NULL,
  verse_refs TEXT[]      DEFAULT '{}',
  tokens_in  INT         DEFAULT 0,
  tokens_out INT         DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_messages_session_idx ON ai_session_messages(session_id, created_at);

ALTER TABLE ai_session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses messages"
ON ai_session_messages FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM ai_bible_sessions WHERE id = session_id AND user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM ai_bible_sessions WHERE id = session_id AND user_id = auth.uid())
);

-- ── 6. Plans de lecture ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_reading_plans (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  description    TEXT,
  level          TEXT        NOT NULL DEFAULT 'intermediaire',
  duration_days  INT         NOT NULL DEFAULT 30,
  language       TEXT        NOT NULL DEFAULT 'fr',
  focus          TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  is_shared      BOOLEAN     NOT NULL DEFAULT false,
  group_id       UUID        REFERENCES ai_study_groups(id),
  created_by_ai  BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_reading_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses plans"
ON ai_reading_plans FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Plans partagés visibles"
ON ai_reading_plans FOR SELECT TO authenticated
USING (
  is_shared = true AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND validated = true)
);

-- ── 7. Jours d'un plan de lecture ────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_reading_plan_days (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      UUID    NOT NULL REFERENCES ai_reading_plans(id) ON DELETE CASCADE,
  day_number   INT     NOT NULL,
  title        TEXT,
  passages     TEXT[]  NOT NULL DEFAULT '{}',
  reflection   TEXT,
  prayer_guide TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(plan_id, day_number)
);

ALTER TABLE ai_reading_plan_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses jours de plan"
ON ai_reading_plan_days FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM ai_reading_plans WHERE id = plan_id AND user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM ai_reading_plans WHERE id = plan_id AND user_id = auth.uid())
);

-- ── 8. Journal spirituel ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_spiritual_journal (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date                DATE        NOT NULL DEFAULT CURRENT_DATE,
  content             TEXT        NOT NULL CHECK (char_length(content) <= 5000),
  verse_refs          TEXT[]      DEFAULT '{}',
  mood                TEXT,
  prayer_request_id   UUID        REFERENCES prayer_requests(id),
  session_id          UUID        REFERENCES ai_bible_sessions(id),
  ai_reflection       TEXT,
  is_private          BOOLEAN     NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS ai_journal_user_date_idx ON ai_spiritual_journal(user_id, date DESC);

ALTER TABLE ai_spiritual_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Journal strictement privé"
ON ai_spiritual_journal FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ── 9. Membres des groupes d'étude ──────────────────────────────
CREATE TABLE IF NOT EXISTS ai_study_group_members (
  group_id  UUID        NOT NULL REFERENCES ai_study_groups(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      TEXT        NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE ai_study_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres voient les participants"
ON ai_study_group_members FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ai_study_group_members m
    WHERE m.group_id = group_id AND m.user_id = auth.uid()
  )
);

-- ── 10. Recommandations médias ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_media_recommendations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  type        TEXT        NOT NULL,
  url         TEXT,
  author      TEXT,
  description TEXT,
  verse_refs  TEXT[]      DEFAULT '{}',
  topics      TEXT[]      DEFAULT '{}',
  language    TEXT        NOT NULL DEFAULT 'fr',
  rating      INT         CHECK (rating BETWEEN 1 AND 5),
  saved       BOOLEAN     NOT NULL DEFAULT false,
  source      TEXT        NOT NULL DEFAULT 'ai',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_media_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses recommandations"
ON ai_media_recommendations FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ── Indexes complémentaires ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS ai_plans_user_idx  ON ai_reading_plans(user_id, is_active);
CREATE INDEX IF NOT EXISTS ai_media_user_idx  ON ai_media_recommendations(user_id, saved);
