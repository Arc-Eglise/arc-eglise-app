# AUDIT ADR-001 — Étape 0
## Lecture seule · Préparation du socle API unifié
**Date :** 2026-07-21 · **Scope :** `arc-eglise-app` en entier

---

## 1. Synthèse

**Constat 1 — Bug de casse en production (gravité : haute).**  
`src/lib/actions/membres.ts:552` contient `.includes("Communication")` avec C majuscule. La valeur canonique dans toute la base de code est `"communication"` (minuscule). La permission de sauvegarder les modules vitrine (`savePlatformCards`) échoue silencieusement pour tous les membres de la fonction `communication`. Le bug est en production.

**Constat 2 — Liste des 12 fonctions redéclarée 7 fois, avec une variante divergente.**  
La liste canonique est éclatée dans 7 endroits distincts. L'un d'eux (`GD_GROUPS` dans `EspaceMembresClient.tsx`) inclut `"admin"` comme premier élément, ce qui n'est pas une fonction dans le référentiel officiel. Un autre (`GROUPS` dans `groups.ts`) est indexé par nom d'affichage et non par slug, rendant `getGroup(slug)` défaillant silencieusement.

**Constat 3 — Zéro rate limiting sur les 13 routes `/api/bible-ai/*`.**  
Chaque route appelle des providers AI payants (Groq, Gemini, Anthropic, OpenAI) sans quota par utilisateur ni contrôle de coût. Un membre authentifié peut déclencher des milliers d'appels.

**Niveau de risque étape 1 (contrainte d'intégrité) :** Modéré. Les valeurs de `profiles.groups[]` semblent conformes d'après le schéma, mais la base de données n'a jamais eu de contrainte formelle. Des profils seeds et des migrations manuelles pourraient avoir introduit des valeurs non conformes. Les requêtes SQL du Livrable B permettront de le confirmer avant de poser la contrainte.

---

## 2. Livrable A — Occurrences en dur des rôles et des fonctions

### 2.1 Listes de fonctions redéclarées — inventaire et divergences

| Fichier | Ligne | Nom de la constante | Valeurs (slugs) | Nb items |
|---|---|---|---|---|
| `src/lib/actions/membres.ts` | 682 | `VALID_GROUPS` (Set) | pasteur, chorale, media, social, sanitaire, finance, support, jeunesse, femmes, ecodim, suivi, communication | 12 ✅ |
| `src/components/crm/GroupsEditorClient.tsx` | 7 | `ALL_GROUPS` | pasteur, chorale, media, social, sanitaire, finance, support, jeunesse, femmes, ecodim, suivi, communication | 12 ✅ |
| `src/app/espace-membres/crm/[id]/page.tsx` | 21 | `ALL_GROUPS` | pasteur, chorale, media, social, sanitaire, finance, support, jeunesse, femmes, ecodim, suivi, communication | 12 ✅ |
| `src/app/admin/crm/page.tsx` | 8 | `GROUPS` | pasteur, chorale, media, social, sanitaire, finance, support, jeunesse, femmes, ecodim, suivi, communication | 12 ✅ |
| `src/app/admin/crm/[id]/page.tsx` | 10 | `GROUPS` | pasteur, chorale, media, social, sanitaire, finance, support, jeunesse, femmes, ecodim, suivi, communication | 12 ✅ |
| `src/app/espace-membres/EspaceMembresClient.tsx` | 193 | `GD_GROUPS` | **admin**, pasteur, media, chorale, jeunesse, femmes, social, sanitaire, finance, ecodim, suivi, communication, support | **13 ⚠** |
| `src/app/espace-membres/EspaceMembresClient.tsx` | 3196 | `FUNC_GROUPS` (local) | pasteur, media, chorale, jeunesse, femmes, social, sanitaire, finance, ecodim, suivi, communication, support | 12 ✅ |

**Divergence critique :** `GD_GROUPS` (ligne 193) inclut `"admin"` comme premier élément. Ce tableau est utilisé pour construire la matrice de droits `GD_DEFAULTS` (lignes 197–226) — les colonnes de cette matrice incluent donc `admin` comme si c'était une fonction, ce qui crée une ambiguïté : `admin` est un rôle (`profiles.role`), pas une valeur possible de `profiles.groups[]`. La matrice elle-même est cohérente (elle utilise admin pour autoriser les admins), mais le mélange rôle/fonction dans un même tableau complique la migration vers `arc-core`.

**Divergence dans l'ordre :** l'ordre des slugs varie entre les 7 déclarations (par exemple `GD_GROUPS` place `media` avant `chorale`, contrairement aux autres). Aucun impact fonctionnel — les comparaisons se font par `.includes()` — mais rend les listes difficiles à maintenir manuellement.

### 2.2 Bug de casse — occurrence unique à risque élevé

| Fichier | Ligne | Valeur écrite | Valeur canonique | Impact |
|---|---|---|---|---|
| `src/lib/actions/membres.ts` | 552 | `"Communication"` (C majuscule) | `"communication"` | Permission `savePlatformCards` échoue pour la fonction `communication` — **bug en production** |

Aucune autre occurrence de majuscule ne concerne une valeur de rôle ou de fonction utilisée comme comparateur de permission.

### 2.3 Type `UserRole` déclaré deux fois

| Fichier | Ligne | Déclaration | Note |
|---|---|---|---|
| `src/hooks/useUser.ts` | 7 | `"admin" \| "pasteur" \| "membre" \| "visiteur" \| null` | `null` possible |
| `src/lib/supabase/types.ts` | 1 | `"admin" \| "pasteur" \| "membre" \| "visiteur"` | Sans `null` |

Les deux coexistent sans conflit apparent (le hook gère l'absence de profil via `null`), mais cette duplication doit être remplacée par l'export unique d'`arc-core`.

### 2.4 Bug GROUP_MAP — indexation par nom d'affichage

| Fichier | Ligne | Problème |
|---|---|---|
| `src/lib/groups.ts` | 129–131 | `GROUP_MAP` est construit avec `g.name` comme clé (`"Pasteur"`, `"Équipe Média"`, etc.) pas le slug (`"pasteur"`, `"media"`) |

`getGroup("pasteur")` retourne toujours le fallback générique. Si un composant appelle `getGroup(slug)` pour afficher une icône ou une couleur depuis un slug de `profiles.groups[]`, le résultat sera incorrect. Ce bug est silencieux.

### 2.5 Occurrences réelles par rôle (hors faux positifs)

| Valeur | Fichiers | Occurrences estimées | Principaux contextes |
|---|---|---|---|
| `"admin"` | 25+ | 45+ | Gardes RBAC, affichage conditionnel, listes de rôles |
| `"pasteur"` | 20+ | 38+ | Gardes RBAC, sync groups[], affi. conditionnel |
| `"membre"` | 6 | ~8 | ALLOWED_ROLES, layout, type TS |
| `"visiteur"` | 5 | ~7 | ALLOWED_ROLES, label UI, migration |

| Valeur (fonction) | Fichiers avec `.includes()` | Occurrences comparaison | Note |
|---|---|---|---|
| `"communication"` | 8 | ~14 | Bug majuscule sur 1 occurrence |
| `"support"` | 7 | ~10 | |
| `"media"` | 6 | ~8 | + faux positifs (Storage bucket name "media") |
| `"pasteur"` (fn) | 6 | ~8 | Dual usage : rôle ET fonction |
| Les 8 autres fonctions | 3–4 chacune | 2–5 chacune | Principalement dans les listes de déclaration |

**Faux positifs confirmés et exclus :**
- `"media"` comme nom de bucket Storage (`uploadToStorage("media", ...)`) : 6 occurrences dans `cms.ts` — non pertinentes
- `"media"` comme onglet de l'interface Bible AI (`tab === "media"`) — non pertinent
- `"suivi"` dans des contextes texte ("suivi pastoral", "Pipeline de suivi") — non pertinents
- `"communication"` dans des prompts IA et labels UI — non pertinents

### 2.6 Fichiers les plus concernés (priorité de migration vers arc-core)

1. `src/app/espace-membres/EspaceMembresClient.tsx` — liste GD_GROUPS redéclarée + matrice GD_DEFAULTS (200+ lignes)
2. `src/lib/actions/membres.ts` — VALID_GROUPS + 12 occurrences de comparaison de rôle/fonction
3. `src/lib/actions/cms.ts` — 9 gardes RBAC
4. `src/app/admin/crm/[id]/page.tsx` + `src/app/espace-membres/crm/[id]/page.tsx` — GROUPS + labels redéclarés
5. `src/lib/groups.ts` — à réécrire pour indexer par slug

---

## 3. Livrable B — Requêtes SQL (à exécuter dans Supabase SQL Editor)

**Lien :** https://supabase.com/dashboard/project/fobyvhulyjxwbhusouqz/sql

---

### B-1 — Valeurs distinctes dans `profiles.groups[]`

```sql
-- Liste toutes les valeurs distinctes présentes dans profiles.groups[],
-- avec le nombre de profils qui la contiennent.
-- Ce que regarder : valeurs inconnues, variantes de casse, chaînes vides.
-- Signal d'alerte : toute valeur absente des 12 fonctions officielles.

SELECT
  unnested_group AS group_value,
  COUNT(*)       AS profile_count
FROM profiles,
  LATERAL unnest("groups") AS unnested_group
GROUP BY group_value
ORDER BY profile_count DESC;
```

---

### B-2 — Valeurs distinctes dans `profiles.managed_groups[]`

```sql
-- Liste toutes les valeurs distinctes dans managed_groups[].
-- Ce que regarder : valeurs inconnues, ou groupes non présents dans les 12 fonctions.
-- Signal d'alerte : valeur "admin" (c'est un rôle, pas un groupe gérable).

SELECT
  unnested AS managed_group_value,
  COUNT(*) AS profile_count
FROM profiles,
  LATERAL unnest(managed_groups) AS unnested
WHERE managed_groups IS NOT NULL
  AND array_length(managed_groups, 1) > 0
GROUP BY managed_group_value
ORDER BY profile_count DESC;
```

---

### B-3 — Valeurs non conformes aux 12 fonctions officielles

```sql
-- Détecte les profils dont groups[] contient une valeur hors du référentiel officiel.
-- Ce que regarder : profils avec des valeurs anciennes (ex: "support" en tant que rôle,
-- "diacre", "ancien"), des fautes de frappe, ou des valeurs importées depuis d'autres systèmes.
-- Signal d'alerte : tout résultat. Ces profils bloquent la contrainte d'intégrité.

WITH official_functions AS (
  SELECT unnest(ARRAY[
    'pasteur','chorale','media','social','sanitaire','finance',
    'support','jeunesse','femmes','ecodim','suivi','communication'
  ]) AS fn
)
SELECT
  p.id,
  p.email,
  p.role,
  p."groups",
  non_conf.val AS valeur_non_conforme
FROM profiles p,
  LATERAL unnest(p."groups") AS non_conf(val)
WHERE non_conf.val NOT IN (SELECT fn FROM official_functions)
ORDER BY p.email;
```

---

### B-4 — Détection des variantes de casse et d'accent

```sql
-- Détecte les valeurs qui deviendraient identiques après normalisation
-- (toLowerCase + suppression des accents), mais qui diffèrent telles quelles.
-- Ce que regarder : "Communication" vs "communication", "Média" vs "media", etc.
-- Signal d'alerte : tout résultat (bug de casse en production, cf. Livrable A §2.2).

WITH all_values AS (
  SELECT DISTINCT unnest("groups") AS val FROM profiles
)
SELECT
  val                                               AS valeur_brute,
  lower(
    translate(val,
      'àâäáãéèêëíìîïóòôöõúùûüýÿçñÀÂÄÁÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÝŸÇÑ',
      'aaaaeeeeiiiioooouuuuyycnAAAAEEEEIIIIOOOOUUUUYYCN'
    )
  )                                                 AS valeur_normalisee,
  COUNT(*) OVER (
    PARTITION BY lower(
      translate(val,
        'àâäáãéèêëíìîïóòôöõúùûüýÿçñÀÂÄÁÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÝŸÇÑ',
        'aaaaeeeeiiiioooouuuuyycnAAAAEEEEIIIIOOOOUUUUYYCN'
      )
    )
  )                                                 AS nb_variantes
FROM all_values
ORDER BY valeur_normalisee, val;
-- Si nb_variantes > 1 pour une valeur_normalisee donnée → divergence de casse/accent.
```

---

### B-5 — Profils avec `groups[]` NULL, vide, ou contenant des chaînes vides

```sql
-- Détecte les profils dont le tableau groups[] est absent ou mal formé.
-- Ce que regarder : NULLs (ne devraient pas exister, DEFAULT '{}' dans le schéma),
-- chaînes vides '' (valeur invalide), ou espaces seuls.
-- Signal d'alerte : tout profil avec des valeurs mal formées.

SELECT
  id,
  email,
  role,
  validated,
  "groups",
  CASE
    WHEN "groups" IS NULL                      THEN 'NULL'
    WHEN array_length("groups", 1) IS NULL     THEN 'TABLEAU VIDE {}'
    WHEN '' = ANY("groups")                    THEN 'CHAINE VIDE DANS TABLEAU'
    WHEN ' ' = ANY("groups")                   THEN 'ESPACE SEUL DANS TABLEAU'
    ELSE 'OK'
  END AS anomalie
FROM profiles
WHERE
  "groups" IS NULL
  OR array_length("groups", 1) IS NULL
  OR '' = ANY("groups")
  OR ' ' = ANY("groups")
ORDER BY email;
```

---

### B-6 — Valeurs distinctes de `profiles.role` avec décompte

```sql
-- Liste tous les rôles présents en base avec leur fréquence.
-- Ce que regarder : présence de 'support' (rôle supprimé selon CDC v3.5),
-- valeurs inconnues, ou NULL inattendu.
-- Signal d'alerte : toute valeur hors de (admin, pasteur, membre, visiteur).

SELECT
  role,
  COUNT(*)  AS nb_profils,
  COUNT(*) FILTER (WHERE validated = true)  AS nb_valides,
  COUNT(*) FILTER (WHERE validated = false) AS nb_non_valides
FROM profiles
GROUP BY role
ORDER BY nb_profils DESC;
```

---

### B-7 — Valeurs distinctes de `profiles.pastoral_stage` avec décompte

```sql
-- Liste tous les stages pastoraux présents en base.
-- Ce que regarder : valeurs inconnues, NULLs (si la colonne est nullable),
-- ou stages non conformes au pipeline officiel.
-- Pipeline officiel : visiteur → intégration → actif → formation → responsable

SELECT
  pastoral_stage,
  COUNT(*) AS nb_profils
FROM profiles
GROUP BY pastoral_stage
ORDER BY nb_profils DESC;
-- Si la colonne n'existe pas encore, cette requête retourne une erreur —
-- confirme que la migration add-crm-pipeline.sql doit être vérifiée.
```

---

### B-8 — Profils dont le rôle diverge entre `profiles` et `auth.users.raw_app_meta_data`

```sql
-- Compare le rôle dans profiles avec celui stocké dans les métadonnées Auth Supabase.
-- Une divergence signifie que le trigger de synchronisation (add-role-auth-sync.sql)
-- n'a pas tourné pour ce profil, ou qu'il a été contourné.
-- Ce que regarder : tout résultat (divergence = risque de comportement incohérent
-- si un code futur lit le rôle depuis les JWT claims plutôt que depuis profiles).
-- Signal d'alerte : tout résultat.

SELECT
  p.id,
  p.email,
  p.role                                       AS role_profiles,
  u.raw_app_meta_data->>'role'                 AS role_auth_metadata,
  CASE
    WHEN p.role::text = u.raw_app_meta_data->>'role' THEN 'COHERENT'
    WHEN u.raw_app_meta_data->>'role' IS NULL        THEN 'AUTH_MANQUANT'
    ELSE                                              'DIVERGENCE'
  END AS statut
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role::text IS DISTINCT FROM (u.raw_app_meta_data->>'role')
ORDER BY statut, p.email;
```

---

### B-9 — Comptage et dimensionnement de la table `notes` (ou `member_notes`)

```sql
-- Compte les lignes et auteurs distincts dans la table des notes pastorales.
-- Ce que regarder : volume total (pour dimensionner la migration de confidentialité
-- si les notes doivent passer sous arc-core avec contrôles renforcés).
-- Note : le nom exact de la table peut être "member_notes" selon les migrations.
-- Essayez les deux si la première échoue.

-- Version 1 : si la table s'appelle member_notes
SELECT
  COUNT(*)                      AS nb_notes_total,
  COUNT(DISTINCT author_id)     AS nb_auteurs_distincts,
  COUNT(DISTINCT member_id)     AS nb_membres_concernés,
  MIN(created_at)               AS premiere_note,
  MAX(created_at)               AS derniere_note
FROM member_notes;

-- Version 2 : si la table s'appelle notes
-- SELECT COUNT(*), COUNT(DISTINCT author_id), COUNT(DISTINCT member_id),
--   MIN(created_at), MAX(created_at) FROM notes;
```

---

## 4. Livrable C — Cartographie des points de lecture du rôle

### 4.1 Inventaire des sources

| Emplacement | Fichier | Source lue | Usage | Divergence possible ? |
|---|---|---|---|---|
| Hook client React | `src/hooks/useUser.ts` | `profiles.role`, `profiles.groups` via `createClient()` (cookies) | Affichage conditionnel côté client, dérivation `isAdmin`, `isPasteur`, `isMembre` | Oui — mis en cache dans l'état React, ne se met pas à jour sans rechargement |
| Layout espace membres | `src/app/espace-membres/layout.tsx` | `profiles.role`, `profiles.validated` via `createClient()` | Garde de route serveur (redirect si non autorisé) | Non — relecture à chaque navigation |
| Layout admin | `src/app/admin/layout.tsx` | `profiles.role`, `profiles.groups` via `createClient()` | Garde de route serveur (redirect si non autorisé) | Non |
| Server Actions CRM | `src/lib/actions/crm.ts` | `profiles.role`, `profiles.groups` via `createClient()` | Autorisation actions (update role, groups, block, delete) | Non |
| Server Actions membres | `src/lib/actions/membres.ts` | `profiles.role`, `profiles.groups` via `createClient()` | Autorisation modifications profils, invitations, envoi SMS | Non |
| Server Actions CMS | `src/lib/actions/cms.ts` | `profiles.role`, `profiles.groups` via `createClient()` | Autorisation modifications CMS (événements, sermons, témoignages, site) | Non |
| Route API mail | `src/app/api/mail/messages/route.ts` | `profiles.role`, `profiles.groups` via `createClient()` | Détermine les boîtes M365 autorisées | Non |
| Route API mobile | `src/app/api/mobile/me/route.ts` | `profiles.role`, `profiles.groups` via `createAdminClient()` + Bearer JWT | Profil exposé à l'app mobile | Non |
| Middleware Next.js | `src/middleware.ts` | `auth.getUser()` uniquement | Vérifie seulement l'existence d'une session (pas le rôle) | N/A |
| Routes bible-ai | `src/app/api/bible-ai/*.ts` | `requireAuth()` → `auth.getUser()` uniquement | Vérifie seulement l'authentification, pas le rôle | N/A |

### 4.2 Synchronisation `profiles` ↔ `auth.users`

Le fichier `supabase/add-role-auth-sync.sql` crée deux triggers :

**Direction 1 — profiles → auth (le cas normal) :**  
Trigger `trg_sync_role_to_auth` : `AFTER INSERT OR UPDATE OF role ON profiles` → met à jour `auth.users.raw_app_meta_data->>'role'`.  
Ce trigger se déclenche à chaque changement de rôle depuis l'application (`setMemberRole()` dans `crm.ts`).

**Direction 2 — auth → profiles (administration dashboard) :**  
Trigger `trg_sync_auth_to_role` : `AFTER UPDATE OF raw_app_meta_data ON auth.users` → met à jour `profiles.role`.  
Protection : si la valeur dans `app_metadata` n'est pas un `user_role` valide, l'exception est capturée silencieusement et `profiles.role` n'est pas modifié.

**RLS policies :** Les 4 policies de `schema.sql` s'appuient toutes exclusivement sur `profiles` via `auth.uid()` et des sous-requêtes `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = ...)`. Aucune RLS policy ne consulte `auth.users.raw_app_meta_data`. La synchronisation vers auth est donc uniquement pour la lisibilité dans le dashboard Supabase, pas pour la sécurité.

### 4.3 Mise en cache côté client

`useUser.ts` stocke le profil dans le state React local. Ce cache :
- Se réinitialise à chaque rechargement de page (pas de localStorage)
- Se met à jour automatiquement lors des changements d'état auth (`onAuthStateChange`)
- **Ne reflète pas** un changement de rôle fait par un admin tant que l'utilisateur ne se reconnecte pas ou n'actualise pas la page

Impact opérationnel : si un admin rétrograde un `pasteur` en `membre`, l'ancien pasteur peut continuer à voir l'espace admin côté client jusqu'au prochain rechargement. Les gardes serveur (layout, Server Actions) bloqueront les actions réelles.

### 4.4 Droits critiques si divergence sources

| Droit | Source utilisée | Risque si divergence |
|---|---|---|
| Accès espace membres | Layout serveur → `profiles.role` + `validated` | Faible — relecture à chaque navigation |
| Accès panel admin | Layout serveur → `profiles.role` + `groups` | Faible — relecture à chaque navigation |
| Actions CRM (block, delete, changer rôle) | Server Actions → `profiles.role` | Faible — relecture par action |
| Affichage boutons admin (côté client) | `useUser.ts` → state React | Modéré — un rôle révoqué peut voir les boutons (sans pouvoir les utiliser côté serveur) |
| `/api/mobile/me` | Bearer JWT validé → `profiles.role` | Faible — lecture directe DB |

---

## 5. Livrable D — Classification des routes API

### 5.1 Candidates à `/api/v1` (priorité mobile ou contrat public)

| Route | Méthodes | Appelée depuis | Nature données | Candidate ? | Justification |
|---|---|---|---|---|---|
| `/api/mobile/me` | GET | App mobile (Bearer JWT) | Profil membre complet | ✅ OUI | Endpoint mobile existant, contrat déjà établi |
| `/api/copilot` | POST | Page d'accueil publique | Assistant IA église | ✅ OUI | Public, pas d'auth — utilisable mobile/widget tiers |
| `/api/contact` | POST | Formulaire public | Message de contact | ✅ OUI | Public, utile depuis toute surface |
| `/api/bible/chapter` | GET | BibleReader web | Contenu Bible externe | ✅ OUI | Lecture Bible, nécessaire mobile |
| `/api/bible/search` | GET | BibleReader web | Recherche Bible | ✅ OUI | idem |
| `/api/bible/versions` | GET | BibleReader web | Versions Bible | ✅ OUI | idem |
| `/api/bible/books` | GET | BibleReader web | Livres Bible | ✅ OUI | idem |
| `/api/bible/crossrefs` | GET | BibleReader web | Références croisées | ✅ OUI | idem |
| `/api/bible-ai/chat` | POST | espace-membres/ai-biblique | Chat streaming | ✅ OUI | Cœur de l'AI biblique — nécessaire mobile |
| `/api/bible-ai/dictionary` | GET, POST | DictionaryPanel | Dictionnaire théo + personnages | ✅ OUI | Valeur haute pour app mobile |
| `/api/bible-ai/plans` | POST | BibleAIClient | Plans de lecture | ✅ OUI | Feature mobile explicitement planifiée |
| `/api/bible-ai/sermons` | POST | SermonSummariesManager | Résumés + gestion sermons | ✅ OUI | Sermons consultables mobile |
| `/api/bible-ai/explain` | POST | BibleAIClient | Explication versets | ✅ OUI | Feature AI mobile |
| `/api/bible-ai/meditate` | POST | BibleAIClient | Méditation guidée | ✅ OUI | Feature AI mobile |
| `/api/bible-ai/theology` | POST | BibleAIClient | Théologie | ✅ OUI | Feature AI mobile |
| `/api/bible-ai/journal` | POST | BibleAIClient | Journal spirituel | ✅ OUI | Données personnelles longue durée — mobile prioritaire |
| `/api/bible-ai/groups` | POST | BibleAIClient | Groupes d'étude | ✅ OUI | Collaboration mobile |
| `/api/bible-ai/search` | POST | BibleAIClient | Recherche biblique | ✅ OUI | Feature mobile |
| `/api/bible-ai/crossrefs` | POST | BibleAIClient | Références croisées IA | ✅ OUI | Feature mobile |
| `/api/bible-ai/compare` | POST | BibleAIClient | Comparaison versets | ✅ OUI | Feature mobile |
| `/api/bible-ai/media` | POST | BibleAIClient | Recommandations médias | ✅ OUI | Feature mobile |
| `/api/bible-ai/preferences` | GET, PATCH | BibleAIClient | Préférences AI | ✅ OUI | Settings partagés mobile/web |
| `/api/profile/spiritual` | GET, PATCH | SpiritualProfileSection | Profil spirituel | ✅ OUI | Données clés pour personnalisation mobile |
| `/api/activity/log` | POST | Divers composants | Log d'activité | ✅ OUI | Analytique côté mobile |
| `/api/member-keys` | GET, POST, DELETE | MemberAIKeys | Clés AI perso | ✅ OUI | Feature AI, sync mobile/web |
| `/api/reading-preferences` | GET, PATCH | ReadingPrefsContext | Préférences lecture | ✅ OUI | Sync settings mobile/web |
| `/api/events/ical` | GET | espace-membres/agenda | Export iCal | ✅ OUI | Intégration calendrier mobile |

### 5.2 Routes internes (web uniquement, pas candidates à /api/v1)

| Route | Méthodes | Justification |
|---|---|---|
| `/api/mail/messages` | GET | Boîte M365, admin seulement, pas mobile |
| `/api/mail/message` | GET | idem |
| `/api/mail/forward` | POST | idem |
| `/api/mail/reply` | POST | idem |
| `/api/mail/send` | POST | idem |
| `/api/auth/signout` | POST | Gestion session web (cookies) |
| `/api/auth/reset-password` | POST | Flux web avec redirect URL |
| `/api/auth/change-password` | POST | Flux web |
| `/api/stripe/webhook` | POST | Endpoint Stripe dédié, pas mobile |
| `/api/stripe/create-payment-intent` | POST | Paiements web |
| `/api/activity/summary` | GET | Analytics admin web |
| `/api/profile/refresh-memo` | POST | Cache interne AI, opération background |
| `/api/youtube/videos` | GET | Embed YouTube web uniquement |
| `/api/events/[id]/ical` | GET | iCal spécifique — doublonne `/api/events/ical` |

### 5.3 Routes à trancher (arbitrage demandé)

| Route | Méthodes | Arguments POUR /api/v1 | Arguments CONTRE |
|---|---|---|---|
| `/api/bible-ai/events` | POST | Récupère des événements de l'église via IA — mobile pourrait en avoir besoin | Doublon partiel avec les données événements déjà dans `/api/mobile/me` |
| `/api/auth/forgot-password` | POST | L'app mobile a besoin d'un flux de reset de mot de passe | Le flux actuel redirige vers une URL web (`/auth/callback?next=/nouveau-mot-de-passe`) — incompatible avec deep link mobile sans adaptation |

### 5.4 Problèmes relevés dans les routes existantes

| Route | Problème | Gravité |
|---|---|---|
| `/api/bible-ai/*` (13 routes) | **Zéro rate limiting.** Un membre authentifié peut déclencher N appels à Groq/Gemini/Anthropic sans limite. Pas de compteur par utilisateur, pas de quota journalier. | Haute — risque de coût |
| `/api/bible-ai/sermons` | Actions `delete_summary` et `update_summary` vérifient seulement `requireAuth()`, pas que l'appelant est admin/pasteur ou auteur du résumé. Tout membre authentifié peut supprimer le résumé d'un sermon. | Haute — contournement de droits |
| `/api/bible-ai/groups` | Action `create` n'a pas de vérification de doublon de nom. | Basse |
| `/api/stripe/webhook` | `STRIPE_WEBHOOK_SECRET` absent en production → retourne 500 au lieu de rejeter proprement. | Moyenne — à configurer avant activation |
| `/api/contact` | Validation entrées présente ✅. Pas de rate limiting (risque de spam). | Basse |
| `/api/bible-ai/explain`, `/api/bible-ai/meditate` | Commentaires `// TODO: intégrer au system prompt` — les summaries de sessions sont chargés mais non utilisés. | Basse (performance/qualité) |

---

## 6. Anomalies relevées mais non corrigées

| # | Fichier | Ligne | Description | Gravité estimée |
|---|---|---|---|---|
| A1 | `src/lib/actions/membres.ts` | 552 | `.includes("Communication")` — majuscule incorrecte. La vérification échoue toujours pour la fonction `communication`. **Bug en production.** | 🔴 Haute |
| A2 | `src/lib/groups.ts` | 129 | `GROUP_MAP` indexé par `g.name` (nom affiché) pas par slug. `getGroup("pasteur")` retourne le fallback. Bug silencieux. | 🟡 Moyenne |
| A3 | `src/app/espace-membres/EspaceMembresClient.tsx` | 193 | `GD_GROUPS` inclut `"admin"` comme si c'était une fonction — mélange rôle/fonction. | 🟡 Moyenne (conceptuelle) |
| A4 | `src/app/api/bible-ai/sermons/route.ts` | 124–138 | `update_summary` et `delete_summary` sans contrôle de droit (admin/pasteur). Tout membre peut supprimer un résumé de sermon. | 🔴 Haute (contournement RBAC) |
| A5 | Toutes les routes `/api/bible-ai/*` | — | Absence totale de rate limiting sur 13 routes AI payantes. Risque financier. | 🔴 Haute |
| A6 | `src/lib/supabase/types.ts` vs `src/hooks/useUser.ts` | 1 / 7 | `UserRole` déclaré deux fois. | 🟢 Basse |
| A7 | `src/app/api/bible-ai/explain/route.ts`, `meditate`, `theology` | 47–48, 36, 32 | `summaries` chargées mais jamais passées au system prompt (`void summaries`). | 🟢 Basse (qualité AI) |
| A8 | `src/lib/mail/mailbox-config.ts` | — | Boîte `hospitalite@arc-eglise.ch` présente dans les labels d'affichage mais pas dans les 12 fonctions officielles. La fonction `hospitalite` n'existe pas dans le référentiel. | 🟡 Moyenne |
| A9 | `src/app/api/stripe/webhook/route.ts` | 30 | `// TODO : enregistrer en base Supabase, envoyer email de confirmation` — les dons reçus ne sont pas enregistrés. | 🟡 Moyenne (prod) |

---

## 7. Points nécessitant votre arbitrage

**Q1.** Le tableau `GD_GROUPS` dans `EspaceMembresClient.tsx` (ligne 193) inclut `"admin"` pour construire la matrice de droits `GD_DEFAULTS`. Dans `arc-core`, souhaitez-vous que la matrice de droits soit **rôle × fonction** (deux axes séparés), ou **un axe unifié** comprenant rôles et fonctions ?

**Q2.** La boîte mail `hospitalite@arc-eglise.ch` apparaît dans `mailbox-config.ts` mais `hospitalite` n'est pas dans les 12 fonctions officielles. Est-ce une 13e fonction non documentée, ou une boîte orpheline à supprimer ?

**Q3.** La route `/api/auth/forgot-password` est interne (flux web). L'app mobile aura-t-elle son propre flux de reset de mot de passe (deep link), ou doit-elle pointer vers le site web ? Cela détermine si la route doit rejoindre `/api/v1` ou rester interne.

**Q4.** L'anomalie A4 (`update_summary`/`delete_summary` sans contrôle RBAC) est identifiée mais non corrigée. Souhaitez-vous que ce correctif soit inclus dans l'étape 0 du chantier ADR-001, ou qu'il soit traité comme un bug séparé hors chantier ?

**Q5.** L'absence de rate limiting sur les routes `/api/bible-ai/*` est identifiée. Ce problème sera-t-il adressé dans l'étape 2 (création d'`arc-core`) via un middleware centralisé, ou souhaitez-vous un correctif immédiat sur les routes existantes avant de commencer le chantier ?

---

## 8. Estimation de l'étape 1 (contrainte d'intégrité sur `profiles.groups[]`)

### Volume et risques identifiés

**Volume inconnu côté DB :** Les requêtes SQL du Livrable B sont nécessaires pour chiffrer le nombre de profils non conformes. L'application gère une communauté réelle de membres — les requêtes B-3 et B-5 donneront les chiffres exacts.

**Risques principaux :**

1. **Présence de `"support"` comme rôle dans `profiles.role`** : la migration `supabase/migrations/remove-support-role.sql` prévue (mais non vérifiée) doit être appliquée avant toute contrainte. Si des profils ont encore `role = 'support'`, la contrainte d'intégrité sur l'enum `user_role` échoue.

2. **Profils seeds** : les migrations de setup (`setup-admin-arceglise.sql`, `fix-emerance-pasteur.sql`, `fix-kylian-luzolo.sql`) ont été appliquées manuellement. Des valeurs introduites lors de ces seeds pourraient diverger du référentiel.

3. **Bug de casse (A1)** : le bug `.includes("Communication")` en production n'a pas modifié de données en base — il a seulement empêché certaines actions. Il ne crée pas de données non conformes en DB.

4. **Boîte `hospitalite` (A8)** : si des profils ont `"hospitalite"` dans `groups[]`, la contrainte d'intégrité les rejettera. Réponse nécessaire à la Q2.

5. **`managed_groups[]`** : cette colonne n'a pas de contrainte formelle non plus. Les requêtes B-1 et B-2 révéleront l'état réel.

**Ordre recommandé avant de poser la contrainte :**
1. Exécuter les requêtes B-3, B-4, B-5 pour inventorier les non-conformités
2. Corriger les données non conformes (UPDATE ciblés)
3. Vérifier et appliquer `remove-support-role.sql` si nécessaire
4. Poser la contrainte CHECK sur `groups[]` et `managed_groups[]`

---

*Audit réalisé en lecture seule le 2026-07-21 — Session ADR-001 Étape 0*  
*Fichiers touchés : ce rapport + `CLAUDE.md` (règle d'isolation)*  
*Aucune modification de code, configuration ou base de données.*
