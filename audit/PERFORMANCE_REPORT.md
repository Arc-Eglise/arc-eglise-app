# PERFORMANCE_REPORT.md — ARC Église
> Analyse des performances : Server vs Client, images, animations, DB queries
> Audit du 2026-06-23

---

## 1. Répartition Server Components vs Client Components

### Site public (home)

| Composant | "use client" | Raison | Optimal ? |
|-----------|-------------|--------|-----------|
| `AnnouncementBar.tsx` | ✅ OUI | Marquee animé | ⚠️ Pourrait être Server + CSS animation |
| `Header.tsx` | ✅ OUI | useUser, scroll, state menu | ✅ Nécessaire |
| `HeroSection.tsx` | ✅ OUI | scrollTo(), useState non utilisé | ⚠️ **Inutile** — aucun state, juste onClick |
| `FeaturesStrip.tsx` | ✅ OUI | Hover CSS géré en `<style>` | ⚠️ **Inutile** — pas d'état, hover via CSS |
| `AboutSection.tsx` | ❌ Server | Statique | ✅ Correct |
| `SermonsSection.tsx` | ❌ Server | Requête DB + passe à SermonsClient | ✅ Correct |
| `SermonsClient.tsx` | ✅ OUI | useState (filter) | ✅ Nécessaire |
| `EventsSection.tsx` | ❌ Server | Requête DB | ✅ Correct |
| `TeamSection.tsx` | ❌ Server | Requête DB | ✅ Correct |
| `DonSection.tsx` | ✅ OUI | useState multiple | ✅ Nécessaire |
| `CopilotAssistant.tsx` | ✅ OUI | fetch streaming, useRef, useState | ✅ Nécessaire |
| `ContactSection.tsx` | ✅ OUI | useState, fetch | ✅ Nécessaire |
| `Footer.tsx` | ❌ Server | Statique | ✅ Correct |

**Résumé :**
- **HeroSection** et **FeaturesStrip** sont marqués `"use client"` sans nécessité réelle. Ils augmentent le bundle JS sans bénéfice.
- `HeroSection` n'a qu'une fonction `scrollTo` qui pourrait être un lien `<a>` ou un `onClick` passé en prop.

---

## 2. Taille et complexité des composants

| Fichier | Lignes | Complexité |
|---------|--------|-----------|
| `globals.css` | 666 | Élevée — Design system double (vitrine + espace membres) |
| `CopilotAssistant.tsx` | 259 | Élevée — Streaming SSE + gestion état |
| `DonSection.tsx` | 220 | Moyenne — Formulaire multi-état |
| `ContactSection.tsx` | 255 | Moyenne — Formulaire + fetch |
| `EventsSection.tsx` | 165 | Moyenne |
| `SermonsClient.tsx` | 192 | Moyenne |
| `Header.tsx` | 243 | Moyenne — useUser + scroll + state |
| `HeroSection.tsx` | 189 | Faible-Moyenne |
| `SermonsSection.tsx` | 49 | Faible |
| `Footer.tsx` | 159 | Faible |
| `AnnouncementBar.tsx` | 35 | Faible |
| `FeaturesStrip.tsx` | 85 | Faible |
| `AboutSection.tsx` | 148 | Faible |
| `TeamSection.tsx` | 107 | Faible |

---

## 3. Images — Utilisation de next/image

### Images avec `<img>` standard (NON optimisées)

| Composant | Ligne | Usage | Impact |
|-----------|-------|-------|--------|
| `SermonsClient.tsx` | 66-70 | Thumbnail YouTube featured | ⚠️ MAJEUR — grande image, pas de lazy load next/image |
| `SermonsClient.tsx` | 122-126 | Thumbnails YouTube secondaires | ⚠️ MAJEUR — idem |
| `TeamSection.tsx` | 49 | Avatar membre `m.avatar_url` | ⚠️ MODÉRÉ — images Supabase Storage |

**Toutes les images utilisent `<img>` natif** au lieu de `next/image`. Cela prive le site :
- De l'optimisation automatique WebP/AVIF
- Du lazy loading natif Next.js
- Du placeholder blur
- Du redimensionnement automatique

Les thumbnails YouTube (`hqdefault.jpg` = 480×360px, `mqdefault.jpg` = 320×180px) sont chargées en taille réelle sans optimisation.

---

## 4. Animations CSS

### Animations définies dans `globals.css`

| Animation | Classe | Durée | `will-change` | Impact |
|-----------|--------|-------|---------------|--------|
| `arcMarquee` | `.animate-marquee` | 26s linear infinite | ✅ `will-change: transform` | Faible |
| `arcFloat` | `.animate-float` | 6s ease-in-out infinite | ❌ non | Faible-Moyen |
| `arcPulse` | `.animate-pulse2` | 1.6s infinite | ❌ non | Faible |
| `arcRing` | `.animate-ring` | 2.4s infinite | ❌ non | Faible |
| `blink` | `.animate-blink` | 1.2s infinite | ❌ non | Faible |
| `bounce` | local CopilotAssistant | 0.9s infinite | ❌ non | Faible |
| `slideUp` | `.em-toast` | 0.3s | ❌ non | Négligeable |
| `em-thread-up` | thread panel | 0.24s | ❌ non | Négligeable |

**Observations :**
1. Le marquee a `will-change: transform` — bien géré
2. Les floating cards (`arcFloat`) sur HeroSection ont 2 animations concurrentes sans `will-change` — peut causer des repaints sur appareils faibles
3. `animate-pulse2` est utilisé sur le live badge ET le point "18 en ligne" du Header — 2 animations simultanées
4. `animate-blink` dans espace membres peut impacter la batterie sur mobile

---

## 5. `<style>` JSX dans des composants

Plusieurs composants injectent des styles via `<style>` JSX inline au lieu de classes Tailwind ou de `globals.css` :

| Composant | Contenu style JSX | Impact |
|-----------|------------------|--------|
| `HeroSection.tsx` | `.arc-hero-grid` responsive | ⚠️ Duplique au re-render |
| `FeaturesStrip.tsx` | `.arc-cards4` + `.arc-discover-card` hover | ⚠️ Duplique |
| `AboutSection.tsx` | `.arc-two` responsive | ⚠️ Duplique |
| `SermonsClient.tsx` | `.arc-sermon-grid` responsive | ⚠️ Duplique |
| `EventsSection.tsx` | `.arc-two` responsive | ⚠️ Duplique |
| `TeamSection.tsx` | `.arc-team-card` hover + `.arc-cards4` | ⚠️ Duplique |
| `DonSection.tsx` | `.arc-two` responsive | ⚠️ Duplique |
| `CopilotAssistant.tsx` | `@keyframes bounce` + `.arc-two` | ⚠️ Duplique |
| `ContactSection.tsx` | `.arc-two` responsive | ⚠️ Duplique |
| `Footer.tsx` | `.arc-footer-grid` responsive | ⚠️ Duplique |

**Problème :** La classe `.arc-two` est définie dans **8 balises `<style>` différentes**, une par composant. CSS identique injecté 8 fois dans le DOM. Devrait être centralisé dans `globals.css`.

---

## 6. Fonts

**Défini dans `src/app/layout.tsx` :**

| Police | Graisses | Styles | Variable CSS |
|--------|---------|--------|-------------|
| Manrope | 300, 400, 500, 600, 700, 800 (6 poids) | normal | `--font-manrope` |
| Cormorant Garamond | 300, 400, 600, 700 (4 poids) | normal + italic | `--font-cormorant` |

**Impact :**
- 10 fichiers de fonts chargés (optimisé `display: "swap"`)
- `next/font/google` avec `display: "swap"` — correct
- Next.js précharge automatiquement et héberge en local — impact limité

**Note :** `globals.css` ligne 172 référence `font-family: 'Outfit'` pour l'espace membres — Outfit n'est PAS déclaré dans `layout.tsx`. Cette font sera chargée depuis le navigateur system-fallback ou non rendue.

```css
/* globals.css ligne 172 */
font-family: 'Outfit', system-ui, sans-serif;
```

**Ce bug est présent partout dans l'espace membres** (`.em-btn`, `.em-tab`, `.em-input`, etc.) — ~30+ déclarations `font-family: 'Outfit'`.

---

## 7. Appels Supabase — Requêtes DB

### Server Components (Build-time ou Request-time)

| Composant | Table(s) | Filtre | Limite | Notes |
|-----------|---------|--------|--------|-------|
| `SermonsSection` | `sermons` | `is_published=true`, ordre date | 10 | ✅ Optimal |
| `EventsSection` | `events` + `event_registrations(count)` | `is_published`, `is_public`, `gte date` | 1 | ⚠️ Régression — devrait être 3 |
| `TeamSection` | `team_members` | `is_active=true` | 8 | ✅ Optimal |
| `EspaceMembresPage` | `profiles`×4, `prayer_requests`, `events` | Multiples | 6 events | ✅ Promise.all — parallèle |
| `ProfilPage` | `profiles` | id utilisateur | 1 | ✅ |
| `PrierePage` | `profiles`, `prayer_requests` | id utilisateur | illimitée | ⚠️ Pas de pagination |

### Client Components (Runtime)

| Composant | Endpoint | Fréquence |
|-----------|---------|-----------|
| `Header` (via useUser) | Supabase profiles | Une fois par session + onAuthStateChange |
| `CopilotAssistant` | `/api/lunziko/chat` | Par message envoyé |
| `ContactSection` | `/api/contact` | Par soumission |
| `useUser hook` | Supabase profiles | onMount + auth changes |

**Observation :** `useUser` fait une requête Supabase à chaque mount du Header et une à chaque changement d'auth state. Sur la page d'accueil, le Header est le seul composant faisant des requêtes client-side à Supabase — acceptable.

---

## 8. Résumé des problèmes de performance

| Problème | Sévérité | Impact estimé |
|---------|---------|--------------|
| Toutes les images `<img>` sans next/image | MAJEUR | LCP, CLS, bandwidth |
| Outfit font non chargée dans layout.tsx | MAJEUR | Rendu espace membres dégradé |
| HeroSection et FeaturesStrip "use client" inutile | MODÉRÉ | +JS bundle |
| `.arc-two` style dupliqué 8× dans le DOM | MODÉRÉ | CSS bloat |
| Pas de pagination sur prayer_requests | MODÉRÉ | DB queries illimitées |
| Animations sans `will-change` (arcFloat × 2) | MINEUR | Repaint mobile |
| `<img>` YouTube sans `loading="lazy"` explicite | MINEUR | Above-fold load |
