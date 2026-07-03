# Rapport d'impact UI — Système de Préférences de Lecture
**ARC Église · Espace Membres**  
Date : 2026-06-24  
Statut : Analyse préalable — aucun code modifié

---

## 1. Inventaire complet des zones de texte affectées

### 1.1 Zones de lecture principale (impact fort)

Ces zones contiennent du contenu textuel long et bénéficieront directement du système.

#### Bible (`src/app/espace-membres/bible/page.tsx`)

| Élément | Style actuel | Impact préférences |
|---|---|---|
| Contenu biblique `.bible-content` | `font-serif text-lg leading-8` = 18px / LH 2.0 | ✅ Taille + LH + police |
| Versets `.em-bible-v` | `font-size: 14px; line-height: 1.8` (hardcodé) | ✅ Taille + LH |
| Citations `.em-verset-card` | `font-size: 20px; line-height: 1.55` (hardcodé) | ✅ Taille + LH |
| Numéros verset `.v` | `font-size: 0.6em` (relatif) | Automatiquement scalé |
| Mots de Jésus `.wj` | `color: #b91c1c` | ⚠️ À protéger en mode contraste |
| Petites majuscules `.nd` | `font-variant: small-caps` | Neutre |
| Panneau notes | `text-sm` textarea | Hors scope (zone saisie) |

**Structure de rendu** : `dangerouslySetInnerHTML` → le CSS doit cibler via `.bible-content *`

#### AI Biblique (`src/app/espace-membres/ai-biblique/page.tsx` + `BibleAIClient.tsx`)

| Élément | Style actuel | Impact préférences |
|---|---|---|
| Messages IA | `max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap` = 14px / LH 1.5 | ✅ Taille + LH |
| Texte streaming | Animation + `text-sm` | ✅ Taille |
| Plans de lecture (passages) | `text-sm leading-relaxed` | ✅ Taille + LH |
| Journal spirituel (IA response) | `text-sm` | ✅ Taille |
| Explications théologiques | `text-sm` | ✅ Taille |
| Suggestions/chips | `text-xs font-semibold` | ⚠️ Hors scope — UI chrome |
| Onglets `.em-tab` | `font-size: 12px` | ⚠️ Hors scope — navigation |

**Structure de rendu** : JSX avec Tailwind → cibler via classe parente `.em-reading-zone`

#### Assistant IA (`src/app/espace-membres/assistant/page.tsx`)

| Élément | Style actuel | Impact préférences |
|---|---|---|
| Messages utilisateur | `text-sm leading-relaxed whitespace-pre-wrap` | ✅ Taille + LH |
| Réponses IA (streaming) | `text-sm leading-relaxed whitespace-pre-wrap` | ✅ Taille + LH |
| Date/heure messages | `text-xs text-arc-text3` | ⚠️ Hors scope — métadonnée |
| Boutons envoi | `text-sm font-bold` | ⚠️ Hors scope — interactif |

#### Notes bibliques (`src/app/espace-membres/notes/NotesClient.tsx`)

| Élément | Style actuel | Impact préférences |
|---|---|---|
| Titre note (lecture) | `font-serif text-2xl font-bold text-arc-navy` | Hors scope — titre |
| Contenu note (lecture) | `text-arc-navy text-sm leading-relaxed whitespace-pre-wrap` | ✅ Taille + LH + police |
| Référence biblique | `text-[10px] text-arc-blue font-mono` | ⚠️ Hors scope — metadata |
| Éditeur textarea | `text-sm` | ⚠️ Hors scope — saisie |
| Liste des notes | `line-clamp-1 text-sm` | ⚠️ Hors scope — navigation |

### 1.2 Zones de lecture secondaire (impact modéré)

#### Prière (`src/app/espace-membres/priere/page.tsx`)

| Élément | Style actuel | Impact |
|---|---|---|
| Description demande | `text-sm text-arc-text2 leading-relaxed` | ✅ Taille + LH |
| Contenu carte `.em-prayer` | `text-sm` | ✅ Taille |
| Compteur caractères | `text-xs` | ⚠️ Hors scope |

#### Doléances (`src/app/espace-membres/doleances/page.tsx`)

| Élément | Style actuel | Impact |
|---|---|---|
| Description soumise | `text-sm text-arc-text2 leading-relaxed` | ✅ Taille + LH |
| Réponse admin | `text-sm text-arc-navy` | ✅ Taille |
| Textarea saisie | `text-sm rows-5` | ⚠️ Hors scope — saisie |

#### Streaming (`src/app/espace-membres/streaming/page.tsx`)

| Élément | Style actuel | Impact |
|---|---|---|
| Description sermon | `text-sm text-arc-text2 mt-3 leading-relaxed` | ✅ Taille + LH |
| Titre sermon | `font-serif text-xl font-bold` | ⚠️ Hors scope — titre |

### 1.3 Zones non affectées (impact nul)

Ces zones ne contiennent pas de texte long ou constituent l'UI chrome :

- **Sidebar navigation** (`.em-sb`, `.em-ni`) — éléments de navigation
- **Header** (`.em-hdr`) — logo, recherche, icônes
- **CRM / Annuaire** — données courtes (noms, dates, contacts)
- **Présences** — tableaux de chiffres
- **Agenda** — titres d'événements courts
- **Profil** — formulaires de saisie
- **Stats pastorales** — tableaux et graphiques

---

## 2. Risques de régression

### 2.1 Risques élevés

#### R1 — Overflow de contenu biblique
- **Cause** : Le contenu HTML biblique est injecté via `dangerouslySetInnerHTML`. Si la taille de police est augmentée à 22–32px, les paragraphes peuvent déborder du conteneur scrollable
- **Composant** : `BibleReader.tsx` + `src/app/espace-membres/bible/page.tsx`
- **Conteneur** : Zone scrollable avec `overflow-y: auto`
- **Mitigation** : La zone scrollable gère le débordement — pas de régression fonctionnelle, juste un scroll plus long
- **Verdict** : Risque faible en pratique, overflow géré correctement

#### R2 — Bulles de chat AI dépassant leur max-width
- **Cause** : Les bulles ont `max-w-[80%]` et un `min-w` implicite. Si font-size = 22px + LH 2.0, les mots longs peuvent dépasser
- **Composant** : `assistant/page.tsx` + `ai-biblique/page.tsx`
- **Mitigation** : `overflow-wrap: break-word` doit être vérifié sur les classes Tailwind actuelles
- **Verdict** : Risque modéré — à tester avec grandes tailles

#### R3 — Grilles `.em-g2 / .em-g3` avec contenu agrandi
- **Cause** : Les grilles 2-4 colonnes dans l'espace membres ont des cellules à largeur fixe. Un texte agrandi peut tronquer le contenu avec `overflow: hidden`
- **Impact** : Cartes de plans de lecture, cartes d'événements
- **Mitigation** : Ces zones ne sont PAS dans `.em-reading-zone` (elles constituent l'UI chrome)
- **Verdict** : Risque nul si le scope de `.em-reading-zone` est bien défini

#### R4 — Largeur de lecture "full" sur grand écran
- **Cause** : En mode `full (100%)`, le texte s'étale sur toute la largeur de `.em-main` qui peut atteindre 1200px
- **Impact** : Lisibilité dégradée (lignes trop longues > 100 caractères)
- **Mitigation** : Afficher un avertissement dans l'UI : "Largeur complète — moins recommandée pour la lecture"
- **Verdict** : Risque UX faible, pas de régression technique

### 2.2 Risques modérés

#### R5 — Classe `.em-bible-v` avec font-size hardcodé
- **Situation actuelle** : `.em-bible-v { font-size: 14px }` en dur dans `globals.css`
- **Risque** : Si on change via `--rp-size`, mais que la classe CSS spécifique a une plus haute spécificité, la valeur 14px persistera
- **Mitigation** : Remplacer `font-size: 14px` par `font-size: var(--rp-size, 14px)` dans globals.css
- **Verdict** : Risque réel, mitigable simplement

#### R6 — Classe `.em-verset-card` avec font-size hardcodé
- **Situation actuelle** : `.em-verset-card { font-size: 20px }` en dur
- **Mitigation** : Remplacer par `font-size: calc(var(--rp-size, 16px) * 1.25)`
- **Verdict** : Risque réel, mitigable simplement

#### R7 — Police Cormorant Garamond en mode confortable
- **Situation actuelle** : Cormorant est chargée pour les titres (headings), pas pour le body
- **Risque** : En mode "confortable" avec Cormorant en body, le rendu peut être trop formel pour les conversations AI
- **Mitigation** : L'utilisateur a le contrôle — c'est une préférence, pas un défaut. Signaler dans l'interface que "Cormorant Garamond est optimal pour la Bible et les méditations"
- **Verdict** : Risque UX acceptable

#### R8 — Mode contraste renforcé + couleur navy
- **Situation actuelle** : Beaucoup de textes utilisent `text-arc-navy` (`#1e2464`) — 8.6:1 sur fond blanc, suffisant mais altéré par le mode contraste
- **Risque** : Le mode `high_contrast` avec `color: #000 !important` change les tons spécifiques navy → noir pur, altérant l'identité visuelle dans la zone de lecture
- **Mitigation** : Acceptable pour l'accessibilité — c'est le but du mode contraste
- **Verdict** : Comportement attendu, pas une régression

### 2.3 Risques faibles

#### R9 — localStorage non disponible
- **Cause** : SSR ou navigation privée peut bloquer localStorage
- **Mitigation** : `try/catch` autour de tous les accès localStorage — fallback sur valeurs par défaut
- **Verdict** : Risque technique mitigable

#### R10 — Race condition chargement Supabase
- **Cause** : L'utilisateur peut modifier les préférences pendant que Supabase charge les siennes
- **Mitigation** : La séquence localStorage → Supabase est délibérée (localStorage d'abord pour l'immédiateté). Si Supabase répond pendant qu'un changement est en cours, les modifications locales sont perdues
- **Mitigation avancée** : Comparer `updated_at` Supabase vs localStorage timestamp avant d'écraser
- **Verdict** : Risque rare, cas limite

---

## 3. Impact sur les classes globals.css existantes

### 3.1 Classes à modifier (non-breaking si fait avec CSS custom property fallback)

| Classe | Propriété actuelle | Modification proposée |
|---|---|---|
| `.em-bible-v` | `font-size: 14px` | `font-size: var(--rp-size, 14px)` |
| `.em-bible-v` | `line-height: 1.8` | `line-height: var(--rp-lh, 1.8)` |
| `.em-verset-card` | `font-size: 20px` | `font-size: calc(var(--rp-size, 16px) * 1.25)` |
| `.em-verset-card` | `line-height: 1.55` | `line-height: var(--rp-lh, 1.55)` |
| `.bible-content` | `font-size: 18px` (Tailwind `text-lg`) | Ajouter `font-size: var(--rp-size, 18px)` via classe `.em-reading-zone .bible-content` |

**Note importante** : Ces modifications utilisent toutes des **CSS fallback values** — si `--rp-size` n'est pas défini (hors espace membres, rendu server-side), les valeurs actuelles s'appliquent. Zéro régression sur les pages publiques du site.

### 3.2 Nouvelles classes à ajouter

```css
/* Nouvelles classes dans globals.css */

.em-reading-zone {
  --rp-size:  16px;
  --rp-lh:    1.6;
  --rp-width: 720px;
  --rp-font:  var(--font-manrope);
}

.em-reading-body {
  font-size:   var(--rp-size);
  line-height: var(--rp-lh);
  font-family: var(--rp-font);
}

.em-reading-content-wrapper {
  max-width: var(--rp-width);
  margin-left: auto;
  margin-right: auto;
}

.em-ai-message-content {
  font-size:   var(--rp-size, 14px);
  line-height: var(--rp-lh, 1.6);
  font-family: var(--rp-font, var(--font-manrope));
}
```

### 3.3 Classes NON modifiées (protégées du système)

Ces classes font partie de l'UI chrome et ne doivent pas être affectées :

- `.em-app`, `.em-hdr`, `.em-sb`, `.em-ni`, `.em-ni-lbl`
- `.em-btn`, `.em-tab`, `.em-tag`, `.em-badge`
- `.em-stat-num`, `.em-stat-lbl`
- `.em-card`, `.em-card-dark`, `.em-g2`, `.em-g3`, `.em-g4`

---

## 4. Impact sur les composants

### 4.1 Composants nécessitant l'ajout de `.em-reading-zone`

| Composant | Fichier | Zone à wrapper | Effort |
|---|---|---|---|
| BibleReader | `src/components/bible/BibleReader.tsx` (à vérifier si existe) | Conteneur du chapitre | Faible |
| Bible page | `src/app/espace-membres/bible/page.tsx` | Div parent `.bible-content` | Faible |
| AI Chat messages | `src/app/espace-membres/assistant/page.tsx` | Zone messages `overflow-y-auto` | Faible |
| BibleAIClient | `src/components/bible-ai/BibleAIClient.tsx` | Zone réponses IA | Faible |
| NotesClient | `src/app/espace-membres/notes/NotesClient.tsx` | Vue lecture du contenu | Faible |
| Prière | `src/app/espace-membres/priere/page.tsx` | Cards `.em-prayer` | Faible |
| Doléances | `src/app/espace-membres/doleances/page.tsx` | Zone description + réponse | Faible |

### 4.2 Composants nécessitant une modification de classe Tailwind

Dans ces composants, les classes `text-sm leading-relaxed` hardcodées seront **remplacées** par `em-ai-message-content` :

- `src/app/espace-membres/assistant/page.tsx` — ligne messages `whitespace-pre-wrap`
- `src/app/espace-membres/notes/NotesClient.tsx` — contenu de lecture
- `src/components/bible-ai/BibleAIClient.tsx` — zones réponses

### 4.3 Composants nécessitant l'ajout du bouton ReadingPrefsButton

Un bouton `Aa` ou `⚙ Lecture` doit être ajouté dans le header de :

- `src/app/espace-membres/bible/page.tsx` (priorité 1)
- `src/app/espace-membres/ai-biblique/page.tsx` (priorité 1)
- `src/app/espace-membres/assistant/page.tsx` (priorité 1)
- `src/app/espace-membres/notes/page.tsx` (priorité 2)
- Ou bien un seul bouton dans le `.em-hdr` global (approche recommandée)

---

## 5. Impact sur le layout et la performance

### 5.1 Impact layout

- La largeur de lecture `reading_width` applique un `max-width` sur la zone de contenu — le layout principal `.em-main` (flex-1, overflow-y-auto) n'est pas affecté
- Sur mobile (`< 768px`), `reading_width` doit être ignorée ou plafonnée à `min(var(--rp-width), 100%)` pour éviter un dépassement horizontal

### 5.2 Impact performance

- **CSS custom properties** : changements O(1), immédiat, pas de re-render React
- **Chargement des préférences** : une requête Supabase au mount du layout espace-membres (déjà une requête auth présente)
- **Sauvegarde** : débouncée à 500ms — un seul PATCH par session de modification
- **OpenDyslexic** : ~100KB (woff2) — chargé uniquement si sélectionné (chargement conditionnel)
- **`<style>` dynamique** : injection d'un bloc `<style>` de ~200 caractères — coût négligeable

### 5.3 Impact SEO

- Aucun — l'espace membres est derrière authentification, non indexé par les robots
- `robots.txt` bloque `/espace-membres/` (déjà en place)

---

## 6. Résumé des impacts

| Catégorie | Fichiers impactés | Effort estimé |
|---|---|---|
| Nouveaux fichiers créés | 8 fichiers | 5–6h |
| globals.css modifié | 1 fichier, ~8 lignes modifiées + ~20 ajoutées | 30min |
| Composants : ajout `.em-reading-zone` | 7 composants | 1–2h |
| Composants : remplacement classes Tailwind | 3 composants | 1h |
| Layout espace-membres | 1 fichier | 15min |
| API route | 1 fichier | 30min |
| Tests manuels | Toutes les zones | 2h |
| **Total estimé** | **~16 fichiers** | **~10–11h** |

**Aucune régression attendue sur le site vitrine public** — le système est entièrement scoped à l'espace membres.
