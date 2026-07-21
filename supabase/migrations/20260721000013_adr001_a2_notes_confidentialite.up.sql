-- ═══════════════════════════════════════════════════════════════════════
--  ADR-001 · Chantier A2 · Migration UP
--  Confidentialité des notes pastorales + droits affinés
--
--  Contexte : 0 note existante en base (vérifié par B-9 le 21/07/2026).
--  Aucune migration de données nécessaire — les nouvelles notes prendront
--  automatiquement la valeur par défaut 'confidentielle_pasteur'.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Colonne confidentialite ────────────────────────────────────────────
ALTER TABLE member_notes
  ADD COLUMN IF NOT EXISTS confidentialite TEXT NOT NULL DEFAULT 'confidentielle_pasteur';

ALTER TABLE member_notes
  ADD CONSTRAINT chk_member_notes_confidentialite
    CHECK (confidentialite IN ('partagee_suivi', 'confidentielle_pasteur'));

-- Aucun UPDATE nécessaire (0 note existante).

-- ── 2. Mise à jour des RLS sur member_notes ───────────────────────────────

-- Supprimer les 3 policies existantes
DROP POLICY IF EXISTS "Admin/Pasteur créent des notes"  ON member_notes;
DROP POLICY IF EXISTS "Admin/Pasteur voient les notes"  ON member_notes;
DROP POLICY IF EXISTS "Auteurs suppriment leurs notes"  ON member_notes;

-- SELECT : admin/pasteur voient tout ;
--          suivi voit les notes partagées + ses propres notes
CREATE POLICY "notes_select" ON member_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (
          role IN ('admin', 'pasteur')
          OR (
            'suivi' = ANY("groups")
            AND (
              member_notes.confidentialite = 'partagee_suivi'
              OR member_notes.author_id = auth.uid()
            )
          )
        )
    )
  );

-- INSERT : admin/pasteur/suivi peuvent créer des notes
CREATE POLICY "notes_insert" ON member_notes
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (
          role IN ('admin', 'pasteur')
          OR 'suivi' = ANY("groups")
        )
    )
  );

-- UPDATE : auteurs uniquement (pour corriger leur contenu)
CREATE POLICY "notes_update" ON member_notes
  FOR UPDATE USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- DELETE : auteurs uniquement
CREATE POLICY "notes_delete" ON member_notes
  FOR DELETE USING (author_id = auth.uid());

COMMIT;
