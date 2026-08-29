-- ═══════════════════════════════════════════════════════════════════════════
-- RH — Évolution : dates Départ/Retour (statuts hors « présent »)
--                   + validation Congé/Vacances par le pasteur
--
-- À exécuter dans l'éditeur SQL Supabase (prod). Idempotent (IF NOT EXISTS).
--
-- 1) hr_attendance : pour tout statut SAUF « present », on saisit une date de
--    DÉPART (depart_date) et une date de RETOUR (retour_date) au lieu des heures.
--    Les colonnes arrival_time/departure_time restent (compat, non supprimées).
-- 2) Congé & Vacances doivent être validés par un membre de fonction PASTEUR :
--    validation_status = 'pending' | 'approved' | 'rejected'.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── hr_attendance : dates période + validation ──────────────────────────────
ALTER TABLE public.hr_attendance
  ADD COLUMN IF NOT EXISTS depart_date       DATE,
  ADD COLUMN IF NOT EXISTS retour_date       DATE,
  ADD COLUMN IF NOT EXISTS validation_status TEXT
    CHECK (validation_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS validated_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS validated_at      TIMESTAMPTZ;

-- ── hr_declarations : validation (start_date/return_date = départ/retour) ────
ALTER TABLE public.hr_declarations
  ADD COLUMN IF NOT EXISTS validation_status TEXT
    CHECK (validation_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS validated_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS validated_at      TIMESTAMPTZ;

-- ── RLS : le PASTEUR (ou admin) peut valider une déclaration ────────────────
-- hr_attendance : la policy UPDATE existante autorise déjà l'encadrement
-- (admin|pasteur|support) ; la restriction « validation = pasteur » est
-- appliquée côté serveur (action validateHrAttendance). Rien à ajouter ici.

-- hr_declarations : aucune policy UPDATE n'existait — on en ajoute une réservée
-- au pasteur/admin (pour poser validation_status/validated_by/validated_at).
DROP POLICY IF EXISTS "hr_decl_update_pasteur" ON public.hr_declarations;
CREATE POLICY "hr_decl_update_pasteur" ON public.hr_declarations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role::text IN ('admin','pasteur')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role::text IN ('admin','pasteur')
    )
  );

-- Index pour lister rapidement les demandes en attente
CREATE INDEX IF NOT EXISTS hr_attendance_validation_idx  ON public.hr_attendance  (validation_status);
CREATE INDEX IF NOT EXISTS hr_declarations_validation_idx ON public.hr_declarations (validation_status);
