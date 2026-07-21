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

### A1 — Contrainte d'intégrité 🔶 EN COURS — EN ATTENTE SQL

**Branche :** `fix/adr-001-correctifs` ✅ créée (21/07/2026)

**Migrations créées :**

| Fichier | Contenu | Statut |
|---|---|---|
| `20260721000010_adr001_a1_referentiel.up.sql` | Tables `arc_referentiel_roles`, `arc_referentiel_functions`, `arc_referentiel_pipeline` | ✅ Prêt |
| `20260721000010_adr001_a1_referentiel.down.sql` | Rollback tables de référence | ✅ Prêt |
| `20260721000011_adr001_a1_data_correction.up.sql` | Corrections données non conformes | ⚠️ INCOMPLET — bloqué sur résultats SQL B-1→B-8 |
| `20260721000011_adr001_a1_data_correction.down.sql` | Rollback (manuel, sauvegarde requise) | ✅ Prêt |
| `20260721000012_adr001_a1_check_constraint.up.sql` | CHECK sur role, groups[], managed_groups[], pastoral_stage | ✅ Prêt |
| `20260721000012_adr001_a1_check_constraint.down.sql` | Rollback contraintes | ✅ Prêt |

**🚧 BLOQUANT :** Les résultats des requêtes SQL B-1 à B-8 n'ont pas été fournis.
La migration 2/3 (data_correction) est un template avec des blocs UPDATE commentés.
Joe doit coller les résultats SQL pour compléter cette migration avant exécution.

**Résultats SQL attendus :**

| Requête | Résultat | Anomalies détectées |
|---|---|---|
| B-1 — valeurs distinctes groups[] | ⏳ | ⏳ |
| B-2 — valeurs distinctes managed_groups[] | ⏳ | ⏳ |
| B-3 — valeurs non conformes aux 13 fonctions | ⏳ | ⏳ |
| B-4 — variantes de casse/accent | ⏳ | ⏳ |
| B-5 — groups[] NULL/vide/chaîne vide | ⏳ | ⏳ |
| B-6 — valeurs distinctes profiles.role | ⏳ | ⏳ |
| B-7 — valeurs pastoral_stage | ⏳ | ⏳ |
| B-8 — divergence profiles ↔ auth.users | ⏳ | ⏳ |

**Ordre d'exécution (quand résultats reçus) :**
1. Joe fournit résultats B-1→B-8
2. Compléter les UPDATE dans `20260721000011_adr001_a1_data_correction.up.sql`
3. Joe valide le tableau valeur_actuelle → valeur_cible → nb_profils
4. Sauvegarde Supabase (commande fournie lors de l'étape)
5. Test en préproduction → accord Joe → exécution production
6. Exécuter migrations dans l'ordre : 10 → 11 → 12

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

*Dernière mise à jour : 21/07/2026 — Session ADR-001 A1 (migrations créées, data_correction bloquée)*
