# RESPONSIVE_ACCESSIBILITY_AUDIT.md — ARC Église
> Audit responsive (breakpoints, grilles) + accessibilité (aria, alt, contrastes, clavier)
> Audit du 2026-06-23

---

## PARTIE 1 — RESPONSIVE

### 1.1 Breakpoints utilisés dans le projet

| Valeur | Unité | Source | Composants |
|--------|-------|--------|-----------|
| `480px` | max-width | `<style>` JSX | TeamSection (cards 1 col), globals.css espace membres |
| `540px` | max-width | `<style>` JSX | FeaturesStrip (1 col), SermonsClient (1 col) |
| `560px` | max-width | `<style>` JSX | SermonsClient (grid 1 col) |
| `820px` | max-width | `<style>` JSX | EventsSection, DonSection, CopilotAssistant, ContactSection (`.arc-two` → 1 col), globals.css espace membres |
| `900px` | max-width | `<style>` JSX | FeaturesStrip (2 cols), AboutSection, SermonsClient, TeamSection, Footer |
| `1024px` | max-width | `<style>` JSX | HeroSection (`arc-hero-grid` → 1 col) |
| `1100px` | max-width | globals.css | Thread panel messagerie |
| `1200px` | max-width | globals.css | Panneau droit espace membres |
| `md:` (768px) | Tailwind | Header nav, pages auth | Header nav, inscriptionPage |
| `lg:` (1024px) | Tailwind | Header, HeroSection, auth pages | `hidden lg:block` |
| `sm:` (640px) | Tailwind | ProfilPage | grid-cols |

**Observation :** Il y a un mélange de 3 systèmes de breakpoints :
1. Tailwind (`sm:`, `md:`, `lg:`) dans certains composants
2. `<style>` JSX inline avec `@media (max-width: Xpx)` dans d'autres
3. CSS globaux dans `globals.css`

Cela rend la maintenance difficile et crée des incohérences (820px vs 768px pour le mobile).

---

### 1.2 Grilles responsives custom

#### `.arc-hero-grid` (HeroSection)
```
Desktop (>1024px) : grid-template-columns: 1.05fr .95fr
Mobile (<1024px)  : grid-template-columns: 1fr (1 colonne)
                   padding: 48px 20px 64px
```
✅ Correct — bascule bien en 1 colonne

#### `.arc-two` (AboutSection, EventsSection, DonSection, CopilotAssistant, ContactSection)
**Défini 8× dans des balises `<style>` différentes :**
```
Desktop : grid défini inline (ratios variables par composant)
Mobile (<820px) : grid-template-columns: 1fr !important
```
✅ Fonctionne — MAIS dupliqué inutilement

| Composant | Ratio desktop |
|-----------|--------------|
| AboutSection | `.9fr 1.1fr` |
| EventsSection | `1.15fr .85fr` |
| DonSection | `1fr .92fr` |
| CopilotAssistant | `.85fr 1.15fr` |
| ContactSection | `.9fr 1.1fr` |

#### `.arc-cards4` (FeaturesStrip, TeamSection)
```
Desktop (>900px) : repeat(4, 1fr)
Tablet (≤900px)  : repeat(2, 1fr)
Mobile (≤480px)  : repeat(1, 1fr) [TeamSection]
Mobile (≤540px)  : 1fr [FeaturesStrip]
```
✅ Responsive correctement géré

#### `.arc-sermon-grid` (SermonsClient)
```
Desktop (>900px) : 1.4fr 1fr 1fr (3 cols)
Tablet (≤900px)  : 1fr 1fr (2 cols) — featured en full width (grid-column: 1 / -1)
Mobile (≤560px)  : 1fr (1 col)
```
✅ Responsive correct

#### `.arc-footer-grid` (Footer)
```
Desktop : 1.4fr 1fr 1fr 1.2fr (4 cols)
Tablet (≤900px)  : 1fr 1fr (2 cols)
Mobile (≤540px)  : 1fr (1 col)
```
✅ Responsive correct

---

### 1.3 Éléments `hidden lg:block` / `hidden md:block`

| Élément | Classe | Impact mobile |
|---------|--------|--------------|
| Colonne droite HeroSection (media stack + floating cards) | `hidden lg:block` | **Totalement invisible mobile** (< 1024px) |
| Scroll indicator HeroSection | `hidden lg:flex` | Invisible mobile |
| Desktop nav | `hidden md:flex` | Remplacé par hamburger |
| Desktop CTAs (Se connecter, Rejoindre) | `hidden md:flex` | Remplacés par menu mobile |
| Panneau gauche inscription/connexion (brand panel) | `hidden lg:flex` | Invisible mobile — UX correcte |
| `mob-only` espace membres | `display: none !important` → `flex` ≤820px | Inversé — visible seulement mobile |

**Impact majeur :** Sur mobile/tablette, toute la colonne droite de la HeroSection disparaît. Les floating cards "Sermon du jour" et "Prochain événement" ne sont jamais vues sur ~70% du trafic. La section hero devient texte-only sur mobile.

---

### 1.4 Espace Membres — Responsive

| Breakpoint | Comportement |
|-----------|-------------|
| `<1200px` | Panneau droit (`.em-rp` 264px) masqué |
| `<820px` | Sidebar (`.em-sb` 220px) masquée, header masqué |
| `<820px` | Header mobile (`.em-mob-hdr`) + bottom nav (`.em-mob-nav`) affichés |
| `<820px` | Chat grille → 1 col, channels masquées |
| `<480px` | Grid 4 → 2 cols → 1 col, tabs overflow scroll |

✅ L'espace membres a une vraie stratégie mobile avec drawer et bottom nav.

---

## PARTIE 2 — ACCESSIBILITÉ

### 2.1 Attributs ARIA

| Composant | Attribut | Valeur | Correct ? |
|-----------|---------|--------|---------|
| `AnnouncementBar` | `aria-hidden` | `"true"` | ❌ Masque l'information aux SR |
| Header logo button | `aria-label` | `"ARC — Accueil"` | ✅ |
| Header hamburger | `aria-label` | `menuOpen ? "Fermer" : "Menu"` | ✅ Dynamique |
| Header socials (Footer) | `aria-label` | `s.label` | ✅ |
| ContactSection socials | `aria-label` | `s.label` | ✅ |
| YouTube thumbnail links | `aria-label` | ❌ Absent | ⚠️ Liens sans label textuel visible |
| TeamSection cards | `aria-label` | ❌ Absent | ⚠️ Cards cliquables sans rôle |
| DonSection buttons | `aria-label` | ❌ Absent | Boutons montants sans contexte SR |
| CopilotAssistant chat | `aria-live` | ❌ Absent | Le streaming n'est pas annoncé aux SR |
| ContactSection form | `aria-describedby` | ❌ Absent | Erreurs non liées aux champs |

---

### 2.2 Labels sur les inputs

| Formulaire | Input | `<label>` | `htmlFor` / `id` linkage | Correct ? |
|-----------|-------|-----------|--------------------------|---------|
| ContactSection | Prénom | ✅ | ❌ `label` sans `htmlFor`, input sans `id` | ⚠️ |
| ContactSection | Nom | ✅ | ❌ | ⚠️ |
| ContactSection | Email | ✅ | ❌ | ⚠️ |
| ContactSection | Sujet | ✅ | ❌ | ⚠️ |
| ContactSection | Message | ✅ | ❌ | ⚠️ |
| DonSection | Custom montant | ❌ | ❌ | ❌ |
| DonSection | Email reçu | ❌ | ❌ | ❌ |
| Inscription | Prénom | ✅ | ❌ pas de htmlFor/id | ⚠️ |
| Inscription | Nom | ✅ | ❌ | ⚠️ |
| Inscription | Email | ✅ | ❌ | ⚠️ |
| Inscription | MDP | ✅ | ❌ | ⚠️ |
| Connexion | Email | ✅ | ❌ `label` sans `htmlFor` | ⚠️ |
| Connexion | MDP | ✅ | ❌ | ⚠️ |
| Prière | Titre | ✅ | ❌ | ⚠️ |
| Prière | CGU (inscription) | ✅ | ✅ `htmlFor="cgu"` | ✅ |

**Problème systématique :** Aucun des `<label>` du site vitrine n'est lié à son input via `htmlFor`/`id`. Les labels sont visuels mais pas fonctionnels pour les lecteurs d'écran. Un clic sur le label ne focuse pas l'input.

---

### 2.3 Navigation clavier

| Zone | Tab order | Focus visible | Skip link | Correct ? |
|------|-----------|--------------|-----------|---------|
| Header nav | ✅ buttons tabulables | ⚠️ style par défaut seulement | ❌ absent | ⚠️ |
| HeroSection CTAs | ✅ buttons/links | ⚠️ style par défaut | N/A | ⚠️ |
| ContactSection form | ✅ | ⚠️ style `outline: none` | N/A | ❌ |
| DonSection | ✅ | ⚠️ `outline: none` sur input | N/A | ❌ |
| Connexion form | ✅ | ⚠️ `outline: none` | N/A | ❌ |

**Problème critique :** Les inputs définissent `outline: none` sans remplaçant visible :
- ContactSection : `style={{ outline: "none" }}`
- DonSection : `style={{ outline: "none" }}`
- Connexion : `className="... outline-none"` (Tailwind)
- Inscription : `className="... outline-none"`
- Profil : `className="... outline-none"`

Sans `outline` et sans `:focus-visible` custom, les utilisateurs naviguant au clavier ne savent pas quel élément est focusé.

---

### 2.4 Contrastes de couleurs

#### Combinaisons critiques

| Texte | Fond | Ratio estimé | WCAG AA (4.5:1) |
|-------|------|-------------|----------------|
| `#C9A227` (or) sur `#FAF7F0` (crème) | Or sur crème | ~3.2:1 | ❌ ÉCHOUE (texte normal) |
| `#C9A227` (or) sur `#fff` (blanc) | Or sur blanc | ~3.2:1 | ❌ ÉCHOUE |
| `#C9A227` (or) sur `#141738` (navy) | Or sur navy profond | ~7.5:1 | ✅ Passe |
| `#6b6f86` (muted) sur `#FAF7F0` | Gris sur crème | ~4.6:1 | ✅ Marginal |
| `#1e2464` (navy) sur `#FAF7F0` | Navy sur crème | ~10:1 | ✅ |
| `#fff` sur `#1e2464` | Blanc sur navy | ~10:1 | ✅ |
| `rgba(255,255,255,.6)` sur `#141738` | Blanc 60% sur navy | ~3.8:1 | ❌ ÉCHOUE (corps texte) |
| `#141738` (navy) sur `#C9A227` (or) | Navy sur or | ~7.5:1 | ✅ |
| `rgba(255,255,255,.7)` sur `#1e2464` | Blanc 70% sur navy | ~5.2:1 | ✅ Marginal |

**Problèmes contrastes identifiés :**
1. **Or `#C9A227` sur fond clair** (crème ou blanc) — utilisé pour les labels de section, CTA arrows ("Voir les sermons →"), tags — ÉCHOUE WCAG AA pour le texte normal
2. **Texte `rgba(255,255,255,.6)` sur fond navy** — utilisé dans SermonsSection, Footer descriptions — ÉCHOUE
3. Les `<button>` filtres sermons inactifs : `color: rgba(255,255,255,.8)` sur fond `rgba(255,255,255,.05)` — contraste insuffisant

---

### 2.5 Images et médias

| Élément | Alt | Descriptif ? | Notes |
|---------|-----|-------------|-------|
| YouTube thumbnails (featured) | `alt={featured.title}` | ✅ | Dynamique et descriptif |
| YouTube thumbnails (secondary) | `alt={s.title}` | ✅ | |
| Avatar membres (TeamSection) | `alt={m.name}` | ✅ | |
| Placeholders (dark cards) | Aucune image — div | N/A | Pas d'alt à gérer |
| Emojis (décoratifs) | N/A | ⚠️ Lus par SR | Ex: "📍", "✉️", "🕐" dans ContactSection |

**Note :** Les emojis utilisés comme icônes décoratifs (`📍`, `✉️`, `📱`, etc.) seront lus par les lecteurs d'écran avec leur nom (ex: "location pin", "envelope"). Certains comme "🔵" (bouton Google) sont mal descriptifs. Devrait utiliser `role="img" aria-label=""` ou `aria-hidden="true"`.

---

### 2.6 Rôles et sémantique manquants

| Element | Problème | Impact |
|---------|---------|--------|
| TeamSection cards (div clickable) | Pas de `role="button"` ni `tabIndex` ni `onClick` | Non tabulable, non cliquable au clavier |
| UserMenu dropdown (Header) | Pas de `role="menu"` / `role="menuitem"` | Structure menu non reconnue par SR |
| Filtre sermons (buttons) | ✅ Correct | Boutons standards |
| CopilotAssistant chat zone | Pas de `aria-live="polite"` | Les nouveaux messages non annoncés |
| AnnouncementBar | `aria-hidden="true"` | Info culte inaccessible |

---

### 2.7 `maximumScale: 1` — Problème d'accessibilité

**Fichier :** `src/app/layout.tsx` — ligne 53

```typescript
maximumScale: 1,
```

Cette configuration empêche le zoom manuel sur mobile, ce qui est une violation des WCAG 1.4.4 (Resize text). Les utilisateurs malvoyants ne peuvent pas agrandir le texte.

---

## Résumé Accessibilité / Responsive

| Catégorie | Score | Principaux problèmes |
|-----------|-------|---------------------|
| Responsive breakpoints | 7/10 | Mélange Tailwind + media inline, 820px vs 768px |
| Grilles responsive | 8/10 | Fonctionnelles mais `.arc-two` dupliqué 8× |
| Mobile hidden content | 6/10 | Floating cards Hero invisibles mobile |
| Labels/inputs | 4/10 | `htmlFor`/`id` manquants partout |
| ARIA | 4/10 | AnnouncementBar hidden, chat sans aria-live |
| Contrastes | 5/10 | Or sur crème échoue WCAG AA |
| Navigation clavier | 3/10 | `outline: none` partout sans remplaçant |
| Alt images | 9/10 | Bien géré pour les images dynamiques |
| `maximumScale: 1` | ❌ | Violation WCAG 1.4.4 |
