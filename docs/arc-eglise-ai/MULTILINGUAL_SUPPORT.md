# Support Multilingue — ARC Église AI

> **Statut :** Document de conception — en attente de validation  
> **Date :** Juin 2026

---

## 1. Contexte

L'église ARC est une communauté multiculturelle basée en Suisse francophone, avec une forte diaspora africaine (Congo, DRC, Angola, etc.). ARC Église AI doit pouvoir répondre dans la langue de l'utilisateur tout en maintenant la précision biblique.

---

## 2. Les 19 langues supportées

### 2.1 Langues européennes
| Code | Langue | Traductions bibliques disponibles |
|------|--------|----------------------------------|
| `fr` | Français | BDS, LSG 1910, NEG, TOB, Français Courant |
| `en` | Anglais | KJV, NIV, ESV, NLT, NKJV, BBE |
| `de` | Allemand | Lutherbibel, Schlachter, Elberfelder |
| `it` | Italien | La Sacra Bibbia, CEI |
| `es` | Espagnol | RVR1960, NVI, LBLA |
| `pt` | Portugais | ARA, NVI-PT |
| `nl` | Néerlandais | SV, HSV |
| `ro` | Roumain | CORNILESCU, NTR |

### 2.2 Langues africaines (priorité ARC)
| Code | Langue | Traductions disponibles |
|------|--------|------------------------|
| `ln` | Lingala | Bible Lingala (partielle) |
| `sw` | Kiswahili | ULB Swahili |
| `kg` | Kikongo | Kikongo Bible |
| `wo` | Wolof | Wolof NT |
| `bm` | Bambara | Bambara Bible |
| `ha` | Haoussa | Hausa Bible |
| `yo` | Yoruba | Yoruba Bible |
| `ig` | Igbo | Igbo Bible |

### 2.3 Langues moyen-orientales et asiatiques
| Code | Langue | Traductions disponibles |
|------|--------|------------------------|
| `ar` | Arabe | ALAB, SVD |
| `zh` | Mandarin | CUVS, CUV |
| `ko` | Coréen | Korean Bible |

---

## 3. Détection automatique de la langue

### Priorité de détection
1. **Préférence enregistrée** dans `ai_user_preferences.language`
2. **Langue du message** (détection automatique par le LLM)
3. **Navigateur** (`Accept-Language` header) — fallback
4. **Défaut :** Français (`fr`)

### Implémentation
```typescript
// Dans /api/bible-ai/chat/route.ts

async function detectLanguage(message: string, userPrefs: AIUserPreferences): Promise<string> {
  // 1. Préférence utilisateur enregistrée
  if (userPrefs.language !== 'auto') return userPrefs.language

  // 2. Déléguer à Lunziko Platform (le LLM détecte la langue)
  // La détection est implicite : le LLM répond dans la langue du message
  // On peut aussi appeler un endpoint /detect si disponible

  return 'fr'  // défaut
}
```

### Principe de réponse
L'IA répondra toujours **dans la langue dans laquelle l'utilisateur écrit**, sauf si une langue spécifique est configurée dans les préférences. Cette logique est gérée par le LLM lui-même via le system prompt :

```
Réponds TOUJOURS dans la langue de l'utilisateur.
Si l'utilisateur écrit en lingala, réponds en lingala.
Si l'utilisateur écrit en français, réponds en français.
Langue par défaut : {language}.
```

---

## 4. Support des traductions bibliques par langue

### Stratégie
1. **Scripture.api.bible** — source principale (450+ traductions)
2. **getbible.net v2** — fallback pour langues peu courantes (déjà utilisé dans le code existant)
3. **Translittération IA** — pour langues sans traduction complète disponible, l'IA peut traduire/paraphraser un passage à partir d'une version de référence

### Mapping langue → Bible ID par défaut

```typescript
export const DEFAULT_BIBLE_IDS: Record<string, string> = {
  fr: '61fd76eafa1ef5f7-01',  // Bible du Semeur (BDS)
  en: '9879dbb7cfe39e4d-01',  // King James Version
  es: '592420522e16049f-01',  // Reina-Valera 1960
  pt: 'a556c5305ee15c3f-01',  // Almeida Revista e Atualizada
  de: '39423fc596f18578-01',  // Lutherbibel
  it: '41f25b97f468e10b-01',  // La Sacra Bibbia
  nl: '339bcdd8ef3abe9c-01',  // Staten Vertaling
  ar: '5e51f89e89947acb-01',  // Arabic Bible
  zh: '7142879509583d59-01',  // Chinese Union Version
  // Pour les langues africaines : utiliser getbible.net comme fallback
  ln: null,  // Scripture.api.bible n'a pas le Lingala complet → fallback + IA
  sw: null,
  kg: null,
}
```

### Fallback pour langues sans traduction complète
```typescript
async function fetchVerse(ref: string, language: string, bibleId?: string): Promise<string> {
  const targetId = bibleId ?? DEFAULT_BIBLE_IDS[language]

  if (targetId) {
    // Scripture.api.bible
    return fetchFromScriptureApiBible(ref, targetId)
  }

  // Fallback : récupérer en français, puis demander à l'IA de traduire
  const frText = await fetchFromScriptureApiBible(ref, DEFAULT_BIBLE_IDS.fr)
  return translateViaLunziko(frText, 'fr', language)
}
```

---

## 5. UI — Sélecteur de langue

### Composant `LangSelector.tsx`
```typescript
// Compact dropdown dans le header de la page AI Biblique
const LANG_OPTIONS = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ln', label: 'Lingala', flag: '🇨🇩' },
  { code: 'sw', label: 'Kiswahili', flag: '🇹🇿' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  // ... 12 autres
]
```

La langue choisie est :
1. **Persistée** dans `ai_user_preferences.language`
2. **Appliquée immédiatement** à la session en cours
3. **Mémorisée** pour les sessions futures

---

## 6. Traductions dans la comparaison de traductions

Le composant `TranslationCompare.tsx` affichera côte-à-côte jusqu'à 6 versions d'un même passage. Les traductions disponibles seront filtrées selon la langue sélectionnée + les langues majeures de l'IA.

```typescript
// Ordre d'affichage par défaut (langue FR) :
const FR_PRIORITY_BIBLES = [
  'Bible du Semeur (BDS)',
  'Louis Segond 1910 (LSG)',
  'Nouvelle Édition de Genève (NEG)',
  'Semeur 2000',
  'Traduction Œcuménique (TOB)',
  'Le Bible en français courant',
]
```

---

## 7. Plans de lecture multilingues

Les plans générés par l'IA seront dans la langue de l'utilisateur :
- Titres des jours
- Questions de réflexion
- Guides de prière
- Commentaires contextuels

Les références de passages restent en format universel (`GEN.1`, `JHN.3.16`) indépendamment de la langue.

---

## 8. Gestion des caractères spéciaux

- **Lingala / Kikongo / Yoruba :** caractères spéciaux Unicode (tones, diacritiques) — supportés nativement par PostgreSQL UTF-8
- **Arabe :** `direction: rtl` CSS sur les conteneurs de texte arabe
- **Mandarin / Coréen :** pas de support RTL nécessaire

```typescript
// Utilitaire CSS
function getTextDirection(language: string): 'ltr' | 'rtl' {
  return ['ar', 'fa', 'ur', 'he'].includes(language) ? 'rtl' : 'ltr'
}
```

---

## 9. Limitations connues en V1

| Langue | Limitation | Workaround |
|--------|-----------|-----------|
| Lingala | Pas de traduction biblique complète dans Scripture.api.bible | IA traduit depuis le français |
| Kikongo | Idem | Idem |
| Wolof, Bambara, Haoussa | Traduction partielle (NT seulement) | Indiqué à l'utilisateur |
| Langues africaines minoritaires | Pas de Bible numérique connue | IA paraphrase en indiquant que c'est une traduction libre |

---

## 10. Message d'avertissement pour traductions IA

Lorsque l'IA génère une traduction (pas une traduction officielle), elle doit l'indiquer clairement :

```
⚠️ Note : Il n'existe pas de traduction biblique officielle complète en [langue] 
dans notre base. Ce texte est une traduction libre générée par l'IA à partir 
du [langue source]. Elle peut contenir des inexactitudes. Pour une étude 
approfondie, nous recommandons de consulter une Bible imprimée en [langue].
```
