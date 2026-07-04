# Architecture — User Personalization Engine (UPE)
**ARC Église · Système de personnalisation avancé**  
Date : 2026-06-24 · Statut : Proposition — en attente de validation

---

## 1. Vue d'ensemble

### 1.1 Définition

Le **User Personalization Engine (UPE)** est l'ensemble des couches qui permettent à chaque membre d'ARC Église d'avoir une expérience individualisée, persistante et synchronisée. Ce n'est pas une application séparée — c'est un système transversal composé de :

- Tables Supabase (données utilisateur)
- Routes API Next.js (logique serveur)
- React Context (état côté client)
- Lunziko Platform (intelligence IA)

### 1.2 Principes directeurs

| Principe | Implémentation |
|---|---|
| **Individuel** | `user_id` sur toutes les tables + RLS strict |
| **Privé** | RLS : `auth.uid() = user_id` sur toutes les tables UPE |
| **Persistant** | Supabase comme source de vérité |
| **Multi-appareils** | Sync automatique via API + Supabase |
| **IA-augmenté** | Profil injecté dans les prompts Lunziko Platform |
| **Non-intrusif** | Les préférences d'un utilisateur n'affectent jamais un autre |

### 1.3 Contraintes architecturales appliquées

- `SUPABASE_SERVICE_ROLE_KEY` : uniquement côté serveur (routes API Next.js)
- `createAdminClient()` : jamais dans un Client Component
- Toute logique IA centralisée dans **Lunziko Platform** — ARC Église ne fait que la consommer
- Le site web et les apps mobiles ne doivent jamais importer directement LunzikoEngine
- API mobile : mêmes endpoints Next.js, authentification Bearer Supabase

---

## 2. Diagramme d'architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        UTILISATEUR                                       │
│           Web (Next.js)  ·  Android  ·  iOS  ·  iPad                    │
└──────────────┬──────────────────────────────────────┬───────────────────┘
               │                                      │
               ▼                                      ▼
┌──────────────────────────┐            ┌─────────────────────────────┐
│    ARC Église (Next.js)  │            │   Apps Mobiles (Flutter)    │
│                          │            │   Appel direct /api/*       │
│  ┌────────────────────┐  │            │   + token Supabase Bearer   │
│  │  React Context     │  │            └─────────────┬───────────────┘
│  │  UserProfile       │  │                          │
│  │  ReadingPrefs      │  │                          │
│  │  ActivityTracker   │  │                          │
│  └────────┬───────────┘  │                          │
│           │              │                          │
│  ┌────────▼───────────┐  │                          │
│  │    API Routes      │◄─┼──────────────────────────┘
│  │  /api/profile      │  │
│  │  /api/activity     │  │
│  │  /api/recommend    │  │
│  │  /api/progress     │  │
│  │  /api/library      │  │
│  │  /api/reading-pref │  │
│  │  /api/bible-ai/*   │  │ (existant)
│  │  /api/lunziko/*    │  │ (existant)
│  └────────┬───────────┘  │
└───────────┼──────────────┘
            │                    ┌──────────────────────────────┐
            ├───────────────────►│     LUNZIKO PLATFORM         │
            │   IA requests      │  (recommandations, mémoire,  │
            │   avec profil      │   coach, synthèse)           │
            │   injecté          └──────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────┐
│                     SUPABASE (ARC Église)                          │
│                                                                     │
│  ── EXISTANT ──────────────────────────────────────────────────── │
│  profiles                    ai_user_preferences                   │
│  bible_notes                 ai_bible_sessions                     │
│  bible_bookmarks             ai_session_messages                   │
│  bible_progress              ai_spiritual_journal                  │
│  biblical_notes              ai_reading_plans                      │
│  prayer_requests             ai_reading_plan_days                  │
│  ai_media_recommendations    reading_preferences                   │
│                                                                     │
│  ── À CRÉER ───────────────────────────────────────────────────── │
│  spiritual_profile           user_activity_log                     │
│  user_library                recommendation_history                │
│  bible_reading_history       prayer_journal                        │
│  user_objectives             study_streaks                         │
│  specialized_profiles                                              │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. Inventaire de l'existant

### 3.1 Ce qui est déjà implémenté et opérationnel

| Fonctionnalité | Table(s) | Route API | État |
|---|---|---|---|
| Préférences IA | `ai_user_preferences` | `/api/bible-ai/preferences` | ✅ Complet |
| Préférences lecture | `reading_preferences` | `/api/reading-preferences` | ✅ Complet |
| Mémoire AI (sessions) | `ai_bible_sessions` + `ai_session_messages` | `/api/bible-ai/chat` | ✅ Complet |
| Journal spirituel | `ai_spiritual_journal` | `/api/bible-ai/journal` | ✅ Complet |
| Plans de lecture | `ai_reading_plans` + `_days` | `/api/bible-ai/plans` | ✅ Complet |
| Notes versets | `bible_notes` | actions/bible.ts | ✅ Complet |
| Signets | `bible_bookmarks` | actions/bible.ts | ✅ Complet |
| Progression Bible | `bible_progress` | actions/bible.ts | ✅ Partiel (dernier chapitre seulement) |
| Notes longues | `biblical_notes` | page notes | ✅ Complet |
| Prière communautaire | `prayer_requests` | page prière | ✅ Complet |
| Recommandations médias | `ai_media_recommendations` | `/api/bible-ai/media` | ✅ Partiel |
| Méditation guidée | — (stateless) | `/api/bible-ai/meditate` | ✅ Complet |
| Théologie | — (stateless) | `/api/bible-ai/theology` | ✅ Complet |
| Clés IA personnelles | `profiles.ai_claude_key` etc. | `/api/member-keys` | ✅ Complet |

### 3.2 Ce qui manque (à créer)

| Fonctionnalité | Tables à créer | Priorité |
|---|---|---|
| Profil spirituel structuré | `spiritual_profile` | 🔴 Élevée |
| Log d'activité utilisateur | `user_activity_log` | 🔴 Élevée |
| Bibliothèque personnelle enrichie | `user_library` | 🟠 Moyenne |
| Historique lecture (chapitre par chapitre) | `bible_reading_history` | 🟠 Moyenne |
| Journal de prière privé | `prayer_journal` | 🟠 Moyenne |
| Objectifs personnels | `user_objectives` | 🟡 Faible |
| Streaks d'engagement | `study_streaks` | 🟡 Faible |
| Profils spécialisés | `specialized_profiles` | 🟡 Faible |
| Historique recommandations | `recommendation_history` | 🟡 Faible |

---

## 4. Schéma de données global — Nouvelles tables

### 4.1 `spiritual_profile`
```sql
CREATE TABLE public.spiritual_profile (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Profil de base
  profile_type      TEXT DEFAULT 'membre'
                    CHECK (profile_type IN ('membre','nouveau_converti','jeunesse','famille','responsable','pasteur','enseignant')),
  theological_focus TEXT[] DEFAULT '{}',    -- ex: ['réforme','grâce','prophétie']
  fav_ot_books      TEXT[] DEFAULT '{}',    -- ex: ['Psaumes','Ésaïe']
  fav_nt_books      TEXT[] DEFAULT '{}',    -- ex: ['Jean','Romains']
  prayer_topics     TEXT[] DEFAULT '{}',    -- ex: ['guérison','famille','nation']
  study_themes      TEXT[] DEFAULT '{}',    -- ex: ['eschatologie','salut','Trinité']
  -- Maturité spirituelle
  spiritual_maturity TEXT DEFAULT 'debutant'
                     CHECK (spiritual_maturity IN ('debutant','intermediaire','avance','enseignant')),
  growth_areas      TEXT[] DEFAULT '{}',    -- ex: ['prière','évangélisation','étude']
  -- Statistiques agrégées (mise à jour périodiquement)
  total_sessions    INTEGER DEFAULT 0,
  total_chapters    INTEGER DEFAULT 0,
  total_minutes     INTEGER DEFAULT 0,
  -- Contexte IA
  ai_context_memo   TEXT,                   -- résumé court pour injection dans les prompts
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 `user_activity_log`
```sql
CREATE TABLE public.user_activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action        TEXT NOT NULL
                CHECK (action IN (
                  'bible_read','ai_chat','journal_entry','plan_day_completed',
                  'prayer_request','note_created','bookmark_added','meditation',
                  'theology_query','search','media_saved','recommendation_clicked'
                )),
  resource_type TEXT,                       -- 'chapter','book','verse','session','plan'
  resource_id   TEXT,                       -- ID spécifique (ex: 'JHN.3', plan UUID)
  resource_label TEXT,                      -- Libellé lisible (ex: 'Jean 3')
  duration_sec  INTEGER,                    -- Durée de l'activité en secondes
  metadata      JSONB DEFAULT '{}',         -- Données supplémentaires
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
-- Index de performance
CREATE INDEX idx_activity_user_date ON user_activity_log (user_id, created_at DESC);
CREATE INDEX idx_activity_action    ON user_activity_log (user_id, action);
```

### 4.3 `user_library`
```sql
CREATE TABLE public.user_library (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type     TEXT NOT NULL
                CHECK (item_type IN ('verse','ai_response','meditation','sermon','article','video','plan','note')),
  title         TEXT NOT NULL,
  content       TEXT,                       -- Contenu complet ou extrait
  source_ref    TEXT,                       -- ex: 'Jean 3:16', URL, session_id
  tags          TEXT[] DEFAULT '{}',
  is_favorite   BOOLEAN DEFAULT FALSE,
  collection    TEXT DEFAULT 'général',     -- Collection personnalisée
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_library_user ON user_library (user_id, created_at DESC);
CREATE INDEX idx_library_type ON user_library (user_id, item_type);
```

### 4.4 `bible_reading_history`
```sql
CREATE TABLE public.bible_reading_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bible_id    TEXT NOT NULL,
  book_id     TEXT NOT NULL,                -- ex: 'GEN','JHN'
  chapter_id  TEXT NOT NULL,               -- ex: 'GEN.1','JHN.3'
  read_at     TIMESTAMPTZ DEFAULT NOW(),
  duration_sec INTEGER                     -- Temps passé sur ce chapitre
);
-- Évite les doublons par date pour les stats
CREATE UNIQUE INDEX idx_reading_history_unique 
  ON bible_reading_history (user_id, chapter_id, (read_at::DATE));
CREATE INDEX idx_reading_history_user ON bible_reading_history (user_id, read_at DESC);
```

### 4.5 `prayer_journal`
```sql
CREATE TABLE public.prayer_journal (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'actif'
                CHECK (status IN ('actif','en_cours','exauce','archive')),
  is_private    BOOLEAN DEFAULT TRUE,
  verse_refs    TEXT[] DEFAULT '{}',
  testimony     TEXT,                       -- Témoignage quand exaucé
  ai_suggestion TEXT,                       -- Verset/plan suggéré par l'IA
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  answered_at   TIMESTAMPTZ
);
CREATE INDEX idx_prayer_journal_user ON prayer_journal (user_id, created_at DESC);
```

### 4.6 `user_objectives`
```sql
CREATE TABLE public.user_objectives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  objective_type TEXT NOT NULL
                 CHECK (objective_type IN ('lecture','étude','prière','mémorisation','plan')),
  target_value  INTEGER NOT NULL,           -- ex: 30 (chapitres par mois)
  current_value INTEGER DEFAULT 0,
  unit          TEXT DEFAULT 'chapitres',   -- 'chapitres','minutes','jours','versets'
  period        TEXT DEFAULT 'mensuel'
                CHECK (period IN ('quotidien','hebdomadaire','mensuel','annuel','ponctuel')),
  due_date      DATE,
  is_active     BOOLEAN DEFAULT TRUE,
  is_completed  BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.7 `study_streaks`
```sql
CREATE TABLE public.study_streaks (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak  INTEGER DEFAULT 0,        -- Jours consécutifs actuels
  longest_streak  INTEGER DEFAULT 0,        -- Record personnel
  last_activity   DATE,                     -- Dernière date d'activité
  streak_type     TEXT DEFAULT 'lecture',
  freeze_used     INTEGER DEFAULT 0,        -- Jours de "congé" utilisés ce mois
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.8 `recommendation_history`
```sql
CREATE TABLE public.recommendation_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rec_type       TEXT NOT NULL,             -- 'verse','sermon','plan','book','video'
  title          TEXT NOT NULL,
  source_id      TEXT,                      -- ID dans ai_media_recommendations si applicable
  shown_at       TIMESTAMPTZ DEFAULT NOW(),
  clicked        BOOLEAN DEFAULT FALSE,
  dismissed      BOOLEAN DEFAULT FALSE,
  saved          BOOLEAN DEFAULT FALSE,
  rating         INTEGER CHECK (rating BETWEEN 1 AND 5)
);
CREATE INDEX idx_rec_history_user ON recommendation_history (user_id, shown_at DESC);
```

---

## 5. Couche API — Vue d'ensemble des nouvelles routes

```
POST /api/profile/spiritual          → Lire / mettre à jour le profil spirituel
GET  /api/profile/spiritual

POST /api/activity/log               → Enregistrer une activité
GET  /api/activity/summary           → Stats pour le tableau de bord
GET  /api/activity/history           → Historique paginé

GET  /api/library                    → Bibliothèque personnelle
POST /api/library                    → Ajouter un item
DELETE /api/library/[id]             → Supprimer

GET  /api/reading/history            → Historique de lecture
GET  /api/reading/stats              → Stats : livres, chapitres, temps

POST /api/prayer-journal             → CRUD journal de prière
GET  /api/prayer-journal

GET  /api/objectives                 → Objectifs personnels
POST /api/objectives
PATCH /api/objectives/[id]

GET  /api/streaks                    → Statistiques de streak
POST /api/streaks/update             → Mise à jour quotidienne

GET  /api/recommendations            → Recommandations personnalisées (via Lunziko)
POST /api/recommendations/[id]/track → Tracker click/dismiss/save
```

---

## 6. Intégration Lunziko Platform

### 6.1 Injection du profil dans les prompts IA

Le profil spirituel doit être injecté dans le **contexte système** de chaque appel à Lunziko Platform. Cette injection se fait côté serveur dans les routes `/api/bible-ai/*` et `/api/lunziko/*`.

```typescript
// Pattern d'injection (côté serveur, dans les routes API)
async function buildUserContext(userId: string): Promise<string> {
  const [prefs, profile] = await Promise.all([
    getUserPrefs(userId),           // ai_user_preferences
    getSpiritualProfile(userId),    // spiritual_profile
  ])
  return [
    `Membre : niveau ${prefs.level}, langue ${prefs.language}`,
    profile.theological_focus.length ? `Intérêts théologiques : ${profile.theological_focus.join(', ')}` : '',
    profile.study_themes.length ? `Thèmes étudiés : ${profile.study_themes.slice(0, 5).join(', ')}` : '',
    profile.prayer_topics.length ? `Sujets de prière : ${profile.prayer_topics.slice(0, 3).join(', ')}` : '',
    profile.spiritual_maturity !== 'debutant' ? `Maturité : ${profile.spiritual_maturity}` : '',
    profile.ai_context_memo ? `Contexte personnel : ${profile.ai_context_memo}` : '',
  ].filter(Boolean).join('\n')
}
```

### 6.2 Flux de recommandations via Lunziko

```
1. Client demande des recommandations
2. Serveur charge : profil spirituel + historique récent + recommandations déjà vues
3. Serveur appelle Lunziko Platform avec contexte enrichi
4. Lunziko génère des recommandations structurées (JSON)
5. Serveur sauvegarde dans recommendation_history (shown_at)
6. Client affiche les recommandations
7. Interactions (click/dismiss/save) → POST /api/recommendations/[id]/track
```

---

## 7. Synchronisation multi-appareils

### 7.1 Principe

Toutes les données personnelles étant dans Supabase, la synchronisation est **native** : l'utilisateur se connecte sur n'importe quel appareil, ses données sont disponibles immédiatement.

### 7.2 Réplication temps réel (optionnel — Phase 3)

Pour les fonctionnalités qui nécessitent une mise à jour en direct (ex: progression de lecture synchronisée entre onglets) :

```typescript
// Supabase Realtime sur les tables clés
supabase.channel('user-sync')
  .on('postgres_changes', {
    event: '*', schema: 'public',
    table: 'spiritual_profile',
    filter: `user_id=eq.${userId}`,
  }, payload => { /* mise à jour locale */ })
  .subscribe()
```

### 7.3 Accès mobile

Les apps Android/iOS utilisent les mêmes routes API Next.js en mode REST, avec le token JWT Supabase en header `Authorization: Bearer <token>`.

---

## 8. Sécurité et conformité RGPD

### 8.1 RLS sur toutes les nouvelles tables

Toutes les tables UPE auront la politique RLS standard :
```sql
CREATE POLICY "user_own_data" ON <table>
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 8.2 Données jamais partagées entre utilisateurs

- Les tables ne contiennent PAS de `is_public` par défaut
- Seule exception : `prayer_requests` (existant, communautaire) — distinct du `prayer_journal` (nouveau, privé)
- L'admin ne peut accéder aux données personnelles que via Service Role Key côté serveur

### 8.3 Droit à l'effacement

Route à créer : `DELETE /api/account/data` — supprime toutes les données personnelles (cascade via ON DELETE CASCADE)

---

## 9. Résumé des décisions architecturales

| Décision | Choix | Raison |
|---|---|---|
| Stockage | Supabase ARC Église | RLS, Realtime, cohérence avec l'existant |
| IA | Via Lunziko Platform uniquement | Contrainte sécurité établie |
| Profil | Progressive disclosure | Construit automatiquement par l'usage |
| Mobile | Same API endpoints | DRY, pas de duplication |
| Lecture | CSS custom properties | Instantané, pas de re-render |
| Recommandations | IA + règles | Combinaison fiable et pertinente |
| Mémoire | Sessions resumées (existant) | Déjà implémenté, étendre uniquement |
