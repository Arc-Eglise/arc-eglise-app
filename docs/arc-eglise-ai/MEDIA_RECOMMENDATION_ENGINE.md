# Media Recommendation Engine — Médias Bibliques

> **Statut :** Document de conception — en attente de validation  
> **Date :** Juin 2026

---

## 1. Objectif

Proposer des ressources médias chrétiennes pertinentes selon le contexte de l'utilisateur : passage étudié, thème exploré, niveau biblique, langue.

---

## 2. Types de médias recommandés

| Type | Exemples | Source |
|------|----------|--------|
| `sermon` | Sermons de l'ARC (table `sermons`) | Supabase local |
| `sermon_ext` | Sermons externes (Tim Keller, Spurgeon...) | IA + web |
| `video` | Documentaires bibliques YouTube | YouTube Data API + IA |
| `podcast` | Podcasts chrétiens francophones | IA + liens statiques |
| `article` | Articles théologiques | IA + web |
| `book` | Livres de théologie recommandés | IA (liste statique curée) |
| `audio_bible` | Bible audio en différentes langues | Liens CDN |
| `commentary` | Commentaires bibliques en ligne | IA + liens |
| `course` | Cours en ligne d'étude biblique | IA + liens |

---

## 3. Sources de données

### 3.1 Sermons locaux (Supabase)

```typescript
async function getLocalSermons(topic?: string, verseRef?: string): Promise<LocalSermon[]> {
  const supabase = createAdminClient()
  const query = supabase
    .from('sermons')
    .select('id, title, pastor, reference, series, excerpt, youtube_id, date')
    .eq('is_published', true)
    .order('date', { ascending: false })
    .limit(5)

  if (verseRef) {
    // Chercher des sermons qui citent ce passage
    query.ilike('reference', `%${verseRef}%`)
  }

  const { data } = await query
  return data ?? []
}
```

### 3.2 YouTube Data API

Pour les vidéos externes (documentaires, messages) :

```typescript
const YT_API_KEY = process.env.YOUTUBE_API_KEY  // Déjà utilisé dans /api/youtube/videos

async function searchYouTube(query: string, language: string): Promise<YouTubeResult[]> {
  const langCode = language === 'fr' ? 'fr' : language === 'en' ? 'en' : 'fr'
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?` +
    `key=${YT_API_KEY}&part=snippet&q=${encodeURIComponent(query)}` +
    `&type=video&relevanceLanguage=${langCode}&maxResults=5` +
    `&safeSearch=strict`
  )
  const data = await res.json()
  return (data.items ?? []).map((item: YoutubeItem) => ({
    title: item.snippet.title,
    url: `https://youtube.com/watch?v=${item.id.videoId}`,
    thumbnail: item.snippet.thumbnails?.medium?.url,
    channel: item.snippet.channelTitle,
    description: item.snippet.description?.slice(0, 200),
    published: item.snippet.publishedAt,
  }))
}
```

**Note :** `YOUTUBE_API_KEY` est déjà configurée (route `/api/youtube/videos` existante).

### 3.3 Recommandations IA (liste curée)

Pour les livres, podcasts et cours, l'IA utilise une liste statique curée intégrée dans le system prompt :

```typescript
const CURATED_RESOURCES = {
  books: {
    fr: [
      { title: "Connaître Dieu", author: "J.I. Packer", topics: ["théologie", "dieu", "foi"] },
      { title: "Le Christianisme pur et simple", author: "C.S. Lewis", topics: ["apologétique", "foi"] },
      { title: "Instituts de la Religion Chrétienne", author: "Jean Calvin", topics: ["théologie réformée"] },
      { title: "La Bible expliquée", author: "Thomas Römer", topics: ["herméneutique", "AT"] },
      { title: "Théologie Systématique", author: "Wayne Grudem", topics: ["doctrine", "enseignant"] },
      // ...
    ],
    en: [
      { title: "Mere Christianity", author: "C.S. Lewis", topics: ["apologetics", "faith"] },
      { title: "Knowing God", author: "J.I. Packer", topics: ["theology", "god"] },
      // ...
    ]
  },
  podcasts: {
    fr: [
      { title: "Réforme Bible", url: "...", description: "Prédications réformées en français" },
      { title: "La Bible en 30 minutes", url: "...", description: "Lecture biblique quotidienne" },
      // ...
    ]
  },
  audio_bible: {
    fr: [
      { title: "Bible du Semeur — Audio", url: "https://...", format: "mp3" },
      { title: "Louis Segond 1910 — Audio", url: "https://...", format: "mp3" },
    ],
    en: [
      { title: "ESV Audio Bible", url: "https://www.esv.org/audio/", format: "stream" },
    ],
    ln: [
      // Bible Lingala partielle
      { title: "Mozalani na Likanisi ya Nzambe", url: "...", format: "mp3", note: "NT uniquement" },
    ]
  }
}
```

---

## 4. Algorithme de recommandation

### 4.1 Flow

```
Contexte utilisateur
  → verseRef | topic | level | language | history | fav_topics
        │
        ▼
┌─────────────────────────────────────────┐
│  1. Sermons locaux ARC                  │  (toujours en premier)
│  2. YouTube search                      │  (si YOUTUBE_API_KEY configurée)
│  3. IA recommendations (books/podcasts) │  (via lunzikoFetch)
│  4. Audio Bible links                   │  (liste statique)
└─────────────────────────────────────────┘
        │
        ▼
Déduplication + classement par pertinence
        │
        ▼
Réponse JSON (max 8 items)
```

### 4.2 System prompt pour recommandations IA

```typescript
const MEDIA_SYSTEM_PROMPT = `
Tu es un bibliothécaire chrétien spécialisé. Tu recommandes des ressources 
pour l'étude biblique.

CONTEXTE :
- Passage : {verseRef}
- Thème : {topic}
- Niveau : {level}
- Langue : {language}
- Tradition : évangélique réformée

RÈGLES :
1. Recommande uniquement des ressources chrétiennes évangéliques orthodoxes
2. Pour les livres : limite aux auteurs reconnus (liste fournie)
3. Pour les videos : YouTube uniquement, canaux vérifiés
4. Signale toujours le niveau recommandé pour chaque ressource
5. 3-5 recommandations maximum
6. Format JSON strict

LIVRES DISPONIBLES :
{curated_books}

PODCASTS DISPONIBLES :
{curated_podcasts}

Format de réponse JSON :
[{
  "title": "...",
  "author": "...",
  "type": "book|podcast|article|commentary|course",
  "url": "...",
  "description": "...",
  "level": "enfant|debutant|intermediaire|avance|enseignant",
  "verse_refs": ["JHN.3.16"],
  "topics": ["grâce", "foi"],
  "language": "fr"
}]
`
```

---

## 5. Sauvegarde et notation

L'utilisateur peut :
- **Sauvegarder** une recommandation (stockée dans `ai_media_recommendations`)
- **Noter** (1-5 étoiles)
- **Partager** en groupe d'étude

```typescript
// POST /api/bible-ai/media
{ action: "save", recommendation: {...} }
{ action: "rate", recommendation_id: "uuid", rating: 4 }
{ action: "list_saved" }
```

---

## 6. Bible Audio — Intégration

### Sources audio disponibles

```typescript
// Liens statiques validés (à confirmer disponibilité)
const AUDIO_BIBLE_SOURCES: AudioSource[] = [
  {
    language: 'fr',
    name: 'Bible du Semeur Audio',
    base_url: 'https://...',  // À configurer via env BIBLE_AUDIO_BASE_URL
    format: 'mp3',
    coverage: 'complete',
  },
  {
    language: 'fr',
    name: 'Louis Segond 1910',
    base_url: 'https://audio.bible.com/bible/...',
    format: 'stream',
    coverage: 'complete',
  },
  {
    language: 'en',
    name: 'ESV Audio Bible',
    base_url: 'https://www.esv.org/audio/',
    format: 'stream',
    coverage: 'complete',
  },
]
```

### Lecteur audio dans l'interface

```typescript
// Composant léger (pas de lib externe)
// src/components/bible-ai/MediaPlayer.tsx

export function AudioBiblePlayer({ url, title }: { url: string; title: string }) {
  return (
    <div className="rounded-xl bg-arc-navy/5 p-4">
      <p className="text-sm font-medium text-arc-navy mb-2">🎧 {title}</p>
      <audio controls className="w-full" preload="metadata">
        <source src={url} type="audio/mpeg" />
        Votre navigateur ne supporte pas l'audio HTML5.
      </audio>
    </div>
  )
}
```

---

## 7. Filtres de sécurité

Toutes les recommandations sont filtrées pour :
- Exclure les sources non-orthodoxes (groupes hérétiques, fausses doctrines)
- Exclure les contenus non-recommandés (violence, nudité) — YouTube safeSearch: strict
- Vérifier que les URLs sont HTTPS

```typescript
const EXCLUDED_DOMAINS = [
  // Groupes considérés non-orthodoxes par rapport à la tradition ARC
  // (liste à définir avec le Pasteur Pedro Obova)
]

const EXCLUDED_CHANNELS = [
  // Chaînes YouTube non recommandées
]
```

**Note :** La liste finale des domaines/chaînes exclus doit être validée par le Pasteur Pedro Obova avant déploiement.

---

## 8. Cache

Les recommandations IA sont mises en cache dans `ai_response_cache` :
- **Clé :** `hash(media:topic:level:language)`
- **TTL :** 24 heures
- **Invalidation :** À chaque nouvelle recommandation sauvegardée par un pasteur/admin

---

## 9. Évolution V2

- Intégration avec une API de contenu chrétien curé (ex: FaithGateway, Desiring God API)
- Recommandations collaboratives (ce que les membres du même groupe ont aimé)
- Bibliothèque partagée gérée par l'admin/pasteur
- Podcast player intégré (flux RSS)
- Bible audio synchronisée avec le lecteur biblique (surlignage en temps réel)
