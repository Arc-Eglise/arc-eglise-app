# ARC Église AI — Routes API

> **Statut :** Document de conception — en attente de validation  
> **Date :** Juin 2026

---

## 1. Conventions générales

- **Préfixe :** `/api/bible-ai/`
- **Méthode :** `POST` pour toutes les routes IA (corps JSON)
- **Auth :** Cookie Supabase session (géré par le middleware existant)
- **Réponse streaming :** SSE (`text/event-stream`) — même format que `/api/lunziko/chat`
- **Réponse non-streaming :** JSON
- **Erreur auth :** 401
- **Erreur validation :** 400
- **Erreur LLM :** 200 avec `{ error: "message lisible" }` (même pattern existant)

### Format SSE unifié (identique à l'existant)
```
data: {"type":"start","mode":"chat"}
data: {"type":"chunk","content":"fragment de texte"}
data: {"type":"end","tokens":{"input":150,"output":320},"refs":["JHN.3.16"]}
data: {"type":"error","error":"message"}
```

---

## 2. Routes existantes (réutilisées)

| Route | Usage dans ARC Église AI |
|-------|--------------------------|
| `POST /api/lunziko/chat` | Conversations générales (réutilisation directe) |
| `POST /api/lunziko/summarize` | Résumé de passages / sessions |
| `GET /api/bible/books` | Liste des livres bibliques |
| `GET /api/bible/chapter` | Lecture d'un chapitre |
| `GET /api/bible/search` | Recherche textuelle |
| `GET /api/bible/crossrefs` | Références croisées |
| `GET /api/bible/versions` | Versions disponibles |

---

## 3. Nouvelles routes à créer

### 3.1 `POST /api/bible-ai/chat`
Chat biblique contextuel (mode principal).

**Requête :**
```typescript
{
  message: string,          // Question ou texte utilisateur
  session_id?: string,      // UUID session existante (pour continuité)
  history?: Message[],      // Historique récent (max 10)
  context?: {
    mode?: "chat" | "theology" | "meditation" | "sermon",
    language?: string,      // "fr" | "en" | "ln" | ...
    level?: Level,          // "enfant" | "debutant" | "intermediaire" | "avance" | "enseignant"
    verse?: string,         // Verset de contexte (ex: "JHN.3.16")
    topic?: string,         // Thème (ex: "foi", "grâce")
  },
  stream?: boolean,         // Défaut: true
}
```

**Réponse (stream) :** SSE avec `type: "chunk"` et `refs[]` dans le message `end`.

**Logique serveur :**
1. Auth check
2. Load `ai_user_preferences` depuis Supabase
3. Créer/continuer `ai_bible_sessions`
4. Construire system prompt (`BIBLE_AI_SYSTEM` + préférences)
5. `lunzikoFetch('/chat', { message, history, system, context })`
6. Persister message dans `ai_session_messages`
7. Stream SSE vers client

---

### 3.2 `POST /api/bible-ai/search`
Recherche biblique multi-mode.

**Requête :**
```typescript
{
  query: string,
  mode: "semantic" | "thematic" | "character" | "location" | "event" | "keyword",
  language?: string,
  bible_id?: string,
  limit?: number,  // Défaut: 10
}
```

**Réponse :**
```typescript
{
  results: {
    ref: string,              // "JHN.3.16"
    reference: string,        // "Jean 3:16"
    text: string,
    relevance: number,        // 0.0 → 1.0
    explanation?: string,     // Pourquoi ce résultat est pertinent
    translations?: {          // Si mode semantic
      [bible_id: string]: string
    }
  }[],
  total: number,
  query_interpretation: string,  // Comment l'IA a interprété la requête
}
```

**Logique serveur :**
1. Auth check
2. Construire prompt de recherche spécialisé selon `mode`
3. `lunzikoFetch('/chat', { system: SEARCH_SYSTEM_PROMPTS[mode], message: query })`
4. Parser la réponse JSON de l'IA
5. Enrichir avec textes depuis Scripture.api.bible
6. Retourner JSON

---

### 3.3 `POST /api/bible-ai/explain`
Explication d'un passage à un niveau donné.

**Requête :**
```typescript
{
  verse_ref: string,     // ex: "JHN.3.16" ou "GEN.1.1-3"
  level: Level,          // niveau d'explication
  language?: string,
  translation?: string,  // bible_id de la traduction source
  stream?: boolean,
}
```

**Réponse (stream) :** SSE avec l'explication complète.

---

### 3.4 `POST /api/bible-ai/compare`
Comparaison de traductions pour un passage.

**Requête :**
```typescript
{
  verse_ref: string,
  bible_ids: string[],   // max 6 traductions
  language?: string,     // langue du commentaire comparatif
}
```

**Réponse :**
```typescript
{
  verse_ref: string,
  translations: {
    bible_id: string,
    name: string,
    abbr: string,
    text: string,
    language: string,
  }[],
  ai_commentary?: string,  // Analyse des différences de traduction (optionnel)
}
```

---

### 3.5 `POST /api/bible-ai/theology`
Assistant théologique avec sources.

**Requête :**
```typescript
{
  question: string,
  category?: "doctrine" | "ethics" | "history" | "apologetics" | "hermeneutics",
  tradition?: "reformed" | "catholic" | "orthodox" | "evangelical" | "all",
  session_id?: string,
  stream?: boolean,
}
```

**Réponse (stream) :** SSE — chaque affirmation doit contenir des références bibliques et théologiques.

---

### 3.6 `POST /api/bible-ai/meditate`
Guide de méditation biblique.

**Requête :**
```typescript
{
  verse_ref: string,
  duration?: "5min" | "10min" | "20min",
  style?: "lectio-divina" | "examen" | "contemplation" | "intercession",
  language?: string,
  stream?: boolean,
}
```

**Réponse (stream) :** SSE — guide pas-à-pas de méditation.

---

### 3.7 `POST /api/bible-ai/plans` (CRUD)

**Créer un plan :**
```typescript
POST /api/bible-ai/plans
{
  action: "create",
  title?: string,         // Si omis, l'IA le génère
  level: Level,
  duration_days: number,
  language?: string,
  focus?: string,         // "Évangile de Jean" | "Psaumes" | "épîtres de Paul" | ...
  generate?: boolean,     // true → l'IA génère les jours automatiquement
}
```

**Lister :**
```typescript
POST /api/bible-ai/plans
{ action: "list" }
```

**Marquer un jour comme complété :**
```typescript
POST /api/bible-ai/plans
{ action: "complete_day", plan_id: string, day_number: number }
```

**Réponse (create avec generate=true) :** SSE pendant la génération, puis JSON final avec le plan complet.

---

### 3.8 `POST /api/bible-ai/journal` (CRUD)

**Créer/mettre à jour une entrée :**
```typescript
POST /api/bible-ai/journal
{
  action: "upsert",
  date?: string,          // ISO date, défaut: aujourd'hui
  content: string,
  verse_refs?: string[],
  mood?: string,
  prayer_request_id?: string,
  session_id?: string,
  generate_reflection?: boolean,  // Demander une réflexion IA
}
```

**Générer une réflexion IA :**
```typescript
POST /api/bible-ai/journal
{
  action: "reflect",
  journal_id: string,
  stream?: boolean,
}
```

**Lister les entrées :**
```typescript
POST /api/bible-ai/journal
{ action: "list", from?: string, to?: string }
```

---

### 3.9 `POST /api/bible-ai/graph`
Données du Bible Study Graph.

**Requête :**
```typescript
{
  center?: string,     // Verset/livre/thème central (ex: "JHN.3.16" | "foi" | "Jean")
  depth?: number,      // Profondeur du graphe (1-3), défaut: 2
  type?: "crossrefs" | "themes" | "characters" | "timeline",
  language?: string,
}
```

**Réponse :**
```typescript
{
  nodes: {
    id: string,
    label: string,
    type: "verse" | "book" | "theme" | "character" | "event" | "location",
    data?: { ref?: string, text?: string, ... }
  }[],
  edges: {
    source: string,
    target: string,
    label?: string,
    weight?: number,
    type?: "crossref" | "theme" | "character" | "timeline",
  }[],
}
```

---

### 3.10 `POST /api/bible-ai/events`
Recherche d'événements (église + web).

**Requête :**
```typescript
{
  query: string,           // ex: "conférences bibliques Suisse 2026"
  scope?: "church" | "web" | "both",
  location?: string,       // ex: "Suisse"
  language?: string,
}
```

**Réponse :**
```typescript
{
  church_events: Event[],   // Depuis table `events` Supabase
  web_results?: {
    title: string,
    url: string,
    snippet: string,
    date?: string,
    source: string,
  }[],
}
```

---

### 3.11 `POST /api/bible-ai/media`
Recommandations de médias bibliques.

**Requête :**
```typescript
{
  topic?: string,          // Thème ou verset
  type?: MediaType[],      // ["video","podcast","article"]
  language?: string,
  save?: boolean,          // Sauvegarder la recommandation en DB
  recommendation_id?: string,  // Pour noter/sauvegarder une recommandation existante
  rating?: number,
}
```

**Réponse :**
```typescript
{
  recommendations: {
    id?: string,
    title: string,
    type: MediaType,
    url?: string,
    author?: string,
    description: string,
    verse_refs: string[],
    topics: string[],
    language: string,
    saved: boolean,
  }[],
}
```

---

### 3.12 `POST /api/bible-ai/sermon`
Préparation de sermon (admin/pasteur uniquement).

**Requête :**
```typescript
{
  topic?: string,
  verse_ref?: string,
  series?: string,
  audience?: string,         // "congregation" | "youth" | "women" | ...
  duration_minutes?: number, // 30 | 45 | 60
  style?: "expository" | "thematic" | "narrative",
  language?: string,
  stream?: boolean,
}
```

**Auth requis :** `role IN ('admin', 'pasteur')` — 403 sinon.

**Réponse (stream) :** SSE avec plan de sermon structuré (intro, 3 points, conclusion, prière).

---

### 3.13 `POST /api/bible-ai/preferences`
Gestion des préférences IA utilisateur.

```typescript
POST /api/bible-ai/preferences
{
  action: "get" | "update",
  data?: Partial<AIUserPreferences>
}
```

---

## 4. Structure des fichiers

```
src/app/api/bible-ai/
  chat/route.ts
  search/route.ts
  explain/route.ts
  compare/route.ts
  theology/route.ts
  meditate/route.ts
  plans/route.ts
  journal/route.ts
  graph/route.ts
  events/route.ts
  media/route.ts
  sermon/route.ts
  preferences/route.ts

src/lib/
  bible-ai.ts        — Helper partagé (auth check, system prompts, cache)
  bible-ai-prompts.ts — System prompts par mode
```

---

## 5. Helper partagé `src/lib/bible-ai.ts`

```typescript
// Pattern identique à src/lib/lunziko.ts

export async function requireAuth(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHORIZED')
  return user.id
}

export async function getUserPrefs(userId: string): Promise<AIUserPreferences> {
  // Load from ai_user_preferences, with defaults
}

export function buildBibleSystemPrompt(prefs: AIUserPreferences, mode: string): string {
  // Build contextual system prompt
}

export async function getCachedResponse(key: string): Promise<string | null> {
  // Check ai_response_cache
}

export async function setCachedResponse(key: string, response: string, ttlHours = 24): Promise<void> {
  // Insert into ai_response_cache
}
```
