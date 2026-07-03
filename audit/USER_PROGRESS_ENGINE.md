# User Progress Engine — Progression et Engagement
**ARC Église · Système de personnalisation**  
Date : 2026-06-24 · Statut : Analyse — en attente de validation

---

## 1. État actuel

### 1.1 Ce qui existe déjà

| Donnée | Table | Limitation |
|---|---|---|
| Dernier chapitre lu | `bible_progress` (user_id PK, bible_id, chapter_id) | Seulement le DERNIER chapitre — pas d'historique |
| Plans de lecture | `ai_reading_plans` + `ai_reading_plan_days.is_completed` | Progression par plan OK |
| Journal quotidien | `ai_spiritual_journal` (date UNIQUE) | Sert de proxy pour la régularité |
| Sessions IA | `ai_bible_sessions` | Nombre de sessions lisible |
| Notes et signets | `bible_notes`, `bible_bookmarks` | Comptable |

### 1.2 Ce qui manque

La table `bible_progress` ne garde que **le dernier chapitre lu**, rendant impossible :
- Le calcul du nombre total de chapitres lus
- Les statistiques par livre ou testament
- La mesure de régularité (streaks)
- Les graphiques de progression dans le temps

---

## 2. Architecture du système de progression

### 2.1 Vue d'ensemble des données de progression

```
Progression Biblique
  └── bible_reading_history    ← Chaque chapitre lu, avec timestamp
  └── bible_progress           ← (existant) Dernier chapitre (curseur)

Progression Plans de Lecture
  └── ai_reading_plan_days.is_completed  ← (existant) Déjà fonctionnel

Engagement Régulier
  └── study_streaks            ← Streak quotidien + record personnel
  └── user_activity_log        ← Log granulaire de toutes les actions

Objectifs Personnels
  └── user_objectives          ← Buts quantifiables définis par l'user
```

### 2.2 Table `bible_reading_history` (à créer)

```sql
CREATE TABLE public.bible_reading_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bible_id     TEXT NOT NULL,
  book_id      TEXT NOT NULL,        -- ex: 'GEN', 'JHN', 'ROM'
  chapter_id   TEXT NOT NULL,        -- ex: 'GEN.1', 'JHN.3'
  chapter_num  INTEGER,              -- Numéro pour l'affichage
  read_at      TIMESTAMPTZ DEFAULT NOW(),
  duration_sec INTEGER              -- Temps passé (optionnel)
);
-- Évite les doublons pour une même date (on compte 1 lecture/jour max par chapitre)
CREATE UNIQUE INDEX idx_reading_history_unique
  ON bible_reading_history (user_id, chapter_id, (read_at::DATE));
CREATE INDEX idx_reading_history_user
  ON bible_reading_history (user_id, read_at DESC);
CREATE INDEX idx_reading_history_book
  ON bible_reading_history (user_id, book_id);
```

### 2.3 Table `user_activity_log` (à créer)

```sql
CREATE TABLE public.user_activity_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action         TEXT NOT NULL CHECK (action IN (
    'bible_read',           -- Chapitre lu
    'ai_chat',              -- Message envoyé à l'IA
    'journal_entry',        -- Entrée de journal créée
    'plan_day_completed',   -- Jour de plan complété
    'prayer_request',       -- Demande de prière créée ou priée
    'note_created',         -- Note créée ou modifiée
    'bookmark_added',       -- Signet ajouté
    'meditation',           -- Méditation guidée complétée
    'theology_query',       -- Question théologique posée
    'search',               -- Recherche biblique
    'media_saved',          -- Ressource sauvegardée
    'recommendation_clicked' -- Recommandation cliquée
  )),
  resource_type  TEXT,              -- 'chapter','book','verse','session','plan','note'
  resource_id    TEXT,              -- ex: 'JHN.3', plan-uuid
  resource_label TEXT,              -- ex: 'Jean 3', 'Romains en 14 jours'
  duration_sec   INTEGER,           -- Durée en secondes (si mesurable)
  metadata       JSONB DEFAULT '{}', -- Données supplémentaires libres
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_activity_user_date ON user_activity_log (user_id, created_at DESC);
CREATE INDEX idx_activity_action    ON user_activity_log (user_id, action);
-- Nettoyage automatique : données > 2 ans
```

### 2.4 Table `study_streaks` (à créer)

```sql
CREATE TABLE public.study_streaks (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak   INTEGER DEFAULT 0,     -- Jours consécutifs actuels
  longest_streak   INTEGER DEFAULT 0,     -- Record personnel
  last_activity    DATE,                  -- Dernière date d'activité (pour calcul streak)
  total_days_active INTEGER DEFAULT 0,   -- Total de jours avec au moins 1 activité
  freeze_remaining INTEGER DEFAULT 1,    -- Jours de "congé" restants ce mois (1/mois)
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.5 Table `user_objectives` (à créer)

```sql
CREATE TABLE public.user_objectives (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  objective_type TEXT NOT NULL CHECK (objective_type IN (
    'lecture',      -- Lire N chapitres par période
    'étude',        -- N sessions IA par période
    'prière',       -- N demandes ou entrées de prière par période
    'mémorisation', -- Mémoriser N versets
    'plan'          -- Terminer un plan de lecture
  )),
  target_value   INTEGER NOT NULL,        -- Valeur cible
  current_value  INTEGER DEFAULT 0,       -- Valeur actuelle
  unit           TEXT DEFAULT 'chapitres', -- chapitres|minutes|jours|versets|plans
  period         TEXT DEFAULT 'mensuel' CHECK (period IN ('quotidien','hebdomadaire','mensuel','annuel','ponctuel')),
  start_date     DATE DEFAULT CURRENT_DATE,
  due_date       DATE,
  is_active      BOOLEAN DEFAULT TRUE,
  is_completed   BOOLEAN DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Calcul du streak — Algorithme

```typescript
// Appelé après chaque activité significative
async function updateStreak(userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
  const streak = await getStreak(userId)

  if (!streak) {
    // Première activité
    await upsertStreak(userId, {
      current_streak: 1,
      longest_streak: 1,
      last_activity: today,
      total_days_active: 1,
    })
    return
  }

  const last = streak.last_activity
  const diff = daysBetween(last, today)

  if (diff === 0) return // Déjà actif aujourd'hui

  const newStreak = diff === 1
    ? streak.current_streak + 1   // Jour consécutif
    : 1                            // Streak cassé, repart de 1

  await upsertStreak(userId, {
    current_streak:    newStreak,
    longest_streak:    Math.max(newStreak, streak.longest_streak),
    last_activity:     today,
    total_days_active: streak.total_days_active + 1,
  })
}
```

### 3.1 Freeze de streak (1 jour de congé par mois)

```typescript
// Quand l'utilisateur n'a pas été actif pendant 2 jours (diff === 2)
// ET qu'il lui reste un freeze ce mois-ci :
if (diff === 2 && streak.freeze_remaining > 0) {
  // Le streak continue comme si l'user avait été actif hier
  // Le freeze est consommé
  newStreak = streak.current_streak + 1
  freezeRemaining = streak.freeze_remaining - 1
}
// Les freezes sont remis à 1 le 1er du mois
```

---

## 4. Tableau de bord de progression

### 4.1 Structure du tableau de bord

```
┌────────────────────────────────────────────────────────────────────┐
│  VOTRE PROGRESSION                                                  │
├──────────────┬─────────────────┬───────────────┬───────────────────┤
│  🔥 Streak   │  📖 Chapitres   │  💬 Sessions  │  ✅ Plans terminés │
│  12 jours    │  47 ce mois     │  23 sessions  │  2 plans           │
│  Record: 21  │  🕒 ~4h15       │  ~8h de chat  │  6 jours d'avance  │
├──────────────┴─────────────────┴───────────────┴───────────────────┤
│  PROGRESSION BIBLIQUE                                               │
│                                                                      │
│  Nouveau Testament    ████████░░░░░░░░  48% (131/260 chapitres)    │
│  Ancien Testament     ████░░░░░░░░░░░░  22% (234/929 chapitres)    │
│                                                                      │
│  Livres terminés ce mois : Jean ✅, Actes ✅, 1 Jean ✅             │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  OBJECTIFS DU MOIS                                                  │
│  📖 Lire 30 chapitres     ████████████████░░░░  24/30 (80%)        │
│  💬 5 sessions IA         ████████████░░░░░░░░  3/5 (60%)          │
│                                          [+ Ajouter un objectif]    │
├──────────────────────────────────────────────────────────────────────┤
│  ACTIVITÉ DES 30 DERNIERS JOURS                                     │
│  [Grille GitHub-style : cases vides/grises/colorées par activité]   │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 Grille d'activité (type GitHub)

52 semaines × 7 jours de cases, chaque case colorée selon l'intensité :
- ⬜ Aucune activité
- 🟦 Faible (1-2 actions)
- 🔵 Moyen (3-5 actions)
- 🟣 Élevé (6-10 actions)
- ⚫ Très élevé (10+ actions)

---

## 5. Enregistrement des activités — Pattern d'intégration

### 5.1 Comment enregistrer sans bloquer l'UX

```typescript
// Utilitaire serveur — fire-and-forget
export async function logActivity(
  userId: string,
  action: ActivityAction,
  opts?: { resourceType?: string; resourceId?: string; resourceLabel?: string; durationSec?: number; metadata?: Record<string, unknown> }
): Promise<void> {
  // Ne bloque jamais — erreur silencieuse
  const supabase = createAdminClient()
  supabase.from('user_activity_log').insert({
    user_id:        userId,
    action,
    resource_type:  opts?.resourceType,
    resource_id:    opts?.resourceId,
    resource_label: opts?.resourceLabel,
    duration_sec:   opts?.durationSec,
    metadata:       opts?.metadata ?? {},
  }).then(() => {
    // Aussi mettre à jour le streak si action significative
    if (['bible_read','ai_chat','journal_entry','plan_day_completed'].includes(action)) {
      updateStreak(userId).catch(console.error)
    }
    // Mettre à jour les stats dans spiritual_profile (totaux)
    updateProfileStats(userId, action).catch(console.error)
  }).catch(console.error)
}
```

### 5.2 Points d'intégration dans le code existant

| Fichier | Où ajouter | Action à logger |
|---|---|---|
| `src/lib/actions/bible.ts` (updateProgress) | Après upsert bible_progress | `bible_read` |
| `src/app/api/bible-ai/chat/route.ts` | Après chaque message reçu | `ai_chat` |
| `src/app/api/bible-ai/journal/route.ts` | Après création d'entrée | `journal_entry` |
| `src/app/api/bible-ai/plans/route.ts` | Après completion d'un jour | `plan_day_completed` |
| `src/lib/actions/membres.ts` (createPrayerRequest) | Après création | `prayer_request` |
| `src/app/espace-membres/notes/` | Après création note | `note_created` |

---

## 6. Routes API

```typescript
// GET /api/activity/summary?days=30
// Retourne les stats agrégées pour le tableau de bord
{
  streak: { current: number, longest: number, lastActivity: string },
  chapters_read: number,
  ai_sessions: number,
  plans_completed: number,
  total_minutes: number,
  activity_grid: Array<{ date: string, count: number }>, // 365 jours pour la grille
}

// GET /api/activity/history?limit=20&offset=0
// Historique paginé des activités

// POST /api/activity/log
// Enregistrement manuel (pour actions client-side difficiles à catcher côté serveur)
body: { action, resourceType?, resourceId?, resourceLabel?, durationSec? }

// GET /api/objectives
// Liste des objectifs actifs avec progression calculée dynamiquement
// (current_value calculé depuis user_activity_log en temps réel)

// POST /api/objectives
// Créer un nouvel objectif

// PATCH /api/objectives/[id]
// Mettre à jour (is_active, is_completed, etc.)

// GET /api/reading/stats
// Stats de lecture biblique : chapitres par livre, temps de lecture
{
  by_book: Array<{ book: string, chapters_read: number }>,
  by_testament: { ot: number, nt: number },
  recent_chapters: Array<{ chapter_id: string, label: string, read_at: string }>,
}
```

---

## 7. Coach d'étude — Intégration avec le Progress Engine

Le coach d'étude (feature 12 du cahier des charges) utilise les données de progression comme signal :

```typescript
// Prompt coach enrichi avec les données de progression
const coachContext = `
PROGRESSION ACTUELLE :
- Streak : ${streak.current_streak} jours (record : ${streak.longest_streak})
- Chapitres lus ce mois : ${stats.chapters_read}
- Objectif mensuel : ${objective.target_value} chapitres
- Progression : ${Math.round(objective.current_value / objective.target_value * 100)}%
- Livres récents : ${recentBooks.join(', ')}
- Plans actifs : ${activePlan?.title}

PROCHAINE SUGGESTION DU COACH :
// L'IA génère une suggestion personnalisée basée sur cette progression
`
```

---

## 8. Estimation d'implémentation

| Tâche | Effort |
|---|---|
| Migration SQL (3 tables) | 45 min |
| Utilitaire `logActivity()` | 1h |
| Intégration dans les 6 points d'entrée existants | 3h |
| Algorithme de streak | 1h30 |
| Route `/api/activity/summary` | 2h |
| Route `/api/reading/stats` | 1h30 |
| CRUD objectifs | 2h |
| Tableau de bord UI (composant) | 4h |
| Grille d'activité (GitHub-style) | 2h |
| Tests | 2h |
| **Total** | **~20h** |
