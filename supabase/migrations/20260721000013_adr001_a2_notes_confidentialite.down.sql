-- ═══════════════════════════════════════════════════════════════════════
--  ADR-001 · Chantier A2 · Migration DOWN
--  Rollback : restaurer les RLS d'origine + supprimer confidentialite
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

DROP POLICY IF EXISTS "notes_select" ON member_notes;
DROP POLICY IF EXISTS "notes_insert" ON member_notes;
DROP POLICY IF EXISTS "notes_update" ON member_notes;
DROP POLICY IF EXISTS "notes_delete" ON member_notes;

CREATE POLICY "Admin/Pasteur créent des notes" ON member_notes
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pasteur'))
  );

CREATE POLICY "Admin/Pasteur voient les notes" ON member_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'pasteur'))
  );

CREATE POLICY "Auteurs suppriment leurs notes" ON member_notes
  FOR DELETE USING (author_id = auth.uid());

ALTER TABLE member_notes DROP CONSTRAINT IF EXISTS chk_member_notes_confidentialite;
ALTER TABLE member_notes DROP COLUMN IF EXISTS confidentialite;

COMMIT;
