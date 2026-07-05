-- ═══════════════════════════════════════════════════════════════
--  Migration : Suppression du rôle 'support' des profils
--  CDC v3.5 — Juillet 2026
--  'support' est une FONCTION (profiles.groups[]), pas un rôle.
--
--  NB : profiles.role est TEXT en production (pas d'ENUM user_role).
--  Cette migration migre simplement les comptes role='support' vers
--  role='membre' (ou 'visiteur' selon le cas).
-- ═══════════════════════════════════════════════════════════════

-- Étape 1 : vérifier les comptes concernés
SELECT id, email, role FROM profiles WHERE role = 'support';

-- Étape 2 : si l'étape 1 renvoie des lignes, exécuter ceci :
-- UPDATE profiles SET role = 'membre' WHERE role = 'support';

-- Étape 3 : vérifier qu'il ne reste aucun compte support
-- SELECT COUNT(*) FROM profiles WHERE role = 'support';
-- Doit retourner 0.
