# User Profile Engine — Profil Utilisateur et Profil Spirituel
**ARC Église · Système de personnalisation**  
Date : 2026-06-24 · Statut : Analyse — en attente de validation

---

## 1. Ce qui existe déjà

### 1.1 Table `profiles` (existante)

```typescript
// Colonnes actuelles dans profiles
{
  id:                UUID,
  email:             string,
  first_name:        string | null,
  last_name:         string | null,
  role:              "admin" | "pasteur" | "membre" | "visiteur",
  validated:         boolean,
  phone:             string | null,
  country:           string | null,
  city:              string | null,
  avatar_url:        string | null,
  bio:               string | null,
  groups:            string[],          // ex: ["chorale", "jeunesse"]
  crm_tags:          string[],          // tags admin (pastoral)
  ai_claude_key:     string | null,     // Chiffré AES-256
  ai_openai_key:     string | null,     // Chiffré AES-256
  ai_gemini_key:     string | null,     // Chiffré AES-256
  ai_provider_pref:  string | null,
}
```

### 1.2 Table `ai_user_preferences` (existante)

```typescript
{
  user_id:            UUID,
  language:           string,        // "fr", "en", "ln"...
  level:              BibleLevel,    // enfant|debutant|intermediaire|avance|enseignant
  default_bible:      string,        // ID de la bible API
  fav_books:          string[],      // ex: ["Psaumes", "Jean"]
  fav_topics:         string[],      // ex: ["grâce", "prière"]
  memory_enabled:     boolean,
  notification_plans: boolean,
}
```

### 1.3 Ce qui manque : le profil spirituel structuré

La table `profiles` contient le profil d'identité. `ai_user_preferences` contient les préférences IA déclarées. Mais il n'existe pas de **profil spirituel cumulatif** — construit automatiquement par l'usage.

---

## 2. Architecture du profil spirituel

### 2.1 Deux types de données

```
DONNÉES DÉCLARÉES (actives — l'utilisateur les choisit)
  └── profiles.role
  └── ai_user_preferences.level / language / fav_books / fav_topics
  └── spiritual_profile.profile_type
  └── spiritual_profile.theological_focus

DONNÉES INFÉRÉES (passives — construites automatiquement par l'usage)
  └── spiritual_profile.study_themes    ← thèmes des questions posées à l'IA
  └── spiritual_profile.fav_ot_books    ← livres les plus consultés
  └── spiritual_profile.fav_nt_books
  └── spiritual_profile.prayer_topics   ← sujets extraits du journal de prière
  └── spiritual_profile.total_sessions  ← compteurs automatiques
  └── spiritual_profile.total_chapters
  └── spiritual_profile.total_minutes
```

### 2.2 Schéma complet `spiritual_profile`

```sql
CREATE TABLE public.spiritual_profile (
  -- Identité
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- PROFIL SPÉCIALISÉ (déclaré)
  profile_type         TEXT DEFAULT 'membre'
                       CHECK (profile_type IN (
                         'membre', 'nouveau_converti', 'jeunesse',
                         'famille', 'responsable', 'pasteur', 'enseignant'
                       )),
  profile_age_range    TEXT DEFAULT 'adulte'
                       CHECK (profile_age_range IN ('enfant','adolescent','jeune_adulte','adulte','senior')),

  -- INTÉRÊTS SPIRITUELS (déclarés + inférés)
  theological_focus    TEXT[] DEFAULT '{}',  -- ex: ['réforme','pentecôte','évangélique']
  fav_ot_books         TEXT[] DEFAULT '{}',  -- Ancien Testament
  fav_nt_books         TEXT[] DEFAULT '{}',  -- Nouveau Testament
  prayer_topics        TEXT[] DEFAULT '{}',  -- Sujets de prière récurrents
  study_themes         TEXT[] DEFAULT '{}',  -- Thèmes étudiés

  -- MATURITÉ & CROISSANCE
  spiritual_maturity   TEXT DEFAULT 'intermediaire'
                       CHECK (spiritual_maturity IN ('enfant','debutant','intermediaire','avance','enseignant')),
  growth_areas         TEXT[] DEFAULT '{}',  -- Domaines où l'user veut grandir

  -- STATISTIQUES AGRÉGÉES (mise à jour automatique)
  total_sessions       INTEGER DEFAULT 0,    -- Sessions de chat biblique
  total_chapters       INTEGER DEFAULT 0,    -- Chapitres lus
  total_minutes        INTEGER DEFAULT 0,    -- Temps total passé
  total_plans          INTEGER DEFAULT 0,    -- Plans de lecture terminés
  total_prayers        INTEGER DEFAULT 0,    -- Demandes de prière

  -- MÉMO CONTEXTUEL POUR L'IA
  ai_context_memo      TEXT,                 -- 500 chars max, régénéré périodiquement
  ai_memo_updated_at   TIMESTAMPTZ,

  -- CONFIGURATION DE L'EXPÉRIENCE
  show_dashboard       BOOLEAN DEFAULT TRUE,
  enable_coach         BOOLEAN DEFAULT TRUE,  -- Coach d'étude biblique
  daily_goal_minutes   INTEGER DEFAULT 15,    -- Objectif quotidien en minutes

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Profils spécialisés — Comportement par type

### 3.1 Tableau de différenciation

| Type | Contenu adapté | IA adaptée | UI adaptée |
|---|---|---|---|
| `membre` | Standard, équilibré | Niveau déclaré dans prefs | Interface complète |
| `nouveau_converti` | Bases de la foi, évangile | Niveau débutant, vocabulaire simple | Parcours d'accueil + coach actif |
| `jeunesse` | Contenu jeunes, culturellement pertinent | Ton dynamique, exemples contemporains | Gamification + streaks |
| `famille` | Dévotionnels en famille, passage enfants | Adaptable (adulte/enfant dans même famille) | Agenda famille + plans partagés |
| `responsable` | Leadership, gestion d'équipe chrétienne | Niveau avancé, application pratique | Outils de gestion de cellule |
| `pasteur` | Ressources pastorales, prédication, exégèse | Niveau expert, grec/hébreu | Accès outils d'administration |
| `enseignant` | Ressources pédagogiques, théologie systématique | Niveau expert, sources académiques | Outils de préparation de cours |

### 3.2 Adaptation de l'IA selon le profil

Le profil spécialisé est injecté dans le prompt système de Lunziko Platform :

```typescript
const PROFILE_TYPE_CONTEXT: Record<string, string> = {
  nouveau_converti: "L'utilisateur est un nouveau croyant. Expliquer les concepts de base avec des définitions simples. Privilégier l'Évangile de Jean et les épîtres paulines simples. Encourager sans technicité.",
  jeunesse:         "L'utilisateur est un jeune (ado/jeune adulte). Utiliser des exemples de vie contemporains. Ton dynamique et accessible. Lier la foi aux défis du quotidien jeune.",
  famille:          "L'utilisateur cherche des ressources pour la famille. Proposer des dévotionnels courts (5-10 min). Inclure des passages accessibles aux enfants. Valoriser la prière en famille.",
  responsable:      "L'utilisateur est un responsable d'église ou de cellule. Mettre l'accent sur le leadership serviteur, la gestion des conflits chrétienne, l'accompagnement pastoral de base.",
  pasteur:          "L'utilisateur est pasteur ou en formation pastorale. Réponses théologiques approfondies, sourcing académique, vocabulaire technique biblique approprié.",
  enseignant:       "L'utilisateur prépare des enseignements bibliques. Fournir des structures pédagogiques, des parallèles thématiques, des ressources exégétiques.",
}
```

---

## 4. Construction progressive du profil

### 4.1 Déclencheurs de mise à jour

Le profil spirituel est enrichi automatiquement après chaque interaction significative :

| Action | Mise à jour |
|---|---|
| Chat biblique sur un thème | `study_themes` += thème extrait |
| Consultation d'un livre biblique | `fav_ot_books` ou `fav_nt_books` compteur++ |
| Entrée de journal avec sujets de prière | `prayer_topics` += sujets |
| Chapitre lu | `total_chapters++`, `total_minutes` += durée |
| Session terminée | `total_sessions++` |
| Plan de lecture terminé | `total_plans++` |
| Demande de prière créée | `total_prayers++` |

### 4.2 Enrichissement par batch (non-bloquant)

La mise à jour des arrays (`study_themes`, `fav_ot_books`, etc.) ne doit pas bloquer la réponse utilisateur. Elle se fait en tâche de fond :

```typescript
// Pattern : fire-and-forget
// Dans la route API, après avoir répondu au client
updateSpiritualProfileAsync(userId, { study_themes: [newTheme] }).catch(console.error)
```

### 4.3 Déduplication et nettoyage des arrays

Les arrays sont limités à 20 éléments maximum (les plus récents/fréquents) pour éviter la croissance infinie et garder le mémo IA compact.

---

## 5. Interface utilisateur — Profil spirituel

### 5.1 Page `Mon Profil Spirituel`

À intégrer dans `/espace-membres/profil` :

```
┌────────────────────────────────────────────────────────┐
│  MON PROFIL SPIRITUEL                                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  TYPE DE MEMBRE                                        │
│  [Membre ✓] [Nouveau converti] [Jeunesse] [Famille]   │
│  [Responsable] [Pasteur] [Enseignant]                  │
│                                                        │
│  NIVEAU SPIRITUEL                                      │
│  Débutant ●━━━━━━━━━━━━━━ Expert                       │
│  ┌─── [Intermédiaire ▼] ───────────────────────────┐  │
│                                                        │
│  MES CENTRES D'INTÉRÊT THÉOLOGIQUES                    │
│  + Ajouter un thème (ex: grâce, eschatologie...)      │
│  [Grâce ×] [Trinité ×] [Prière ×]                     │
│                                                        │
│  MES LIVRES PRÉFÉRÉS                                   │
│  AT : [Psaumes ×] [Ésaïe ×]                           │
│  NT : [Jean ×] [Romains ×] [Philippiens ×]             │
│                                                        │
│  OBJECTIF QUOTIDIEN                                    │
│  [15 min ▼] de lecture/étude par jour                  │
│                                                        │
│  ─────────────────────────────────────────────────    │
│  Ce que l'IA mémorise sur vous : [Voir →]              │
│  Dernière mise à jour : il y a 3 jours                 │
└────────────────────────────────────────────────────────┘
```

### 5.2 Accueil personnalisé selon le profil

Au chargement de l'espace membres, le message d'accueil et les raccourcis s'adaptent au type de profil :

- **nouveau_converti** → "Bienvenue ! Commençons par l'Évangile de Jean" + parcours guidé
- **jeunesse** → Streak affiché en premier, défis bibliques
- **pasteur** → Accès rapide aux outils d'administration + ressources exégétiques
- **membre** → Dashboard standard avec statistiques

---

## 6. Routes API du profil

```typescript
// GET /api/profile/spiritual
// Retourne le profil complet avec les préférences IA fusionnées
{ profile: SpiritualProfile, prefs: AIUserPreferences }

// PATCH /api/profile/spiritual
// Mise à jour partielle des champs déclarés uniquement
// (Les champs inférés sont protégés contre la modification directe)
body: { profile_type?, theological_focus?, fav_ot_books?, growth_areas?, daily_goal_minutes? }

// POST /api/profile/refresh-memo
// Régénère le ai_context_memo via Lunziko Platform
// (déclenche aussi la mise à jour des statistiques agrégées)

// GET /api/profile/summary
// Version light pour l'injection dans les composants
// (pas de ai_context_memo, juste profile_type + maturity + stats)
```

---

## 7. Estimation d'implémentation

| Tâche | Effort |
|---|---|
| Migration SQL `spiritual_profile` | 30 min |
| Routes API (GET/PATCH/refresh-memo) | 2h |
| Mise à jour automatique après actions (hooks) | 3h |
| UI dans `/profil` | 3h |
| Injection dans les prompts Lunziko | 2h |
| Tests | 1h |
| **Total** | **~12h** |
