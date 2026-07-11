-- ══════════════════════════════════════════════════════════════
--  ARC — Migration compte admin → arceglise.cdf@gmail.com
--  À exécuter dans : Supabase > SQL Editor > New Query
--
--  PRÉREQUIS : arceglise.cdf@gmail.com doit être inscrit et avoir
--  confirmé son email via l'interface avant d'exécuter ce script.
--
--  Ce script :
--  1. Donne le rôle admin à arceglise.cdf@gmail.com
--  2. Rétrograde jaise.buka.dilu@gmail.com en 'membre' (si présent)
--  3. Vérifie le résultat
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Promouvoir arceglise.cdf@gmail.com en admin ──────────
UPDATE profiles
SET role         = 'admin',
    validated    = true,
    validated_at = COALESCE(validated_at, NOW())
WHERE email = 'arceglise.cdf@gmail.com';

-- ── 2. Rétrograder l'ancien compte personnel si présent ─────
--    (décommenter si voulu — irréversible sans intervention manuelle)
-- UPDATE profiles
-- SET role = 'membre'
-- WHERE email = 'jaise.buka.dilu@gmail.com';

-- ── 3. Vérification ──────────────────────────────────────────
SELECT email, role, validated, validated_at
FROM profiles
WHERE email IN ('arceglise.cdf@gmail.com', 'jaise.buka.dilu@gmail.com')
ORDER BY role;

COMMIT;
