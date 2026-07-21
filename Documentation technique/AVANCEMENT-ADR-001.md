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

### A1 — Contrainte d'intégrité ⏳ EN ATTENTE

**Branche cible :** `fix/adr-001-correctifs`  
**Prérequis :** résultats des requêtes SQL B-1 à B-8 du Livrable B de l'audit (non encore exécutées)

**Résultats SQL attendus :** _(à remplir lors de la session A1)_

| Requête | Résultat | Anomalies |
|---|---|---|
| B-1 — valeurs distinctes groups[] | ⏳ | ⏳ |
| B-2 — valeurs distinctes managed_groups[] | ⏳ | ⏳ |
| B-3 — valeurs non conformes aux 13 fonctions | ⏳ | ⏳ |
| B-4 — variantes de casse/accent | ⏳ | ⏳ |
| B-5 — groups[] NULL/vide/chaîne vide | ⏳ | ⏳ |
| B-6 — valeurs distinctes profiles.role | ⏳ | ⏳ |
| B-7 — valeurs pastoral_stage | ⏳ | ⏳ |
| B-8 — divergence profiles ↔ auth.users | ⏳ | ⏳ |

**Travaux :**
1. Table de référence des 13 fonctions et 4 rôles (migration SQL)
2. Migration corrective des valeurs non conformes → **à soumettre à Joe avant exécution**
3. Contrainte CHECK sur `profiles.groups[]` et `profiles.managed_groups[]`
4. Vérification RLS après contrainte
5. Migrations `up` + `down` (réversible)

**Ordre d'exécution impératif :**
1. Sauvegarde complète base → Joe exécute la commande
2. Test en préproduction Supabase
3. Accord Joe → exécution production

---

### A2 — Confidentialité des notes et droits ⏳ ARBITRAGE REQUIS

**Décision attendue :** A2-now (lib/droits/ local, correctif immédiat) ou A2-later (reporter au chantier C)

| Voie | Description | Statut |
|---|---|---|
| A2-now | Droits dans `lib/droits/`, remplacé par `arc-core` lors de la bascule | ⏳ |
| A2-later | Reporter entièrement au chantier C | ⏳ |

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
| `master` | Production (via Vercel CLI) | En avance sur git — nombreux fichiers modifiés non commités |
| `fix/adr-001-correctifs` | Chantier A | ⏳ À créer |
| `feat/socle-api` | Chantier B | ⏳ À créer |

---

*Dernière mise à jour : 21/07/2026 — Session ADR-001 démarrage*
