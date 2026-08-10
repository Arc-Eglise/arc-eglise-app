# Reskin ARC Église — Inventaire (Phase A · lecture seule)

**Branche :** `feat/refonte-visuelle`
**Base :** `master` @ `713128f` (i18n messagerie/mail inclus)
**Dossier maquettes :** `stitch_arc_eglise_website_refresh/`
**Chartes de design :** `sacred_modernity_1` & `sacred_modernity_2` — même concept « Sacred Modernity » : Navy `#1E2464` + Or liturgique `#C5A059`, Playfair Display (titres) + Inter/DM Sans (UI), thème clair « paper white » `#F8F9FC`. **Cohérent avec l'identité ARC existante** (navy `#1e2464`, or `#C9A227`).

> ⚠️ **Aucune ligne de code n'a été modifiée en Phase A.** Ce document attend ta validation avant la Phase B.

---

## 0. Cartographie maquettes → pages réelles

| Groupe de maquettes (nb variantes) | Page réelle correspondante | Statut |
|---|---|---|
| `connexion_membres_arc_modernis_e` (1) | `src/app/connexion/` (+ `ConnexionForm.tsx`) | ✅ page existante |
| `notes_et_t_ches_*`, `notes_arc_mobile_pwa` (9) | `src/app/espace-membres/notes-taches/` | ✅ page existante |
| `messagerie_*` (6) | Panneau `?panel=messagerie` dans `EspaceMembresClient.tsx` (route `/messagerie` = **redirect**) | ⚠️ **pas une vraie page** — voir §5 |
| `gestion_des_pr_sences_*`, `pr_sences_arc_mobile_pwa` (7) | `src/app/espace-membres/presences/` (+ `PresencesTable.tsx`, `stats/`, `[id]/`) | ✅ page existante |
| `gestion_d_quipe_*`, `t_ches_d_quipe_arc_mobile_pwa` (6) | Recouvre **présences** (gestion d'équipe / check-in) et `equipe/` (équipe dirigeante). À clarifier page par page. | ⚠️ ambigu |
| `crm_*` (9) | `src/app/espace-membres/crm/` : liste, `[id]`, `tableau-de-bord`, `taches`, `communication`, `desengagement` | ✅ pages existantes |
| `crm_gestion_des_dons_et_finances_arc` (1) | Module Dons/Finances | 🔒 **GEL Stripe** — hors périmètre (voir §7) |
| `m_diath_que_*` (7) | `src/app/espace-membres/streaming/` (sermons + vidéos YouTube) | ✅ page existante |
| `rapports_d_heures_*` (5) | **Aucune page équivalente claire.** Le plus proche = `presences/stats/` (fidélité par groupe), mais « rapports d'heures » ≠ présences. | ⚠️ **feature potentiellement nouvelle** — voir §7 |
| `tableau_de_bord_arc_mobile_pwa` (1) | `crm/tableau-de-bord/` ou accueil espace membre | ✅ existante |

**Variantes :** chaque groupe a plusieurs déclinaisons Stitch (`_harmonis`, `_optimis_connect`, `_extension_v3.4`, `_mobile_pwa`, `_community`…). Je te demanderai **quelle variante fait foi** au début de chaque page en Phase B.

---

## 1. Page CONNEXION — `src/app/connexion/`

Fichiers : `page.tsx` (server), `ConnexionForm.tsx` (client, `Suspense`).

| Élément actuel | Type | Ce qu'il fait | Dans la maquette ? |
|---|---|---|---|
| Panneau de marque gauche | visuel | Dégradé navy + logo + citation | ✅ (logo, citation) |
| Citation dynamique | appel Supabase | `citations.select(...).eq("is_active",true).single()` | ✅ |
| Logo → `/` | lien | Retour accueil site | ✅ (logo) |
| Champ Email | formulaire | `email` state | ✅ |
| Champ Mot de passe + œil 👁️/🙈 | formulaire | toggle `showPwd` | ✅ (password) |
| Lien « Mot de passe oublié ? » → `/mot-de-passe-oublie` | lien | reset password | ✅ (oublié) |
| Case « Rester connecté » | formulaire | persistance `localStorage arc_persist` / `sessionStorage arc_session_only` | ✅ |
| Bouton « Se connecter → » | appel Supabase | `auth.signInWithPassword` → `/espace-membres` | ✅ |
| Bouton « Continuer avec Google » | appel Supabase | `auth.signInWithOAuth({provider:"google", redirectTo:/auth/callback})` | ✅ |
| Lien « Rejoindre l'ARC » → `/inscription` | lien | inscription | ✅ (rejoindre) |
| Auto-redirect si session | garde | `auth.getSession()` → `/espace-membres` | (comportement) |
| Gestion `?error`/`?message` | logique | `auth_callback_error`, `check_email` | (comportement) |

**Verdict :** maquette couvre 100 % des éléments. Reskin « propre » possible. Aucune garde de permission (page publique).

---

## 2. Page NOTES & TÂCHES — `src/app/espace-membres/notes-taches/`

Fichiers : `page.tsx` (server), `NotesTachesClient.tsx`, `NotesBoard.tsx`, `TasksBoard.tsx`, `ShareModal.tsx`, `SharesInbox.tsx`, `TagBar.tsx`.
**Actions serveur :** `src/lib/actions/{notes,tasks,tags,shares}.ts`.
**Garde :** `if (!user) redirect("/connexion")` — accessible à **tout membre authentifié**.

| Élément actuel | Type | Ce qu'il fait | Dans la maquette ? |
|---|---|---|---|
| BackButton → `/espace-membres` | lien | Retour espace membre | à vérifier maquette |
| Onglets Notes / Tâches / Partages (`?tab=`) | navigation | 3 vues | ✅ |
| Chargement initial | appel Supabase | `notes`, `tasks`, `shares`(count), `user_tags`, `note_tags`, `task_tags` | ✅ |
| Créer note | action | `createNote` (`notes` insert) | ✅ |
| Éditer note | action | `updateNote` | ✅ |
| Supprimer note | action | `deleteNote` | ✅ |
| Épingler note (`is_pinned`) | action | `updateNote` (tri pinned) | ✅ |
| Couleurs de note (`NOTE_COLORS`) | visuel/action | `updateNote` | ✅ |
| Créer tâche | action | `createTask` (`tasks`) | ✅ |
| Statut / priorité / échéance tâche | action | `updateTask` (onStatus/onPrio/onDue) | ✅ |
| Récurrence tâche | action | `updateTask` (logique recurrence) | ✅ (partage/rappels) |
| Rappel tâche (`remind_at`) | action | `updateTask` | ✅ (rappels) |
| Supprimer tâche | action | `deleteTask` | ✅ |
| Créer/supprimer tag | action | `createTag`/`deleteTag` (`user_tags`) | ✅ |
| Attacher/détacher tag | action | `attachTag`/`detachTag` (`note_tags`/`task_tags`) | ✅ |
| Partager note/tâche (ShareModal) | action | `shareResource` (`shares` insert ; cible = individu **ou fonction** via `createAdminClient` + `contains("groups",[fn])`) | ✅ (attribution) |
| Boîte des partages entrants (SharesInbox) | action | `listIncomingShares` + `respondToShare` (accepte → copie note/tâche) | ✅ (collaboration) |
| Révoquer partage | action | `revokeShare` (`shares` delete) | ✅ |
| Badge partages en attente | appel Supabase | count `shares` `status=en_attente` | ✅ |

**Verdict :** maquette riche (collaboration/attribution/partage/rappels) — couvre l'essentiel. Reskin faisable en conservant les 4 modules d'actions serveur intacts.

---

## 3. MESSAGERIE — panneau dans `EspaceMembresClient.tsx` (voir §5)

Route `src/app/espace-membres/messagerie/page.tsx` = **`redirect("/espace-membres?panel=messagerie")`**.
Le code messagerie est **embarqué** dans `EspaceMembresClient.tsx` (6804 lignes, shell multi-panneaux).

| Élément actuel | Type | Ce qu'il fait | Dans la maquette ? |
|---|---|---|---|
| Liste conversations / sections | appel Supabase | tables `conversation*` | ✅ |
| Messages | appel Supabase | `.from("message*")` (l.2130, 2133) + realtime `supabase.channel` | ✅ |
| Envoi de message / réponse fil | handler | `sendThreadReply` | ✅ |
| Messages directs (DM) | fonction | `openConversationById`, `openFunctionConv` | ✅ |
| Créer un groupe | fonction | `createGroup` | ✅ |
| Gestion membres de groupe | handlers | `handleGroupAddMember/RemoveMember/AssignManager/RevokeManager` | ✅ |
| Épingler message | handler | `togglePin` (`pinned*`) | ✅ |
| Réactions | handler | `reaction*` (l.2896-2904) | ✅ |
| Huddle audio | handler | `huddle*` (l.2777-2780) | ✅ (extensions récentes) |
| Canal ARC IA | route API | `/api/messagerie/arc-ia` | ✅ |
| Sélecteur destinataire (membre/fonction) | fonction | `messageFunction` (RBAC : comm/admin/pasteur → toutes fonctions) | ✅ |
| Recherche dans fil / conversations | UI + state | `threadSearch` | ✅ |

**⚠️ Ne PAS traiter comme un simple reskin — voir §5.**

---

## 4. PRÉSENCES (gestion d'équipe) — `src/app/espace-membres/presences/`

Fichiers : `page.tsx` (server), `PresencesTable.tsx` (client), `stats/page.tsx`, `[id]/page.tsx`, `[id]/AdminCheckInPanel.tsx`.

**Gardes :**
- `presences/page.tsx` : `if(!user) redirect("/connexion")` (tout membre). `isAdmin = ["admin","pasteur"].includes(role)` → débloque le check-in admin.
- `presences/stats/page.tsx` : `["admin","pasteur"]` **uniquement**.
- `presences/[id]/page.tsx` : `isAdmin` requis.

| Élément actuel | Type | Ce qu'il fait | Dans la maquette ? |
|---|---|---|---|
| Chargement events + profils + présences | appel Supabase | `events`, `profiles`, `event_attendance` | ✅ |
| Check-in / check-out (soi) | handler | toggle optimiste + `event_attendance` | ✅ |
| Check-in admin (autre membre) | handler+garde | `toggleAdminCheckIn` (isAdmin only) | ✅ (gestion d'équipe) |
| Suppression présence | appel Supabase | `.delete()` (×3, PresencesTable) | ✅ |
| Modal « décliner » | UI | `setDeclModal` | à vérifier |
| Bascule vue individuelle / groupe | UI | `setGroupView` | ✅ |
| Pagination | UI | `navigate(offset)` | ✅ |
| Gestion par groupe (admin) | garde+UI | `isAdmin && groupMembers` | ✅ |
| Stats (`stats/`) | appel Supabase | fidélité par groupe (`GROUPS`, `getGroup`) | ✅ (rapports/analyse) |
| Fiche event (`[id]/`) | appel Supabase | `events`, `event_rsvp`, `event_attendance`, `profiles` | ✅ |

**Verdict :** maquettes `gestion_des_pr_sences_*` + `gestion_d_quipe_*` couvrent bien. Attention à ne pas confondre `presences/` (check-in) et `equipe/` (équipe dirigeante, §6).

---

## 5. CRM PASTORAL — `src/app/espace-membres/crm/`

Fichiers : `page.tsx` (liste), `[id]/page.tsx` (fiche, 752 l.), `tableau-de-bord/`, `taches/`, `communication/`, `desengagement/`, `CrmTagsEditor.tsx`.

**Gardes (checks de rôle INLINE — à préserver verbatim) :**
- Liste : `["admin","pasteur"].includes(role) || groups.includes("suivi") || groups.includes("support")`
- `taches/`, `tableau-de-bord/`, `desengagement/` : `["admin","pasteur"] || groups.includes("suivi")` (isPastoralTeam)
- `communication/` : `["admin","pasteur"] || groups.includes("communication")` (canSend)
- Fiche `[id]` : `callerIsAdminFull = admin|pasteur` ; `callerIsAdmin = admin` (DangerActions) ; `canWriteNotes = adminFull || groups.includes("suivi")`

| Élément actuel | Type | Ce qu'il fait | Dans la maquette ? |
|---|---|---|---|
| BackButton → `/espace-membres` | lien | retour | à vérifier |
| Filtres (q/stage/tag/group/engagement) | formulaire GET | filtrage liste | ✅ |
| Réinitialiser filtres | lien | `/espace-membres/crm` | ✅ |
| Liens tableau de bord / tâches / désengagement | liens | sous-pages CRM | ✅ (dashboards) |
| Lien communication (email groupé) | lien (canSend) | `crm/communication` | ✅ (dons/comm) |
| Cartes membres → `crm/[id]` | liens | fiche membre | ✅ (annuaire) |
| Stats par rôle | appel Supabase | `profiles` reduce | ✅ (analytique) |
| **Fiche :** Ajouter/suppr. note | actions (canWriteNotes) | `handleAddNote`/`handleDeleteNote` (`member_notes` + `confidentialite`) | ✅ |
| Ajouter/suppr. interaction | actions | `member_interactions` | ✅ |
| Ajouter/statut/suppr. tâche | actions | `pastoral_tasks` | ✅ (tâches) |
| Valider / refuser membre | action | `handleValidation` | ✅ |
| Changer rôle | action (admin) | `updateMemberRole` via DangerActionsPanel | ✅ |
| Changer fonctions | action | `handleUpdateGroups` | ✅ |
| Assigner/révoquer manager | actions | `managed_groups` | ✅ |
| Faire évoluer le pipeline | action | `handleUpdateStage` (`pastoral_stage`) | ✅ |

**Verdict :** maquettes CRM très fournies (`annuaire`, `profil détaillé`, `dashboard`, `analytique`, `dons`). Reskin faisable. **`crm_gestion_des_dons_et_finances` = 🔒 GEL Stripe, à écarter.**

---

## 6. MÉDIATHÈQUE — `src/app/espace-membres/streaming/`

| Élément actuel | Type | Ce qu'il fait | Dans la maquette ? |
|---|---|---|---|
| Chargement sermons | appel Supabase | `sermons` (×2) | ✅ |
| Liens vidéos YouTube | liens | `youtube.com/watch?v=` | ✅ |
| Lien → `ai-biblique` | lien | outil IA | à vérifier |
| Garde | `if(!user) redirect("/connexion")` | tout membre | — |

---

## 7. Signaux à ta décision (avant Phase B)

1. **Messagerie « vraie page » (§5 du brief)** — transformer le panneau embarqué en page autonome n'est **pas** un reskin : c'est un déplacement de ~plusieurs centaines de lignes hors de `EspaceMembresClient.tsx`, avec réémission des abonnements realtime, de l'état, et du routage. **Je décris l'état actuel ci-dessus et j'attends ton accord explicite** sur l'ampleur avant de coder. Option minimale possible : reskin visuel du panneau **sans** l'extraire (route reste un redirect). À trancher.

2. **`rapports_d_heures_*` (5 maquettes)** — aucune page « rapports d'heures » n'existe. C'est soit (a) à mapper sur `presences/stats/`, soit (b) une **fonctionnalité nouvelle**. Je ne crée rien : **dis-moi** ce que tu veux.

3. **`crm_gestion_des_dons_et_finances`** — 🔒 **GEL Stripe** (mémoire projet, dons en attente). Je **n'y touche pas** sauf ordre explicite.

4. **Checks de rôle inline** — plusieurs pages (CRM, présences, équipe) font `["admin","pasteur"].includes(role)` en dur, **pas** via `src/lib/droits`. Conformément à §4, je **conserve ces gardes verbatim** (pas de refactor vers `lib/droits`, ce serait un changement de comportement hors périmètre).

5. **`gestion_d_quipe_*` vs `presences/` vs `equipe/`** — le mot « équipe » recouvre deux réalités : gestion des **présences/check-in** (`presences/`) et l'**équipe dirigeante** (`equipe/`, garde `admin|pasteur|support|media|communication`). Je te demanderai à quelle page chaque maquette « gestion d'équipe » correspond.

6. **Champs DB potentiellement suggérés par les maquettes** — aucune migration en Phase B. Si une maquette exige un champ absent, je te le **signale**, je ne le crée pas.

---

## 8. Ordre proposé pour la Phase B

Suggestion (tu donnes l'ordre final) : **1) Connexion** (la plus autonome, faible risque) → **2) Notes & Tâches** → **3) Présences** → **4) CRM** → **5) Messagerie** (après décision §7.1). Médiathèque et « rapports d'heures » à part.

**→ En attente de ta validation de cet inventaire avant toute modification de code (Phase B).**
