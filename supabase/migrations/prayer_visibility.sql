-- Migration : Visibilité des demandes de prière
-- À exécuter dans le SQL Editor de Supabase

ALTER TABLE prayer_requests
  ADD COLUMN IF NOT EXISTS visibility      TEXT    DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS target_groups   TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_members  UUID[]  DEFAULT '{}';

-- Index pour les requêtes de filtrage par visibilité
CREATE INDEX IF NOT EXISTS idx_prayer_requests_visibility ON prayer_requests(visibility);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_user_id   ON prayer_requests(user_id);
