# Cadrage — « Rapports d'heures » (espace membre)

> Étape de **cadrage** demandée par le plan de portage (`PORTAGE-correspondance.md` B.11) :
> définir **périmètre + source de données Supabase AVANT de coder**. Rien n'est
> créé en base sans accord de Joe. Ce document propose une base ; les points
> marqués **①→⑦** attendent une décision.

---

## 1. Ce que montre la maquette (`rapports_d_heures_arc_extension_v3.4_final`)

Un **rapport mensuel d'heures d'équipe** :
- KPI **« Heures Totales »** du mois (ex. `1 248 hrs`), **variation vs mois précédent** (`+4 %`), **% d'un objectif** (`84 % de l'objectif`).
- **Graphique barres** des heures totales sur ~6 mois (Mai → Oct).
- **Sélecteur de mois** (`Octobre 2023`).
- **Export PDF** (`picture_as_pdf`).
- Encarts secondaires de la maquette (**Dons Stripe récurrents, reçus fiscaux, engagement**) → **hors périmètre** de ce module (relèvent de *Dons & Finances* / *Analytics*). Proposé : **exclus** du rapport d'heures.

## 2. Source de données — ce qui existe déjà ✅

Le module **RH** (onglet dans *Présences*, déjà livré) fournit la donnée :

| Table | Champs utiles | Alimentée par |
|---|---|---|
| `hr_attendance` | `member_id`, `date`, `status`, **`arrival_time`**, **`departure_time`**, `note` | l'encadrement (admin/pasteur/support) via le tableau RH, un statut + heures par membre/jour |
| `hr_declarations` | `member_id`, `type`, `start_date`, `return_date` | déclarations self-service (congé/absence/…) |

**Heures travaillées d'un jour** = `departure_time − arrival_time` (quand les deux sont renseignés), pour les statuts « travaillés » (`present`, `distance`, `retard`).
**Heures du mois d'un membre** = somme des jours. **Total équipe** = somme des membres.

➡️ **Aucune nouvelle table n'est nécessaire** pour un rapport « heures réellement pointées ». La lecture par plage mensuelle demandera une **nouvelle action** `listHrAttendanceRange(from, to)` (l'actuelle `listHrAttendance(date)` ne lit qu'un jour) — code seul, pas de schéma.

## 3. Dépendance critique ⚠️

Le rapport n'a de valeur que si **`arrival_time` / `departure_time` sont réellement saisis**. Aujourd'hui ils sont **optionnels** dans le tableau RH. Deux cas :
- **① Si l'ARC pointe les heures d'arrivée/départ** → le rapport fonctionne tel quel sur la donnée réelle.
- **① Sinon** → le rapport sera vide. Options de repli à trancher : (a) heures forfaitaires par statut (ex. `present` = X h) ; (b) rapport basé sur les **jours de présence** plutôt que les heures ; (c) reporter la feature.

## 4. Décisions à trancher

- **① Définition des « heures »** : heures réelles (arrivée→départ) / forfait par statut / jours de présence ?
- **② Objectif** (« 84 % de l'objectif ») : garder ce KPI ? Si oui, l'objectif est **par membre**, **par mois**, ou **global équipe** ? → sinon **nouveau champ** (ex. `profiles.monthly_hours_target INT`, ou table `hr_targets`). *Sans accord, je ne l'ajoute pas ; par défaut je masque ce KPI.*
- **③ Périmètre** (« équipe ») : tous les membres ayant au moins une ligne `hr_attendance` ? tout le personnel d'une/des fonction(s) ? un sous-ensemble ?
- **④ Emplacement** : **nouvelle page** `/espace-membres/rapports-heures` (sidebar) **ou** nouvel **onglet dans Présences** (à côté de RH) ?
- **⑤ Accès** : réutiliser les droits RH (encadrement = tout ; membre = ses propres heures) — recommandé. Confirmer.
- **⑥ Export PDF** : impression navigateur (`window.print` + CSS print, simple, 0 dépendance) **ou** vraie génération PDF (lib) ?
- **⑦ Granularité** : par **membre** (tableau) + **total équipe** + **tendance 6 mois** ? Détail par jour cliquable ?

## 5. Décisions VERROUILLÉES (Joe, 2026-08-28)

- **① Heures = réelles + repli jours** : heures = `départ − arrivée` quand saisies ; sinon on affiche les **jours de présence** (`present`/`distance`/`retard`). Robuste même sans pointage horaire.
- **② Objectif = MASQUÉ** → **aucun nouveau champ Supabase**. (Réactivable plus tard.)
- **③ Périmètre** = membres avec ≥1 ligne `hr_attendance` sur la période (défaut retenu).
- **④ Emplacement = ONGLET dans *Présences*** (à côté de l'onglet RH) — **pas** de nouvelle page/route. (Le shell nav+panneau droit de Présences s'applique déjà.)
- **⑤ Accès = droits RH réutilisés** : encadrement (admin/pasteur/support) voit toute l'équipe ; un membre voit ses propres heures. RLS `hr_attendance` déjà en place.
- **⑥ Export = impression navigateur** (`window.print` + CSS `@media print`). Zéro dépendance.
- **⑦ Contenu** : total équipe du mois + variation vs M-1 + barres 6 derniers mois + **tableau par membre** (heures ou jours, par statut) ; **sélecteur de mois**.

## 6. Plan d'implémentation (aucune migration Supabase)

1. **Action** `listHrAttendanceRange(from, to)` dans `src/lib/actions/hr.ts` (lecture par plage, mêmes droits/RLS que `listHrAttendance`).
2. **Calcul** : util `computeHours(record)` = `départ − arrivée` (minutes → heures) ; agrégats par membre et total équipe ; comptage jours en repli.
3. **UI** : nouvel **onglet « Rapports »** dans `presences/page.tsx` (à côté de RH) → composant `HrReport.tsx` (client) : KPI + graphe barres (CSS, pas de lib) + tableau par membre + sélecteur de mois + bouton Imprimer.
4. **Style** : charte maquette (Playfair `#000666`, cartes `shadow-ambient`) + CSS print.
5. **Périmètre/droits** : réutilise `me`/`isPastoralTeam` déjà calculés dans `presences/page.tsx`.

➡️ **Prêt à coder. Aucune table ni colonne à créer.**
