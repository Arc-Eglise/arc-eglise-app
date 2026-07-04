# User Memory Engine — Mémoire Individuelle Utilisateur
**ARC Église · Système de personnalisation**  
Date : 2026-06-24 · Statut : Analyse — en attente de validation

---

## 1. État actuel — Ce qui existe déjà

### 1.1 Tables existantes

La mémoire utilisateur est **déjà partiellement implémentée** et robuste pour l'IA biblique :

```
ai_bible_sessions        → Sessions de chat avec résumé auto
ai_session_messages      → Messages individuels (role, content, verse_refs, tokens)
ai_response_cache        → Cache 24h pour réponses fréquentes (partagé, pas par user)
ai_spiritual_journal     → Journal quotidien avec réflexion IA
ai_user_preferences      → Préférences persistantes (langue, niveau, bible, topics)
```

### 1.2 Fonctions existantes dans `src/lib/bible-ai.ts`

```typescript
// Chargement de la mémoire contextuelle
getRecentSessionSummaries(userId)   // 3 dernières sessions résumées
getUserPrefs(userId)                // Préférences complètes
upsertUserPrefs(userId, partial)    // Mise à jour préférences

// Auto-résumé via Lunziko Platform
// Déclenché dans /api/bible-ai/chat quand session terminée
// Stocke dans ai_bible_sessions.summary
```

### 1.3 Injection actuelle de la mémoire dans l'IA

Dans `/api/bible-ai/chat`, la mémoire est déjà injectée :
1. Préférences utilisateur (`language`, `level`, `fav_topics`, `fav_books`)
2. Résumés des 3 dernières sessions si `memory_enabled = true`
3. Contexte de la session courante (messages précédents)

---

## 2. Limitations actuelles

| Limitation | Impact | Priorité |
|---|---|---|
| Résumés de sessions seulement (pas de profil cumulatif) | L'IA ne se souvient pas des thèmes récurrents sur des mois | 🔴 Élevée |
| Mémoire liée uniquement au chat biblique, pas à l'activité générale | L'assistant ne sait pas que l'user a lu 20 chapitres cette semaine | 🟠 Moyenne |
| `ai_context_memo` n'existe pas encore | Pas de mémo court injecté à chaque interaction | 🔴 Élevée |
| Le journal spirituel n'est pas injecté dans le chat | L'IA ne connaît pas les prières récentes de l'utilisateur | 🟠 Moyenne |
| Pas de mémoire croisée (chat biblique ↔ assistant général) | Deux IA qui ne se connaissent pas | 🟡 Faible |

---

## 3. Architecture de mémoire complète

### 3.1 Niveaux de mémoire

```
NIVEAU 1 — Mémoire de session (existant ✅)
  → Messages de la session courante
  → Injectés dans l'historique du chat
  → Durée : session active

NIVEAU 2 — Mémoire inter-sessions (existant ✅ partiel)
  → Résumés des 3 dernières sessions (ai_bible_sessions.summary)
  → Injectés comme contexte au début de chaque session
  → Durée : 30 derniers jours (configurable)

NIVEAU 3 — Profil cumulatif (à créer 🆕)
  → spiritual_profile.ai_context_memo : mémo court (500 chars max)
  → Mis à jour hebdomadairement par tâche automatique
  → Contenu : thèmes récurrents, sujets de prière, parcours d'étude
  → Durée : permanent (mis à jour, jamais effacé sauf demande)

NIVEAU 4 — Préférences déclarées (existant ✅)
  → ai_user_preferences : fav_books, fav_topics, language, level
  → Toujours injecté (Niveau 0 de contexte)
  → Durée : permanent
```

### 3.2 Structure du `ai_context_memo`

```
Exemple de contenu du mémo court (500 chars max) :
"Nouveau membre (3 mois). Intéressé par Romains, Jean, eschatologie.
Sujets de prière récurrents : famille, santé. Lit 3-4 chapitres/semaine.
A complété 1 plan de lecture (Évangile de Jean 21 jours).
Questions fréquentes : grâce, prédestination, Trinité.
Niveau intermédiaire. Études théologiques récentes : sotériologie, Confessions de Foi."
```

### 3.3 Processus de mise à jour du mémo

La mise à jour est déclenchée par :
1. **Toutes les 50 interactions** (côté serveur, dans `/api/bible-ai/chat`)
2. **Chaque dimanche à minuit** (via une route cron ou webhook Supabase)
3. **Sur demande** (bouton "Actualiser le profil IA" dans les préférences)

```typescript
// Route : POST /api/profile/refresh-memo
async function refreshContextMemo(userId: string): Promise<void> {
  // 1. Charger les 10 dernières sessions résumées
  const sessions = await getRecentSessionSummaries(userId, limit: 10)
  // 2. Charger les 5 dernières entrées de journal
  const journal  = await getRecentJournalEntries(userId, limit: 5)
  // 3. Charger les stats d'activité (30 derniers jours)
  const stats    = await getActivityStats(userId, days: 30)
  // 4. Appeler Lunziko Platform pour générer un mémo de 500 chars
  const memo = await lunzikoSummarize({
    text: buildMemoContext(sessions, journal, stats),
    length: 'short',
    format: 'paragraph',
  })
  // 5. Sauvegarder dans spiritual_profile.ai_context_memo
  await upsertSpiritualProfile(userId, { ai_context_memo: memo })
}
```

---

## 4. Injection de la mémoire par niveau

### 4.1 Template de contexte système enrichi

```
PROMPT SYSTÈME enrichi (côté serveur, construit à chaque appel) :
───────────────────────────────────────────────────────────────────
Tu es ARC Église AI, assistant biblique de l'église ARC à La Chaux-de-Fonds.

PROFIL DE CET UTILISATEUR :
{ai_context_memo}  ← Niveau 3

PRÉFÉRENCES DÉCLARÉES :
- Niveau : {level}
- Langue : {language}
- Bible préférée : {default_bible}
- Livres favoris : {fav_books}
- Thèmes d'intérêt : {fav_topics}    ← Niveau 4

SESSIONS RÉCENTES :
{recent_session_summaries}              ← Niveau 2

CONTEXTE ACTUEL :
Date : {today}
Mode : {chatMode}
─────────────────────────────────────────────────────────────────
```

### 4.2 Politique de mémoire

| Option | Comportement |
|---|---|
| `memory_enabled: true` (défaut) | Niveaux 1+2+3+4 tous injectés |
| `memory_enabled: false` | Niveau 4 uniquement (préférences de base) |
| Effacement de l'historique | Supprime Niveaux 1+2, réinitialise Niveau 3 |
| Effacement complet | Supprime tout, repart de zéro |

### 4.3 UI pour la gestion de la mémoire

Dans `Préférences → Confidentialité IA` :
- Toggle : "Activer la mémoire personnalisée" (`memory_enabled`)
- Bouton : "Voir ce que l'IA mémorise" (affiche le `ai_context_memo` actuel)
- Bouton : "Effacer l'historique des sessions" (garde les préférences)
- Bouton : "Réinitialiser toute ma mémoire IA" (reset complet)

---

## 5. Mémoire croisée — Assistant général + IA Biblique

Actuellement, l'Assistant IA (`/api/lunziko/chat`) et l'IA Biblique (`/api/bible-ai/chat`) ont des mémoires séparées.

### 5.1 Solution recommandée : Injection du mémo dans les deux

Le `ai_context_memo` de `spiritual_profile` est injecté dans TOUTES les routes IA, pas seulement le chat biblique. Cela crée une mémoire unifiée légère sans duplication de données.

```typescript
// Dans /api/lunziko/chat (assistant général) — à étendre
const userContext = await buildUserContext(userId)  // profile + memo
// Injecter dans system prompt
```

### 5.2 Ce qui ne change PAS

Les sessions restent séparées — l'historique du chat biblique n'est pas mélangé à l'assistant général. Seul le **mémo court** (profil de haut niveau) est partagé.

---

## 6. Politique de rétention

| Donnée | Durée | Suppression |
|---|---|---|
| Messages de session (`ai_session_messages`) | 1 an | Auto (tâche mensuelle) ou sur demande |
| Résumés de sessions (`ai_bible_sessions`) | 2 ans | Sur demande |
| Journal spirituel (`ai_spiritual_journal`) | Permanent | Sur demande uniquement |
| Contexte mémo (`spiritual_profile.ai_context_memo`) | Permanent (mis à jour) | Reset sur demande |
| Cache réponses (`ai_response_cache`) | 24h | Auto (expires_at) |
| Préférences (`ai_user_preferences`) | Permanent | Reset/suppression compte |

---

## 7. Tables à créer pour étendre la mémoire

**Seule la table `spiritual_profile`** est nécessaire pour compléter le système mémoire — les tables de sessions existent déjà.

La colonne `ai_context_memo TEXT` dans `spiritual_profile` est le seul ajout critique pour la mémoire.

**Estimation d'implémentation** : 4–6 heures (schema + fonction de génération + injection dans les routes + UI de gestion)
