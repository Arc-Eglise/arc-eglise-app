-- CRM pastoral — Support enrichi : priorité, SLA, satisfaction (Phase 7)
-- Colonnes AJOUTÉES à la table grievances existante (aucune donnée touchée).

ALTER TABLE grievances ADD COLUMN IF NOT EXISTS priority             TEXT NOT NULL DEFAULT 'normale';
ALTER TABLE grievances ADD COLUMN IF NOT EXISTS first_response_at    TIMESTAMPTZ;
ALTER TABLE grievances ADD COLUMN IF NOT EXISTS resolved_at          TIMESTAMPTZ;
ALTER TABLE grievances ADD COLUMN IF NOT EXISTS satisfaction         SMALLINT;
ALTER TABLE grievances ADD COLUMN IF NOT EXISTS satisfaction_comment TEXT;

-- Contraintes (idempotentes)
DO $$ BEGIN
  ALTER TABLE grievances ADD CONSTRAINT chk_grievance_priority
    CHECK (priority IN ('basse','normale','haute','urgente'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE grievances ADD CONSTRAINT chk_grievance_satisfaction
    CHECK (satisfaction IS NULL OR satisfaction BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_grievances_priority_status ON grievances (priority, status);
