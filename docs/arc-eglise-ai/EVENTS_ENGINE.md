# Events Engine — Moteur d'Événements et Recherche Web

> **Statut :** Document de conception — en attente de validation  
> **Date :** Juin 2026

---

## 1. Objectif

Le moteur d'événements permet à ARC Église AI de répondre à des questions comme :
- "Quels événements y a-t-il à l'église ce mois-ci ?"
- "Y a-t-il des conférences bibliques en Suisse en 2026 ?"
- "Quel pastor parle ce dimanche ?"
- "Cherche des ressources sur la théologie réformée en 2026"

Il combine **deux sources** : les données locales Supabase (événements de l'église) et une **recherche web** pour les événements externes.

---

## 2. Sources de données

### 2.1 Source locale — Table `events` (Supabase)

```sql
-- Données déjà disponibles
SELECT id, title, description, date, time_start, time_end, 
       location, capacity, price_chf, tags, is_public, is_published
FROM events
WHERE is_published = true
  AND date >= CURRENT_DATE
ORDER BY date ASC
```

Données connexes :
- `sermons` — pour le contexte des prédications passées
- `team_members` — pour identifier quel pasteur prêche
- `site_settings` — horaires récurrents (cultes)

### 2.2 Source web — Recherche externe

Pour les événements extérieurs à l'église (conférences, concerts, séminaires...), ARC Église AI utilise une API de recherche web.

**Options recommandées :**

| Provider | Coût | Qualité | Notes |
|----------|------|---------|-------|
| **Serper.dev** | $50/mois (2500 req/j) | Excellent | Résultats Google, facile à intégrer |
| **Brave Search API** | Gratuit (2000 req/mois), puis payant | Bon | Respect vie privée, pas de Google |
| **DuckDuckGo Instant Answers** | Gratuit | Limité | Pas de résultats complets |
| **Via Lunziko Platform WebEngine** | Inclus dans Lunziko | Bon | DuckDuckGo + Wikipedia + RSS |

**Recommandation V1 :** Utiliser le **WebEngine de Lunziko Platform** (déjà disponible dans LunzikoEngine) via l'API Lunziko, en passant la requête de recherche dans le contexte du chat.

```typescript
// Pattern : demander à l'IA de chercher via son accès web
await lunzikoFetch('/chat', {
  message: `Recherche sur le web : "${userQuery}". 
             Donne-moi les 5 résultats les plus pertinents avec leurs URLs.`,
  context: {
    system: EVENTS_SEARCH_SYSTEM_PROMPT,
    use_web: true,   // Signal à Lunziko Platform d'activer WebEngine
  }
})
```

Si Lunziko Platform ne supporte pas `use_web` nativement, fallback sur Serper.dev directement.

---

## 3. Architecture du moteur

### 3.1 Route `POST /api/bible-ai/events`

```typescript
// src/app/api/bible-ai/events/route.ts

export async function POST(req: NextRequest) {
  const userId = await requireAuth()
  const { query, scope = 'both', location = 'Suisse', language = 'fr' } = await req.json()

  const results: EventsResponse = {
    church_events: [],
    web_results: [],
  }

  // ── 1. Événements locaux (toujours inclus) ──────────────────────
  if (scope === 'church' || scope === 'both') {
    const supabase = createAdminClient()
    const { data: events } = await supabase
      .from('events')
      .select('id, title, description, date, time_start, time_end, location, tags')
      .eq('is_published', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(10)

    // Filtrage IA si query complexe
    if (query && events) {
      const filtered = await filterEventsWithAI(events, query, language)
      results.church_events = filtered
    } else {
      results.church_events = events ?? []
    }
  }

  // ── 2. Recherche web ─────────────────────────────────────────────
  if (scope === 'web' || scope === 'both') {
    results.web_results = await searchWeb(
      `${query} ${location} chrétien évangélique 2026`,
      language
    )
  }

  return NextResponse.json(results)
}
```

### 3.2 Filtre IA pour événements locaux

```typescript
async function filterEventsWithAI(
  events: Event[],
  query: string,
  language: string
): Promise<Event[]> {
  // Si la liste est courte (< 5), pas besoin de filtrage
  if (events.length <= 5) return events

  // Demander à l'IA de sélectionner les événements pertinents
  const eventList = events.map(e => `${e.date}: ${e.title} (${e.tags?.join(', ')})`).join('\n')

  const res = await lunzikoFetch('/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: `Parmi ces événements d'église, lesquels correspondent à "${query}" ? 
                Réponds avec les IDs séparés par des virgules.
                ${eventList}`,
      context: { system: 'Tu filtres des événements selon une requête. Réponds uniquement avec les IDs.', language },
    }),
  })

  const text = await res.json()
  const selectedIds = text.content?.split(',').map((id: string) => id.trim()) ?? []
  return events.filter(e => selectedIds.includes(e.id))
}
```

### 3.3 Recherche web

```typescript
async function searchWeb(query: string, language: string): Promise<WebResult[]> {
  const SERPER_KEY = process.env.SERPER_API_KEY

  if (!SERPER_KEY) {
    // Fallback : via Lunziko Platform chat (WebEngine intégré)
    return searchViaLunziko(query, language)
  }

  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      hl: language,
      gl: 'ch',  // Suisse
      num: 5,
    }),
  })

  const data = await res.json()
  return (data.organic ?? []).slice(0, 5).map((r: SerperResult) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
    date: r.date,
    source: new URL(r.link).hostname,
  }))
}

async function searchViaLunziko(query: string, language: string): Promise<WebResult[]> {
  const res = await lunzikoFetch('/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: `Recherche web : "${query}". Donne 3-5 résultats récents et pertinents en JSON.`,
      context: {
        system: `Tu es un assistant de recherche. Réponds uniquement en JSON: 
                 [{"title":"...","url":"...","snippet":"...","source":"..."}]`,
        language,
      },
    }),
  })
  try {
    const data = await res.json()
    return JSON.parse(data.content ?? '[]')
  } catch {
    return []
  }
}
```

---

## 4. Intégration dans le chat

L'assistant principal (`/api/bible-ai/chat`) peut déclencher automatiquement une recherche d'événements si la question le justifie :

```typescript
// Détection d'intention "événement" dans le chat
const EVENT_INTENT_KEYWORDS = [
  'événement', 'event', 'conférence', 'conference', 'culte', 'service',
  'prochainement', 'ce dimanche', 'ce week-end', 'semaine prochaine',
  'quand', 'when', 'programme', 'agenda', 'calendrier',
]

function detectEventIntent(message: string): boolean {
  const lower = message.toLowerCase()
  return EVENT_INTENT_KEYWORDS.some(kw => lower.includes(kw))
}

// Dans le handler chat :
if (detectEventIntent(message)) {
  const events = await fetchChurchEvents()
  // Injecter dans le contexte du message
  enrichedContext.church_schedule = formatEventsForPrompt(events)
}
```

---

## 5. Affichage dans l'interface

### Composant `EventsPanel.tsx`

```
┌───────────────────────────────────────────────────────────┐
│  📅 Événements                                            │
│  [🏛️ Église ARC] [🌐 Web & Région]                       │
├──────────────────────────────────────────────────────────-┤
│  🔍 Rechercher un événement, conférence, séminaire...     │
├──────────────────────────────────────────────────────────-┤
│                                                           │
│  CETTE SEMAINE — Église ARC                               │
│  ────────────────────────────────────────────            │
│  📅 Dim 28 juin · 9h30                                    │
│     Culte dominical                                       │
│     Av. Charles-Naine 39, La Chaux-de-Fonds              │
│                                                           │
│  📅 Mer 25 juin · 19h00                                   │
│     Soirée de prière                                      │
│                                                           │
│  ÉVÉNEMENTS RÉGIONAUX (Web)                               │
│  ────────────────────────────────────────────            │
│  🌐 Conférence Réformation 2026 - Genève                  │
│     12-13 septembre 2026 · Cité-de-Genève                 │
│     [Voir le site →]                                      │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 6. Sécurité et limitations

### 6.1 Sécurité
- Seuls les événements `is_published = true` sont exposés
- La recherche web est limitée à des domaines chrétiens/évangéliques reconnus (filtrable via Serper.dev site filter)
- Les résultats web ne sont jamais présentés comme des "faits vérifiés"

### 6.2 Disclaimer systématique pour résultats web
```
⚠️ Les informations sur les événements externes proviennent du web et 
peuvent ne pas être à jour. Vérifiez directement auprès des organisateurs.
```

### 6.3 Rate limiting
- Max 10 recherches web / utilisateur / heure
- Cache des résultats web : 6 heures (dans `ai_response_cache`)

---

## 7. Horaires récurrents

Les horaires fixes de l'église (cultes, prière) sont injectés directement dans le system prompt — pas besoin de requête DB à chaque fois :

```typescript
const CHURCH_SCHEDULE = `
HORAIRES RÉGULIERS DE L'ARC ÉGLISE :
- Culte principal : Dimanche 9h30
- Culte du soir : Dimanche 17h00
- Prière & Parole : Mercredi 19h00
- Adresse : Av. Charles-Naine 39, La Chaux-de-Fonds, Suisse
`
```
