# Roadmap — ARC Église AI

> **Statut :** Document de conception — en attente de validation  
> **Date :** Juin 2026

---

## Vue d'ensemble des phases

```
Phase 1 (V1) — Fondation          ~ 3-4 semaines
Phase 2 (V1.5) — Enrichissement   ~ 2-3 semaines
Phase 3 (V2) — Intelligence       ~ 4-6 semaines
```

---

## Phase 1 — Fondation (V1)

### Objectif
Intégrer ARC Église AI dans l'espace membres avec les fonctionnalités essentielles. Aucune modification de l'infrastructure existante — ajout uniquement.

### Sprint 1 — Infrastructure (semaine 1)

**Base de données (migration unique) :**
- [ ] Créer `supabase/schema-arc-eglise-ai.sql` (10 tables)
- [ ] Exécuter la migration en Supabase dashboard
- [ ] Vérifier RLS sur toutes les nouvelles tables
- [ ] Créer `ai_user_preferences` avec defaults pour tous les membres existants

**Routes API (base) :**
- [ ] `src/lib/bible-ai.ts` — helper partagé (`requireAuth`, `getUserPrefs`, `buildSystemPrompt`)
- [ ] `src/lib/bible-ai-prompts.ts` — tous les system prompts
- [ ] `POST /api/bible-ai/chat/route.ts` — chat biblique SSE
- [ ] `POST /api/bible-ai/preferences/route.ts` — GET/UPDATE préférences

**Navigation :**
- [ ] Modifier `src/components/membres/SidebarNav.tsx` — ajouter "ARC Église AI" ✦

**Page principale :**
- [ ] `src/app/espace-membres/ai-biblique/page.tsx` — Server Component + auth gate
- [ ] `src/components/bible-ai/BibleAIChat.tsx` — chat SSE (adapté de `AssistantPage`)
- [ ] `src/components/bible-ai/LangSelector.tsx` — sélecteur 19 langues

**Variables d'environnement :**
- [ ] Documenter les nouvelles variables dans `.env.local.example`
- [ ] (Optionnel) Configurer `SERPER_API_KEY` sur Vercel

---

### Sprint 2 — Recherche biblique (semaine 2)

- [ ] `POST /api/bible-ai/search/route.ts` — recherche multi-mode
- [ ] `POST /api/bible-ai/explain/route.ts` — explication 5 niveaux
- [ ] `POST /api/bible-ai/compare/route.ts` — comparaison traductions
- [ ] `src/components/bible-ai/BibleSearchPanel.tsx`
- [ ] `src/components/bible-ai/ExplanationLevels.tsx` (tabs enfant/débutant/etc.)
- [ ] `src/components/bible-ai/TranslationCompare.tsx`
- [ ] Intégration Scripture.api.bible pour les textes sources

---

### Sprint 3 — Plans & Journal (semaine 3)

- [ ] `POST /api/bible-ai/plans/route.ts` — CRUD + génération IA
- [ ] `POST /api/bible-ai/journal/route.ts` — CRUD + réflexion IA
- [ ] `src/components/bible-ai/ReadingPlanCard.tsx`
- [ ] `src/components/bible-ai/SpiritualJournal.tsx`
- [ ] Système de cache `ai_response_cache`
- [ ] Génération automatique du résumé de session (`ai_bible_sessions.summary`)

---

### Sprint 4 — Théologie & Médias (semaine 4)

- [ ] `POST /api/bible-ai/theology/route.ts`
- [ ] `POST /api/bible-ai/meditate/route.ts`
- [ ] `POST /api/bible-ai/media/route.ts`
- [ ] `POST /api/bible-ai/events/route.ts`
- [ ] `src/components/bible-ai/MeditationGuide.tsx`
- [ ] `src/components/bible-ai/MediaPlayer.tsx` — lecteur audio Bible
- [ ] Connecter `events` Supabase au moteur d'événements
- [ ] Liste statique curéée des ressources (livres/podcasts/audio)

---

### Livrable Phase 1

Page `/espace-membres/ai-biblique` fonctionnelle avec :
- ✅ Chat biblique contextuel (SSE, multilingue)
- ✅ Recherche multi-mode (sémantique, thématique, personnage, lieu)
- ✅ Explication 5 niveaux
- ✅ Comparaison de traductions (côte-à-côte)
- ✅ Plans de lecture générés par IA (ou manuels)
- ✅ Journal spirituel personnel
- ✅ Assistant théologique sourcé
- ✅ Guide de méditation
- ✅ Recommandations médias (sermons ARC + IA)
- ✅ Événements église + recherche web basique
- ✅ Sélecteur 19 langues
- ✅ Mémoire utilisateur entre sessions
- ✅ Préférences personnalisables

---

## Phase 2 — Enrichissement (V1.5)

### Objectif
Améliorer l'expérience, ajouter les fonctionnalités sociales et la préparation de sermons.

### Semaine 5-6

**Bible Study Graph :**
- [ ] `POST /api/bible-ai/graph/route.ts`
- [ ] `src/components/bible-ai/StudyGraph.tsx` — D3 force graph
- [ ] Import du dataset OpenBible cross-references (100k+ refs)
- [ ] Cache des graphes dans `ai_response_cache` (TTL 7j)

**Groupes d'étude :**
- [ ] `src/components/bible-ai/GroupStudyRoom.tsx`
- [ ] Gestion des groupes (via `ai_study_groups` + `ai_study_group_members`)
- [ ] Plans partagés entre membres d'un groupe
- [ ] Interface de liaison avec les groupes existants (`profiles.groups`)

**Préparation de sermons (admin/pasteur) :**
- [ ] `POST /api/bible-ai/sermon/route.ts` (auth: role IN ('admin','pasteur'))
- [ ] `src/components/bible-ai/SermonPrep.tsx`
- [ ] Export markdown du plan de sermon
- [ ] Lien avec table `sermons` pour retrouver les séries

### Semaine 7

**Rapport de progression :**
- [ ] `POST /api/bible-ai/preferences` — action `progress_report`
- [ ] Rapport mensuel : chapitres lus, thèmes explorés, plans complétés
- [ ] Notification optionnelle (email) pour rappel plan de lecture

**Améliorations UX :**
- [ ] Mode sombre pour la page AI Biblique (déjà supporté par le reste du site)
- [ ] Réponses avec citations cliquables (clic → ouvre BibleReader)
- [ ] Historique des sessions (liste + recherche)
- [ ] Suppression de l'historique (RGPD)

---

## Phase 3 — Intelligence (V2)

### Objectif
Ajouter la recherche sémantique vectorielle, les agents d'étude avancés et l'intégration Lunziko Memory/Knowledge.

### Fonctionnalités V2

**Recherche vectorielle (pgvector) :**
- [ ] Activer extension pgvector dans Supabase
- [ ] Créer table `bible_embeddings`
- [ ] Pipeline d'embedding : tous les versets de la Bible via OpenAI `text-embedding-3-small`
- [ ] Recherche sémantique native côté Supabase (sans passer par le LLM)
- [ ] Amélioration majeure de la qualité de recherche

**Intégration Lunziko Memory Engine :**
- [ ] Synchroniser `ai_user_preferences` avec les préférences Lunziko Platform (mémoire utilisateur centralisée)
- [ ] Historique des études bibliques dans Lunziko Knowledge Engine (KnowledgeItem type "scripture")

**Agents d'étude guidés :**
- [ ] Workflow "Étude en profondeur" — 5 étapes enchaînées (lecture → contexte → application → questions → prière)
- [ ] Chaque étape attend la validation de l'utilisateur avant de continuer
- [ ] Aucun agent totalement autonome (validation à chaque étape)

**Fonctionnalités avancées :**
- [ ] Mémoire multi-dispositif (web + futur app mobile)
- [ ] Partage de sessions d'étude (lien public configurable)
- [ ] Collaboration en temps réel sur un graphe (Realtime Supabase)
- [ ] Integration YouTube : analyse automatique des sermons ARC (transcription → thèmes → verset)

---

## Contraintes et prérequis

### Prérequis techniques
| Prérequis | Responsable | Statut |
|-----------|------------|--------|
| Migration DB Supabase | Jaise (admin) | À faire |
| `SERPER_API_KEY` Vercel | Jaise | Optionnel V1 |
| `BIBLE_AUDIO_BASE_URL` | Jaise | Optionnel V1 |
| Validation pastorale du contenu théologique | Pasteur Pedro Obova | Requis avant déploiement |
| Test sur mobile (responsive) | Dev | Sprint 4 |

### Prérequis de contenu
- [ ] Le Pasteur Pedro Obova valide la liste des sources théologiques de référence
- [ ] Définir la liste des domaines/chaînes exclus (filtres de sécurité médias)
- [ ] Valider les formulations pour la redirection pastorale

---

## Estimation de charge de travail

| Phase | Fichiers créés | Tables DB | Routes API | Temps estimé |
|-------|---------------|-----------|------------|-------------|
| Phase 1 | ~25 fichiers | 10 tables | 9 routes | 3-4 semaines |
| Phase 2 | ~10 fichiers | 0 | 3 routes | 2-3 semaines |
| Phase 3 | ~15 fichiers | 1 table | 2 routes | 4-6 semaines |

---

## Ordre de priorité recommandé

Si le temps est contraint, voici l'ordre de priorité des fonctionnalités V1 :

| Priorité | Fonctionnalité | Valeur |
|----------|---------------|--------|
| 🔴 Critique | Chat biblique + navigation | Accès de base |
| 🔴 Critique | Explication 5 niveaux | Différenciation clé |
| 🔴 Critique | Préférences langue/niveau | Personnalisation de base |
| 🟠 Haute | Recherche biblique multi-mode | Très utilisé |
| 🟠 Haute | Plans de lecture | Rétention |
| 🟠 Haute | Journal spirituel | Engagement quotidien |
| 🟡 Moyenne | Assistant théologique | Profil avancé |
| 🟡 Moyenne | Recommandations médias | Enrichissement |
| 🟡 Moyenne | Événements | Lien communauté |
| 🟢 Basse | Comparaison traductions | Niche |
| 🟢 Basse | Méditation guidée | Nice-to-have |

---

## Ce qu'il NE FAUT PAS implémenter (rappel V1)

- ❌ Agents autonomes sans validation utilisateur
- ❌ Génération automatique de doctrines
- ❌ Interprétations théologiques non sourcées
- ❌ Prise de décision spirituelle à la place de l'utilisateur
- ❌ Bible Study Graph en V1 (reporté en V1.5)
- ❌ pgvector (reporté en V2)
- ❌ Agents de groupe autonomes
