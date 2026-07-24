-- CRM pastoral — Tâches & rappels de suivi (Phase 2)
-- Une tâche peut concerner un membre (rappeler X, visiter Y) ou être générale.
-- Assignée à un membre de l'équipe pastorale, avec échéance et priorité.

CREATE TABLE IF NOT EXISTS pastoral_tasks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    UUID                 REFERENCES profiles(id) ON DELETE CASCADE,  -- membre concerné (optionnel)
  assigned_to  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- responsable de la tâche
  created_by   UUID                 REFERENCES profiles(id) ON DELETE SET NULL,
  title        TEXT        NOT NULL,
  description  TEXT,
  due_date     DATE,
  priority     TEXT        NOT NULL DEFAULT 'normale',
  status       TEXT        NOT NULL DEFAULT 'todo',
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_task_priority CHECK (priority IN ('basse','normale','haute')),
  CONSTRAINT chk_task_status   CHECK (status   IN ('todo','done','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_pastoral_tasks_assignee ON pastoral_tasks (assigned_to, status, due_date);
CREATE INDEX IF NOT EXISTS idx_pastoral_tasks_member   ON pastoral_tasks (member_id, status);

ALTER TABLE pastoral_tasks ENABLE ROW LEVEL SECURITY;

-- Fonction d'aide inline : membre de l'équipe pastorale
CREATE POLICY pastoral_tasks_select ON pastoral_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('admin','pasteur') OR 'suivi' = ANY(p.groups))
    )
  );

CREATE POLICY pastoral_tasks_insert ON pastoral_tasks
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('admin','pasteur') OR 'suivi' = ANY(p.groups))
    )
  );

-- Mise à jour (statut) : le responsable, le créateur, ou admin/pasteur.
CREATE POLICY pastoral_tasks_update ON pastoral_tasks
  FOR UPDATE USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','pasteur'))
  );

-- Suppression : le créateur ou admin/pasteur.
CREATE POLICY pastoral_tasks_delete ON pastoral_tasks
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','pasteur'))
  );
