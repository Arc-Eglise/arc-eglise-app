# ARC Église AI — Architecture Générale

> **Statut :** Document de conception — en attente de validation  
> **Date :** Juin 2026  
> **Auteur :** Analyse Claude Code

---

## 1. Vue d'ensemble

ARC Église AI est un assistant biblique spécialisé intégré **directement dans l'espace membres** du site ARC Église. Il ne constitue pas une application séparée : c'est une nouvelle section `/espace-membres/ai-biblique` ajoutée à la plateforme existante.

### Positionnement dans l'architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARC Église Website (Next.js 14)              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Espace Membres                          │   │
│  │                                                         │   │
│  │  /accueil  /messagerie  /agenda  /streaming             │   │
│  │  /priere   /bible       /assistant                      │   │
│  │  ┌──────────────────────────────────────────────┐       │   │
│  │  │   /ai-biblique  ← NOUVEAU (ARC Église AI)    │       │   │
│  │  └──────────────────────────────────────────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Supabase (Auth + PostgreSQL + RLS + Realtime)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/SSE (serveur uniquement)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Lunziko Platform API (cloud)                        │
│  /chat  /summarize  /embed  /search  /knowledge  /memory        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
             LLM providers (Claude / OpenAI / Gemini)
```

---

## 2. Stack technologique (inchangé)

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | Next.js App Router | 14.2.35 |
| Base de données | Supabase (PostgreSQL) | ^2.108.1 |
| Auth | Supabase Auth | idem |
| Styling | Tailwind CSS | ^3.4.1 |
| Déploiement | Vercel | - |
| IA backend | Lunziko Platform API | v1 |
| Bible data | Scripture.api.bible (API Bible) | v1 |
| Bible data (fallback) | getbible.net | v2 |

**Aucune nouvelle dépendance npm n'est nécessaire pour la V1.** Toute la logique AI passe par `lunzikoFetch()` (pattern existant).

---

## 3. Route et navigation

### 3.1 Nouvelle page
```
src/app/espace-membres/ai-biblique/
  page.tsx          — Page principale (Server Component, auth gate)
  layout.tsx        — Layout spécifique (optionnel)
```

### 3.2 Modification SidebarNav.tsx
Le nouvel item est inséré **entre "Prière" et "Bible"** dans `src/components/membres/SidebarNav.tsx` :

```typescript
// Avant (ordre actuel) :
// Prière → Streaming → Bible

// Après :
{ href: "/espace-membres/priere",       label: "Prière & Bible",  icon: "🙏" },
{ href: "/espace-membres/ai-biblique",  label: "ARC Église AI",   icon: "✦" },  // NOUVEAU
{ href: "/espace-membres/streaming",    label: "Streaming",       icon: "📺" },
{ href: "/espace-membres/bible",        label: "Bible",           icon: "📖" },
```

### 3.3 Accès
- **Requis :** Utilisateur authentifié (géré par `layout.tsx` existant)
- **Rôles autorisés :** tous (visiteur, membre, pasteur, admin)
- **Fonctionnalités réservées :** préparation de sermons → pasteur/admin uniquement

---

## 4. Architecture de la page AI Biblique

### 4.1 Onglets (tabs) de la page

```
┌────────────────────────────────────────────────────────────────┐
│  ARC Église AI                                    [Lang ▾] [⚙] │
├──────────┬──────────┬──────────┬──────────┬──────────┬─────────┤
│ 🔍 Bible │ 📖 Étude │ 🗺 Graphe │ 📅 Plans │ 📓 Journal│ 👥 Groupe│
├──────────┴──────────┴──────────┴──────────┴──────────┴─────────┤
│                                                                │
│                    [Contenu de l'onglet actif]                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

| Onglet | Fonctionnalités | API |
|--------|-----------------|-----|
| 🔍 Bible | Recherche biblique multi-mode, comparaison traductions, explication 5 niveaux | `/api/bible-ai/search`, `/api/bible-ai/explain` |
| 📖 Étude | Assistant théologique, méditation, cross-refs, figures bibliques | `/api/bible-ai/theology`, `/api/bible-ai/meditate` |
| 🗺 Graphe | Bible Study Graph, visualisation connexions | `/api/bible-ai/graph` |
| 📅 Plans | Plans de lecture 5 niveaux, suivi progression | `/api/bible-ai/plans` |
| 📓 Journal | Journal spirituel personnel, IA commentaire | `/api/bible-ai/journal` |
| 👥 Groupe | Étude en groupe, partage, sermon (pasteur) | `/api/bible-ai/group` |

### 4.2 Composants React

```
src/components/bible-ai/
  BibleAIChat.tsx          — Chat principal (SSE streaming, pattern existant)
  BibleSearchPanel.tsx     — Recherche multi-mode
  TranslationCompare.tsx   — Comparaison traductions côte-à-côte
  ExplanationLevels.tsx    — Explication 5 niveaux (tabs)
  StudyGraph.tsx           — Graphe D3/SVG (voir BIBLE_GRAPH.md)
  ReadingPlanCard.tsx      — Plan de lecture avec progression
  SpiritualJournal.tsx     — Journal + IA
  GroupStudyRoom.tsx        — Étude en groupe
  MediaPlayer.tsx          — Lecteur audio Bible
  LangSelector.tsx         — Sélecteur 19 langues
  MeditationGuide.tsx      — Guide de méditation
  SermonPrep.tsx           — Préparation sermon (admin/pasteur)
```

---

## 5. Flux de données AI

### 5.1 Requête standard (chat)

```
Client (BibleAIChat.tsx)
  │ POST /api/bible-ai/chat
  │ { message, history, context: { mode, language, level, verse? } }
  ▼
Route Handler (Next.js Server, /api/bible-ai/chat/route.ts)
  │ 1. Auth check (createClient + getUser)
  │ 2. Load user preferences from Supabase
  │ 3. Build enriched system prompt (BIBLE_SYSTEM_PROMPT + user context)
  │ 4. lunzikoFetch('/chat', { message, history, context, system })
  ▼
Lunziko Platform API (/v1/chat)
  │ LLM provider (Claude sonnet-4-6 / auto)
  ▼
SSE stream → Client
  data: {"type":"chunk","content":"..."}
  data: {"type":"end","tokens":{...}}
```

### 5.2 Recherche biblique (non-conversationnelle)

```
Client (BibleSearchPanel.tsx)
  │ POST /api/bible-ai/search
  │ { query, mode: "semantic"|"thematic"|"character"|"location"|"event", language }
  ▼
Route Handler
  │ 1. Auth check
  │ 2. Scripture.api.bible (texte source)
  │ 3. lunzikoFetch('/chat', { system: SEARCH_SYSTEM_PROMPT, message: query })
  ▼
Response JSON: { results: [{ ref, text, relevance, explanation }] }
```

---

## 6. Contraintes de sécurité (inchangées, critiques)

| Règle | Application |
|-------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` côté serveur uniquement | `createAdminClient()` dans route handlers seulement |
| Jamais LunzikoEngine directement | Toujours via `lunzikoFetch()` → Lunziko Platform API |
| Validation utilisateur requise | `auth.getUser()` en tête de chaque route handler |
| Clés IA membres chiffrées AES-256 | `decryptKey()` depuis `member-ai.ts`, jamais exposées au client |
| Pas d'agents autonomes V1 | Toutes les actions IA nécessitent une intention utilisateur explicite |
| Pas d'interprétations théologiques non sourcées | Chaque affirmation référencée (chapitre:verset) |

---

## 7. System prompts — Principes

Chaque mode dispose d'un system prompt dédié injecté dans la requête Lunziko. Structure :

```typescript
const BIBLE_AI_SYSTEM = `
Tu es ARC Église AI, l'assistant biblique spécialisé de l'église ARC (Alliance Réconciliée en Christ).

IDENTITÉ :
- Église évangélique suisse, tradition réformée/charismatique
- Cultes : dimanche 9h30 et 17h00, mercredi 19h00

PRINCIPES ABSOLUS :
1. Toute affirmation biblique doit être référencée (livre chapitre:verset)
2. Toute affirmation théologique doit citer sa source (confession, théologien, date)
3. Sur les sujets controversés : présenter plusieurs perspectives sans décider pour l'utilisateur
4. Niveau d'explication : {level} (enfant/débutant/intermédiaire/avancé/enseignant)
5. Langue de réponse : {language}
6. Ne pas prendre de décisions spirituelles à la place de l'utilisateur

CAPACITÉS :
- Recherche biblique multimodale (thème, personnage, lieu, événement)
- Comparaison de traductions
- Explication de passages à 5 niveaux
- Références croisées
- Contexte historique et culturel
- Théologie systématique (sourcée)
- Plans de méditation
- ...
`
```

---

## 8. Environnement — Variables requises

Variables existantes (déjà configurées) :
```env
LUNZIKO_API_URL
LUNZIKO_SUPABASE_URL
LUNZIKO_SUPABASE_ANON_KEY
LUNZIKO_EMAIL
LUNZIKO_PASSWORD
BIBLE_API_KEY
BIBLE_DEFAULT_ID
ARC_ENCRYPTION_KEY
```

Variables nouvelles à ajouter pour ARC Église AI :
```env
# Optionnel — clé API dédiée pour les recherches web/événements
SERPER_API_KEY=          # Recherche Google via Serper.dev
# ou
BRAVE_SEARCH_API_KEY=    # Recherche Brave (alternative)

# Optionnel — CDN audio Bible
BIBLE_AUDIO_BASE_URL=    # URL de base pour les fichiers MP3 Bible
```

---

## 9. Points d'intégration avec l'existant

| Existant | Intégration ARC Église AI |
|----------|---------------------------|
| `BibleReader.tsx` | Lien direct depuis le graphe → chapitre correspondant |
| `assistant/page.tsx` | Lien croisé (l'assistant renvoie vers AI Biblique pour les questions de foi) |
| `prayer_requests` | Le journal spirituel peut lier une prière à une session d'étude |
| `events` table | Le moteur d'événements lit directement cette table |
| `sermons` table | L'IA peut suggérer des passages pour un sermon basé sur les sermons passés |
| `profiles.groups` | Plans de groupe utilisent les groupes existants |

---

## 10. Audit des lacunes architecturales

| Lacune | Impact | Recommandation |
|--------|--------|----------------|
| Pas de mémoire persistante des conversations IA | L'IA oublie les échanges précédents | Table `ai_sessions` + résumé auto |
| Pas d'embedding vectoriel côté Supabase | Recherche sémantique limitée | pgvector extension + table `bible_embeddings` |
| getbible.net utilisé dans EspaceMembresClient.tsx | API non-officielle, sans clé, peut être bloquée | Migrer vers Scripture.api.bible (déjà configuré) |
| EspaceMembresClient.tsx monolithique (2088 lignes) | Difficile à étendre | Pas à refactoriser pour cette PR (hors scope) |
| Pas de cache Supabase pour les réponses IA fréquentes | Coût API inutile | `ai_response_cache` table avec TTL |
| Plans de lecture hardcodés dans le client | Non personnalisable | Table `reading_plans` en DB |

---

## 11. Ce que cette V1 ne fera PAS

- Agents autonomes (exécution sans validation utilisateur)
- Génération automatique de doctrines
- Interprétations théologiques non sourcées
- Prise de décision spirituelle à la place de l'utilisateur
- Intégration directe LunzikoEngine (Swift) depuis le web
- Bible audio complète intégrée (dépend disponibilité CDN licencié)
