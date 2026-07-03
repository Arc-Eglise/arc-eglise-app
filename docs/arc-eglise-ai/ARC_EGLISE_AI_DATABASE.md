# ARC Église AI — Schéma de Base de Données

> **Statut :** Document de conception — en attente de validation  
> **Date :** Juin 2026

---

## 1. Tables existantes réutilisées

Les tables suivantes existent déjà et seront **lues** (non modifiées) par ARC Église AI :

| Table | Usage dans ARC Église AI |
|-------|--------------------------|
| `profiles` | Préférences utilisateur, langue, niveau, rôle |
| `bible_notes` | Affichage dans le journal, lien avec sessions |
| `bible_bookmarks` | Suggestions de passages dans les plans |
| `bible_progress` | Point de départ des plans de lecture |
| `prayer_requests` | Lien journal spirituel → prières |
| `events` | Moteur d'événements locaux |
| `sermons` | Contexte pour préparation de sermon |

---

## 2. Nouvelles tables à créer

### 2.1 `ai_bible_sessions` — Historique des conversations

```sql
CREATE TABLE ai_bible_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT,                              -- Auto-généré par IA (résumé en 5 mots)
  mode          TEXT        NOT NULL DEFAULT 'chat',  -- chat | search | theology | meditation | sermon
  language      TEXT        NOT NULL DEFAULT 'fr',
  level         TEXT        NOT NULL DEFAULT 'intermediaire',  -- enfant | debutant | intermediaire | avance | enseignant
  summary       TEXT,                              -- Résumé auto de la session (pour mémoire future)
  verse_refs    TEXT[]      DEFAULT '{}',          -- Versets référencés dans la session
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherche par utilisateur et date
CREATE INDEX ai_sessions_user_idx ON ai_bible_sessions(user_id, created_at DESC);

ALTER TABLE ai_bible_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses sessions"
ON ai_bible_sessions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 2.2 `ai_session_messages` — Messages des conversations

```sql
CREATE TABLE ai_session_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID        NOT NULL REFERENCES ai_bible_sessions(id) ON DELETE CASCADE,
  role          TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content       TEXT        NOT NULL,
  verse_refs    TEXT[]      DEFAULT '{}',          -- Versets cités dans ce message
  tokens_in     INT         DEFAULT 0,
  tokens_out    INT         DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ai_messages_session_idx ON ai_session_messages(session_id, created_at);

ALTER TABLE ai_session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses messages via session"
ON ai_session_messages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM ai_bible_sessions
    WHERE id = session_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ai_bible_sessions
    WHERE id = session_id AND user_id = auth.uid()
  )
);
```

### 2.3 `ai_reading_plans` — Plans de lecture personnalisés

```sql
CREATE TABLE ai_reading_plans (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  description   TEXT,
  level         TEXT        NOT NULL DEFAULT 'intermediaire',
  duration_days INT         NOT NULL DEFAULT 30,
  language      TEXT        NOT NULL DEFAULT 'fr',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  is_shared     BOOLEAN     NOT NULL DEFAULT false,  -- Plan partagé dans un groupe
  group_id      UUID        REFERENCES ai_study_groups(id),
  created_by_ai BOOLEAN     NOT NULL DEFAULT false,   -- Généré par l'IA ou manuellement
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_reading_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses plans"
ON ai_reading_plans FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Plans partagés visibles par membres validés"
ON ai_reading_plans FOR SELECT
USING (
  is_shared = true
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND validated = true)
);
```

### 2.4 `ai_reading_plan_days` — Jours d'un plan de lecture

```sql
CREATE TABLE ai_reading_plan_days (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID    NOT NULL REFERENCES ai_reading_plans(id) ON DELETE CASCADE,
  day_number  INT     NOT NULL,
  title       TEXT,
  passages    TEXT[]  NOT NULL,   -- ex: ['GEN.1', 'GEN.2', 'PSA.1']
  reflection  TEXT,               -- Question de méditation IA
  prayer_guide TEXT,              -- Guide de prière court
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(plan_id, day_number)
);

ALTER TABLE ai_reading_plan_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses jours de plan via plan"
ON ai_reading_plan_days FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM ai_reading_plans
    WHERE id = plan_id AND user_id = auth.uid()
  )
);
```

### 2.5 `ai_spiritual_journal` — Journal spirituel

```sql
CREATE TABLE ai_spiritual_journal (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date          DATE        NOT NULL DEFAULT CURRENT_DATE,
  content       TEXT        NOT NULL CHECK (char_length(content) <= 5000),
  verse_refs    TEXT[]      DEFAULT '{}',
  mood          TEXT,               -- serein | reconnaissant | inquiet | en deuil | joyeux | ...
  prayer_request_id UUID    REFERENCES prayer_requests(id),
  session_id    UUID        REFERENCES ai_bible_sessions(id),
  ai_reflection TEXT,               -- Réflexion générée par l'IA sur l'entrée (optionnel)
  is_private    BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)  -- Un journal par jour (peut être mis à jour)
);

CREATE INDEX ai_journal_user_date_idx ON ai_spiritual_journal(user_id, date DESC);

ALTER TABLE ai_spiritual_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Journal privé — accès propriétaire uniquement"
ON ai_spiritual_journal FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 2.6 `ai_study_groups` — Groupes d'étude biblique

```sql
CREATE TABLE ai_study_groups (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  description   TEXT,
  facilitator_id UUID       NOT NULL REFERENCES profiles(id),
  church_group  TEXT,               -- Lien vers profiles.groups (ex: 'jeunesse')
  language      TEXT        NOT NULL DEFAULT 'fr',
  level         TEXT        NOT NULL DEFAULT 'intermediaire',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  max_members   INT         DEFAULT 20,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_study_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres validés voient les groupes actifs"
ON ai_study_groups FOR SELECT
USING (
  is_active = true
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND validated = true)
);

CREATE POLICY "Admin/Pasteur gèrent les groupes"
ON ai_study_groups FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','pasteur'))
);

CREATE POLICY "Facilitateur gère son groupe"
ON ai_study_groups FOR UPDATE
USING (facilitator_id = auth.uid());
```

### 2.7 `ai_study_group_members` — Membres d'un groupe d'étude

```sql
CREATE TABLE ai_study_group_members (
  group_id    UUID        NOT NULL REFERENCES ai_study_groups(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'member',  -- member | facilitator
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE ai_study_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membres voient les participants du groupe"
ON ai_study_group_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ai_study_group_members m
    WHERE m.group_id = group_id AND m.user_id = auth.uid()
  )
);
```

### 2.8 `ai_user_preferences` — Préférences IA personnelles

```sql
CREATE TABLE ai_user_preferences (
  user_id       UUID    PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  language      TEXT    NOT NULL DEFAULT 'fr',
  level         TEXT    NOT NULL DEFAULT 'intermediaire',
  default_bible TEXT    DEFAULT '61fd76eafa1ef5f7-01',  -- BDS (Bible du Semeur)
  fav_books     TEXT[]  DEFAULT '{}',                   -- Livres favoris
  fav_topics    TEXT[]  DEFAULT '{}',                   -- Thèmes favoris
  memory_enabled BOOLEAN NOT NULL DEFAULT true,          -- Mémoire entre sessions
  notification_plans BOOLEAN NOT NULL DEFAULT true,      -- Rappels plans de lecture
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses préférences IA"
ON ai_user_preferences FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 2.9 `ai_response_cache` — Cache des réponses fréquentes

```sql
CREATE TABLE ai_response_cache (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key     TEXT        NOT NULL UNIQUE,  -- hash(mode + query + language + level)
  response      TEXT        NOT NULL,
  mode          TEXT        NOT NULL,
  language      TEXT        NOT NULL DEFAULT 'fr',
  level         TEXT        NOT NULL DEFAULT 'intermediaire',
  hit_count     INT         NOT NULL DEFAULT 0,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ai_cache_key_idx ON ai_response_cache(cache_key);
CREATE INDEX ai_cache_expires_idx ON ai_response_cache(expires_at);

-- RLS : lecture publique pour membres, écriture service_role
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache accessible à tous les authentifiés"
ON ai_response_cache FOR SELECT
TO authenticated USING (expires_at > NOW());
```

### 2.10 `ai_media_recommendations` — Recommandations médias bibliques

```sql
CREATE TABLE ai_media_recommendations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  type        TEXT        NOT NULL,  -- video | podcast | article | book | sermon | audio_bible
  url         TEXT,
  author      TEXT,
  description TEXT,
  verse_refs  TEXT[]      DEFAULT '{}',
  topics      TEXT[]      DEFAULT '{}',
  language    TEXT        NOT NULL DEFAULT 'fr',
  rating      INT         CHECK (rating BETWEEN 1 AND 5),
  saved       BOOLEAN     NOT NULL DEFAULT false,
  source      TEXT        NOT NULL DEFAULT 'ai',  -- ai | user | pastor
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_media_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère ses recommandations"
ON ai_media_recommendations FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

## 3. Extension pgvector (optionnelle — V2)

Pour la recherche sémantique avancée, l'extension `pgvector` permettrait de stocker les embeddings des passages bibliques directement dans Supabase.

```sql
-- À activer dans Supabase Dashboard → Extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Table des embeddings (V2, hors scope V1)
CREATE TABLE bible_embeddings (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  verse_ref   TEXT    NOT NULL UNIQUE,  -- ex: 'JHN.3.16'
  text_fr     TEXT    NOT NULL,
  embedding   vector(1536),             -- OpenAI text-embedding-3-small
  bible_id    TEXT    NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX bible_embeddings_vec_idx ON bible_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

**Note V1 :** La recherche sémantique en V1 sera effectuée via Lunziko Platform API (embedding + recherche côté LCP), sans pgvector local.

---

## 4. Script de migration complet

Fichier : `supabase/schema-arc-eglise-ai.sql`

```sql
-- Ordre d'exécution (respecter les dépendances FK) :
-- 1. ai_study_groups            (pas de FK vers les autres nouvelles tables)
-- 2. ai_user_preferences
-- 3. ai_bible_sessions
-- 4. ai_session_messages        (FK → ai_bible_sessions)
-- 5. ai_reading_plans           (FK → ai_study_groups)
-- 6. ai_reading_plan_days       (FK → ai_reading_plans)
-- 7. ai_spiritual_journal       (FK → ai_bible_sessions, prayer_requests)
-- 8. ai_study_group_members     (FK → ai_study_groups)
-- 9. ai_response_cache
-- 10. ai_media_recommendations
```

---

## 5. Résumé des tables

| Table | Rows estimées (1 an) | RLS | Realtime |
|-------|---------------------|-----|----------|
| `ai_bible_sessions` | ~5 000 | ✅ | Non |
| `ai_session_messages` | ~50 000 | ✅ | Non |
| `ai_reading_plans` | ~200 | ✅ | Non |
| `ai_reading_plan_days` | ~6 000 | ✅ | Non |
| `ai_spiritual_journal` | ~3 000 | ✅ | Non |
| `ai_study_groups` | ~20 | ✅ | Optionnel |
| `ai_study_group_members` | ~100 | ✅ | Non |
| `ai_user_preferences` | ~150 | ✅ | Non |
| `ai_response_cache` | ~500 | ✅ | Non |
| `ai_media_recommendations` | ~1 000 | ✅ | Non |
