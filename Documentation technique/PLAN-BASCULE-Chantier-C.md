# Plan de bascule — ADR-001 Chantier C

**Projet :** ARC Église — arc-eglise.ch
**Rédigé le :** 24/07/2026 (session 14)
**Statut :** 🔒 **PLAN UNIQUEMENT — aucune étape ne s'exécute sans feu vert écrit de Joe.**

> Ce document prépare la mise en service (« bascule ») du socle construit en isolation
> totale au Chantier B (B0→B4 terminés). Il ne modifie rien : il décrit l'ordre exact,
> les vérifications et les rollbacks. Rien ci-dessous n'est appliqué tant que Joe n'a pas
> donné son accord écrit, étape par étape.

---

## 1. Objectif & principe

Le Chantier B a produit un socle **isolé** (`@arc/core`, `/api/v1`, `@arc/ai-engine`) que
`src/` **ne peut pas encore importer** (règle d'isolation **I1**). La bascule = **connecter**
ce socle à l'application vivante, en remplaçant les implémentations locales dupliquées par
la source de vérité unique `@arc/core`, sans changement de comportement observable.

**Invariant de bascule :** à droits et référentiel identiques, l'UI et les permissions se
comportent exactement comme avant. La bascule est un **remplacement d'implémentation**, pas
un changement de règles métier.

---

## 2. Préconditions & garde-fous

| # | Garde-fou | État requis avant de commencer |
|---|---|---|
| G1 | **Accord écrit de Joe** pour la bascule (rappel : `feat/socle-api` ne se merge JAMAIS sans accord écrit) | ⏳ à obtenir |
| G2 | **Backup remote de `feat/socle-api`** — la branche est actuellement LOCALE uniquement, sans filet | ⏳ `git push -u origin feat/socle-api` avant tout rebase |
| G3 | **GEL Stripe/dons jusqu'au 03/08/2026** — le socle n'y touche pas ; ne rien mêler de Stripe à cette bascule | ✅ respecté par conception |
| G4 | Fenêtre de déploiement calme (pas en plein culte / événement live) | ⏳ à planifier |
| G5 | `master` propre, working tree propre, dernier déploiement Vercel vert | ⏳ à vérifier le jour J |

---

## 3. Inventaire de la surface de bascule (mesuré le 24/07/2026)

### 3a. Droits — remplacement direct (risque faible)
- **Source cible :** `@arc/core` → `droits` (10 droits nommés, **signatures identiques** à
  `src/lib/droits/index.ts`, qui se déclare lui-même temporaire).
- **Consommateurs réels dans `src/` :** **1 seul fichier** —
  `src/app/espace-membres/EspaceMembresClient.tsx` (`import { droits } from "@/lib/droits"`).
- `src/app/espace-membres/crm/[id]/page.tsx` utilise un check inline `role === "admin"`
  (pas le module droits) — hors surface, à laisser tel quel (ou harmoniser plus tard).

### 3b. Référentiel — refactor partiel (risque moyen)
- **Source cible :** `@arc/core` → `FONCTIONS` (13), `FONCTION_LABELS`, `ROLES` (4),
  `PIPELINE_STAGES` (5) + labels.
- **`src/lib/groups.ts`** : porte les **13 mêmes slugs** que `FONCTIONS`, **enrichis** de
  métadonnées UI (icônes Lucide, couleurs Tailwind) que `@arc/core` (pur, sans dépendance
  UI) ne peut pas héberger. → **Refactor, pas suppression** : dériver la liste/labels de
  `@arc/core`, conserver localement la couche UI, ajouter un garde de parité.
- **`src/lib/actions/membres.ts`, `src/lib/arc-ai/engines/church-engine.ts`,
  `src/lib/mail/mailbox-config.ts`** : référencent des valeurs de rôle/fonction/pipeline en
  dur → remplacer par les constantes `@arc/core` au cas par cas.

### 3c. Hors périmètre de cette bascule
- **`@arc/ai-engine`** : encore un squelette vide (`export {}`). Migrer `src/lib/arc-ai/*`
  dedans est un **chantier ultérieur distinct**, non couvert ici.
- **Stripe / dons** : gelés (voir G3).

---

## 4. Étapes ordonnées

Chaque étape a : Actions · Vérification · Rollback. On ne passe à l'étape suivante que si la
vérification est verte.

### C0 — Préparation & filet de sécurité
**Actions :**
1. `git push -u origin feat/socle-api` (rétablir un backup remote — G2).
2. Sur `feat/socle-api` : intégrer master (26 commits d'avance). **Merge** recommandé plutôt
   que rebase (branche partagée/longue, historique préservé) : `git merge master`.
3. Résoudre les conflits éventuels (probables sur `package.json`, `next.config.mjs`,
   `tsconfig.json`, journal ADR). Le socle (`packages/`, `src/app/api/v1/`) ne recoupe pas
   les 26 commits master (web-push, mobile, notifs IA…) → conflits attendus faibles.
4. `rm -rf .next` (artefacts master périmés faussent tsc sur cette branche).

**Vérification :** `npm run check:isolation` ✅ · `npx tsc --noEmit` 0 erreur ·
`npm run build` ✅ · `npm run dev` + `npm run validate:socle` → 25/25 ✅.

**Rollback :** `git merge --abort` (avant commit) ; sinon `git reset --hard <sha-avant-merge>`
(le backup remote C0.1 protège le travail).

---

### C1 — Migration DB B3 (additive, sans risque sur l'existant)
**Actions :** exécuter dans le SQL Editor Supabase
`supabase/migrations/20260724000001_adr001_b3_socle_quotas.up.sql`.
- Chemin Windows : `C:\Users\Joe\Desktop\Maj projet\arc-eglise-app\supabase\migrations\20260724000001_adr001_b3_socle_quotas.up.sql`
- SQL Editor : https://supabase.com/dashboard/project/fobyvhulyjxwbhusouqz/sql
- Crée `arc_api_rate_limit`, `arc_api_log`, RPC `arc_api_increment_rate_limit`. **Purement
  additif** (aucune table existante modifiée) → exécutable même avant la bascule UI, sans
  impact sur l'app en prod (les routes `/api/v1` ne sont pas encore consommées par l'UI).

**Vérification :** dans le SQL Editor,
`SELECT arc_api_increment_rate_limit('test','60:1');` renvoie `1`, `2`, … à chaque appel ;
`SELECT * FROM arc_api_log LIMIT 1;` ne lève pas d'erreur. Puis re-lancer `validate:socle`
contre une préversion : le fail-open disparaît, `X-RateLimit-Remaining` **décrémente**.

**Rollback :** exécuter `...b3_socle_quotas.down.sql` (drop des 2 tables + RPC). Le socle
retombe automatiquement en fail-open (déjà validé en B4).

---

### C2 — Lever l'isolation I1 (connecter le socle à `src/`)
**Actions :** modifier `scripts/check-isolation.js` : **autoriser `src/` → `@arc/core`**
(le socle devient consommable par l'app), tout en **conservant** :
- I1' : `src/` ne doit toujours PAS importer `@arc/ai-engine` (encore vide/non basculé) ;
- I2 : `arc-core` ne dépend ni de `@arc/ai-engine` ni de `src/app/` ;
- I3 : `arc-ai-engine` ne dépend pas de `src/app/`.

**Vérification :** `npm run check:isolation` ✅ avec les nouvelles règles (ajouter un test
négatif : un import `@arc/ai-engine` depuis `src/` doit toujours échouer).

**Rollback :** `git checkout scripts/check-isolation.js`.

---

### C3 — Basculer les droits (le remplacement à plus faible risque en premier)
**Actions (approche shim, dé-risquée) :**
1. Remplacer le corps de `src/lib/droits/index.ts` par un **ré-export** :
   `export { droits } from "@arc/core"` + ré-export des types (`ProfileLike`, `NoteLike`).
   → aucun autre fichier n'a besoin de changer, l'import `@/lib/droits` continue de marcher.
2. (Optionnel, phase de nettoyage ultérieure) migrer l'import d'`EspaceMembresClient.tsx`
   vers `@arc/core` directement, puis supprimer le shim `src/lib/droits/`.

**Vérification :** `tsc` 0 erreur · `build` ✅ · smoke manuel espace-membres : les
permissions (onglets CRM/Admin, actions) sont **strictement identiques** pour un compte
admin, un compte `suivi`, un compte `communication` (cf. matrice A2 du journal ADR).

**Rollback :** `git checkout src/lib/droits/index.ts`.

---

### C4 — Basculer le référentiel (fonctions / rôles / pipeline)
**Actions :**
1. `src/lib/groups.ts` : importer `FONCTIONS` + `FONCTION_LABELS` de `@arc/core`, dériver la
   liste canonique depuis eux, **conserver** la couche UI (icônes/couleurs), et ajouter un
   **garde de parité** au chargement du module :
   `if (GROUPS.map(g=>g.slug).sort().join() !== [...FONCTIONS].sort().join()) throw …`
   → toute divergence future casse le build au lieu de diverger silencieusement.
2. `membres.ts` / `church-engine.ts` / `mailbox-config.ts` : remplacer les listes de
   rôle/fonction/pipeline en dur par les constantes `@arc/core` là où c'est 1-pour-1.

**Vérification :** `check:isolation` ✅ · `tsc` 0 · `build` ✅ · smoke : badges de groupes,
annuaire, CRM, présences, mailbox affichent les mêmes libellés/icônes qu'avant.

**Rollback :** `git checkout` des fichiers concernés (étape indépendante de C3).

---

### C5 — Vérification intégrale + déploiement préversion
**Actions :**
1. Suite complète : `check:isolation` · `tsc --noEmit` · `build` · `dev`+`validate:socle` (25/25).
2. Déployer une **préversion Vercel** (branche `feat/socle-api`).
3. `npm run validate:socle https://<preview>.vercel.app` → 25/25, **et** vérifier que le 429
   effectif + le décrément Remaining + les lignes `arc_api_log` fonctionnent maintenant que
   la migration C1 est jouée (le périmètre reporté de B4).
4. Smoke manuel de l'espace-membres en préversion (droits, référentiel).

**Vérification :** tout vert en préversion. **Sinon → stop, on ne merge pas.**

**Rollback :** aucun impact prod (préversion isolée) ; corriger sur la branche.

---

### C6 — Merge en production 🔒 (GATE : accord écrit explicite de Joe requis ici)
**Actions :**
1. **Confirmation écrite finale de Joe** (rappel de la règle « jamais sans accord écrit »).
2. `git checkout master && git merge feat/socle-api` (fast-forward ou merge commit) → push
   → auto-deploy Vercel.

**Vérification post-prod :**
- `npm run validate:socle https://arc-eglise.ch` → 25/25.
- Espace-membres en prod : permissions identiques (admin / suivi / communication).
- `arc_api_log` se remplit en prod ; `X-RateLimit-*` corrects ; aucun 500 dans les logs Vercel.

**Rollback prod :** `git revert` du merge → push (redéploiement) ; la migration C1 est
additive et peut rester en place sans nuire (ou `down.sql` si on veut tout retirer).

---

## 5. Ordre de migration DB (récapitulatif strict)

1. **C1 d'abord** (tables + RPC additifs) — peut précéder la bascule UI sans risque.
2. **Puis** bascule code (C2→C4) + préversion (C5).
3. **Enfin** merge prod (C6).
- Ne jamais merger le code de bascule **sans** que C1 soit joué (sinon le socle reste en
  fail-open en prod — dégradé mais non bloquant, déjà validé en B4).

---

## 6. Matrice de risques

| Étape | Risque | Mitigation |
|---|---|---|
| C0 merge master | Conflits sur configs | Socle disjoint des 26 commits → conflits limités ; backup remote (G2) |
| C1 migration | Très faible (additif) | `down.sql` prêt ; fail-open couvre l'absence de table |
| C2 lever I1 | Régression d'isolation | Test négatif `@arc/ai-engine` conservé ; I2/I3 intacts |
| C3 droits | Changement de permissions | Signatures identiques + shim + smoke matrice A2 |
| C4 référentiel | Divergence slugs/labels | Garde de parité au build (throw) |
| C6 merge prod | Indispo prod | Préversion validée d'abord ; `git revert` en rollback |

---

## 7. Hors périmètre (chantiers ultérieurs)

- **Population de `@arc/ai-engine`** (migration de `src/lib/arc-ai/*` : providers, bible,
  plans, quotas IA) — chantier distinct, à planifier après stabilisation de la bascule cœur.
- **Harmonisation** des checks inline restants (`role === "admin"` dans `crm/[id]/page.tsx`).
- **Stripe / dons** — gelés jusqu'au 03/08/2026.

---

## 8. Definition of Done — Chantier C

- [ ] G1 accord écrit obtenu · G2 backup remote poussé
- [ ] C0 : master intégré, socle re-validé (25/25)
- [ ] C1 : migration jouée, RPC + tables opérationnelles
- [ ] C2 : I1 levée pour `@arc/core`, I2/I3 + interdiction ai-engine intactes
- [ ] C3 : droits servis par `@arc/core`, permissions identiques vérifiées
- [ ] C4 : référentiel dérivé de `@arc/core` + garde de parité, UI inchangée
- [ ] C5 : préversion 25/25 + 429/log réels validés
- [ ] C6 : mergé en prod, vérif post-prod verte, `arc_api_log` alimenté

---

*Plan figé le 24/07/2026. Prochaine action = obtenir l'accord écrit (G1) — rien ne démarre avant.*
