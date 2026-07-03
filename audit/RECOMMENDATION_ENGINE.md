# Recommendation Engine — Moteur de Recommandations Personnalisées
**ARC Église · Système de personnalisation**  
Date : 2026-06-24 · Statut : Analyse — en attente de validation

---

## 1. État actuel

### 1.1 Ce qui existe

La table `ai_media_recommendations` existe et stocke des recommandations par utilisateur :

```typescript
{
  user_id:    UUID,
  title:      string,
  type:       string,      // livre, podcast, article, sermon
  url:        string | null,
  author:     string | null,
  description: string | null,
  verse_refs: string[],
  topics:     string[],
  language:   string,
  rating:     number,      // 1-5
  saved:      boolean,
  source:     'ai' | 'curated',
}
```

### 1.2 Limitation principale

Les recommandations actuelles sont générées **à la demande** dans `/api/bible-ai/media` via une requête à Lunziko Platform. Il n'y a pas :
- de moteur proactif (recommandations sans que l'user demande)
- de tracking des clics/vues (impossible de savoir si une recommandation est utile)
- de personnalisation basée sur l'historique réel d'utilisation

---

## 2. Architecture du moteur de recommandations

### 2.1 Deux modes de recommandation

```
MODE RÉACTIF (existant, à améliorer)
  → L'utilisateur demande des recommandations ("Suggestions pour moi")
  → Lunziko Platform génère une liste basée sur le profil
  → Résultats affichés immédiatement + sauvegardés dans ai_media_recommendations

MODE PROACTIF (à créer)
  → Recommandations générées périodiquement en arrière-plan
  → Affichées dans le tableau de bord ou en notification
  → Basées sur l'activité récente (bible lue, thèmes étudiés)
```

### 2.2 Sources de contenu recommandable

| Type | Source | Disponibilité |
|---|---|---|
| Versets bibliques | Scripture.api.bible | ✅ Opérationnelle |
| Sermons locaux ARC | Table `sermons` (Supabase) | ✅ Opérationnelle |
| Vidéos YouTube ARC | `/api/youtube/videos` | ✅ Opérationnelle |
| Plans de lecture | Table `ai_reading_plans` + génération IA | ✅ Opérationnelle |
| Livres chrétiens | Génération IA (Lunziko Platform) | ✅ Opérationnelle |
| Podcasts/Articles | Génération IA (Lunziko Platform) | ✅ Opérationnelle |
| Méditations | `/api/bible-ai/meditate` | ✅ Opérationnelle |
| Ressources externes | Serper.dev / Lunziko | ✅ Opérationnelle |
| Cours bibliques ARC | Aucun catalogue n'existe encore | ❌ Non disponible |
| Musiques chrétiennes | Aucune source intégrée | ❌ Non disponible |

---

## 3. Algorithme de recommandation

### 3.1 Signal prioritaire : profil + activité récente

```typescript
interface RecommendationContext {
  // Ce que l'user fait (7 derniers jours)
  recentBooks:   string[]    // Livres bibliques consultés
  recentThemes:  string[]    // Thèmes des conversations IA
  recentPrayers: string[]    // Sujets de prière du journal

  // Ce qu'il est
  profileType:   string      // membre|pasteur|jeunesse...
  maturity:      string      // debutant|intermediaire|avance|enseignant
  language:      string      // fr|en|ln...
  favTopics:     string[]    // Thèmes favoris déclarés

  // Ce qu'il a déjà vu (à exclure)
  seenItems:     string[]    // IDs des recommandations déjà montrées (30j)
  savedItems:    string[]    // IDs des items sauvegardés (ne pas re-recommander)
}
```

### 3.2 Flux de génération

```
1. COLLECTER LE CONTEXTE
   → Charger spiritual_profile (profil + stats + memo)
   → Charger user_activity_log (7 derniers jours)
   → Charger recommendation_history (30 derniers jours, seen_ids)
   → Charger ai_user_preferences

2. CONSTRUIRE LE PROMPT LUNZIKO
   → Contexte utilisateur complet
   → Types de contenu souhaités (variable selon section)
   → IDs à exclure (déjà vus)
   → Format de réponse JSON strict

3. APPELER LUNZIKO PLATFORM /chat
   → Retourne JSON : [{ type, title, description, why, verse_refs, url? }]

4. ENRICHIR + SAUVEGARDER
   → Chercher sermons locaux correspondants (Supabase)
   → Chercher vidéos YouTube correspondantes
   → Sauvegarder dans ai_media_recommendations + recommendation_history

5. RETOURNER AU CLIENT
   → Mélange de recommandations IA + contenu local
```

### 3.3 Prompt template pour Lunziko Platform

```
Génère 5 recommandations personnalisées pour ce membre en JSON.

PROFIL : {ai_context_memo}
TYPE DE MEMBRE : {profile_type}
ACTIVITÉ RÉCENTE : livres lus {recent_books}, thèmes étudiés {recent_themes}
SUJETS DE PRIÈRE : {recent_prayers}
LANGUE : {language}

TYPES AUTORISÉS : livre chrétien, sermon, article théologique, podcast biblique, plan de lecture

FORMAT ATTENDU (JSON strict) :
[{
  "type": "livre"|"sermon"|"article"|"podcast"|"plan",
  "title": "Titre exact",
  "author": "Auteur",
  "description": "2 phrases max",
  "why": "Pourquoi pour cet utilisateur spécifiquement (1 phrase)",
  "verse_refs": ["Jean 3:16"],
  "url": null
}]

IMPORTANT : Ne pas recommander {excluded_titles}
```

---

## 4. Nouvelles tables requises

### 4.1 Table `recommendation_history` (déjà définie dans ARCHITECTURE.md)

Permet de :
- Savoir ce qui a été montré (éviter la répétition)
- Mesurer l'efficacité (taux de clic/sauvegarde)
- Améliorer le profil (ce qui plait vs ce qui ne plait pas)

### 4.2 Extension de `ai_media_recommendations`

Ajouter les colonnes manquantes :
```sql
ALTER TABLE ai_media_recommendations
  ADD COLUMN IF NOT EXISTS shown_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ DEFAULT NOW();
```

---

## 5. Routes API

### 5.1 Existant (à étendre)

```
POST /api/bible-ai/media
  → Génère des recommandations médias à la demande
  → À enrichir avec : injection du profil spirituel + sauvegarde dans recommendation_history
```

### 5.2 Nouvelles routes

```
GET /api/recommendations
  → Retourne les recommandations personnalisées du moment
  → Si aucune en cache (< 24h), en génère de nouvelles
  → Paramètres : type? (verse|plan|sermon|media), limit?

POST /api/recommendations/[id]/track
  → Enregistre une interaction : { action: 'click'|'dismiss'|'save'|'rate', rating? }
  → Met à jour recommendation_history
  → Si dismiss → la recommandation n'est plus montrée pendant 30 jours

POST /api/recommendations/refresh
  → Force la régénération des recommandations
  → Déclenché manuellement ou hebdomadairement
```

---

## 6. Widgets de recommandations dans l'UI

### 6.1 Dans le tableau de bord principal

```
┌──────────────────────────────────────────────────────┐
│  ✨ POUR TOI AUJOURD'HUI                              │
├──────────────────────────────────────────────────────┤
│  📖 Verset du moment                                  │
│     "L'Éternel est ma lumière..." — Psaume 27:1      │
│     Basé sur tes prières récentes [Ajouter à la bib.]│
│                                                        │
│  📚 Lecture suggérée                                  │
│     "Connaître Dieu" — J.I. Packer                   │
│     Correspond à ton étude sur la théologie [Voir]    │
│                                                        │
│  🎯 Plan de lecture                                   │
│     "Romains en 14 jours" — Niveau intermédiaire      │
│     Tu as étudié la sotériologie récemment [Commencer]│
└──────────────────────────────────────────────────────┘
```

### 6.2 Dans ARC Église AI (après chaque réponse)

Bloc optionnel à la fin de certaines réponses :
```
─────────────────────────────────────────────
💡 Pour aller plus loin sur ce thème :
   • Lire : Romains 8 (directement dans la Bible)
   • Plan : "La grâce en 7 jours" [Démarrer]
   • Sermon : "La Justification" — Pasteur [Écouter]
─────────────────────────────────────────────
```

### 6.3 Dans la Bible (sidebar contextuelle)

Lors de la lecture d'un chapitre :
- "Autres passages sur ce thème"
- "Sermons sur ce livre"
- "Plan de lecture incluant ce livre"

---

## 7. Métriques d'efficacité (feedback loop)

```
Taux de clic sur les recommandations            → cibler >20%
Taux de sauvegarde                              → cibler >5%
Taux de dismiss (recommandation refusée)        → cibler <30%
Note moyenne des recommandations (1-5)          → cibler >3.5
Temps avant engagement (combien de jours après la recommandation)
```

Ces métriques alimentent le prompt suivant en indiquant quels types de recommandations fonctionnent pour cet utilisateur.

---

## 8. Estimation d'implémentation

| Tâche | Effort |
|---|---|
| Migration SQL (extension ai_media_recommendations + recommendation_history) | 30 min |
| Enrichissement de `/api/bible-ai/media` avec le profil | 2h |
| Nouvelle route GET `/api/recommendations` | 3h |
| Route de tracking POST `/api/recommendations/[id]/track` | 1h |
| Widget tableau de bord | 3h |
| Widget post-réponse IA | 2h |
| Tests | 1h30 |
| **Total** | **~13h** |
