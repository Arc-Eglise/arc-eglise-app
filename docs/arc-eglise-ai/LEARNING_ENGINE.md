# Learning Engine — Personnalisation et Mémoire

> **Statut :** Document de conception — en attente de validation  
> **Date :** Juin 2026

---

## 1. Objectif

Le Learning Engine permet à ARC Église AI de s'adapter à chaque utilisateur au fil du temps. Sans être un agent autonome, il apprend silencieusement les habitudes, préférences et niveau biblique de l'utilisateur pour personnaliser les réponses futures.

---

## 2. Sources de signal d'apprentissage

| Signal | Source | Fréquence |
|--------|--------|-----------|
| Livres bibliques consultés | `bible_progress`, sessions | En temps réel |
| Versets marqués / notés | `bible_bookmarks`, `bible_notes` | En temps réel |
| Sujets posés en chat | `ai_session_messages` | Par session |
| Niveau de lecture actuel | `ai_user_preferences.level` | Par session |
| Plans de lecture complétés | `ai_reading_plan_days` | Par jour |
| Entrées de journal | `ai_spiritual_journal` | Par entrée |
| Médias sauvegardés | `ai_media_recommendations` | À la sauvegarde |
| Temps passé par onglet | Client-side (pas stocké, privé) | Optionnel |

---

## 3. Profil utilisateur IA (`ai_user_preferences`)

La table `ai_user_preferences` est la source de vérité pour la personnalisation :

```typescript
interface AIUserPreferences {
  user_id: string
  language: string           // "fr" | "en" | "ln" | ...
  level: BibleLevel          // "enfant" | "debutant" | "intermediaire" | "avance" | "enseignant"
  default_bible: string      // bible_id par défaut
  fav_books: string[]        // ["JHN", "PSA", "ROM", ...]
  fav_topics: string[]       // ["grâce", "foi", "prière", ...]
  memory_enabled: boolean    // Activer la mémoire entre sessions
  notification_plans: boolean
  updated_at: string
}
```

### Mise à jour automatique des préférences

À la fin de chaque session (ou toutes les 5 minutes), un résumé est calculé côté serveur :
1. Extraire les versets et thèmes mentionnés
2. Mettre à jour `fav_books` et `fav_topics` (top 10)
3. Ajuster `level` si l'utilisateur a demandé des explications plus simples/avancées

---

## 4. Mémoire entre sessions

### 4.1 Résumé de session

À la fin de chaque session de chat, l'IA génère automatiquement un résumé court (≤ 100 mots) stocké dans `ai_bible_sessions.summary` :

```
Promesse side-server (non bloquant) :
POST /api/bible-ai/chat → réponse → [après SSE terminé]
  → lunzikoFetch('/summarize', { text: session_transcript, length: 'short' })
  → UPDATE ai_bible_sessions SET summary = ..., verse_refs = [...]
```

### 4.2 Injection de mémoire dans les sessions futures

Au début d'une nouvelle session, si `memory_enabled = true`, les résumés des 5 dernières sessions sont injectés dans le system prompt :

```typescript
function buildBibleSystemPrompt(prefs: AIUserPreferences, recentSessions: string[]): string {
  const memoryBlock = recentSessions.length > 0
    ? `\nMÉMOIRE UTILISATEUR (sessions précédentes) :\n${recentSessions.join('\n')}\n`
    : ''

  return `${BIBLE_AI_BASE_SYSTEM}
${memoryBlock}
PROFIL :
- Niveau biblique : ${prefs.level}
- Langue : ${prefs.language}
- Livres favoris : ${prefs.fav_books.join(', ') || 'non définis'}
- Thèmes d'intérêt : ${prefs.fav_topics.join(', ') || 'non définis'}
`
}
```

### 4.3 Confidentialité de la mémoire

- La mémoire est **opt-in** (activée par défaut, désactivable dans les préférences)
- L'utilisateur peut **supprimer tout son historique** depuis les préférences
- Le journal spirituel est **TOUJOURS privé** (jamais injecté dans les prompts)
- Les résumés de session n'incluent **jamais** les entrées de journal

---

## 5. Adaptation du niveau

### Niveaux disponibles

| Niveau | Cible | Vocabulaire | Longueur réponse |
|--------|-------|-------------|-----------------|
| `enfant` | 6-10 ans | Simple, concret, histoires | Courte (3-4 phrases) |
| `debutant` | Nouveau chrétien | Vulgarisé, définitions données | Moyenne (1 paragraphe) |
| `intermediaire` | Membre actif | Standard, quelques termes techniques | Standard |
| `avance` | Étudiant en théologie | Termes techniques, sources multiples | Longue |
| `enseignant` | Pasteur, formateur | Académique, grec/hébreu si pertinent | Très longue, détaillée |

### Détection automatique du niveau

L'IA peut proposer un ajustement de niveau si elle détecte une inadéquation :

```
[Si l'utilisateur utilise des termes techniques avancés → proposer d'augmenter le niveau]
→ "Je remarque que vous utilisez des termes théologiques précis. Souhaitez-vous 
   passer au niveau 'avancé' pour des réponses plus détaillées ?"

[Si l'utilisateur demande "c'est quoi ça ?" sur des termes basiques → proposer niveau inférieur]
→ "Voulez-vous que j'explique avec des termes plus simples ?"
```

**Cette proposition est toujours présentée comme une question, jamais appliquée automatiquement.**

---

## 6. Détection des thèmes récurrents

Un algorithme simple (côté serveur, sans ML) analyse les messages pour détecter les thèmes :

```typescript
const THEME_KEYWORDS: Record<string, string[]> = {
  'grâce': ['grâce', 'grace', 'favour', 'miséricorde'],
  'foi': ['foi', 'faith', 'croire', 'confiance'],
  'prière': ['prière', 'prier', 'intercession', 'prayer'],
  'salut': ['salut', 'salvation', 'sauvé', 'rédemption'],
  'souffrance': ['souffrance', 'épreuve', 'douleur', 'trial', 'suffering'],
  'prophétie': ['prophétie', 'prophecy', 'accomplissement', 'prophète'],
  // ... 30+ thèmes
}

function extractThemes(messages: string[]): string[] {
  const counts: Record<string, number> = {}
  const text = messages.join(' ').toLowerCase()
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    const count = keywords.filter(k => text.includes(k)).length
    if (count > 0) counts[theme] = count
  }
  return Object.entries(counts)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 5)
    .map(([theme]) => theme)
}
```

---

## 7. Personnalisation des plans de lecture

Le moteur d'apprentissage influence la génération des plans :

```typescript
// System prompt pour génération d'un plan personnalisé
const PLAN_GEN_PROMPT = `
Génère un plan de lecture biblique de {duration_days} jours.

PROFIL UTILISATEUR :
- Niveau : {level}
- Livres favoris : {fav_books}
- Thèmes d'intérêt : {fav_topics}
- Progression actuelle : {current_book} {current_chapter}
- Humeur récente (journal) : {recent_mood}  // si disponible
- Langues : {language}

CONTRAINTES :
- Chaque jour doit avoir 1-3 passages (pas plus pour les débutants)
- Inclure une question de réflexion adaptée au niveau
- Varier AT et NT si le focus n'est pas spécifique
- Ne pas répéter les passages déjà lus ce mois
`
```

---

## 8. Rapport de progression spirituelle

L'IA peut générer un rapport mensuel de progression :

```typescript
POST /api/bible-ai/preferences
{ action: "progress_report", period: "month" }
```

Contenu :
- Chapitres lus ce mois
- Thèmes les plus explorés
- Plans complétés / en cours
- Entrées de journal (nombre, humeurs)
- Suggestion pour le mois suivant

---

## 9. Ce que le Learning Engine NE fait PAS (V1)

- Ne prédit pas de l'âme ou des états spirituels (pas de diagnostic psychologique)
- Ne partage pas les données d'un utilisateur avec d'autres
- Ne prend pas de décisions spirituelles à la place de l'utilisateur
- N'utilise pas de machine learning local (tout via Lunziko Platform)
- Ne collecte pas de données comportementales (clics, scrolls) sans consentement
