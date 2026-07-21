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

### A2 — Confidentialité des notes et droits ⏳ DÉCISION PRISE : A2-now

**Décision :** A2-now — `lib/droits/` local, remplacé par `arc-core` lors de la bascule.

**Motif :** les notes pastorales sont accessibles à la fonction `communication` depuis la production. Reporter au chantier C laisserait cette faille ouverte pendant plusieurs semaines. Le module `lib/droits/` est conçu pour être exactement remplacé par `arc-core/droits/` lors de la bascule — aucune duplication ne sera maintenue à terme.

**Statut :** ⏳ À démarrer (après complétion de A1)

---

## Chantier B — Socle en isolation totale

**Branche :** `feat/socle-api` — **jamais fusionnée dans `main` sans accord écrit**

| Sous-étape | Description | État |
|---|---|---|
| B0 | Isolation + script de vérification | ⏳ |
| B1 | `arc-core` (référentiel, droits, schemas, errors) | ⏳ |
| B2 | `/api/v1` + OpenAPI | ⏳ |
| B3 | Quotas, rate limiting, journalisation | ⏳ |
| B4 | Validation du socle | ⏳ |

---

## Chantier C — Bascule

🔒 **Bloqué — aucune sous-étape ne démarre sans feu vert écrit de Joe.**

---

## Git — État des branches

| Branche | Rôle | État |
|---|---|---|
| `master` | Production (via Vercel CLI) | ✅ Commité — `3cd215e` session 8 |
| `fix/adr-001-correctifs` | Chantier A | ✅ Créée — migrations A1 prêtes (data_correction incomplète) |
| `feat/socle-api` | Chantier B | ⏳ À créer (après A1 finalisé) |

---

*Dernière mise à jour : 21/07/2026 — Session ADR-001 A1 TERMINÉ + A2 en cours (décision A2-now)*
