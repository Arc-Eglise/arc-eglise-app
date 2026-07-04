# HEADER_FIX_PROPOSAL.md — Propositions de correction

Date : 2026-06-23  
Attendre validation avant toute modification du code.

---

## 1. CORRECTION PRINCIPALE : Nom complet "Ambassade du Royaume de Christ"

### 1.1 Corrections texte (3 fichiers)

**Fichier 1 : `src/components/layout/Header.tsx` ligne 78**
```tsx
// AVANT
Ambassade du Royaume

// APRÈS
Ambassade du Royaume de Christ
```

**Fichier 2 : `src/app/connexion/page.tsx` ligne 77**
```tsx
// AVANT
<div className="text-[8px] text-arc-bluePale tracking-[1.5px] uppercase">Ambassade du Royaume</div>

// APRÈS
<div className="text-[8px] text-arc-bluePale tracking-[1.5px] uppercase">Ambassade du Royaume de Christ</div>
```

**Fichier 3 : `src/app/inscription/page.tsx` ligne ~97**
```tsx
// AVANT
<div className="text-[8px] text-arc-bluePale tracking-[1.5px] uppercase">Ambassade du Royaume</div>

// APRÈS
<div className="text-[8px] text-arc-bluePale tracking-[1.5px] uppercase">Ambassade du Royaume de Christ</div>
```

---

## 2. CORRECTION LAYOUT : Ajustement fontSize pour compatibilité tablette

### Problème

À 21px avec `whiteSpace: "nowrap"`, "Ambassade du Royaume de Christ" en Cormorant Garamond occupe ~305px. À 768px (breakpoint `md`), il reste ~85px pour 7 liens de nav → insuffisant.

### Option A — Réduire la taille de police (recommandée)

Passer de 21px à **17px**. "Ambassade du Royaume de Christ" en Cormorant à 17px ≈ 248px.

```tsx
// AVANT
<span className="font-serif font-semibold text-arc-navy" 
  style={{ fontSize: 21, letterSpacing: ".01em", whiteSpace: "nowrap" }}>
  Ambassade du Royaume de Christ
</span>
<span style={{ fontSize: 10.5, letterSpacing: ".28em", textTransform: "uppercase", color: "#6b6f86" }}>
  La Chaux-de-Fonds
</span>

// APRÈS (option A)
<span className="font-serif font-semibold text-arc-navy" 
  style={{ fontSize: 17, letterSpacing: ".01em", whiteSpace: "nowrap" }}>
  Ambassade du Royaume de Christ
</span>
<span style={{ fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase", color: "#6b6f86" }}>
  La Chaux-de-Fonds
</span>
```

**Avantages :**
- Nom complet visible à tous les breakpoints
- Équilibre avec les liens de nav
- Police Cormorant Garamond reste très lisible à 17px (c'est une police display)
- Cohérent avec le style Footer qui utilise 19px

**Calcul tablette avec 17px :**
```
Logo à 17px : 44 + 12 + 248 = 304px
CTAs : ~210px
Gaps : 48px
Disponible pour nav à 768px : 704 - 304 - 210 - 48 = 142px → acceptable
```

### Option B — Masquer le texte en dessous de lg (1024px)

Conserver 21px mais masquer la ligne texte sur tablette :

```tsx
<span className="hidden lg:block font-serif font-semibold text-arc-navy" 
  style={{ fontSize: 21, letterSpacing: ".01em", whiteSpace: "nowrap" }}>
  Ambassade du Royaume de Christ
</span>
```

**Inconvénients :** Le nom disparaît sur tablette → contraire à l'objectif.

### Option C — Texte sur deux lignes, taille réduite (élégant)

```tsx
<span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
  <span className="font-serif font-semibold text-arc-navy" 
    style={{ fontSize: 16, letterSpacing: ".01em", whiteSpace: "nowrap" }}>
    Ambassade du Royaume de Christ
  </span>
  <span style={{ fontSize: 9.5, letterSpacing: ".26em", textTransform: "uppercase", color: "#6b6f86" }}>
    Église Évangélique · La Chaux-de-Fonds
  </span>
</span>
```

**Avantages :** Plus fidèle au logo officiel (deux lignes de texte sous le monogramme).

---

## 3. HARMONISATION DU LOGO OFFICIEL

### 3.1 Étapes de mise en œuvre

**Étape 1 — Préparer les assets**

Copier `C:\Users\Joe\Desktop\Projet ARC\Site Web\Logo\Logo ARC.jpeg` vers :
- `public/images/logo-arc.jpeg` — logo complet
- Créer `public/images/logo-arc-icon.jpeg` — monogramme seul (crop du JPEG)

**Étape 2 — Open Graph (priorité SEO maximale)**

Créer `src/app/opengraph-image.tsx` (Next.js 14 App Router génère l'image automatiquement) :
```tsx
import { ImageResponse } from "next/og";
export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export default function OGImage() {
  return new ImageResponse(
    <div style={{ background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", flexDirection: "column", gap: 24 }}>
      <div style={{ fontSize: 120, fontWeight: 700, color: "#1e2464" }}>ARC</div>
      <div style={{ fontSize: 36, color: "#1e2464" }}>Ambassade du Royaume de Christ</div>
      <div style={{ fontSize: 22, color: "#6b6f86" }}>Église Évangélique · La Chaux-de-Fonds, Suisse</div>
    </div>
  );
}
```

**Étape 3 — Header avec image**

Utiliser `next/image` pour le monogramme ARC dans le header :
```tsx
import Image from "next/image";

// Dans le bouton logo
<Image 
  src="/images/logo-arc-icon.jpeg" 
  alt="ARC — Ambassade du Royaume de Christ"
  width={44} height={44}
  style={{ borderRadius: 12, objectFit: "cover" }}
/>
```

**Note :** Le logo officiel est vertical (ARC letters + texte). Pour le header 74px, utiliser uniquement le monogramme. Garder le texte "Ambassade du Royaume de Christ" en CSS à côté.

**Étape 4 — Pages auth (connexion, inscription, etc.)**

Même approche : image monogramme + texte CSS.

**Étape 5 — PWA manifest**

Ajouter des icônes correctes dans `manifest.ts` :
```ts
icons: [
  { src: "/images/logo-arc-192.png", sizes: "192x192", type: "image/png" },
  { src: "/images/logo-arc-512.png", sizes: "512x512", type: "image/png" },
  { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
],
```

---

## 4. RÉCAPITULATIF DES ACTIONS À VALIDER

### Phase 1 — Corrections texte immédiates (5 min)
- [ ] `Header.tsx` L.78 : ajouter "de Christ"
- [ ] `connexion/page.tsx` L.77 : ajouter "de Christ"
- [ ] `inscription/page.tsx` L.~97 : ajouter "de Christ"
- [ ] Choisir entre Option A (17px), B (masqué mobile), C (2 lignes) pour la taille

### Phase 2 — Harmonisation logo (1-2h)
- [ ] Copier `Logo ARC.jpeg` dans `public/images/`
- [ ] Créer `opengraph-image.tsx` (OG image automatique Next.js)
- [ ] Remplacer box CSS dans Header par `next/image`
- [ ] Remplacer box CSS dans pages auth par `next/image`
- [ ] Compléter PWA manifest

### Phase 3 — Assets complémentaires (2-4h)
- [ ] Créer `robots.txt` dans `public/`
- [ ] Créer `sitemap.xml` ou route `/sitemap.ts`
- [ ] Créer `browserconfig.xml` (référencé dans metadata)
- [ ] Remplacer favicon.ico par version ARC

---

## 5. RECOMMANDATION FINALE

**Approche recommandée : Option A (17px) + image pour la Phase 2**

Raisons :
1. Correction texte simple et immédiate (3 fichiers, 3 lignes)
2. Réduction de 21px → 17px résout le problème tablette sans sacrifier la visibilité
3. 17px reste grand et lisible pour Cormorant Garamond (police display)
4. Cohérent avec le 19px du Footer
5. Le logo image peut être intégré en Phase 2 sans bloquer la correction urgente
