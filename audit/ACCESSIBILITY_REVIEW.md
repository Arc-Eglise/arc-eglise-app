# Revue d'accessibilité — Préférences de Lecture
**ARC Église · Espace Membres**  
Date : 2026-06-24  
Statut : Rapport préalable à l'implémentation

---

## 1. État d'accessibilité actuel de l'espace membres

### 1.1 Ce qui fonctionne déjà

| Aspect | État | Détail |
|---|---|---|
| Focus-visible | ✅ Implémenté | `*:focus-visible { outline: 2px solid var(--gold) !important }` dans globals.css |
| Contraste couleurs principales | ✅ Conforme WCAG AA | Navy `#1e2464` sur crème `#FAF7F0` → ratio ~11:1 |
| Structure sémantique | ✅ Partielle | `<h1>` présents sur toutes les pages, labels sur les formulaires |
| Texte alternatif images | ✅ Partiel | `alt` présents sur les images `next/image`, pas de décoratifs |
| Navigation clavier | ⚠️ Partielle | Les éléments interactifs sont focusables, mais l'ordre n'est pas audité |

### 1.2 Problèmes identifiés AVANT le système de préférences

| Problème | Composant | Criticité | WCAG |
|---|---|---|---|
| Font-size `10px` sur labels | `.em-stat-lbl`, `.em-rp-title` | Élevée | 1.4.4 |
| Font-size `9px` sur `.em-ch-sec` | Chat sidebar | Élevée | 1.4.4 |
| `line-height: 1` sur `.em-stat-num` | Stats | Faible | 1.4.12 |
| Couleur `#8890aa` sur fond blanc | Sous-titres `.em-sect-sub` | Modérée | 1.4.3 (ratio ~3.5:1 insuffisant) |
| Messages IA `text-sm` (14px) | AI Chat | Modérée | 1.4.4 |
| Contenu dangerouslySetInnerHTML Bible | BibleReader | Info | Pas de rôle ARIA sur le contenu injecté |
| Pas de `lang` sur les citations | Contenu biblique en hébreu/grec | Faible | 3.1.2 |

---

## 2. Analyse des fonctionnalités de préférences sous l'angle accessibilité

### 2.1 Taille du texte

**WCAG 1.4.4 — Redimensionnement du texte (Niveau AA)**
> Le texte peut être redimensionné jusqu'à 200% sans perte de contenu ou de fonctionnalité, sans assistance technologique.

**Analyse** :
- Les navigateurs modernes permettent le zoom global (Ctrl+molette, Ctrl+) — notre système de préférences est **complémentaire**, pas un remplacement
- Le curseur de taille personnalisée (11–32px) couvre la plage standard (jusqu'à ~200% de la base 16px)
- La plage `custom` autorise jusqu'à 32px = 200% de 16px — conforme WCAG 1.4.4
- Les fonts relatives (`em`, `rem`) doivent être préservées pour les éléments UI (boutons, nav) — seules les zones de lecture sont affectées

**Recommandation** :
- N'appliquer les préférences de taille QUE aux zones `.em-reading-zone` — ne jamais modifier la taille des boutons, labels de navigation, ou éléments interactifs
- Conserver la compatibilité avec le zoom navigateur (utiliser `px` dans les custom properties, pas `vw`)

### 2.2 Espacement des lignes

**WCAG 1.4.12 — Espacement du texte (Niveau AA)**
> Aucune perte de contenu si les espacements suivants sont appliqués :
> - Hauteur de ligne : 1.5× la taille de la police
> - Espacement entre paragraphes : 2× la taille de la police
> - Espacement entre lettres : 0.12× la taille de la police
> - Espacement entre mots : 0.16× la taille de la police

**Analyse** :
- Notre valeur minimale `tight: 1.4` est EN DESSOUS du seuil WCAG (1.5)
- Il faut s'assurer qu'aucune valeur ne cause de perte de contenu (texte tronqué, overflow caché)

**Recommandation** :
- Renommer `tight` en `compact` et le définir à `1.5` (seuil WCAG exact)
- Ne pas proposer de valeur inférieure à 1.5 dans l'interface utilisateur
- Tester l'overflow visible sur toutes les zones de contenu dynamique

### 2.3 Mode contraste renforcé

**WCAG 1.4.3 — Contraste (Niveau AA)** : ratio minimum 4.5:1 pour texte normal, 3:1 pour grand texte  
**WCAG 1.4.6 — Contraste renforcé (Niveau AAA)** : ratio minimum 7:1

**Analyse du mode high_contrast proposé** :
- `color: #000 / background: #fff` → ratio 21:1 ✅ Niveau AAA
- Override via `!important` sur toutes les couleurs → peut casser des éléments UI non-lecture

**Recommandation** :
- Limiter le mode contraste renforcé aux seules zones `.em-reading-zone`, jamais à toute l'app
- Prévoir une variante "contraste renforcé navy" (#000066 / #fff) plus douce que noir pur

### 2.4 Mode malvoyant (`low_vision`)

**Analyse** :
- `letter-spacing: 0.02em` et `word-spacing: 0.05em` sont des ajustements conformes WCAG 1.4.12
- Soulignement systématique des liens (`text-decoration: underline`) est requis par WCAG 1.4.1 (couleur seule insuffisante)

**Recommandation** :
- Ajouter en mode malvoyant : `font-weight` légèrement augmenté sur le body (400→500)
- Ne pas dépasser `letter-spacing: 0.12em` (seuil lisibilité Manrope)

### 2.5 Support des zooms système

**Analyse** :
- Le zoom navigateur (`Ctrl+/−`) fonctionne indépendamment de notre système
- Sur Windows, le zoom d'affichage (100%→125%→150%) est géré par le navigateur
- Sur iOS/Android, le pinch-to-zoom doit rester actif — notre `viewport` actuel a `maximumScale: 1` ce qui **désactive** le pinch-to-zoom

**PROBLÈME CRITIQUE IDENTIFIÉ** :
```typescript
// src/app/layout.tsx — ligne 58
export const viewport: Viewport = {
  maximumScale: 1,  // ← BLOQUE le zoom sur iOS Safari
}
```
`maximumScale: 1` empêche les utilisateurs malvoyants de zoomer sur mobile.  
**WCAG 1.4.4 — Niveau AA** : le zoom doit rester possible.

**Recommandation** : Supprimer `maximumScale: 1` du viewport metadata dans `layout.tsx`.

### 2.6 Support des lecteurs d'écran

**Analyse** :
- Notre approche CSS custom properties **n'affecte pas le DOM** — les lecteurs d'écran (NVDA, VoiceOver, TalkBack) lisent la structure sémantique, pas le CSS
- La police OpenDyslexic peut interférer avec certains lecteurs d'écran sur Android — à tester
- Le contenu `dangerouslySetInnerHTML` de la Bible (HTML de l'API scripture.api.bible) contient des éléments `<span class="v">` sans rôle ARIA

**Recommandation** :
- Ajouter `role="note"` et `aria-label="verset N"` sur les numéros de versets injectés
- Ajouter `aria-live="polite"` sur les zones de streaming AI pour annoncer les nouvelles réponses
- Vérifier que le panneau ReadingPrefsPanel a `role="dialog"` et `aria-labelledby` corrects

### 2.7 Compatibilité mobile

**Analyse** :
- Les CSS custom properties sont supportées par tous les navigateurs modernes (iOS Safari 10+, Chrome 49+, Firefox 31+)
- `dangerouslySetInnerHTML` avec du contenu HTML biblique peut poser des problèmes de focus sur mobile
- Le panneau de préférences drawer doit être accessible au doigt (touch target minimum 44×44px)

**WCAG 2.5.5 — Taille de la cible (Niveau AAA)** : 44×44px minimum recommandé

**Recommandation** :
- Tous les boutons du panneau de préférences : minimum `h-11` (44px)
- Bouton [A−] / [A+] dans le header : minimum `w-10 h-10` (40px) ou `w-11 h-11` (44px)
- Le drawer de préférences doit pouvoir se fermer en swipant vers le bas (mobile)

---

## 3. Checklist accessibilité par fonctionnalité

### 3.1 Taille du texte
- [ ] Plage 11–32px (seuil min acceptable : 11px = très petite, jamais en dessous)
- [ ] Valeur par défaut 16px = base navigateur standard
- [ ] Libellés verbaux sur le curseur (`aria-label="Taille du texte, 16 pixels"`)
- [ ] Le changement doit annoncer la nouvelle valeur aux lecteurs d'écran (`aria-live="polite"`)

### 3.2 Espacement
- [ ] Line-height minimum : 1.5 (jamais inférieur pour conformité WCAG 1.4.12)
- [ ] L'overflow hidden doit être évité sur les zones de lecture

### 3.3 Largeur de lecture
- [ ] Pas d'impact sur l'accessibilité fondamentale
- [ ] Vérifier qu'en mode "narrow" (520px), le contenu reste lisible sur mobile (max-width doit avoir un min())

### 3.4 Police
- [ ] Éviter les polices à contraste réduit (polices décoratives)
- [ ] OpenDyslexic : tester avec VoiceOver iOS et NVDA Windows
- [ ] Cormorant Garamond (sérif italic) : vérifier lisibilité pour dyslexie en mode confortable

### 3.5 Contraste renforcé
- [ ] Ratio de contraste texte ≥ 7:1 en mode AAA
- [ ] Ne pas affecter les icônes et éléments décoratifs
- [ ] Compatible avec Windows High Contrast Mode (forcer `forced-colors: active` en test)

### 3.6 Mode malvoyant
- [ ] `font-weight: 500` minimum
- [ ] Liens soulignés systématiquement
- [ ] Indicateurs d'état (couleur seule insuffisante → icône ajoutée)

---

## 4. Problèmes à corriger indépendamment du système de préférences

Ces problèmes existent actuellement et doivent être corrigés dans une phase dédiée :

| Priorité | Problème | Fichier | Fix |
|---|---|---|---|
| 🔴 Critique | `maximumScale: 1` bloque le zoom iOS | `src/app/layout.tsx:58` | Supprimer `maximumScale: 1` |
| 🟠 Élevée | `font-size: 9px` sur `.em-ch-sec` | `globals.css:319` | Minimum 11px |
| 🟠 Élevée | `font-size: 10px` sur `.em-rp-title`, `.em-stat-lbl` | `globals.css:265,283` | Minimum 11px |
| 🟡 Modérée | Couleur `#8890aa` → ratio ~3.5:1 insuffisant | Multiples | Utiliser `#6b7080` (ratio ~4.6:1) |
| 🟡 Modérée | `aria-live` manquant sur streaming IA | AI components | Ajouter `aria-live="polite"` |
| 🟢 Faible | Numéros de versets sans aria-label | BibleReader | Ajouter `aria-label` sur `.v` spans |

---

## 5. Recommandations finales

1. **Corriger `maximumScale: 1` avant tout** — c'est le seul problème critique qui viole WCAG AA sans le système de préférences
2. **Ne pas remplacer** le zoom navigateur par notre système — le compléter
3. **Tester avec VoiceOver (Mac/iOS)** après implémentation du panneau de préférences
4. **OpenDyslexic** : charger en self-hosted dans `public/fonts/` (pas de CDN tiers)
5. **Touch targets** : tous les contrôles du panneau ≥ 44×44px
6. **Line-height minimum : 1.5** — ne jamais proposer de valeur inférieure dans l'UI
