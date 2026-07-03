# SEO_AUDIT.md — ARC Église
> Audit SEO : métadonnées, structure H1-H3, sémantique, sitemap
> Audit du 2026-06-23

---

## 1. Métadonnées globales (`src/app/layout.tsx`)

### Balises metadata définies
```typescript
title: "ARC — Ambassade du Royaume de Christ · La Chaux-de-Fonds"
description: "Une communauté évangélique vivante, fondée sur la Parole de Dieu, ouverte à toutes les nations. La Chaux-de-Fonds, Suisse."
keywords: ["église", "évangélique", "La Chaux-de-Fonds", "Suisse", "ARC", "Ambassade du Royaume de Christ"]
authors: [{ name: "ARC Église" }]
applicationName: "ARC Église"
manifest: "/manifest.webmanifest"
```

### Open Graph
```typescript
openGraph: {
  title: "ARC — Ambassade du Royaume de Christ",
  description: "Église évangélique à La Chaux-de-Fonds, Suisse",
  locale: "fr_CH",
  type: "website",
}
```

### Viewport
```typescript
viewport: {
  themeColor: "#1e2464",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}
```

### Analyse

| Métadonnée | Statut | Commentaire |
|-----------|--------|------------|
| `<title>` | ✅ Présent | Bien structuré avec localisation |
| `<meta description>` | ✅ Présent | 130 chars — dans la limite recommandée |
| `keywords` | ⚠️ Présent | Peu d'impact SEO moderne, acceptable |
| Open Graph `og:title` | ✅ Présent | |
| Open Graph `og:description` | ✅ Présent | |
| Open Graph `og:image` | ❌ **ABSENT** | Aucune image OG définie |
| Open Graph `og:url` | ❌ **ABSENT** | Non défini explicitement |
| Twitter Card | ❌ **ABSENT** | Pas de `twitter:*` tags |
| `metadataBase` | ✅ Présent | `https://www.arc-eglise.ch` |
| `lang="fr"` | ✅ Présent | `<html lang="fr">` |
| Canonical URL | ❌ **ABSENT** | Pas de balise canonical |
| `robots` | ❌ **ABSENT** | Pas de meta robots ni robots.txt |
| `favicon` | ⚠️ Partiel | `favicon.ico` présent, pas d'icônes PNG 192/512 |
| PWA manifest | ✅ Présent | `/manifest.webmanifest` — icône seulement `.ico` |

---

## 2. Structure des titres (H1-H3)

### `src/app/page.tsx` — Page d'accueil

| Section | Balise | Texte | Niveau approprié ? |
|---------|--------|-------|-------------------|
| HeroSection | `<h1>` | "Construisons des générations qui transforment" | ✅ Correct — 1 seul H1 |
| AboutSection | `<h2>` | "Une église enracinée dans la Parole" | ✅ |
| SermonsSection | `<h2>` | "Sermons & Replays" | ✅ |
| SermonsClient — featured | `<h3>` | `{featured.title}` | ✅ |
| SermonsClient — secondary | `<h4>` | `{s.title}` | ✅ |
| EventsSection | `<h2>` | "Événements & Cultes" | ✅ |
| EventsSection — featured | `<h3>` | `{featured.title}` | ✅ |
| TeamSection | `<h2>` | "Des bergers au service de la communauté" | ✅ |
| DonSection | `<h2>` | "Chaque don construit le Royaume" | ✅ |
| DonSection form | `<h3>` | "Faire un don" | ✅ |
| CopilotAssistant | `<h2>` | "Besoin d'aide ?" | ✅ |
| ContactSection | `<h2>` | "Venez nous rendre visite" | ✅ |

**Verdict :** La hiérarchie des titres est bien structurée. Un seul H1, des H2 par section, H3 pour les sous-éléments. Pas de saut de niveaux.

**Problème :** Le `<h4>` dans SermonsClient (sermons secondaires) — il n'y a pas de `<h3>` parent dans ces articles. La hiérarchie saute de `<article>` directement à `<h4>`. Mineur mais imprécis.

---

## 3. Attributs `alt` sur les images

| Composant | Image | Alt | Qualité |
|-----------|-------|-----|---------|
| `SermonsClient.tsx` L.69 | YouTube thumbnail featured | `alt={featured.title}` | ✅ Dynamique |
| `SermonsClient.tsx` L.124 | YouTube thumbnail secondary | `alt={s.title}` | ✅ Dynamique |
| `TeamSection.tsx` L.49 | Avatar membre | `alt={m.name}` | ✅ Dynamique |
| (Espace membres) `em-av img` | Avatar | CSS seulement, pas d'alt | ⚠️ À vérifier dans EspaceMembresClient |

**Verdict :** Les images publiques ont des `alt` descriptifs. Pas d'images décoratives avec `alt=""` à tort.

---

## 4. Balises sémantiques HTML5

| Composant | Balises sémantiques utilisées | Commentaire |
|-----------|------------------------------|------------|
| `page.tsx` | `<main>` | ✅ Correct |
| `Header.tsx` | `<header>`, `<nav>`, `<ul>/<li>` | ✅ Correct |
| `Footer.tsx` | `<footer>` | ✅ Correct |
| `HeroSection.tsx` | `<section id="accueil">` | ✅ |
| `FeaturesStrip.tsx` | `<section id="features">` | ✅ |
| `AboutSection.tsx` | `<section id="apropos">` | ✅ |
| `SermonsSection.tsx` | `<section id="sermons">` | ✅ |
| `SermonsClient.tsx` | `<article>` pour chaque sermon | ✅ |
| `EventsSection.tsx` | `<section id="evenements">` | ✅ |
| `TeamSection.tsx` | `<section id="equipe">` | ✅ |
| `DonSection.tsx` | `<section id="dons">` | ✅ |
| `CopilotAssistant.tsx` | `<section id="assistant">` | ✅ |
| `ContactSection.tsx` | `<section id="contact">`, `<form>` | ✅ |
| `AboutSection.tsx` | `<blockquote>` | ✅ |

**Verdict :** L'utilisation des balises sémantiques est globalement bonne. Les sections ont des IDs cohérents. Les articles sermons utilisent `<article>`.

**Problème :** Le Header utilise `<ul>/<li>` pour la nav desktop mais des `<button>` dans les `<li>` (à cause du scrollTo JS) plutôt que des `<a>`. Cela n'est pas idéal pour le SEO car les liens d'ancrage `<a href="#section">` sont préférables pour que les crawlers comprennent la structure.

---

## 5. Sitemap et Robots

| Fichier | Statut |
|---------|--------|
| `/sitemap.xml` | ❌ **ABSENT** |
| `src/app/sitemap.ts` | ❌ **ABSENT** |
| `/robots.txt` | ❌ **ABSENT** |
| `src/app/robots.ts` | ❌ **ABSENT** |

**Impact :** Sans sitemap, les crawlers (Google) doivent découvrir les pages par eux-mêmes. Pour un site avec peu de pages publiques (principalement la home), l'impact est limité, mais l'absence de `robots.txt` signifie que les routes `/admin/*` et `/espace-membres/*` peuvent être indexées.

---

## 6. Problèmes SEO spécifiques identifiés

### 6.1 Boutons au lieu de liens pour la navigation
**Fichier :** `src/components/layout/Header.tsx` — lignes 89-96

```typescript
<button onClick={() => scrollTo(link.href)}>
  {link.label}
</button>
```

Les crawlers Google suivent les `<a href>` mais pas nécessairement les `<button onClick>`. La navigation principale devrait utiliser `<a href="#section">` avec un `e.preventDefault()` + scrollTo JS comme fallback.

### 6.2 Absence d'image Open Graph
Le partage sur Facebook, Twitter/X, WhatsApp ne génèrera pas d'aperçu visuel de l'église. Une image OG recommandée : 1200×630px.

### 6.3 URL canonique manquante
Sans canonical, si le site est accessible sur `www.arc-eglise.ch` et `arc-eglise.ch`, des duplications d'index peuvent se produire.

### 6.4 `maximumScale: 1` problématique
```typescript
maximumScale: 1,
```
Cette meta viewport empêche le zoom sur mobile — pratique d'accessibilité défaillante et potentiellement pénalisée par Google (Core Web Vitals).

### 6.5 CopilotAssistant non indexable
Le contenu généré dynamiquement par l'IA dans le chat n'est pas indexable. Acceptable car il s'agit d'un chat interactif.

### 6.6 Données structurées absentes
Aucun Schema.org JSON-LD pour :
- `Organization` / `Church`
- `Event` (événements)
- `LocalBusiness` (adresse, horaires)

---

## 7. Analyse des performances SEO par page

| Page | Title | Meta Desc | H1 | OG Image | Canonical |
|------|-------|-----------|-----|----------|-----------|
| `/` (home) | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/inscription` | ❌ Global | ❌ Global | ✅ | ❌ | ❌ |
| `/connexion` | ❌ Global | ❌ Global | ✅ | ❌ | ❌ |
| `/mot-de-passe-oublie` | ❌ Global | ❌ Global | ✅ | ❌ | ❌ |
| `/espace-membres/*` | ❌ Global | ❌ Global | Variable | ❌ | ❌ |
| `/admin/*` | ❌ Global | ❌ Global | Variable | ❌ | ❌ |

**Note :** Les pages `/inscription`, `/connexion` etc. héritent du title/description global. Idéalement chaque page devrait avoir ses propres métadonnées via `export const metadata` ou `generateMetadata`.

---

## 8. Score SEO global

| Catégorie | Score | Commentaire |
|-----------|-------|------------|
| Titres H1-H6 | 8/10 | Hiérarchie correcte, quelques H4 orphelins |
| Métadonnées | 6/10 | Manque OG image, canonical, twitter cards |
| Sémantique HTML | 8/10 | Bon usage sections/articles/nav |
| Indexabilité | 5/10 | Pas de sitemap, robots.txt absent |
| Performance (SEO) | 6/10 | Images non optimisées impactent LCP |
| Données structurées | 0/10 | Aucun Schema.org |
| **Score global estimé** | **5.5/10** | |
