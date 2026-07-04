# FUNCTIONAL_AUDIT.md — ARC Église
> Audit du 2026-06-23 · Lecture seule, aucune modification de code.

---

## 1. Architecture générale

| Couche | Technologie |
|--------|------------|
| Framework | Next.js 14 (App Router) |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Fonts | Manrope (6 graisses) + Cormorant Garamond (4 graisses) |
| CSS | Tailwind CSS + inline styles + `<style>` JSX |
| IA | Lunziko Platform API (fallback), clés personnelles membres |

---

## 2. Site public vitrine (`src/app/page.tsx`)

### 2.1 Composition de la page d'accueil

```
AnnouncementBar  → [Server: NON — "use client"]
Header           → [Server: NON — "use client"]
HeroSection      → [Server: NON — "use client"]
FeaturesStrip    → [Server: NON — "use client"]
AboutSection     → [Server: OUI — Server Component]
SermonsSection   → [Server: OUI — Server Component]
  └── SermonsClient → [Client]
EventsSection    → [Server: OUI — Server Component]
TeamSection      → [Server: OUI — Server Component]
DonSection       → [Server: NON — "use client"]
CopilotAssistant → [Server: NON — "use client"]
ContactSection   → [Server: NON — "use client"]
Footer           → [Server: OUI — Server Component]
```

### 2.2 Fonctionnalités présentes

| Fonctionnalité | Statut | Notes |
|---------------|--------|-------|
| Barre d'annonces animée (marquee) | ✅ Présent | Données hardcodées |
| Navigation ancres (Header) | ✅ Présent | scrollIntoView() JS |
| HeroSection avec stats | ✅ Présent | Stats hardcodées (250/32/6/600+) |
| HeroSection cards flottantes | ✅ Présent | `hidden lg:block` — invisible mobile |
| FeaturesStrip 4 cartes | ✅ Présent | Liens ancres |
| AboutSection valeurs | ✅ Présent | Pas d'image réelle |
| SermonsSection depuis DB | ✅ Présent | `.limit(10)`, 1 featured + 2 rest |
| Filtre sermons (Tout/Série/Évangélisation/Prière/Famille) | ✅ Présent | Côté client uniquement |
| EventsSection 1 événement featured | ✅ Présent | `.limit(1)` — régression vs 3 |
| Cultes horaires (statique) | ✅ Présent | 3 créneaux hardcodés |
| TeamSection depuis DB | ✅ Présent | `.limit(8)` |
| DonSection formulaire | ✅ UI présente | **Non connecté** — bouton sans submit réel |
| CopilotAssistant IA | ✅ Présent | Lunziko API + clés membres |
| ContactSection formulaire | ✅ Présent | → `/api/contact` → Supabase |
| Footer avec navigation | ✅ Présent | |

---

## 3. Authentification

| Fonctionnalité | Statut | Notes |
|---------------|--------|-------|
| Inscription multi-étapes | ✅ Présent | 3 étapes : Identité / Compte / Confirmation |
| Connexion email+password | ✅ Présent | |
| Connexion Google OAuth | ✅ Présent | handleGoogle() |
| Mot de passe oublié | ✅ Présent | `resetPasswordForEmail` |
| Confirmation email | ✅ Présent | `/auth/callback` route |
| Rôles utilisateur | ✅ Présent | admin / pasteur / membre / visiteur |
| Validation pasteur | ✅ Présent | Champ `validated` booléen |
| Déconnexion | ✅ Présent | `supabase.auth.signOut()` |

---

## 4. Espace Membres

| Section | Route | Statut |
|---------|-------|--------|
| Dashboard | `/espace-membres` | ✅ Présent |
| Profil | `/espace-membres/profil` | ✅ Présent |
| Prière | `/espace-membres/priere` | ✅ Présent |
| Bible | `/espace-membres/bible` | ✅ Présent |
| Streaming | `/espace-membres/streaming` | ✅ Présent |
| AI Biblique | `/espace-membres/ai-biblique` | ✅ Présent |
| Assistant | `/espace-membres/assistant` | ✅ Présent |
| Messagerie | `/espace-membres/messagerie` | ✅ Présent |
| Annuaire | `/espace-membres/annuaire` | ✅ Présent |
| Agenda | `/espace-membres/agenda` | ✅ Présent |
| Notes | `/espace-membres/notes` | ✅ Présent |
| Doléances | `/espace-membres/doleances` | ✅ Présent |
| CRM | `/espace-membres/crm` | ✅ Présent |
| Présences | `/espace-membres/presences` | ✅ Présent |

---

## 5. APIs

| Endpoint | Méthode | Statut |
|---------|--------|--------|
| `/api/contact` | POST | ✅ Valide — Supabase insert |
| `/api/lunziko/chat` | POST | ✅ Valide — streaming SSE |
| `/api/lunziko/summarize` | POST | ✅ Présent |
| `/api/copilot` | POST | ✅ Présent |
| `/api/youtube/videos` | GET | ✅ Présent |
| `/api/bible/chapter` | GET | ✅ Présent |
| `/api/bible/search` | GET | ✅ Présent |
| `/api/bible/versions` | GET | ✅ Présent |
| `/api/bible/books` | GET | ✅ Présent |
| `/api/bible/crossrefs` | GET | ✅ Présent |
| `/api/bible-ai/*` (9 routes) | POST | ✅ Présent |
| `/api/member-keys` | POST | ✅ Présent |
| `/api/auth/signout` | POST | ✅ Présent |
| `/api/mobile/me` | GET | ✅ Présent |
| `/api/events/[id]/ical` | GET | ✅ Présent |

---

## 6. Fonctionnalités manquantes / partielles

| Problème | Sévérité | Détail |
|---------|---------|--------|
| DonSection bouton "Donner" non fonctionnel | CRITIQUE | Aucun `onSubmit`, aucun appel API, aucune intégration paiement réelle |
| Email Microsoft 365 / Resend non intégré | MAJEUR | `/api/contact` enregistre en DB mais n'envoie PAS d'email de notification |
| HeroSection — image réelle absente | MODÉRÉ | Placeholder `[ Photo — assemblée en culte ]` |
| AboutSection — image réelle absente | MODÉRÉ | Placeholder `[ Photo — Pasteur Pedro Obova ]` |
| TeamSection — images membres absentes | MODÉRÉ | Conditionnel `if m.avatar_url` mais fallback placeholder |
| Carte Google Maps réelle absente | MODÉRÉ | Lien Google Maps mais image simulée |
| Nouveau-mot-de-passe page | CRITIQUE | La route `/nouveau-mot-de-passe` référencée dans `resetPasswordForEmail` n'existe pas dans l'arborescence |
| Sitemap.xml absent | MINEUR | Pas de `/sitemap.xml` ni `sitemap.ts` |
| Robots.txt absent | MINEUR | Pas de `robots.txt` ni `robots.ts` |
| AnnouncementBar aria-hidden | MODÉRÉ | `aria-hidden="true"` masque l'info aux lecteurs d'écran |
