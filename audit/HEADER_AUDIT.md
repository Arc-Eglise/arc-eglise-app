# HEADER_AUDIT.md — Audit complet du Header ARC Église

Date : 2026-06-23  
Composant : `src/components/layout/Header.tsx`

---

## 1. CAUSE EXACTE DU TEXTE TRONQUÉ

### Verdict : omission de contenu — PAS un problème CSS

La cause est directe et sans ambiguïté.

**Ligne 78 du fichier `Header.tsx` :**
```tsx
<span className="font-serif font-semibold text-arc-navy" style={{ fontSize: 21, letterSpacing: ".01em", whiteSpace: "nowrap" }}>
  Ambassade du Royaume
</span>
```

Le texte `"de Christ"` a été **omis lors de l'écriture du composant** pendant la refonte.
Ce n'est pas une troncature CSS (overflow, text-overflow, max-width) — les mots `"de Christ"` n'ont tout simplement jamais été écrits dans le code source.

**Le nom complet correct est :**
```
Ambassade du Royaume de Christ
```

---

## 2. ANALYSE STRUCTURELLE DU LAYOUT

### 2.1 Structure du `<nav>`

```tsx
<nav className="max-w-8xl mx-auto px-5 md:px-8 h-[74px] flex items-center justify-between gap-6">
```

- `max-w-8xl` = **1240px** (défini dans `tailwind.config.ts` ligne 44)
- `flex items-center justify-between` — 3 enfants directs
- `gap-6` = 24px entre chaque enfant
- `h-[74px]` — hauteur fixe

### 2.2 Les 3 blocs flex du header

| Bloc | Classes | Comportement flex |
|---|---|---|
| Logo button (gauche) | `flex-shrink-0` | Ne rétrécit jamais |
| Nav desktop (centre) | `flex-1` | S'étire / compresse |
| CTAs droite | `flex-shrink-0` | Ne rétrécit jamais |

### 2.3 Calcul des largeurs à chaque breakpoint

#### Desktop plein (≥ 1240px)
| Élément | Largeur estimée |
|---|---|
| Box "ARC" | 44px |
| Gap interne logo | 12px |
| "Ambassade du Royaume de Christ" à 21px Cormorant | ~305px |
| **Total logo** | **~361px** |
| CTAs non-connecté ("18 en ligne" + "Se connecter" + "Rejoindre") | ~210px |
| Gaps justify-between × 2 | 48px |
| **Disponible pour la nav** | **~621px** |
| **Verdict** | ✅ Très à l'aise |

#### Tablette entrée breakpoint md (768px)
| Élément | Largeur estimée |
|---|---|
| Logo complet à 21px | ~361px |
| CTAs non-connecté | ~210px |
| Padding total (px-8 × 2) | 64px |
| Gaps × 2 | 48px |
| **Disponible pour 7 liens nav** | **95px** |
| **Verdict** | ❌ CRITIQUE — les liens nav s'écrasent |

#### Tablette avec texte raccourci actuel (768px, "Ambassade du Royaume")
| Élément | Largeur estimée |
|---|---|
| Logo à 21px (texte court) | ~296px |
| CTAs + padding + gaps | 322px |
| **Disponible pour la nav** | **150px** |
| **Verdict** | ⚠️ Très serré mais partiellement fonctionnel |

### 2.4 Propriétés CSS sur le texte logo

```tsx
style={{ fontSize: 21, letterSpacing: ".01em", whiteSpace: "nowrap" }}
```

- `whiteSpace: "nowrap"` → le texte ne wraps pas → la largeur est fixe
- `font-serif` → Cormorant Garamond (police élégante, relativement étroite)
- `fontSize: 21` → trop grand pour un header partagé avec 7 liens de navigation
- Pas de `overflow: hidden` ni `text-overflow` → le texte ne sera PAS tronqué visuellement, mais le layout sera compressé

### 2.5 Comportement réel observé

Le texte n'est pas tronqué par CSS. Il est absent du code. Une fois "de Christ" ajouté :
- ✅ Desktop (≥ 1024px) : aucun problème
- ⚠️ Tablette md (768-1023px) : risque de compression de la nav
- ✅ Mobile (< 768px) : hamburger, nav desktop masquée — aucun impact

---

## 3. ANALYSE DE CONSISTANCE

### Occurrences de "Ambassade du Royaume" sans "de Christ" dans le projet

| Fichier | Ligne | Valeur actuelle | Attendu |
|---|---|---|---|
| `Header.tsx` | 78 | `Ambassade du Royaume` | `Ambassade du Royaume de Christ` |
| `connexion/page.tsx` | 77 | `Ambassade du Royaume` | `Ambassade du Royaume de Christ` |
| `inscription/page.tsx` | ~97 | `Ambassade du Royaume` | `Ambassade du Royaume de Christ` |

La régression touche **3 fichiers**, pas seulement le Header.

### Occurrences correctes (pour référence)
- `layout.tsx` — metadata title et OG : ✅ complet
- `Footer.tsx` — texte brand + copyright : ✅ complet
- `AboutSection.tsx` — texte de contenu : ✅ complet

---

## 4. POINTS FORTS DU HEADER ACTUEL

- Scroll detection (`scrolled`) → shadow au scroll ✅
- Backdrop blur cream ✅
- `flex-shrink-0` sur logo et CTAs — bon comportement ✅
- Close userMenu sur click extérieur ✅
- Mobile menu avec animation hamburger ✅
- Smooth scroll via `scrollIntoView` ✅
- Badge de rôle (admin / pasteur / membre / visiteur) ✅
- Sticky position ✅

---

## 5. PROBLÈMES IDENTIFIÉS

| # | Sévérité | Problème |
|---|---|---|
| 1 | CRITIQUE | "de Christ" absent du Header (ligne 78) |
| 2 | CRITIQUE | "de Christ" absent de connexion/page.tsx (ligne 77) |
| 3 | CRITIQUE | "de Christ" absent de inscription/page.tsx (~ligne 97) |
| 4 | MAJEUR | fontSize 21px trop grand → layout serré à 768-900px |
| 5 | MODÉRÉ | Aucune image logo — uniquement du texte CSS |
| 6 | MINEUR | `max-w-8xl` non défini dans le CSS standard — bien défini dans tailwind.config.ts ✅ |
