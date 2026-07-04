# LOGO_AUDIT.md — Audit des ressources graphiques ARC Église

Date : 2026-06-23

---

## 1. LOGO OFFICIEL DE RÉFÉRENCE

**Fichier :** `C:\Users\Joe\Desktop\Projet ARC\Site Web\Logo\Logo ARC.jpeg`

**Description du logo officiel :**
- Monogramme "ARC" en lettres majuscules calligraphiques navy (#1e2464)
- Flèche stylisée traversant le "A" (symbolique identitaire)
- Ligne de séparation horizontale navy
- Texte : "Ambassade du Royaume de Christ" en serif élégant
- Sous-texte : "- Église Évangélique -" en bleu pâle
- Format JPEG, fond blanc/transparent

**Utilisation actuelle dans le projet :** ❌ AUCUNE — le fichier n'est pas copié dans le projet

---

## 2. INVENTAIRE COMPLET DES LOGOS UTILISÉS

### 2.1 Implémentations textuelles (CSS) — aucune image réelle

Toutes les instances de "logo" dans le projet sont des **rendus CSS purs** :
box colorée + texte "ARC" en serif. L'image officielle n'est nulle part utilisée.

### 2.2 Tableau d'audit par composant

| Composant / Page | Rendu actuel | Texte utilisé | Conforme |
|---|---|---|---|
| **Header** (`Header.tsx` L.67-83) | Box navy 44×44px + texte | "ARC" + "Ambassade du Royaume" + "La Chaux-de-Fonds" | ❌ Nom tronqué |
| **Footer** (`Footer.tsx` L.48-57) | Box or 42×42px + texte | "ARC" + "Ambassade du Royaume de Christ" | ⚠️ Texte OK mais icône CSS |
| **Connexion** (`connexion/page.tsx` L.71-79) | Box navy gradient + texte | "ARC" + "Ambassade du Royaume" | ❌ Nom tronqué |
| **Inscription** (`inscription/page.tsx` L.~92-98) | Box navy gradient + texte | "ARC" + "Ambassade du Royaume" | ❌ Nom tronqué |
| **Mot de passe oublié** (`mot-de-passe-oublie/page.tsx` L.35-40) | Box navy gradient + texte | "ARC" (seul, sans sous-titre) | ⚠️ Incomplet |
| **Nouveau mot de passe** (`nouveau-mot-de-passe/page.tsx`) | Box navy gradient + texte | "ARC" (seul, sans sous-titre) | ⚠️ Incomplet |
| **Espace membres** (`globals.css .em-logo-icon`) | CSS class box | CSS uniquement | ⚠️ Aucun texte |

### 2.3 SEO / Open Graph / Favicons

| Ressource | Statut | Détail |
|---|---|---|
| **favicon.ico** | ⚠️ Existant mais générique | `src/app/favicon.ico` — probablement le favicon Next.js par défaut |
| **og-image** | ❌ ABSENT | `layout.tsx` définit `openGraph` mais sans image (`images` non défini) |
| **apple-touch-icon** | ❌ ABSENT | Non référencé dans metadata ni dans `public/` |
| **PWA icons** | ❌ INCOMPLET | `manifest.ts` référence `/favicon.ico` uniquement (pas de 192px ni 512px) |
| **robots.txt** | ❌ ABSENT | Aucun fichier dans `public/` |
| **sitemap.xml** | ❌ ABSENT | Non configuré |
| **browserconfig.xml** | ❌ ABSENT | Référencé dans metadata `other` mais inexistant |

### 2.4 Dossier `public/`

```
public/   ← VIDE (aucun fichier)
```

Il n'existe aucune ressource statique dans le projet. Toutes les références à `/favicon.ico`, `/manifest.webmanifest`, etc. reposent sur des routes Next.js App Router (`src/app/favicon.ico`, `src/app/manifest.ts`), pas sur le dossier `public/`.

---

## 3. ANALYSE DES INCOHÉRENCES VISUELLES

### 3.1 Couleur de la box logo

| Page | Couleur box | Cohérence |
|---|---|---|
| Header | Navy `#1e2464` | — |
| Footer | Or `#C9A227` | Différent du header |
| Connexion | Gradient navy→blue | Différent du header |
| Inscription | Gradient navy→blue | Différent du header |
| Espace membres | Gradient navy→#0f123a | Différent du header |

**Constat : 4 variantes visuelles différentes pour le même logo.** Aucune utilisation de l'image officielle.

### 3.2 Texte sous le logo

| Page | Ligne 1 | Ligne 2 |
|---|---|---|
| Header | "Ambassade du Royaume" ❌ | "La Chaux-de-Fonds" |
| Footer | "Ambassade du Royaume de Christ" ✅ | — |
| Connexion | "ARC" + "Ambassade du Royaume" ❌ | — |
| Inscription | "ARC" + "Ambassade du Royaume" ❌ | — |
| Mot de passe oublié | "ARC" uniquement | — |
| Nouveau mot de passe | "ARC" uniquement | — |

---

## 4. PRÉSENCE DU LOGO OFFICIEL

### Ce qui doit être créé

Pour utiliser le logo officiel `Logo ARC.jpeg` :

1. **Copier l'image** dans `public/images/logo-arc.jpeg`
2. **Créer des variantes** :
   - `public/images/logo-arc.jpeg` → logo complet (SEO, OG, pages auth)
   - `public/images/logo-arc-icon.jpeg` → monogramme seul (favicon, header compact)
3. **Créer les favicons** : icône 32×32, 180×180 (Apple), 192×192, 512×512 (PWA)
4. **Créer l'image OG** : 1200×630px avec logo + nom sur fond navy ou cream

### Priorités de remplacement

| Priorité | Emplacement | Action |
|---|---|---|
| 1 — Critique | SEO / Open Graph | Créer `og-image.png` 1200×630 |
| 2 — Critique | Header | Utiliser `next/image` avec le monogramme ARC |
| 3 — Majeur | Pages auth (connexion, inscription, etc.) | Remplacer CSS box par image |
| 4 — Majeur | PWA manifest | Ajouter icônes 192 et 512px |
| 5 — Modéré | Favicon | Remplacer par version ARC |
| 6 — Modéré | Footer | Harmoniser avec header |
| 7 — Mineur | Espace membres sidebar | Harmoniser |

---

## 5. RÉCAPITULATIF DES PROBLÈMES

| # | Sévérité | Problème |
|---|---|---|
| 1 | CRITIQUE | Logo officiel JPEG jamais copié dans le projet |
| 2 | CRITIQUE | Open Graph sans image → mauvais partage réseaux sociaux |
| 3 | CRITIQUE | Nom tronqué dans 3 composants (Header, Connexion, Inscription) |
| 4 | MAJEUR | 4 variantes visuelles incohérentes du logo CSS |
| 5 | MAJEUR | PWA manifest incomplet (1 seule icône favicon) |
| 6 | MAJEUR | `browserconfig.xml` référencé mais absent |
| 7 | MODÉRÉ | Favicon probablement générique Next.js |
| 8 | MODÉRÉ | `apple-touch-icon` absent |
| 9 | MINEUR | `robots.txt` absent |
| 10 | MINEUR | `sitemap.xml` absent |
