-- ═══════════════════════════════════════════════════════════════════════════
-- RH — Suivi présence / absence / congés / vacances du personnel ARC
-- Nouvelle fonctionnalité : onglet « RH » à l'intérieur de la page Présences.
-- Un statut RH par membre et par jour (+ heures d'arrivée/départ optionnelles).
-- Statuts : present · absent · conge · vacances · maladie · distance · retard
-- Accès gestion (écriture) : role admin | pasteur, ou fonction "support".
-- Lecture : l'encadrement voit tout ; un membre voit ses propres lignes.
-- Aucune donnée n'est insérée ici — la table alimente l'UI en données réelles.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hr_attendance (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date           DATE        NOT NULL,
  status         TEXT        NOT NULL
                 CHECK (status IN ('present','absent','conge','vacances','maladie','distance','retard')),
  arrival_time   TIME,
  departure_time TIME,
  note           TEXT,
  recorded_by    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, date)
);

CREATE INDEX IF NOT EXISTS hr_attendance_date_idx   ON public.hr_attendance (date);
CREATE INDEX IF NOT EXISTS hr_attendance_member_idx ON public.hr_attendance (member_id);

-- updated_at automatique (fonction déjà utilisée par les autres tables du projet)
DROP TRIGGER IF EXISTS hr_attendance_updated_at ON public.hr_attendance;
CREATE TRIGGER hr_attendance_updated_at
  BEFORE UPDATE ON public.hr_attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_select" ON public.hr_attendance;
DROP POLICY IF EXISTS "hr_insert" ON public.hr_attendance;
DROP POLICY IF EXISTS "hr_update" ON public.hr_attendance;
DROP POLICY IF EXISTS "hr_delete" ON public.hr_attendance;

-- Lecture : ses propres lignes, ou tout pour l'encadrement (admin/pasteur/support)
CREATE POLICY "hr_select" ON public.hr_attendance
  FOR SELECT TO authenticated
  USING (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role::text IN ('admin','pasteur') OR 'support' = ANY(groups))
    )
  );

-- Écriture réservée à l'encadrement
CREATE POLICY "hr_insert" ON public.hr_attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role::text IN ('admin','pasteur') OR 'support' = ANY(groups))
    )
  );

CREATE POLICY "hr_update" ON public.hr_attendance
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role::text IN ('admin','pasteur') OR 'support' = ANY(groups))
    )
  );

CREATE POLICY "hr_delete" ON public.hr_attendance
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role::text IN ('admin','pasteur') OR 'support' = ANY(groups))
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- Déclarations RH self-service (membre) — retard / absence / congé / …
-- Le membre déclare lui-même une PÉRIODE (date de début → date de retour).
-- À la création, l'application notifie par email le pasteur + les groupes de
-- fonction du membre. Table distincte du pointage journalier hr_attendance.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hr_declarations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL
               CHECK (type IN ('retard','absent','conge','vacances','maladie','distance')),
  start_date   DATE        NOT NULL,
  return_date  DATE        NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (return_date >= start_date)
);

CREATE INDEX IF NOT EXISTS hr_declarations_member_idx ON public.hr_declarations (member_id);
CREATE INDEX IF NOT EXISTS hr_declarations_start_idx  ON public.hr_declarations (start_date);

ALTER TABLE public.hr_declarations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_decl_select" ON public.hr_declarations;
DROP POLICY IF EXISTS "hr_decl_insert" ON public.hr_declarations;
DROP POLICY IF EXISTS "hr_decl_delete" ON public.hr_declarations;

-- Lecture : ses propres déclarations, ou tout pour l'encadrement
CREATE POLICY "hr_decl_select" ON public.hr_declarations
  FOR SELECT TO authenticated
  USING (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role::text IN ('admin','pasteur') OR 'support' = ANY(groups))
    )
  );

-- Déclaration : le membre déclare pour lui-même (l'encadrement peut aussi)
CREATE POLICY "hr_decl_insert" ON public.hr_declarations
  FOR INSERT TO authenticated
  WITH CHECK (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role::text IN ('admin','pasteur') OR 'support' = ANY(groups))
    )
  );

-- Suppression : l'auteur ou l'encadrement
CREATE POLICY "hr_decl_delete" ON public.hr_declarations
  FOR DELETE TO authenticated
  USING (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (role::text IN ('admin','pasteur') OR 'support' = ANY(groups))
    )
  );
