-- ============================================================
-- ARC Église — Rôles multiples + Module Finance
-- ============================================================

-- 1. Type enum level
DO $$ BEGIN
  CREATE TYPE role_level AS ENUM ('membre', 'manager', 'responsable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Table roles
CREATE TABLE IF NOT EXISTS roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO roles (name, description) VALUES
  ('Admin',    'Superutilisateur — accès total sans restriction'),
  ('Pasteur',  'Direction spirituelle et gouvernance'),
  ('Finance',  'Gestion financière opérationnelle'),
  ('Support',  'Aide technique et prise en main à distance'),
  ('Media',    'Streaming, photos, communication'),
  ('Chorale',  'Équipe musicale'),
  ('Jeunesse', 'Groupe jeunesse'),
  ('Social',   'Hospitalité et social')
ON CONFLICT (name) DO NOTHING;

-- 3. Table member_roles (many-to-many)
CREATE TABLE IF NOT EXISTS member_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id     uuid NOT NULL REFERENCES roles(id)    ON DELETE CASCADE,
  level       role_level NOT NULL DEFAULT 'membre',
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE (member_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_member_roles_member ON member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_role   ON member_roles(role_id);

-- 4. Fonction is_admin(member_id) — superutilisateur Admin
CREATE OR REPLACE FUNCTION is_admin(p_member_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM member_roles mr
    JOIN roles r ON r.id = mr.role_id
    WHERE mr.member_id = p_member_id
      AND r.name = 'Admin'
  );
$$;

-- 5. Fonction has_role(member_id, role_name, min_level)
-- min_level: 'membre' = tout level ; 'manager' = manager ou responsable ; 'responsable' = uniquement responsable
CREATE OR REPLACE FUNCTION has_role(
  p_member_id uuid,
  p_role_name text,
  p_min_level text DEFAULT 'membre'
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM member_roles mr
    JOIN roles r ON r.id = mr.role_id
    WHERE mr.member_id = p_member_id
      AND r.name = p_role_name
      AND CASE p_min_level
            WHEN 'responsable' THEN mr.level = 'responsable'
            WHEN 'manager'     THEN mr.level IN ('manager', 'responsable')
            ELSE TRUE
          END
  );
$$;

-- 6. Vue pratique : rôles du membre authentifié
CREATE OR REPLACE VIEW my_roles AS
SELECT r.name, mr.level, mr.assigned_at
FROM member_roles mr
JOIN roles r ON r.id = mr.role_id
WHERE mr.member_id = auth.uid();

-- ============================================================
-- RLS — member_roles
-- ============================================================
ALTER TABLE member_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mr_select" ON member_roles FOR SELECT USING (
  member_id = auth.uid()
  OR is_admin(auth.uid())
  OR has_role(auth.uid(), 'Pasteur', 'manager')
);

CREATE POLICY "mr_insert" ON member_roles FOR INSERT WITH CHECK (
  is_admin(auth.uid())
  OR has_role(auth.uid(), 'Pasteur', 'manager')
);

CREATE POLICY "mr_update" ON member_roles FOR UPDATE USING (
  is_admin(auth.uid())
  OR has_role(auth.uid(), 'Pasteur', 'manager')
);

CREATE POLICY "mr_delete" ON member_roles FOR DELETE USING (
  is_admin(auth.uid())
  OR has_role(auth.uid(), 'Pasteur', 'manager')
);

-- ============================================================
-- RLS — donations (renforcée)
-- ============================================================
DROP POLICY IF EXISTS "donations_select"  ON donations;
DROP POLICY IF EXISTS "donations_insert"  ON donations;
DROP POLICY IF EXISTS "donations_update"  ON donations;
DROP POLICY IF EXISTS "donations_delete"  ON donations;

CREATE POLICY "donations_select" ON donations FOR SELECT USING (
  -- Le donateur voit son propre don non-anonyme
  (donor_id = auth.uid() AND is_anonymous = false)
  -- Finance voit tout
  OR has_role(auth.uid(), 'Finance', 'membre')
  -- Admin voit tout
  OR is_admin(auth.uid())
  -- Pasteur principal (consultation — l'API filtre les champs individuels)
  OR has_role(auth.uid(), 'Pasteur', 'responsable')
);

CREATE POLICY "donations_insert" ON donations FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);

CREATE POLICY "donations_update" ON donations FOR UPDATE USING (
  has_role(auth.uid(), 'Finance', 'membre')
  OR is_admin(auth.uid())
);

CREATE POLICY "donations_delete" ON donations FOR DELETE USING (
  has_role(auth.uid(), 'Finance', 'membre')
  OR is_admin(auth.uid())
);

-- ============================================================
-- Table payment_methods
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('twint','stripe','bank_transfer','payrexx','postfinance')),
  config      jsonb NOT NULL DEFAULT '{}',
  qr_code_url text,
  is_active   boolean DEFAULT true,
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_select" ON payment_methods FOR SELECT USING (
  has_role(auth.uid(), 'Finance', 'membre')
  OR is_admin(auth.uid())
  OR has_role(auth.uid(), 'Pasteur', 'manager')
  OR has_role(auth.uid(), 'Support', 'manager')
);

CREATE POLICY "pm_write" ON payment_methods FOR ALL USING (
  has_role(auth.uid(), 'Finance', 'membre')
  OR is_admin(auth.uid())
);

-- ============================================================
-- Table finance_exports
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_exports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_from  date NOT NULL,
  period_to    date NOT NULL,
  format       text DEFAULT 'csv' CHECK (format IN ('csv','pdf','xlsx')),
  file_url     text,
  generated_by uuid REFERENCES profiles(id),
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE finance_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fe_all" ON finance_exports FOR ALL USING (
  has_role(auth.uid(), 'Finance', 'membre')
  OR is_admin(auth.uid())
);

-- ============================================================
-- Colonne price_chf sur events (idempotent)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'price_chf'
  ) THEN
    ALTER TABLE events ADD COLUMN price_chf numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- RLS events — lecture publique pour les publiés, écriture Finance+Admin
DROP POLICY IF EXISTS "events_select"       ON events;
DROP POLICY IF EXISTS "events_price_update" ON events;

CREATE POLICY "events_select" ON events FOR SELECT USING (
  is_published = true
  OR is_admin(auth.uid())
  OR has_role(auth.uid(), 'Finance', 'membre')
);

CREATE POLICY "events_update" ON events FOR UPDATE USING (
  is_admin(auth.uid())
  OR has_role(auth.uid(), 'Finance', 'membre')
);

-- ============================================================
-- Attribution rôle Admin au premier admin (à faire manuellement)
-- INSERT INTO member_roles (member_id, role_id, level)
-- SELECT '<uuid-admin>', id, 'responsable' FROM roles WHERE name = 'Admin';
-- ============================================================
