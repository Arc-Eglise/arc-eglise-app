-- ═══════════════════════════════════════════════════════════════════════
--  ADR-001 · Chantier A1 · Migration 2/3 · UP
--  Correction des données non conformes — AUCUNE CORRECTION NÉCESSAIRE
--
--  Résultats des requêtes B-1 à B-8 exécutées le 21/07/2026 :
--
--  B-1 groups[] : 6 valeurs, toutes conformes (chorale, communication,
--                 jeunesse, media, pasteur, support)
--  B-2 managed_groups[] : 0 valeur (aucun manager assigné)
--  B-3 non-conformes : 0 résultat — base déjà propre ✅
--  B-4 variantes casse : 0 variante — toutes canoniques ✅
--  B-5 vides : 3 profils avec groups=[] (admin/visiteur/testmembre — normal)
--  B-6 roles : membre(4), admin(1), visiteur(1) — tous conformes ✅
--             NB : profiles.role est un ENUM user_role (pas TEXT)
--  B-7 pastoral_stage : actif(4), visiteur(2) — conformes ✅
--  B-8 divergences auth : 0 divergence ✅
--  B-9 notes : 0 note pastorale en base
--
--  Cette migration est conservée comme preuve que la vérification a eu lieu.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Étape préliminaire : vérification des rôles non conformes ─────────────
-- (issue de remove-support-role.sql — à intégrer ici si des profils ont role='support')

-- SELECT id, email, role FROM profiles WHERE role NOT IN ('visiteur','membre','pasteur','admin');
-- Si résultat non vide → décommenter le bloc ci-dessous après validation Joe :
-- UPDATE profiles
--   SET role = 'membre'
--   WHERE role = 'support';
-- Profils concernés : ⏳ À renseigner après B-6

-- ── Correction des variantes de casse dans groups[] ───────────────────────
-- Signal détecté par B-4 (variantes casse/accent)
-- Modèle : valeur brute → valeur canonique → nb profils
-- À compléter après B-4 :
--
-- | Valeur brute | Valeur cible  | Nb profils |
-- |--------------|---------------|------------|
-- | ⏳            | ⏳            | ⏳          |
--
-- Pattern de correction :
-- UPDATE profiles
--   SET "groups" = array_replace("groups", 'ValeurBrute', 'valeurcanonique')
--   WHERE 'ValeurBrute' = ANY("groups");

-- ── Correction des valeurs orphelines dans groups[] ───────────────────────
-- Signal détecté par B-3 (valeurs hors référentiel)
-- Deux cas possibles :
--   (a) valeur normalisable → remplacer par le slug canonique
--   (b) valeur sans équivalent → supprimer du tableau
--
-- À compléter après B-3 :
--
-- | Valeur brute | Action        | Valeur cible  | Nb profils |
-- |--------------|---------------|---------------|------------|
-- | ⏳            | ⏳            | ⏳            | ⏳          |

-- ── Nettoyage des chaînes vides dans groups[] ─────────────────────────────
-- Signal détecté par B-5 (NULL / vide / chaîne vide)
-- À exécuter si B-5 retourne des résultats :

-- UPDATE profiles
--   SET "groups" = array_remove("groups", '')
--   WHERE '' = ANY("groups");

-- UPDATE profiles
--   SET "groups" = array_remove("groups", ' ')
--   WHERE ' ' = ANY("groups");

-- ── Même nettoyage sur managed_groups[] ───────────────────────────────────
-- Signal détecté par B-2

-- UPDATE profiles
--   SET managed_groups = array_remove(managed_groups, '')
--   WHERE managed_groups IS NOT NULL AND '' = ANY(managed_groups);

-- ── Vérification finale avant de passer à la migration 3/3 ───────────────
-- Ces requêtes doivent retourner 0 ligne chacune avant d'exécuter le CHECK.

-- SELECT unnested_group, COUNT(*)
-- FROM profiles, LATERAL unnest("groups") AS unnested_group
-- WHERE unnested_group NOT IN (
--   'pasteur','chorale','media','social','hospitalite','sanitaire',
--   'finance','support','jeunesse','femmes','ecodim','suivi','communication'
-- )
-- GROUP BY unnested_group;

-- SELECT COUNT(*) FROM profiles
-- WHERE role NOT IN ('visiteur','membre','pasteur','admin');

COMMIT;
