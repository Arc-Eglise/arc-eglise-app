# Reading Preferences — Préférences de Lecture
**ARC Église · Système de personnalisation**  
Date : 2026-06-24 · Statut : Analyse — en attente de validation

---

## 1. État actuel — Système entièrement implémenté ✅

Le système de préférences de lecture est **complet et déployé**. Ce document sert de référence pour l'intégration au sein de l'UPE global.

### 1.1 Ce qui est en production

| Composant | Fichier | État |
|---|---|---|
| Types TypeScript | `src/types/reading-preferences.ts` | ✅ |
| Context React | `src/contexts/ReadingPrefsContext.tsx` | ✅ |
| Route API | `src/app/api/reading-preferences/route.ts` | ✅ |
| Bouton + Drawer UI | `src/components/reading/ReadingPrefsButton.tsx` | ✅ |
| CSS custom properties | `src/app/globals.css` (.em-reading-zone, .em-reading-text, etc.) | ✅ |
| Layout integration | `src/app/espace-membres/layout.tsx` | ✅ |
| Table Supabase | `supabase/reading-preferences-migration.sql` | ⚠️ À exécuter |

### 1.2 Table `reading_preferences` (créée, migration en attente)

```sql
-- À exécuter dans Supabase SQL Editor
CREATE TABLE public.reading_preferences (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  font_size_px  INTEGER DEFAULT 16  CHECK (font_size_px BETWEEN 13 AND 26),
  line_height   NUMERIC DEFAULT 1.6 CHECK (line_height BETWEEN 1.4 AND 2.4),
  font_family   TEXT    DEFAULT 'manrope'
                CHECK (font_family IN ('manrope','cormorant','georgia','system')),
  high_contrast BOOLEAN DEFAULT FALSE,
  low_vision    BOOLEAN DEFAULT FALSE,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.3 Fonctionnement technique

```
Flux de synchronisation :
User change → localStorage (0ms) → Context re-render → CSS vars injectés
                              ↓ (600ms debounce)
                         Supabase PATCH /api/reading-preferences

Au chargement :
1. localStorage lu immédiatement (0ms) → prefs affichées sans latence
2. Supabase GET → si prefs différentes, localStorage + Context mis à jour
   (les prefs Supabase ont priorité si memory_enabled)
```

### 1.4 CSS custom properties

```css
/* Ces 3 variables controlent tout le texte dans .em-reading-zone */
--rp-size:  16px;   /* font_size_px */
--rp-lh:    1.6;    /* line_height  */
--rp-font:  var(--font-manrope); /* font_family */
```

### 1.5 Zones de lecture activées

| Composant | Classe appliquée |
|---|---|
| Lecteur biblique | `em-reading-zone` (sur `.bible-content`) |
| Chat IA Biblique | `em-reading-zone` + `em-ai-msg` |
| Assistant général | `em-reading-zone` + `em-ai-msg` |
| Notes | `em-reading-zone em-reading-text` |
| Prières (description) | `em-reading-zone em-reading-text` |

---

## 2. Action immédiate requise

**Avant tout autre développement UPE**, exécuter la migration SQL :

```bash
# Dans Supabase Studio → SQL Editor
# Fichier : supabase/reading-preferences-migration.sql
```

La route API `/api/reading-preferences` fonctionne déjà sans la table (graceful fallback), mais les prefs ne seront PAS synchronisées entre appareils tant que la table n'existe pas.

---

## 3. Intégration avec l'UPE

### 3.1 Les préférences de lecture dans le profil complet

Les préférences de lecture sont **complémentaires** au profil spirituel :

```
spiritual_profile     → Qui est l'utilisateur spirituellement
ai_user_preferences   → Comment l'IA l'assiste
reading_preferences   → Comment il préfère lire le texte
```

Dans la page `Mon Profil` / Paramètres, ces trois tables forment un bloc cohérent visible par l'utilisateur.

### 3.2 Lien avec les profils spécialisés

Les profils spécialisés peuvent avoir des valeurs par défaut recommandées :

| Profil | Font size recommandé | Line height | Font |
|---|---|---|---|
| `nouveau_converti` | 17px | 1.75 | manrope |
| `jeunesse` | 16px | 1.6 | manrope |
| `senior` | 20px | 2.1 | georgia |
| `enseignant` | 15px | 1.55 | manrope |
| `pasteur` | 16px | 1.7 | cormorant |

Ces valeurs ne s'appliquent qu'à la première connexion (si aucune préférence sauvegardée).

### 3.3 Accessibilité

- `high_contrast: true` → filtre CSS contrastes renforcés sur tout `.em-reading-zone`
- `low_vision: true` → active les classes `.em-low-vision` (espacement accru, taille min 18px)
- `maximumScale: 1` retiré du `viewport` (correction WCAG AA déjà appliquée)

---

## 4. Ce qui reste à faire

### 4.1 Priorité haute

| Tâche | Effort |
|---|---|
| Exécuter `reading-preferences-migration.sql` | 5 min (action Jaise) |
| Vérifier la sync cross-device après migration | 15 min |

### 4.2 Priorité moyenne (Phase 2)

| Tâche | Effort |
|---|---|
| Appliquer `.em-reading-zone` à la page Sermons | 30 min |
| Appliquer `.em-reading-zone` aux événements (description) | 30 min |
| Appliquer `.em-reading-zone` au journal (ai_spiritual_journal UI) | 30 min |
| Option "mode nuit" (dark/sepia background) | 2h |
| Synchronisation des prefs au premier login selon profil | 1h |

### 4.3 Priorité basse (Phase 3)

| Tâche | Effort |
|---|---|
| Icône dans la barre d'outils du lecteur (en plus du bouton fixe) | 1h |
| Shortcut clavier (Ctrl+T pour taille, etc.) | 2h |
| Export des prefs (JSON) | 30 min |

---

## 5. Bugs connus / points d'attention

| Point | Description | Solution |
|---|---|---|
| Hydration flash | Premier rendu SSR utilise les CSS defaults, puis localStorage ajuste | Acceptable — imperceptible sur connexion rapide |
| Fontes Google (Cormorant, Manrope) | Déjà chargées via next/font dans layout.tsx | ✅ Aucune action |
| Font Georgia | Font système — pas de chargement | ✅ Toujours disponible |
| localStorage absent (SSR) | `typeof window === 'undefined'` guard en place | ✅ Géré |
| Supabase table absente | Retourne `ok: true, warn: "..."` | ✅ Graceful fallback |
