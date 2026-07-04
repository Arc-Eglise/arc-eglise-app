# Plan d'implémentation — User Personalization Engine (UPE)
**ARC Église · Système de personnalisation**  
Date : 2026-06-24 · Statut : En attente de validation

> **Note** : Ce document remplace l'ancien plan de préférences de lecture (déjà implémenté).  
> Le système de lecture est complet — voir `READING_PREFERENCES.md` pour son état.

---

## Vue d'ensemble

L'UPE est implémenté en **6 phases progressives**. Chaque phase est indépendante et livrable séparément. La Phase 1 est la fondation — tout le reste en dépend.

| Phase | Nom | Durée estimée | Valeur immédiate |
|---|---|---|---|
| 0 | Action préalable (Jaise) | 5 min | Lecture sync multi-appareils |
| 1 | Fondations — Profil spirituel + Mémoire enrichie | 2–3 jours | IA contextuelle |
| 2 | Progression + Activité | 3–4 jours | Tableau de bord |
| 3 | Recommandations intelligentes | 2–3 jours | Suggestions personnalisées |
| 4 | Journal de prière + Bibliothèque | 2–3 jours | Outils spirituels complets |
| 5 | Coach + Objectifs | 3–4 jours | Accompagnement guidé |
| 6 | Profils spécialisés + Confidentialité | 2–3 jours | Expérience complète |

**Total estimé : 15–20 jours de développement** (après validation)

---

## Phase 0 — Action Jaise (5 minutes)

### Objectif
Exécuter la migration `reading_preferences` dans Supabase pour activer la synchronisation des préférences de lecture entre appareils.

### Action

```
1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier le contenu de : supabase/reading-preferences-migration.sql
3. Exécuter
4. Vérifier dans Table Editor que la table reading_preferences existe avec RLS activée
```

**Cette action débloque la synchronisation cross-device pour les préférences de lecture déjà implémentées.**

---

## Phase 1 — Fondations : Profil Spirituel + Mémoire Enrichie

### Objectif
Créer le `spiritual_profile` et enrichir la mémoire IA avec un mémo contextuel. C'est la colonne vertébrale de tout le système.

### Migration SQL à créer

**Fichier** : `supabase/phase1-spiritual-profile.sql`

```sql
CREATE TABLE public.spiritual_profile (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_type         TEXT DEFAULT 'membre' CHECK (profile_type IN (
    'membre','nouveau_converti','jeunesse','famille','responsable','pasteur','enseignant'
  )),
  profile_age_range    TEXT DEFAULT 'adulte' CHECK (profile_age_range IN (
    'enfant','adolescent','jeune_adulte','adulte','senior'
  )),
  theological_focus    TEXT[] DEFAULT '{}',
  fav_ot_books         TEXT[] DEFAULT '{}',
  fav_nt_books         TEXT[] DEFAULT '{}',
  prayer_topics        TEXT[] DEFAULT '{}',
  study_themes         TEXT[] DEFAULT '{}',
  spiritual_maturity   TEXT DEFAULT 'intermediaire' CHECK (spiritual_maturity IN (
    'enfant','debutant','intermediaire','avance','enseignant'
  )),
  growth_areas         TEXT[] DEFAULT '{}',
  total_sessions       INTEGER DEFAULT 0,
  total_chapters       INTEGER DEFAULT 0,
  total_minutes        INTEGER DEFAULT 0,
  total_plans          INTEGER DEFAULT 0,
  total_prayers        INTEGER DEFAULT 0,
  ai_context_memo      TEXT,
  ai_memo_updated_at   TIMESTAMPTZ,
  show_dashboard       BOOLEAN DEFAULT TRUE,
  enable_coach         BOOLEAN DEFAULT TRUE,
  daily_goal_minutes   INTEGER DEFAULT 15,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.spiritual_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_spiritual_profile" ON public.spiritual_profile
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_spiritual_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_spiritual_profile_updated_at
  BEFORE UPDATE ON public.spiritual_profile
  FOR EACH ROW EXECUTE FUNCTION update_spiritual_profile_updated_at();
```

### Fichiers à créer

```
src/types/spiritual-profile.ts              → Types TypeScript (SpiritualProfile, ProfileType, etc.)
src/lib/spiritual-profile.ts                → getSpiritualProfile(), upsertSpiritualProfile()
                                              buildUserContext() — construit le prompt enrichi
src/app/api/profile/spiritual/route.ts      → GET + PATCH
src/app/api/profile/refresh-memo/route.ts   → POST — régénère ai_context_memo via Lunziko
```

### Fichiers à modifier

```
src/lib/bible-ai.ts                         → Étendre buildSystemPrompt() avec buildUserContext()
src/app/api/bible-ai/chat/route.ts          → Charger le profil + injecter dans prompt système
src/app/api/lunziko/chat/route.ts           → Idem pour l'assistant général
src/app/espace-membres/profil/page.tsx      → Afficher + modifier le profil spirituel
```

### Validation Phase 1

- [ ] Table `spiritual_profile` créée avec RLS
- [ ] `GET /api/profile/spiritual` retourne le profil (ou défauts si nouveau)
- [ ] `PATCH /api/profile/spiritual` met à jour les champs déclarés
- [ ] `POST /api/profile/refresh-memo` génère et sauvegarde le mémo via Lunziko
- [ ] Le chat biblique inclut le profil dans le prompt système
- [ ] L'assistant général inclut le profil dans le prompt système
- [ ] Page profil affiche et permet la modification du profil spirituel

---

## Phase 2 — Progression + Activité

### Objectif
Tracer l'activité de l'utilisateur, calculer les streaks, afficher un tableau de bord de progression.

### Migration SQL à créer

**Fichier** : `supabase/phase2-activity-progress.sql`

```sql
-- Historique de lecture chapitre par chapitre
CREATE TABLE public.bible_reading_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bible_id     TEXT NOT NULL,
  book_id      TEXT NOT NULL,
  chapter_id   TEXT NOT NULL,
  chapter_num  INTEGER,
  read_at      TIMESTAMPTZ DEFAULT NOW(),
  duration_sec INTEGER
);
CREATE UNIQUE INDEX idx_reading_history_unique
  ON bible_reading_history (user_id, chapter_id, (read_at::DATE));
CREATE INDEX idx_reading_history_user ON bible_reading_history (user_id, read_at DESC);

-- Log d'activité granulaire
CREATE TABLE public.user_activity_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action         TEXT NOT NULL CHECK (action IN (
    'bible_read','ai_chat','journal_entry','plan_day_completed','prayer_request',
    'note_created','bookmark_added','meditation','theology_query','search',
    'media_saved','recommendation_clicked'
  )),
  resource_type  TEXT,
  resource_id    TEXT,
  resource_label TEXT,
  duration_sec   INTEGER,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_activity_user_date ON user_activity_log (user_id, created_at DESC);
CREATE INDEX idx_activity_action    ON user_activity_log (user_id, action);

-- Streaks d'engagement
CREATE TABLE public.study_streaks (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak    INTEGER DEFAULT 0,
  longest_streak    INTEGER DEFAULT 0,
  last_activity     DATE,
  total_days_active INTEGER DEFAULT 0,
  freeze_remaining  INTEGER DEFAULT 1,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- RLS sur les 3 tables
ALTER TABLE public.bible_reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_streaks         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own" ON public.bible_reading_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_own" ON public.user_activity_log     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_own" ON public.study_streaks         FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Fichiers à créer

```
src/lib/activity.ts                             → logActivity(), updateStreak(), getActivityStats()
src/app/api/activity/summary/route.ts           → GET — stats pour tableau de bord
src/app/api/activity/history/route.ts           → GET — historique paginé
src/app/api/activity/log/route.ts               → POST — log manuel (client-side)
src/app/api/reading/stats/route.ts              → GET — stats par livre/testament
src/app/api/streaks/route.ts                    → GET — état du streak
src/components/dashboard/ActivityGrid.tsx       → Grille type GitHub
src/components/dashboard/StreakBadge.tsx        → Badge streak avec flamme
src/components/dashboard/ProgressStats.tsx      → Cartes stats (chapitres, sessions, plans)
src/components/dashboard/BibleProgressBar.tsx   → Barre AT/NT
```

### Fichiers à modifier

```
src/lib/actions/bible.ts                        → Après updateProgress() : logActivity('bible_read')
src/app/api/bible-ai/chat/route.ts              → Après réponse : logActivity('ai_chat')
src/app/api/bible-ai/journal/route.ts           → Après création : logActivity('journal_entry')
src/app/api/bible-ai/plans/route.ts             → Après completion jour : logActivity('plan_day_completed')
src/lib/actions/membres.ts                      → Après createPrayerRequest : logActivity('prayer_request')
src/app/espace-membres/page.tsx                 → Ajouter le tableau de bord de progression
```

### Validation Phase 2

- [ ] Les 3 tables créées avec RLS
- [ ] `logActivity()` s'exécute silencieusement sans bloquer les opérations
- [ ] `GET /api/activity/summary` retourne streak, chapitres, sessions, grille 365 jours
- [ ] Tableau de bord visible et chargé depuis `/espace-membres`
- [ ] Streak incrémenté le lendemain d'une activité
- [ ] Streak reset si 2+ jours sans activité (sauf freeze utilisé)

---

## Phase 3 — Recommandations Intelligentes

### Objectif
Moteur de recommandations proactives basé sur le profil et l'historique.

### Migration SQL à créer

**Fichier** : `supabase/phase3-recommendations.sql`

```sql
CREATE TABLE public.recommendation_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rec_type     TEXT NOT NULL,
  title        TEXT NOT NULL,
  source_id    TEXT,
  shown_at     TIMESTAMPTZ DEFAULT NOW(),
  clicked      BOOLEAN DEFAULT FALSE,
  dismissed    BOOLEAN DEFAULT FALSE,
  saved        BOOLEAN DEFAULT FALSE,
  rating       INTEGER CHECK (rating BETWEEN 1 AND 5)
);
CREATE INDEX idx_rec_history_user ON recommendation_history (user_id, shown_at DESC);

ALTER TABLE public.recommendation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON public.recommendation_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Extension ai_media_recommendations
ALTER TABLE ai_media_recommendations
  ADD COLUMN IF NOT EXISTS shown_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dismissed   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT NOW();
```

### Fichiers à créer

```
src/lib/recommendations.ts                          → buildRecommendationContext(), generateRecommendations()
src/app/api/recommendations/route.ts                → GET — retourne les recs du moment (cache 24h)
src/app/api/recommendations/[id]/track/route.ts     → POST — track click/dismiss/save/rate
src/app/api/recommendations/refresh/route.ts        → POST — régénération forcée
src/components/dashboard/RecommendationsWidget.tsx  → Widget "Pour toi aujourd'hui"
src/components/bible-ai/AfterResponseSuggestions.tsx → Suggestions après réponse IA
```

### Fichiers à modifier

```
src/app/api/bible-ai/media/route.ts                 → Enrichir avec profil + sauvegarder dans recommendation_history
src/app/espace-membres/page.tsx                     → Ajouter widget recommandations
```

### Validation Phase 3

- [ ] Table `recommendation_history` créée avec RLS
- [ ] `GET /api/recommendations` retourne 3–5 recs personnalisées
- [ ] Les recs ne répètent pas ce qui a été dismissed (30 derniers jours)
- [ ] Track click/dismiss enregistré dans recommendation_history
- [ ] Widget "Pour toi aujourd'hui" visible dans le tableau de bord

---

## Phase 4 — Journal de Prière + Bibliothèque Personnelle

### Objectif
Journal de prière privé (distinct du mur communautaire) et bibliothèque d'éléments sauvegardés.

### Migration SQL à créer

**Fichier** : `supabase/phase4-prayer-library.sql`

```sql
CREATE TABLE public.prayer_journal (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'actif' CHECK (status IN ('actif','en_cours','exauce','archive')),
  is_private  BOOLEAN DEFAULT TRUE,
  verse_refs  TEXT[] DEFAULT '{}',
  testimony   TEXT,
  ai_suggestion TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);

CREATE TABLE public.user_library (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type   TEXT NOT NULL CHECK (item_type IN (
    'verse','ai_response','meditation','sermon','article','video','plan','note'
  )),
  title       TEXT NOT NULL,
  content     TEXT,
  source_ref  TEXT,
  tags        TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  collection  TEXT DEFAULT 'général',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.prayer_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_library   ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON public.prayer_journal FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_own" ON public.user_library   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Fichiers à créer

```
src/app/api/prayer-journal/route.ts                → GET + POST
src/app/api/prayer-journal/[id]/route.ts           → PATCH + DELETE
src/app/api/library/route.ts                       → GET + POST
src/app/api/library/[id]/route.ts                  → DELETE
src/app/espace-membres/journal-priere/page.tsx     → Page journal de prière privé
src/app/espace-membres/bibliotheque/page.tsx        → Page bibliothèque personnelle
src/components/membres/PrayerJournalCard.tsx
src/components/membres/LibraryItem.tsx
```

### Fichiers à modifier

```
src/app/espace-membres/layout.tsx                  → Ajouter liens navigation
src/app/espace-membres/page.tsx                    → Widget prière du jour
src/components/bible-ai/BibleAIClient.tsx          → Bouton "Sauvegarder" sur les réponses
```

---

## Phase 5 — Coach + Objectifs Personnels

### Objectif
Coach d'étude biblique IA et système d'objectifs quantifiables.

### Migration SQL à créer

**Fichier** : `supabase/phase5-objectives.sql`

```sql
CREATE TABLE public.user_objectives (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  objective_type TEXT NOT NULL CHECK (objective_type IN (
    'lecture','étude','prière','mémorisation','plan'
  )),
  target_value   INTEGER NOT NULL,
  current_value  INTEGER DEFAULT 0,
  unit           TEXT DEFAULT 'chapitres',
  period         TEXT DEFAULT 'mensuel' CHECK (period IN (
    'quotidien','hebdomadaire','mensuel','annuel','ponctuel'
  )),
  start_date     DATE DEFAULT CURRENT_DATE,
  due_date       DATE,
  is_active      BOOLEAN DEFAULT TRUE,
  is_completed   BOOLEAN DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON public.user_objectives FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### Fichiers à créer

```
src/app/api/objectives/route.ts              → GET + POST
src/app/api/objectives/[id]/route.ts         → PATCH + DELETE
src/app/api/coach/route.ts                   → POST — suggestion IA basée sur la progression
src/components/dashboard/ObjectivesWidget.tsx
src/components/coach/CoachSuggestion.tsx
```

---

## Phase 6 — Profils Spécialisés + Confidentialité

### Objectif
Adapter l'expérience selon le type de membre. Page de gestion des données personnelles.

### Pas de nouvelles migrations SQL

Utilise `spiritual_profile.profile_type` (Phase 1).

### Fichiers à créer

```
src/lib/profile-contexts.ts                       → PROFILE_TYPE_CONTEXT (prompts adaptés par type)
src/components/onboarding/WelcomeFlow.tsx          → Parcours d'accueil pour nouveau_converti
src/app/espace-membres/confidentialite/page.tsx   → Gestion mémoire IA + données perso
```

### Fichiers à modifier

```
src/app/espace-membres/page.tsx                   → Accueil adapté selon profile_type
src/app/api/bible-ai/chat/route.ts                → Injecter PROFILE_TYPE_CONTEXT
src/app/api/lunziko/chat/route.ts                 → Idem
```

---

## Dépendances entre phases

```
Phase 0 (Jaise — migration reading prefs)
    ↓
Phase 1 (spiritual_profile)
    ├──────────────────────────────────────┐
    ▼                                      ▼
Phase 2 (activity + progress)     Phase 3 (recommandations)
    │                                      │
    ▼                                      ▼
Phase 5 (coach + objectifs)       Phase 4 (prayer + library)
    └──────────────────────────────────────┘
                    ▼
            Phase 6 (profils spécialisés)
```

Les Phases 2, 3 et 4 peuvent être développées en **parallèle** après la Phase 1.

---

## Résumé des migrations SQL

| Fichier | Phase | Tables créées | Tables modifiées |
|---|---|---|---|
| `reading-preferences-migration.sql` | 0 | `reading_preferences` | — |
| `phase1-spiritual-profile.sql` | 1 | `spiritual_profile` | — |
| `phase2-activity-progress.sql` | 2 | `bible_reading_history`, `user_activity_log`, `study_streaks` | — |
| `phase3-recommendations.sql` | 3 | `recommendation_history` | `ai_media_recommendations` (+4 cols) |
| `phase4-prayer-library.sql` | 4 | `prayer_journal`, `user_library` | — |
| `phase5-objectives.sql` | 5 | `user_objectives` | — |

**Total : 9 nouvelles tables + 4 colonnes ajoutées à une table existante**

---

## Impacts Supabase

### Volume de données estimé (1 000 utilisateurs actifs/mois)

| Table | Lignes/user/mois | Total/mois |
|---|---|---|
| `user_activity_log` | ~200 | ~200 000 |
| `bible_reading_history` | ~50 | ~50 000 |
| `recommendation_history` | ~30 | ~30 000 |
| Autres nouvelles tables | <10 | <10 000 |

→ Volume très raisonnable pour le plan Supabase Pro.

### Index de performance critiques

```sql
-- À inclure dans chaque migration
CREATE INDEX idx_activity_user_date ON user_activity_log (user_id, created_at DESC);
CREATE INDEX idx_reading_history_user ON bible_reading_history (user_id, read_at DESC);
CREATE INDEX idx_rec_history_user ON recommendation_history (user_id, shown_at DESC);
```

---

## Impacts sur Lunziko Platform

| Usage | Fréquence | Tokens supplémentaires |
|---|---|---|
| Contexte enrichi dans chaque prompt | À chaque message | +200–500 tokens |
| Génération du mémo contextuel | ~1x/semaine/user actif | 1 500–2 000 tokens |
| Génération de recommandations | ~1x/semaine/user actif | 2 000–3 000 tokens |
| Suggestion du coach | Sur demande | 1 000–1 500 tokens |

Augmentation estimée des coûts Lunziko Platform : **+15–25%** (marginal).

---

## Checklist de validation — Avant de commencer

Valider avec Jaise :

- [ ] Architecture globale approuvée
- [ ] Phase 1 uniquement ou plusieurs phases en parallèle ?
- [ ] Les noms de tables sont conformes aux conventions existantes
- [ ] Le profil spirituel est OPTIONNEL (l'user peut ignorer) — confirmer
- [ ] Journal de prière privé vs mur communautaire — bien deux tables séparées — confirmer
- [ ] Les streaks doivent-ils être visibles aux autres membres ou strictement privés ?
- [ ] Priorité Phase 3 vs Phase 4 (recommandations vs bibliothèque)
- [ ] Politique de rétention des logs d'activité (2 ans proposé)
