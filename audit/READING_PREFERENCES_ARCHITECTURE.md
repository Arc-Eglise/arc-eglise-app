# Architecture — Système de Préférences de Lecture
**ARC Église · Espace Membres**  
Date d'analyse : 2026-06-24  
Statut : Proposition — en attente de validation

---

## 1. Contexte et contraintes

### 1.1 État actuel du projet
- L'espace membres (`/espace-membres/`) est une application Next.js 14 App Router avec authentification Supabase
- Il existe déjà une table `ai_user_preferences` pour les préférences IA (language, level, bible_version, etc.)
- Le layout `src/app/espace-membres/layout.tsx` ne fait que vérifier l'authentification — il n'y a aucun Provider de contexte actuellement
- Les styles texte sont dispersés : Tailwind inline dans les composants + classes `.em-*` hardcodées dans `globals.css`

### 1.2 Contraintes architecturales
- **Sécurité** : `SUPABASE_SERVICE_ROLE_KEY` uniquement côté serveur — la lecture des préférences utilisateur doit passer par `createClient()` côté client ou par l'API route existante
- **Mobile** : Les préférences doivent être accessibles via API pour les futures apps Android/iOS (via Lunziko Platform)
- **Performance** : Les changements doivent être immédiats, sans rechargement de page
- **Séparation des responsabilités** : Ne pas mélanger les préférences IA (language/level) et les préférences d'affichage

---

## 2. Schéma de données

### 2.1 Nouvelle table Supabase recommandée

**Décision : table séparée `reading_preferences`** (plutôt qu'une colonne JSONB dans `ai_user_preferences`)

Raisons :
- Séparation des responsabilités (IA ≠ affichage)
- Requêtes plus légères (seules les préférences d'affichage chargées au mount)
- Évolutivité indépendante
- API mobile peut cibler uniquement ce périmètre

```sql
-- Migration Supabase à exécuter dans SQL Editor
CREATE TABLE public.reading_preferences (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  font_size        TEXT    NOT NULL DEFAULT 'base'       CHECK (font_size IN ('xs','sm','base','lg','xl','2xl','custom')),
  font_size_px     INTEGER NOT NULL DEFAULT 16           CHECK (font_size_px BETWEEN 11 AND 32),
  line_height      TEXT    NOT NULL DEFAULT 'normal'     CHECK (line_height IN ('tight','normal','relaxed','loose','spacious')),
  reading_width    TEXT    NOT NULL DEFAULT 'medium'     CHECK (reading_width IN ('narrow','medium','wide','full')),
  font_family      TEXT    NOT NULL DEFAULT 'manrope'    CHECK (font_family IN ('manrope','cormorant','georgia','system','dyslexic')),
  reading_mode     TEXT    NOT NULL DEFAULT 'standard'   CHECK (reading_mode IN ('standard','comfortable','intensive','senior')),
  high_contrast    BOOLEAN NOT NULL DEFAULT FALSE,
  low_vision       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reading_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reading prefs"
  ON public.reading_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_reading_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reading_prefs_updated_at
  BEFORE UPDATE ON public.reading_preferences
  FOR EACH ROW EXECUTE FUNCTION update_reading_prefs_updated_at();
```

### 2.2 Interface TypeScript

```typescript
// src/types/reading-preferences.ts

export type FontSize    = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | 'custom'
export type LineHeight  = 'tight' | 'normal' | 'relaxed' | 'loose' | 'spacious'
export type ReadingWidth = 'narrow' | 'medium' | 'wide' | 'full'
export type FontFamily  = 'manrope' | 'cormorant' | 'georgia' | 'system' | 'dyslexic'
export type ReadingMode = 'standard' | 'comfortable' | 'intensive' | 'senior'

export interface ReadingPreferences {
  user_id:      string
  font_size:    FontSize
  font_size_px: number    // utilisé uniquement si font_size === 'custom'
  line_height:  LineHeight
  reading_width: ReadingWidth
  font_family:  FontFamily
  reading_mode: ReadingMode
  high_contrast: boolean
  low_vision:   boolean
}

export const READING_PREFS_DEFAULTS: Omit<ReadingPreferences, 'user_id'> = {
  font_size:     'base',
  font_size_px:  16,
  line_height:   'normal',
  reading_width: 'medium',
  font_family:   'manrope',
  reading_mode:  'standard',
  high_contrast: false,
  low_vision:    false,
}
```

### 2.3 Table de correspondance des valeurs CSS

| Préférence | Valeur logique | CSS résultant |
|---|---|---|
| `font_size: 'xs'` | 13px | `--rp-size: 13px` |
| `font_size: 'sm'` | 14px | `--rp-size: 14px` |
| `font_size: 'base'` | 16px | `--rp-size: 16px` |
| `font_size: 'lg'` | 18px | `--rp-size: 18px` |
| `font_size: 'xl'` | 20px | `--rp-size: 20px` |
| `font_size: '2xl'` | 22px | `--rp-size: 22px` |
| `font_size: 'custom'` | user value | `--rp-size: {font_size_px}px` |
| `line_height: 'tight'` | 1.4 | `--rp-lh: 1.4` |
| `line_height: 'normal'` | 1.6 | `--rp-lh: 1.6` |
| `line_height: 'relaxed'` | 1.8 | `--rp-lh: 1.8` |
| `line_height: 'loose'` | 2.0 | `--rp-lh: 2.0` |
| `line_height: 'spacious'` | 2.4 | `--rp-lh: 2.4` |
| `reading_width: 'narrow'` | 520px | `--rp-width: 520px` |
| `reading_width: 'medium'` | 720px | `--rp-width: 720px` |
| `reading_width: 'wide'` | 960px | `--rp-width: 960px` |
| `reading_width: 'full'` | 100% | `--rp-width: 100%` |
| `font_family: 'manrope'` | Manrope | `--rp-font: var(--font-manrope)` |
| `font_family: 'cormorant'` | Cormorant Garamond | `--rp-font: var(--font-cormorant)` |
| `font_family: 'georgia'` | Georgia (system) | `--rp-font: Georgia, serif` |
| `font_family: 'system'` | system-ui | `--rp-font: system-ui, sans-serif` |
| `font_family: 'dyslexic'` | OpenDyslexic | `--rp-font: 'OpenDyslexic', sans-serif` |

### 2.4 Modes de lecture prédéfinis

Les modes sont des raccourcis qui configurent plusieurs préférences simultanément :

| Mode | font_size_px | line_height | reading_width | font_family |
|---|---|---|---|---|
| `standard` | 16 | normal (1.6) | medium (720px) | manrope |
| `comfortable` | 18 | relaxed (1.8) | medium (720px) | cormorant |
| `intensive` | 15 | normal (1.6) | narrow (520px) | manrope |
| `senior` | 20 | loose (2.0) | medium (720px) | georgia |

---

## 3. Architecture des composants

### 3.1 Vue d'ensemble

```
src/app/espace-membres/layout.tsx  ← Injecter ReadingPrefsProvider ici
   └── ReadingPrefsProvider (Context + Supabase sync)
         └── .em-app (wrapper)
               └── <style> CSS custom properties appliquées au runtime
               └── .em-reading-zone  ← Toutes les zones de contenu long
                     ├── Bible Reader    ← font-size, line-height, font-family
                     ├── AI Chat         ← font-size, line-height
                     ├── AI Biblique     ← font-size, line-height, max-width
                     ├── Notes           ← font-size, line-height
                     ├── Prière          ← font-size, line-height
                     └── ...
               └── ReadingPrefsPanel (flottant ou panneau latéral)
```

### 3.2 Fichiers à créer

```
src/
  types/
    reading-preferences.ts          ← Types et defaults (nouveau)
  contexts/
    ReadingPrefsContext.tsx          ← Context + Provider (nouveau)
  hooks/
    useReadingPrefs.ts               ← Hook pour consommer le contexte (nouveau)
  components/
    reading/
      ReadingPrefsPanel.tsx          ← UI du panneau de préférences (nouveau)
      ReadingPrefsButton.tsx         ← Bouton déclencheur (icône Aa) (nouveau)
      FontSizeControl.tsx            ← Curseur taille (nouveau)
  app/
    api/
      reading-preferences/
        route.ts                     ← GET + PATCH (nouveau)
    espace-membres/
      layout.tsx                     ← Modifier pour ajouter Provider
```

### 3.3 ReadingPrefsContext

```typescript
// src/contexts/ReadingPrefsContext.tsx
"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { createClient }  from "@/lib/supabase/client"
import type { ReadingPreferences } from "@/types/reading-preferences"
import { READING_PREFS_DEFAULTS, buildCSSVars } from "@/types/reading-preferences"

const LS_KEY = "arc_reading_prefs"

interface ReadingPrefsContextValue {
  prefs:    ReadingPreferences | null
  loading:  boolean
  update:   (patch: Partial<Omit<ReadingPreferences, 'user_id'>>) => void
  applyMode: (mode: ReadingPreferences['reading_mode']) => void
  reset:    () => void
}

const ReadingPrefsContext = createContext<ReadingPrefsContextValue | null>(null)

export function ReadingPrefsProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const [prefs, setPrefs]     = useState<ReadingPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  // Chargement initial : localStorage (immédiat) puis Supabase (autoritatif)
  useEffect(() => {
    const cached = localStorage.getItem(LS_KEY)
    if (cached) {
      try { setPrefs(JSON.parse(cached)); setLoading(false) } catch {}
    }

    const supabase = createClient()
    supabase
      .from("reading_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const resolved = data
          ? { ...READING_PREFS_DEFAULTS, ...data } as ReadingPreferences
          : { user_id: userId, ...READING_PREFS_DEFAULTS }
        setPrefs(resolved)
        localStorage.setItem(LS_KEY, JSON.stringify(resolved))
        setLoading(false)
      })
  }, [userId])

  // Sauvegarde Supabase débouncée (500ms)
  const persistToSupabase = useCallback((next: ReadingPreferences) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await fetch("/api/reading-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      })
    }, 500)
  }, [])

  const update = useCallback((patch: Partial<Omit<ReadingPreferences, 'user_id'>>) => {
    setPrefs(prev => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      persistToSupabase(next)
      return next
    })
  }, [persistToSupabase])

  const applyMode = useCallback((mode: ReadingPreferences['reading_mode']) => {
    const MODES = {
      standard:    { font_size: 'base' as const, font_size_px: 16, line_height: 'normal' as const, reading_width: 'medium' as const, font_family: 'manrope' as const },
      comfortable: { font_size: 'lg' as const,   font_size_px: 18, line_height: 'relaxed' as const, reading_width: 'medium' as const, font_family: 'cormorant' as const },
      intensive:   { font_size: 'sm' as const,   font_size_px: 15, line_height: 'normal' as const, reading_width: 'narrow' as const, font_family: 'manrope' as const },
      senior:      { font_size: 'xl' as const,   font_size_px: 20, line_height: 'loose' as const,  reading_width: 'medium' as const, font_family: 'georgia' as const },
    }
    update({ reading_mode: mode, ...MODES[mode] })
  }, [update])

  const reset = useCallback(() => {
    update({ ...READING_PREFS_DEFAULTS })
  }, [update])

  return (
    <ReadingPrefsContext.Provider value={{ prefs, loading, update, applyMode, reset }}>
      {/* Injection des CSS custom properties — appliquées à toute la zone de lecture */}
      {prefs && (
        <style dangerouslySetInnerHTML={{ __html: buildCSSVars(prefs) }} />
      )}
      {children}
    </ReadingPrefsContext.Provider>
  )
}

export function useReadingPrefs() {
  const ctx = useContext(ReadingPrefsContext)
  if (!ctx) throw new Error("useReadingPrefs must be used inside ReadingPrefsProvider")
  return ctx
}
```

### 3.4 Génération des CSS custom properties

```typescript
// Dans src/types/reading-preferences.ts

const FONT_SIZE_MAP: Record<FontSize, string> = {
  xs: '13px', sm: '14px', base: '16px', lg: '18px', xl: '20px', '2xl': '22px', custom: '16px',
}
const LINE_HEIGHT_MAP: Record<LineHeight, string> = {
  tight: '1.4', normal: '1.6', relaxed: '1.8', loose: '2.0', spacious: '2.4',
}
const WIDTH_MAP: Record<ReadingWidth, string> = {
  narrow: '520px', medium: '720px', wide: '960px', full: '100%',
}
const FONT_MAP: Record<FontFamily, string> = {
  manrope:   'var(--font-manrope)',
  cormorant: 'var(--font-cormorant)',
  georgia:   'Georgia, "Times New Roman", serif',
  system:    'system-ui, -apple-system, sans-serif',
  dyslexic:  '"OpenDyslexic", "Comic Sans MS", cursive',
}

export function buildCSSVars(p: ReadingPreferences): string {
  const size = p.font_size === 'custom' ? `${p.font_size_px}px` : FONT_SIZE_MAP[p.font_size]
  return `
    .em-reading-zone {
      --rp-size:    ${size};
      --rp-lh:      ${LINE_HEIGHT_MAP[p.line_height]};
      --rp-width:   ${WIDTH_MAP[p.reading_width]};
      --rp-font:    ${FONT_MAP[p.font_family]};
      --rp-contrast: ${p.high_contrast ? '1' : '0'};
    }
    ${p.high_contrast ? `.em-reading-zone { background: #fff !important; color: #000 !important; }
    .em-reading-zone * { color: #000 !important; background: transparent !important; border-color: #000 !important; }` : ''}
    ${p.low_vision ? `.em-reading-zone { letter-spacing: 0.02em; word-spacing: 0.05em; }
    .em-reading-zone a { text-decoration: underline !important; }` : ''}
  `
}
```

### 3.5 Route API

```typescript
// src/app/api/reading-preferences/route.ts

// GET  — récupère les préférences (pour mobile et SSR)
// PATCH — met à jour les préférences (debounced du client)
```

- Méthode GET : retourne les prefs de l'utilisateur authentifié
- Méthode PATCH : upsert partiel dans `reading_preferences`
- Accessible aux apps mobiles avec un token Supabase valide

### 3.6 Intégration dans le layout espace-membres

```typescript
// src/app/espace-membres/layout.tsx  (à modifier)
import { createClient } from "@/lib/supabase/server"
import { redirect }     from "next/navigation"
import { ReadingPrefsProvider } from "@/contexts/ReadingPrefsContext"

export default async function EspaceMembresLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/connexion")

  return (
    <ReadingPrefsProvider userId={user.id}>
      {children}
    </ReadingPrefsProvider>
  )
}
```

---

## 4. Application CSS dans les zones de contenu

### 4.1 Stratégie CSS custom properties

La classe `.em-reading-zone` est ajoutée aux wrappers de chaque zone de contenu long. Les propriétés `--rp-*` sont injectées dynamiquement par le Provider.

```css
/* globals.css — à ajouter */

/* Zone de lecture : reçoit les variables du Provider */
.em-reading-zone {
  --rp-size:  16px;
  --rp-lh:    1.6;
  --rp-width: 720px;
  --rp-font:  var(--font-manrope);
}

/* Classes utilitaires lisant les variables */
.em-reading-body {
  font-size:   var(--rp-size);
  line-height: var(--rp-lh);
  font-family: var(--rp-font);
  max-width:   var(--rp-width);
}

/* Bible : déjà font-serif — on override la taille et interligne uniquement */
.bible-content {
  font-size:   var(--rp-size, 18px);
  line-height: var(--rp-lh, 2);
}

/* Messages IA chat */
.em-ai-message {
  font-size:   var(--rp-size, 14px);
  line-height: var(--rp-lh, 1.6);
}

/* Versets bibliques interactifs */
.em-bible-v {
  font-size: var(--rp-size, 14px);
  line-height: var(--rp-lh, 1.8);
}

/* Citations bibliques (em-verset-card) */
.em-verset-card {
  font-size: calc(var(--rp-size, 20px) * 1.2);
  line-height: var(--rp-lh, 1.55);
}
```

### 4.2 Zones ciblées par module

| Module | Wrapper à ajouter `.em-reading-zone` | Classes de contenu à adapter |
|---|---|---|
| Bible Reader | `div.bible-content` parent | `.bible-content`, `.em-bible-v`, `.em-verset-card` |
| AI Chat (messages) | `div` contenant les bulles | `max-w-[78%]...text-sm leading-relaxed` |
| AI Biblique (réponses) | Zone de réponse IA | `text-sm leading-relaxed` |
| Notes (vue lecture) | `div.text-arc-navy.text-sm.leading-relaxed` | Ajouter `.em-reading-body` |
| Prière (descriptions) | Cards `.em-prayer` | `text-sm.text-arc-text2.leading-relaxed` |
| Journal spirituel | Zone entrée journal | `text-sm leading-relaxed` |
| Plans de lecture | Passages et réflexions | `text-sm leading-relaxed` |
| Théologie / Méditations | Contenu réponse | `text-sm leading-relaxed` |

---

## 5. Interface utilisateur — Panneau de préférences

### 5.1 Déclencheur

Un bouton flottant `Aa` (ou dans le header `.em-hdr`) ouvre un panneau latéral ou un drawer inférieur sur mobile.

### 5.2 Structure du panneau

```
┌─────────────────────────────────────────────────────┐
│  ⚙ Préférences de lecture                       [×] │
├─────────────────────────────────────────────────────┤
│                                                       │
│  MODE DE LECTURE                                      │
│  [Standard]  [Confortable]  [Intensif]  [Senior]      │
│                                                       │
│  TAILLE DU TEXTE                                      │
│  [A-] ●━━━━━━━━━━━━━━ [A+]        16px               │
│  Très petite  Petite  Normale  Grande  Très grande    │
│                                                       │
│  ESPACEMENT DES LIGNES                                │
│  [Serré] [Normal] [Aéré] [Large] [Spacieux]           │
│                                                       │
│  LARGEUR DE LECTURE                                   │
│  [Étroite]  [Moyenne]  [Large]  [Complète]            │
│                                                       │
│  POLICE DE CARACTÈRES                                 │
│  [Manrope]  [Cormorant]  [Georgia]  [Système]         │
│  [OpenDyslexic]                                       │
│                                                       │
│  ACCESSIBILITÉ                                        │
│  [◻] Contraste renforcé                              │
│  [◻] Mode malvoyant                                  │
│                                                       │
│  ─────────────────────────────────────────────────  │
│  APERÇU                                               │
│  ┌──────────────────────────────────────────────┐    │
│  │ Car Dieu a tant aimé le monde qu'il a donné  │    │
│  │ son Fils unique, afin que quiconque croit en │    │
│  │ lui ne périsse point, mais qu'il ait la vie  │    │
│  │ éternelle. — Jean 3:16                       │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
│  [Réinitialiser]                    [Appliquer ✓]   │
└─────────────────────────────────────────────────────┘
```

### 5.3 Zoom rapide

Un widget permanent (3 boutons) dans le header de chaque page de lecture :

```
[A−]  [100%]  [A+]
```

Raccourcis clavier : `Ctrl+` / `Ctrl−` / `Ctrl+0` (interceptés dans la zone de lecture).

---

## 6. Synchronisation multi-appareils

### 6.1 Web
- localStorage comme cache immédiat (0ms de latence)
- Supabase comme source de vérité (chargé au mount, sync debounced à 500ms)
- En cas de conflit : Supabase gagne (updated_at plus récent)

### 6.2 API Mobile (Android / iOS)
```
GET  /api/reading-preferences          → retourne ReadingPreferences
PATCH /api/reading-preferences         → met à jour (partiel ou total)
```
Les apps mobiles utilisent le même endpoint avec leur token Supabase Bearer.

### 6.3 Réplication temps réel (optionnel — Phase 2)
Supabase Realtime sur la table `reading_preferences` pour synchroniser instantanément les changements entre onglets ouverts.

---

## 7. Police OpenDyslexic

La police OpenDyslexic n'est pas chargée par Next.js/Google Fonts. Deux options :

**Option A** (recommandée) — CDN public :
```html
<!-- Chargé conditionnellement uniquement si font_family === 'dyslexic' -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic-regular.css" />
```

**Option B** — Fichier local dans `public/fonts/OpenDyslexic.woff2` (self-hosted, RGPD-friendly)

Recommandation : Option B pour éviter les dépendances CDN tierces en production.

---

## 8. Résumé de l'architecture

```
Données         : table reading_preferences (Supabase, RLS user-level)
API             : /api/reading-preferences (GET + PATCH, Next.js Route Handler)
Contexte        : ReadingPrefsContext (React Context, Client Component)
Application CSS : CSS custom properties --rp-* injectées sur .em-reading-zone
UI              : ReadingPrefsPanel (drawer flottant) + zoom rapide en header
Persistance     : localStorage (immédiat) + Supabase (authoritatif, debounced 500ms)
Mobile          : même API REST avec token Supabase
```

**Nombre de fichiers à créer** : 8 nouveaux  
**Nombre de fichiers à modifier** : ~15 (layout + composants text zones)  
**Régression UI estimée** : faible si CSS defaults identiques aux valeurs actuelles
