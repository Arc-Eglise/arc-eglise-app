# ADR-002 — Modules **Notes** & **Tâches**

**Projet :** ARC Église — arc-eglise.ch
**Statut :** Accepté (décisions D1→D8 arbitrées le 04/08/2026)
**Branche :** `feat/notes-taches` (isolée — voir §Isolation)
**Auteur du cadrage :** Joe · **Confrontation au code + arbitrage technique :** Claude Code

---

## 1. Contexte

Le cahier des charges demande deux modules pour l'Espace Membre :

- **Notes** — façon *Sticky Notes* (Microsoft) : couleurs, épinglage, mise en forme, drag & drop, recherche.
- **Tâches** — façon *Todoist / TickTick* : statuts, priorités, échéances, sous-tâches, étiquettes, récurrence, partage.

Regroupés sous un onglet **« Notes & Tâches »** placé **sous « Prière & Bible »**, avec un **raccourci dans « Accès Rapide »**, et une **prise de note contextuelle** depuis 5 sources : Prière & Bible, Agenda, Messagerie, Streaming, Boîtes mail.

Un document d'architecture (fourni par Joe) a servi de base. Il a été **confronté au code réel** ; 5 prémisses ont été corrigées (§3).

---

## 2. Existant (vérifié dans le code, 04/08/2026)

| Élément | Réalité |
|---|---|
| Outil de notes actuel | Table **`biblical_notes`** (`title`, `content`, `reference`) — route `/espace-membres/notes`, `NotesClient.tsx`. **Personnel**, propriété du membre. |
| Notes pastorales | Table **`member_notes`** (`confidentialite` : `partagee_suivi` \| `confidentielle_pasteur`) — domaine **distinct**, gouverné par la fonction *Suivi* (droits dans `src/lib/droits`). |
| Tâches existantes | **`pastoral_tasks`** (CRM, `/espace-membres/crm/taches`) — tâches d'accompagnement pastoral, **domaine distinct** du todo personnel. |
| API | **Plate** : `src/app/api/{...}` — **pas** de `/api/v1`. |
| Permissions | `src/lib/droits/index.ts` (10 droits nommés). **Pas** de package `arc-core` importé. |
| Notifications | `src/lib/notify.ts` = point d'entrée **unique** in-app + web push ; `NotifBell.tsx`. |
| Messagerie | **Unifiée + en production** (session 15). **Fonctionnelle.** |
| Ordonnanceur | Aucun cron applicatif existant. Projet hébergé **Vercel**. |

---

## 3. Corrections apportées au document de cadrage

1. **`/api/v1` → API plate.** On suit la convention existante : `/api/notes`, `/api/tasks` (ou server actions).
2. **`arc-core` → `src/lib/droits`.** Les prédicats de permission vivent dans le module de droits existant, pas dans un package.
3. **D8 (messagerie non fonctionnelle) → caduque.** La messagerie fonctionne ; la source Messagerie n'a **aucune** dépendance de séquencement.
4. **D6 (créer un centre de notifs) → réutilisation.** `notify.ts` existe déjà (in-app + push). Aucune table `notifications` à créer.
5. **Existant = `biblical_notes` (perso), pas pastoral.** La séparation D1 est **déjà** réalisée dans le schéma.

---

## 4. Décisions

| # | Décision | Arbitrage retenu |
|---|----------|------------------|
| **D1** | Notes membres vs pastorales | **Domaines séparés** (déjà le cas : `notes`/`biblical_notes` ≠ `member_notes`). Étanchéité stricte avec la confidentialité N3. |
| **D2** | Stratégie de lien source | `source_kind` (enum) + `source_ref_id` (texte, nullable) + **`source_snapshot` JSONB** (contexte dénormalisé → survit à la suppression de la source). |
| **D3** | Package ou module ? | **Module de fonctionnalité** dans l'app. Server actions `src/lib/actions/{notes,tasks}.ts`. Consomme `src/lib/droits`. |
| **D4** | Portée du partage | **Individus + fonctions/groupes.** Opt-in strict, acceptation par le destinataire, **journal d'audit**. Le partage par fonction réutilise les canaux `fn:<slug>` existants. |
| **D5** | Ordonnanceur rappels/récurrence | **Vercel Cron** → `/api/tasks/reminders` → `notify.ts`. *(Correction du doc : `pg_cron` ne peut pas déclencher le web push applicatif.)* |
| **D6** | Centre de notifications | **Réutilise `notify.ts`.** Aucun nouveau centre. |
| **D7** | Offline en v1 | **Différé** au chantier PWA. v1 = online-first, UI optimiste. |
| **D8** | Sort de `biblical_notes` | **Migration** vers la nouvelle table `notes` (aucune perte). L'ancienne route redirige. |

---

## 5. Modèle de données (Phase 1)

Tables créées par `20260804000000_notes_tasks_socle` :

- **`notes`** — `id`, `owner_id`, `title`, `body`, `color`, `is_pinned`, `position`, `reference` (repris de `biblical_notes`), `source_kind`/`source_ref_id`/`source_snapshot` (nullable, pour Phase 2), `created_at`, `updated_at`, `archived_at`.
- **`tasks`** — `id`, `owner_id`, `title`, `description`, `status` (`a_faire`\|`en_cours`\|`bloque`\|`termine`), `priority` (`haute`\|`moyenne`\|`basse`), `due_at`, `parent_task_id` (sous-tâches, self-ref), `position`, `source_*` (nullable), `assignee_id` (nullable, Phase 3), `created_at`, `updated_at`, `completed_at`.
- **`user_tags`** — `id`, `owner_id`, `label`, `color`, unique(`owner_id`,`label`).
- **`note_tags`** / **`task_tags`** — jointures.

**RLS :** activée dès la création. Propriétaire seul (`owner_id = auth.uid()`) en Phase 1. Le partage (accès en lecture/copie via `shares`) sera ajouté en **Phase 3** (table `shares` + policies dédiées + audit).

**Migration `biblical_notes` → `notes` :** copie `user_id→owner_id`, `content→body`, `reference→reference`, `title→title`, timestamps préservés. `biblical_notes` **conservée** (non supprimée) pour rollback trivial ; l'app cesse simplement de la lire.

---

## 6. Phasage

- **Phase 1 — Socle** *(en cours)* : modèle + RLS ; CRUD Notes (couleurs, épingle, formatage, recherche, tags) ; CRUD Tâches (statuts, priorités, échéances, sous-tâches, tags, recherche) ; onglet **« Notes & Tâches »** sous Prière & Bible ; **raccourci Accès Rapide**. **Aucune** source externe, **aucun** partage.
- **Phase 2 — Sources contextuelles** : Prière & Bible, Agenda, Messagerie, Streaming (fenêtre flottante), Boîtes mail. Renseignent `source_kind` + `source_snapshot`.
- **Phase 3 — Collaboration** : table `shares` (individus + fonctions), acceptation, journal d'audit, assignation de tâches, conversion mail→tâche.
- **Phase 4 — Rappels & récurrence** : `RRULE`, Vercel Cron → `notify.ts` (in-app + push).
- **Phase 5 — Sync & mobile** : Supabase Realtime multi-appareils, offline/PWA, durcissement API Flutter.

---

## 7. Isolation (règle permanente)

Le module vit sur **`feat/notes-taches`**. Tant que cette branche n'est pas fusionnée :
- ❌ Aucune migration exécutée en production sans **accord écrit** de Joe.
- ❌ Aucune fusion vers `master`, aucun déploiement, sans accord écrit.
- ✅ Chaque phase se termine par une **validation en UI** avant d'enchaîner.

---

## 8. Conformité nLPD/FADP

- Données à **Francfort** (`eu-central-1`) — inchangé.
- Partage (Phase 3) = donnée personnelle → **opt-in**, acceptation, **journal d'audit**, base légale documentée.
- **Étanchéité** stricte : le partage de notes membres ne crée **jamais** de pont vers le domaine pastoral confidentiel (N3).
- Gadgets Sticky Notes hors sujet (calculatrice, météo, chatbot, Pomodoro…) **exclus**.
