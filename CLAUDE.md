# ARC Église — Claude Code Project Instructions

## Projet
Site web de l'ARC (Ambassade du Royaume de Christ) — La Chaux-de-Fonds, Suisse.
**Stack :** Next.js 14 App Router · Supabase (PostgreSQL + Auth + RLS) · Vercel · Tailwind CSS · TypeScript

**Site live :** https://arc-eglise.ch  
**Dossier :** `C:\Users\Joe\Desktop\Maj projet\arc-eglise-app`  
**GitHub :** https://github.com/Arc-Eglise/arc-eglise-app

---

## Skills actifs sur ce projet

### Backend / BDD
- `/supabase` — migrations SQL, RLS policies, queries, types TypeScript générés
- `/api-design-principles` — structure des Route Handlers Next.js (`src/app/api/**`)

### Frontend / UI
- `/nextjs` — App Router, Server Components, Route Handlers, metadata, layout
- `/vercel:nextjs` — optimisations Next.js spécifiques à Vercel
- `/frontend` — composants React/Tailwind, patterns UI
- `/typescript` — typage strict, types Supabase, interfaces

### Déploiement / Infra
- `/vercel:deploy` — déploiements production et preview
- `/vercel:env-vars` — gestion des variables d'environnement Vercel
- `/vercel:vercel-functions` — Serverless Functions / Edge Functions
- `/vercel:runtime-cache` — stratégie de cache (ISR, revalidate, tags)

### Services
- `/resend` — emails transactionnels (contact, invitations, notifications)

### Qualité / Sécurité
- `/security-auditor` — audit RLS Supabase, secrets côté client, RBAC
- `/perf-auditor` — Core Web Vitals, Lighthouse, bundle size
- `/accessibility-a11y` — WCAG 2.2, navigation clavier, contrastes
- `/seo-optimizer` — metadata Next.js, sitemap, Open Graph

---

## Architecture & Règles absolues

### RBAC — 4 rôles
`visiteur` | `membre` | `pasteur` | `admin`

### 12 fonctions (`profiles.groups[]`)
`pasteur` `chorale` `media` `social` `sanitaire` `finance` `support` `jeunesse` `femmes` `ecodim` `suivi` `communication`

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
