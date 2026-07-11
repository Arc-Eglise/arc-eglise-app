-- ══════════════════════════════════════════════════════════════
--  ARC — Fix Emerance Obova — Rôle Pasteur + Fonctions
--  UID : 593b90b5-b75f-42a7-adc8-4bf384345c4b
--
--  AVANT D'EXÉCUTER :
--  1. Lancer check-emerance-obova.sql pour confirmer l'état actuel
--  2. Ajuster ARRAY['pasteur','media','communication'] si besoin
--  3. Valider avec le responsable avant exécution
--
--  À exécuter dans : Supabase > SQL Editor > New Query
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ── ÉTAPE 1 : Assigner le rôle pasteur ──────────────────────
--    Le trigger auto_validate_privileged_roles() pose validated=true
--    automatiquement via BEFORE UPDATE OF role (cf. fix-auth-admin-v2.sql)
UPDATE profiles
SET role = 'pasteur'
WHERE id = '593b90b5-b75f-42a7-adc8-4bf384345c4b';

-- ── ÉTAPE 2 : Assigner les fonctions (groups[]) ──────────────
--    - 'pasteur'       : fonction automatique liée au rôle pasteur
--    - 'media'         : équipe média
--    - 'communication' : communication (fonction valide dans le référentiel)
--
--    ⚠ Ajuste ce ARRAY selon les fonctions réellement demandées
UPDATE profiles
SET groups = ARRAY['pasteur', 'media', 'communication']
WHERE id = '593b90b5-b75f-42a7-adc8-4bf384345c4b';

-- ── ÉTAPE 3 : Vérification immédiate ────────────────────────
SELECT
  id,
  first_name || ' ' || COALESCE(last_name, '') AS full_name,
  email,
  role,
  groups,
  validated,
  validated_at
FROM profiles
WHERE id = '593b90b5-b75f-42a7-adc8-4bf384345c4b';

COMMIT;

-- ══════════════════════════════════════════════════════════════
--  VÉRIFICATION RLS (à lancer séparément, en dehors du BEGIN/COMMIT)
-- ══════════════════════════════════════════════════════════════

-- Test helper CMS — doit retourner true (role=pasteur → is_cms_member)
SELECT
  role,
  groups,
  (
    role IN ('admin', 'pasteur')
    OR 'communication' = ANY(groups)
    OR 'media' = ANY(groups)
  ) AS is_cms_member_result
FROM profiles
WHERE id = '593b90b5-b75f-42a7-adc8-4bf384345c4b';

-- Vérifier que validated = true (auto-trigger sur role=pasteur)
SELECT validated, validated_at
FROM profiles
WHERE id = '593b90b5-b75f-42a7-adc8-4bf384345c4b';
