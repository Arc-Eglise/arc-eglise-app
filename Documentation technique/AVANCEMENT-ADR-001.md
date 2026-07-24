# Journal de chantier — ADR-001
**Projet :** ARC Église — arc-eglise.ch  
**ADR version :** 2.1  
**Démarré le :** 21/07/2026

---

## Étape 0 — Audit (lecture seule) ✅ TERMINÉ — 21/07/2026

**Livrables produits :**
- `Documentation technique/AUDIT-ADR-001-Etape-0.md` — rapport complet
- `CLAUDE.md` — section CHANTIER ADR-001 ajoutée (règle d'isolation + référentiel)

**Anomalies identifiées (A1–A9) :** toutes corrigées dans la même session (code applicatif uniquement — pas de contrainte DB)

| Anomalie | Description | Statut |
|---|---|---|
| A1 (audit) | `.includes("Communication")` majuscule dans membres.ts | ✅ Corrigé session 8 |
| A2 (audit) | GROUP_MAP indexé par nom affiché, pas slug | ✅ Corrigé session 8 |
| A3 (audit) | GD_GROUPS inclut "admin" (conceptuel) | ℹ️ Noté — design documenté |
| A4 (audit) | delete_summary/update_summary sans contrôle RBAC | ✅ Corrigé session 8 |
| A5 (audit) | Zéro rate limiting sur 13 routes bible-ai | ✅ Corrigé session 8 (SQL + lib + 5 routes) |
| A6 (audit) | UserRole déclaré deux fois | ✅ Corrigé session 8 |
| A7 (audit) | summaries chargées mais non passées aux prompts AI | ✅ Corrigé session 8 |
| A8 (audit) | hospitalite absente du référentiel | ✅ Corrigé session 8 (13e fonction ajoutée) |
| A9 (audit) | Dons Stripe non enregistrés | ✅ Corrigé session 8 (table donations + webhook) |

**Points en suspens issus de l'audit :**

| Question | Décision |
|---|---|
| Q1 — Matrice droits : rôle × fonction ou axe unifié ? | ⏳ Non tranchée |
| Q2 — hospitalite : 13e fonction ou boîte orpheline ? | ✅ **13e fonction** (confirmé session 8) |
| Q3 — forgot-password mobile : deep link ou web ? | ⏳ Non tranchée |
| Q4 — A4 dans ADR ou bug séparé ? | ✅ Traité comme bug urgent hors ADR (session 8) |
| Q5 — Rate limiting : immédiat ou via arc-core ? | ✅ Correctif immédiat appliqué (session 8) |

**Référentiel officiel au 21/07/2026 :**
- 4 rôles : `visiteur` | `membre` | `pasteur` | `admin`
- 13 fonctions : `pasteur` `chorale` `media` `social` `hospitalite` `sanitaire` `finance` `support` `jeunesse` `femmes` `ecodim` `suivi` `communication`
- ⚠️ Le rapport d'audit mentionne « 12 fonctions » — hospitalite a été ajoutée après l'audit

---

## Chantier A — Correctifs de production

### A1 — Contrainte d'intégrité ✅ TERMINÉ — 21/07/2026

**Branche :** `fix/adr-001-correctifs`

**Migrations exécutées en production (21/07/2026) :**

| Fichier | Contenu | Statut |
|---|---|---|
| `20260721000010_adr001_a1_referentiel.up.sql` | Tables `arc_referentiel_roles`(4), `arc_referentiel_functions`(13), `arc_referentiel_pipeline`(5) | ✅ Exécuté |
| `20260721000011_adr001_a1_data_correction.up.sql` | Vérification données — aucune correction nécessaire | ✅ Vérifié (base propre) |
| `20260721000012_adr001_a1_check_constraint.up.sql` | 4 contraintes CHECK sur profiles | ✅ Exécuté |

**Contraintes CHECK actives sur `profiles` :**
- `chk_profiles_role_valid` : role IN (visiteur, membre, pasteur, admin) — redondant avec ENUM user_role mais documentaire
- `chk_profiles_groups_valid` : groups[] ⊆ {13 fonctions}
- `chk_profiles_managed_groups_valid` : managed_groups[] IS NULL OU ⊆ {13 fonctions}
- `chk_profiles_pastoral_stage_valid` : pastoral_stage IS NULL OU IN (5 étapes)
- `profiles_pastoral_stage_check` : pré-existante, compatible ✅

**Résultats SQL B-1 à B-8 (exécutés en autonomie via API Supabase) :**

| Requête | Résultat | Anomalies |
|---|---|---|
| B-1 groups[] | chorale(1), communication(1), jeunesse(1), media(1), pasteur(1), support(1) | ✅ Aucune |
| B-2 managed_groups[] | 0 résultat | ✅ Aucun manager assigné |
| B-3 non-conformes | 0 résultat | ✅ Base propre |
| B-4 variantes casse | 6 valeurs, nb_variantes=1 chacune | ✅ Toutes canoniques |
| B-5 vides/NULL | 3 profils groups=[] (admin, visiteur, testmembre) | ℹ️ Normal |
| B-6 roles | membre(4/3v), admin(1), visiteur(1/0v) — total 6 profils | ⚠️ Aucun role=pasteur en base |
| B-7 pastoral_stage | actif(4), visiteur(2) | ✅ Conformes |
| B-8 divergence auth | 0 divergence | ✅ Triggers sync OK |
| B-9 notes | 0 note pastorale | ℹ️ Aucune donnée à migrer pour A2 |

**Notes importantes :**
- `profiles.role` est un ENUM `user_role` (pas TEXT comme indiqué dans l'audit)
- Aucun profil avec `role=pasteur` → Pedro/Emerance n'ont pas encore de compte
- 0 notes pastorales → migration A2 (confidentialité) triviale

**Critère de sortie ADR-001 A1 :** ✅ Vérifié
- INSERT role='superadmin' → rejeté par ENUM user_role
- INSERT groups='{diacre}' → rejeté par `chk_profiles_groups_valid` (ERROR 23514)

---

### A2 — Confidentialité des notes et droits ✅ TERMINÉ — 21/07/2026

**Décision :** A2-now — `lib/droits/` local, remplacé par `arc-core` lors de la bascule.

**Commit :** `2715039` — branche `fix/adr-001-correctifs`

**Migration SQL (exécutée en production) :**

| Fichier | Contenu | Statut |
|---|---|---|
| `20260721000013_adr001_a2_notes_confidentialite.up.sql` | Colonne `member_notes.confidentialite` + CHECK + 4 RLS | ✅ Exécuté |
| `20260721000013_adr001_a2_notes_confidentialite.down.sql` | Rollback complet | ✅ Écrit |

**RLS `member_notes` actives :**
- `notes_select` : admin/pasteur → tout ; suivi → partagee_suivi + ses propres notes
- `notes_insert` : admin | pasteur | suivi (auteur = auth.uid())
- `notes_update` / `notes_delete` : auteur uniquement

**Code applicatif livré :**
- `src/lib/droits/index.ts` — 10 droits nommés (`peutVoirCRM`, `peutLireNotesPastorales`, `peutEcrireNotesPastorales`…)
- `membres.ts` — `assertCRMWriter` (admin|pasteur|suivi), `addMemberNote` + `updatePastoralStage` utilisent assertCRMWriter, `addMemberNote` accepte `confidentialite`
- `crm/page.tsx` — garde étendue à suivi + support
- `crm/[id]/page.tsx` — garde étendue, panneaux DangerActions/Rôle/Fonctions/Manager masqués pour suivi/support, formulaire note avec sélecteur confidentialité, badge confidentialité sur chaque note
- `EspaceMembresClient.tsx` — import droits, `peutVoirCRM` pour l'onglet CRM (suivi y accède désormais), `canAdmin` conservé pour le panneau Administration

**Matrice d'accès effective :**
| Opération | admin | pasteur | suivi | support | comm |
|---|---|---|---|---|---|
| Voir CRM (liste + fiche) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Lire notes (partagee_suivi) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Lire notes (confidentielle_pasteur) | ✅ | ✅ | ses propres | ❌ | ❌ |
| Créer notes | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mettre à jour pipeline | ✅ | ✅ | ✅ | ❌ | ❌ |
| Changer rôle/fonctions/ban | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Chantier B — Socle en isolation totale

**Branche :** `feat/socle-api` — **jamais fusionnée dans `main` sans accord écrit**

| Sous-étape | Description | État |
|---|---|---|
| B0 | Isolation + script de vérification | ✅ 21/07/2026 |
| B1 | `arc-core` (référentiel, droits, schemas, errors) | ✅ 21/07/2026 |
| B2 | `/api/v1` + OpenAPI | ✅ 21/07/2026 |
| B3 | Quotas, rate limiting, journalisation | ✅ 24/07/2026 |
| B4 | Validation du socle | ⏳ |

---

### B0 — Isolation + script de vérification ✅ TERMINÉ — 21/07/2026

**Livrables :**

| Fichier | Rôle |
|---|---|
| `packages/arc-core/package.json` | Package `@arc/core` — privé, name + types |
| `packages/arc-core/src/index.ts` | Squelette vide (contenu réel : B1) |
| `packages/arc-ai-engine/package.json` | Package `@arc/ai-engine` — dépend de `@arc/core` |
| `packages/arc-ai-engine/src/index.ts` | Squelette vide (contenu réel : B1–B3) |
| `scripts/check-isolation.js` | Vérifie les règles I1/I2/I3 à chaque session |
| `package.json` | `workspaces: ["packages/*"]` + script `check:isolation` |

**Règles d'isolation vérifiées automatiquement :**
- **I1** — `src/` ne doit pas importer `@arc/core` ni `@arc/ai-engine`
- **I2** — `arc-core` ne doit pas importer `@arc/ai-engine` ni `src/app/`
- **I3** — `arc-ai-engine` ne doit pas importer depuis `src/app/`

**Résultat du test :** `node scripts/check-isolation.js` → ✅ aucune violation

**Convention d'utilisation :** lancer `npm run check:isolation` en début de chaque session de travail sur `feat/socle-api`.

---

## Chantier C — Bascule

🔒 **Bloqué — aucune sous-étape ne démarre sans feu vert écrit de Joe.**

---

## Git — État des branches

| Branche | Rôle | État |
|---|---|---|
| `master` | Production (via Vercel CLI) | ✅ À jour — merge Chantier A + bible-ai (21/07/2026) |
| `fix/adr-001-correctifs` | Chantier A | ✅ Mergée dans master — supprimée |
| `feat/socle-api` | Chantier B | ✅ Créée — B0 terminé |

---

### B1 — `@arc/core` ✅ TERMINÉ — 21/07/2026

**Fichiers livrés dans `packages/arc-core/src/` :**

| Fichier | Contenu |
|---|---|
| `referentiel/roles.ts` | `ROLES`, `Role`, `ROLE_LABELS`, `isAdminOuPasteur()` |
| `referentiel/fonctions.ts` | `FONCTIONS` (13), `Fonction`, `FONCTION_LABELS`, `isFonctionValide()` |
| `referentiel/pipeline.ts` | `PIPELINE_STAGES` (5), `PipelineStage`, `PIPELINE_LABELS`, `PIPELINE_ORDER`, `peutProgresserVers()` |
| `droits/types.ts` | `ProfileLike`, `NoteLike`, `NiveauConfidentialite` |
| `droits/matrice.ts` | `droits` — 10 droits nommés, signatures identiques à `src/lib/droits/index.ts` |
| `errors/index.ts` | `ArcError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError`, `ConflictError`, `RateLimitedError`, `isArcError()` |
| `index.ts` | Re-export unique — `export * from "./referentiel"` etc. |

**Vérification :** `tsc --noEmit` → 0 erreur · `check-isolation` → ✅ aucune violation

### B2 — `/api/v1` + OpenAPI ✅ TERMINÉ — 21/07/2026

**Endpoints livrés (dans `src/app/api/v1/`) :**

| Route | Auth | Description |
|---|---|---|
| `GET /api/v1/health` | ❌ public | Health check Supabase DB — 200 ok / 503 dégradé |
| `GET /api/v1/referentiel` | ❌ public | Rôles · fonctions · pipeline depuis `@arc/core` |
| `GET /api/v1/profile/me` | ✅ cookie | Profil + droits calculés par `@arc/core` |
| `GET /api/v1/openapi.json` | ❌ public | Spec OpenAPI 3.1.0 auto-générée |

**Fichiers partagés `_lib/` :**
- `auth.ts` — `requireAuthV1()` et `getUserWithProfile()` (lève `UnauthorizedError`)
- `response.ts` — `ok()`, `fromArcError()`, `handleError()`

**Configuration :**
- `tsconfig.json` : paths `@arc/core` et `@arc/ai-engine` → `packages/*/src/index.ts`
- `next.config.mjs` : `transpilePackages: ["@arc/core", "@arc/ai-engine"]`
- `check-isolation.js` : règle I1 exclut `src/app/api/v1/` (fait partie du socle)

**Isolation :** `check-isolation` → ✅ aucune violation

### B3 — Quotas, rate limiting, journalisation ✅ TERMINÉ — 24/07/2026

**Logique pure dans `@arc/core` (`packages/arc-core/src/quotas/`) :**

| Fichier | Contenu |
|---|---|
| `quotas/types.ts` | `QuotaCategory` (public/read/write/ai), `RateLimitPolicy`, `RateLimitDecision` |
| `quotas/index.ts` | `BASE_RATE_LIMITS`, `ROLE_MULTIPLIER`, `resolveRateLimit()`, `currentWindowKey()`, `secondsUntilReset()`, `evaluateRateLimit()` — **100 % pur, aucune I/O** |

Politiques de base (fenêtre glissante 60 s, par utilisateur ou IP) : public 120 · read 240 · write 60 · ai 20.
Multiplicateur de rôle : visiteur/membre ×1 · pasteur ×4 · admin ×10.

**Infrastructure du socle (`src/app/api/v1/_lib/`) :**

| Fichier | Rôle |
|---|---|
| `handler.ts` | `withApiV1({category, requireAuth}, handler)` — wrapper central : identification → garde auth → rate limit → exécution → en-têtes `X-RateLimit-*` + `X-Request-Id` → gestion d'erreurs typées → journalisation |
| `rate-limit.ts` | `enforceRateLimit()` — incrément atomique via RPC `arc_api_increment_rate_limit`, lève `RateLimitedError` (429 + `Retry-After`). **Fail-open** si stockage indisponible |
| `logging.ts` | `logApiRequest()` — log structuré stdout (fiable) + insertion best-effort non bloquante dans `arc_api_log` |
| `auth.ts` | + `getOptionalUserWithProfile()` (ne lève pas) + type `V1Profile` |
| `response.ts` | `fromArcError()` pose l'en-tête `Retry-After` sur les `RateLimitedError` |

**Migration (NON exécutée — attend le feu vert, jouée en B4) :**
- `supabase/migrations/20260724000001_adr001_b3_socle_quotas.up.sql` / `.down.sql`
- Tables **propres au socle** `arc_api_rate_limit` (compteur générique par bucket/fenêtre) + `arc_api_log` (journal, RLS lecture admin) + RPC `arc_api_increment_rate_limit` (SECURITY DEFINER). N'interfère pas avec `ai_rate_limit` (routes bible-ai héritées).

**Câblage des routes :**
- `health` (public) + `profile/me` (read, auth) → passent par `withApiV1` → **dynamiques**, rate-limitées, journalisées.
- `referentiel` + `openapi.json` → **restent statiques** (specs publiques cacheables ; rate-limiter une réponse CDN n'a pas de sens). OpenAPI documente désormais en-têtes `X-RateLimit-*`, `Retry-After` et réponses 429.

**Vérification :** `check:isolation` → ✅ · `tsc --noEmit` → 0 erreur · `next build` → ✅ (health/profile-me = ƒ dynamique, referentiel/openapi = ○ statique).

*Dernière mise à jour : 24/07/2026 — B3 TERMINÉ — quotas + rate limiting + journalisation. Reste B4 (validation du socle).*
