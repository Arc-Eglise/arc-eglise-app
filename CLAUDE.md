# ARC Église — Claude Code Project Instructions

## Projet
Site web de l'ARC (Ambassade du Royaume de Christ) — La Chaux-de-Fonds, Suisse.
**Stack :** Next.js 14 App Router · Supabase (PostgreSQL + Auth + RLS) · Vercel · Tailwind CSS · TypeScript

**Site live :** https://arc-eglise.ch  
**Dossier :** `C:\Users\Joe\Desktop\Maj projet\arc-eglise-app`  
**GitHub :** https://github.com/Arc-Eglise/arc-eglise-app

---

## Skills actifs sur ce projet

### IA / LLM (ARC AI Engine)
- `/ia` — patterns IA généraux, intégration LLM côté serveur
- `/claude-api` — référence Claude/Anthropic (fallback chain, modèles, pricing, streaming)
- `/llm-fallback` — chaîne de fallback Groq→Gemini→Mistral→Anthropic→DeepSeek→OpenAI→Ollama
- `/rag-pipeline` — RAG biblique (contenu théologique, dictionnaire, versets)
- `/prompt-engineer` — system prompts ARC AI, prompts JSON-safe, prompts copilote
- `/agent-workflow` — patterns agentiques, tool-use, boucles AI, handoff multi-agents
- `/agent-team` — orchestration multi-agents Claude Code
- `/token-optimizer` — optimisation coûts LLM, cache de prompts, truncation
- `/vercel:ai-sdk` — streaming AI responses, useChat, AI SDK Vercel
- `/vercel:ai-gateway` — Vercel AI Gateway, routing providers, fallback
- `/vercel:vercel-agent` — agents Vercel

### Backend / BDD
- `/supabase` — migrations SQL, RLS policies, queries, types TypeScript générés
- `/api-design-principles` — structure des Route Handlers Next.js (`src/app/api/**`)
- `/vector-db` — embeddings, recherche vectorielle (futur RAG Supabase pgvector)

### Frontend / UI
- `/nextjs` — App Router, Server Components, Route Handlers, metadata, layout
- `/vercel:nextjs` — optimisations Next.js spécifiques à Vercel
- `/vercel:react-best-practices` — patterns React modernes, Server/Client components
- `/vercel:routing-middleware` — middleware Next.js, redirects, rewrites
- `/frontend` — composants React/Tailwind, patterns UI
- `/typescript` — typage strict, types Supabase, interfaces
- `/component-generator` — templates React Server/Client, props typées
- `/theme-factory` — système de thèmes (buildThemeCss, accent couleur, navy/or)
- `/micro-interactions` — animations Tailwind, transitions UX, hover states
- `/design` — UI/UX ARC Église, identité visuelle
- `/copywriting-ux` — textes UI, messages d'erreur, libellés

### Déploiement / Infra
- `/vercel:deploy` — déploiements production et preview
- `/vercel:env-vars` — gestion des variables d'environnement Vercel
- `/vercel:vercel-functions` — Serverless Functions / Edge Functions
- `/vercel:runtime-cache` — stratégie de cache (ISR, revalidate, tags)
- `/vercel:auth` — Supabase Auth sur Vercel, sessions, cookies
- `/vercel:deployments-cicd` — CI/CD, preview deployments, GitHub Actions
- `/vercel:status` — monitoring déploiements Vercel
- `/devops` — infra, scripts, tâches Windows (ngrok, Ollama)
- `/git` — workflow git, branches ADR-001, merge strategy

### Services
- `/resend` — emails transactionnels (contact, invitations, notifications)
- `/localization-i18n` — site en français, formats dates/nombres suisses

### Qualité / Sécurité
- `/security-auditor` — audit RLS Supabase, secrets côté client, RBAC
- `/guardrails-security` — OWASP, injection, XSS, validation entrées AI
- `/perf-auditor` — Core Web Vitals, Lighthouse, bundle size
- `/accessibility-a11y` — WCAG 2.2, navigation clavier, contrastes
- `/seo-optimizer` — metadata Next.js, sitemap, Open Graph
- `/cost-reducer` — réduction coûts LLM + Vercel + Supabase
- `/refactoring-debugging` — debug Next.js/Supabase, git bisect, React
- `/code-reviewer` — revue PR, ADR-001 compliance, sécurité

---

## Architecture & Règles absolues

### RBAC — 4 rôles
`visiteur` | `membre` | `pasteur` | `admin`

### 13 fonctions (`profiles.groups[]`)
`pasteur` `chorale` `media` `social` `hospitalite` `sanitaire` `finance` `support` `jeunesse` `femmes` `ecodim` `suivi` `communication`

### Pipeline pastoral (`profiles.pastoral_stage`)
`visiteur` → `integration` → `actif` → `formation` → `responsable`

### Règles RBAC
```
canAdmin       = isAdmin || isPasteur || canCommFunc || canSupportFunc
canAdminFull   = isAdmin || isPasteur
canGestionDroits = isAdmin uniquement
```

### Sécurité — Règles INVIOLABLES
- `SUPABASE_SERVICE_ROLE_KEY` → JAMAIS côté client
- `createAdminClient()` → UNIQUEMENT côté serveur (`src/lib/supabase/admin.ts`)
- `STRIPE_SECRET_KEY` → UNIQUEMENT côté serveur
- Modifier le profil d'un autre user → toujours `createAdminClient()` (RLS bloque sinon)
- `groups` est un mot réservé PostgreSQL → toujours entre guillemets : `"groups"`

### AI biblique — Fallback chain
Groq (primary) → Gemini → Mistral → Anthropic → DeepSeek → OpenAI

Utiliser `chat()` directement (pas `arcAIRequest()`/`runArcAgent()`) pour les endpoints qui génèrent du JSON.

### Git — IMPORTANT
La production Vercel est **en avance** sur git (déploiements directs via `vercel --prod`).
Toujours faire `git add -A && git commit` avant de modifier du code.

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/lib/supabase/admin.ts` | `createAdminClient()` — serveur uniquement |
| `src/lib/features.ts` | Feature flags (`DONS_ENABLED`, etc.) |
| `src/components/VideoPlayer.tsx` | Player fullscreen (client component) |
| `src/lib/graph-client.ts` | Graph API Microsoft 365 — DOIT inclure `from` dans sendMail |
| `src/app/api/bible-ai/` | Routes AI biblique |

---

## SQL Supabase

**Lien SQL Editor :** https://supabase.com/dashboard/project/fobyvhulyjxwbhusouqz/sql  
**Dossier migrations locales :** `supabase/`

Tous les fichiers SQL en attente ont été exécutés le 2026-07-17.

---

## Couleurs brand

| Couleur | Valeur |
|---------|--------|
| Navy (Tailwind) | `#1e2464` |
| Navy (SVG icônes) | `#2B3475` |
| Or | `#C9A227` |

---

## Contacts
- **Pasteur :** Pedro Obova
- **Cultes :** Dim 9h30 + 17h00, Prière Mer 19h00
- **Adresse :** Av. Charles-Naine 39, 2300 La Chaux-de-Fonds
- **Email église :** arceglise.cdf@gmail.com
- **Vercel account :** arceglise.cdf@gmail.com

---

## CHANTIER ADR-001 — RÈGLES PERMANENTES

### Structure du chantier

| Chantier | Branche | Touche la production ? |
|---|---|---|
| **A — Correctifs** | `fix/adr-001-correctifs` puis `main` | Oui, volontairement |
| **B — Socle isolé** | `feat/socle-api` — **jamais fusionnée** | **Non, jamais** |
| **C — Bascule** | sur feu vert explicite uniquement | Oui, sous-étape par sous-étape |

La branche `feat/socle-api` ne doit **jamais** être fusionnée dans `main` sans accord écrit de Joe. Un feu vert pour une sous-étape du chantier C ne vaut que pour cette sous-étape précise.

### Règle d'isolation absolue

Le chantier B vit sur `feat/socle-api`. Tant que cette branche n'est pas fusionnée, aucune ligne du socle n'atteint la production. Sont interdits sans feu vert explicite :

- ❌ Qu'une page, composant, hook ou route **existante** importe quoi que ce soit du socle.
- ❌ Que `arc-ai-engine` importe, appelle ou dépende de `arc-core`.
- ❌ Que `arc-core` importe quoi que ce soit de `arc-ai-engine` ou de `app/`.
- ❌ De rediriger, remplacer, proxifier une route existante vers le socle, même temporairement.
- ❌ D'introduire un drapeau de fonctionnalité ou un `if` pour activer partiellement le socle.
- ❌ De fusionner `feat/socle-api` dans `main`, ni de la déployer, sans accord écrit.

**Si tu penses qu'un raccordement est nécessaire : arrête-toi et demande à Joe.** Ne décide jamais seul.

### Règles non négociables (ADR-001 v2.1 — section 8)

- **R1** — Aucune valeur de rôle ou de fonction en chaîne littérale hors de `arc-core`. Dans le chantier A (correctifs), les listes locales sont temporairement acceptées.
- **R5** — Le droit suit la mission : aucun droit sur les personnes accordé par effet de bord d'un droit sur le contenu. `communication` accède aux outils de contenu, pas aux personnes.
- **R8** — Domaine unique `arc-eglise.ch`. Aucun sous-domaine créé sans accord.
- **R9** — Dépendance à sens unique `arc-ai-engine → arc-core`, jamais l'inverse.
- **R11** — Validation systématique des entrées à toutes les frontières du système. Aucun digest opaque.

### Référentiel officiel (à jour — session 8, 21/07/2026)

**4 rôles :** `visiteur` | `membre` | `pasteur` | `admin`  
**13 fonctions :** `pasteur` `chorale` `media` `social` `hospitalite` `sanitaire` `finance` `support` `jeunesse` `femmes` `ecodim` `suivi` `communication`  
**5 étapes pipeline :** `visiteur` → `intégration` → `actif` → `formation` → `responsable`

### État d'avancement

| Chantier | Sous-étape | État | Date |
|---|---|---|---|
| — | Audit (Étape 0) | ✅ Terminé | 21/07/2026 |
| A | A1 — Contrainte d'intégrité DB | ✅ Terminé | 21/07/2026 |
| A | A2 — Confidentialité notes + droits | ✅ Terminé | 21/07/2026 |
| B | B0 — Mise en place isolation | ⏳ À démarrer | — |
| B | B1–B4 | ⏳ À démarrer | — |
| C | C0–C4 | 🔒 Bloqué (feu vert requis) | — |

*Journal détaillé :* `Documentation technique/AVANCEMENT-ADR-001.md`
