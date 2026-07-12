-- ═══════════════════════════════════════════════════════════════
--  ARC — Image des événements
--  À exécuter dans : Supabase > SQL Editor > New Query
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT;
