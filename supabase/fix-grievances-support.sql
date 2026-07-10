-- ══════════════════════════════════════════════════════════════
--  Doléances — table grievances + accès fonction Support
--  À exécuter dans : Supabase > SQL Editor > New Query
--  Idempotent : peut être rejoué sans danger
-- ══════════════════════════════════════════════════════════════

-- ── 1. Table grievances (create if missing) ──────────────────
CREATE TABLE IF NOT EXISTS public.grievances (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL CHECK (char_length(title) <= 200),
  description    TEXT        NOT NULL CHECK (char_length(description) <= 2000),
  category       TEXT        NOT NULL DEFAULT 'autre'
                             CHECK (category IN ('pastoral','organisation','technique','autre')),
  status         TEXT        NOT NULL DEFAULT 'en_attente'
                             CHECK (status IN ('en_attente','en_cours','resolu')),
  is_anonymous   BOOLEAN     NOT NULL DEFAULT false,
  admin_response TEXT        CHECK (char_length(admin_response) <= 1000),
  responded_by   UUID        REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Colonne responded_by (idempotent) ─────────────────────
ALTER TABLE public.grievances
  ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS : Membres voient leurs propres doléances ──────────
DROP POLICY IF EXISTS "grievances_select_own"   ON public.grievances;
DROP POLICY IF EXISTS "grievances_select_admin" ON public.grievances;
DROP POLICY IF EXISTS "grievances_insert"       ON public.grievances;
DROP POLICY IF EXISTS "grievances_delete_own"   ON public.grievances;
DROP POLICY IF EXISTS "grievances_update_admin" ON public.grievances;

CREATE POLICY "grievances_select_own" ON public.grievances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── 4. RLS : Admin / Pasteur / Support voient tout ───────────
CREATE POLICY "grievances_select_admin" ON public.grievances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (
          role::text IN ('admin','pasteur')
          OR 'support' = ANY(groups)
        )
    )
  );

-- ── 5. RLS : Insertion (membres validés) ─────────────────────
CREATE POLICY "grievances_insert" ON public.grievances
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── 6. RLS : Suppression (propriétaire seulement) ────────────
CREATE POLICY "grievances_delete_own" ON public.grievances
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── 7. RLS : Mise à jour statut — Admin / Pasteur / Support ──
CREATE POLICY "grievances_update_admin" ON public.grievances
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (
          role::text IN ('admin','pasteur')
          OR 'support' = ANY(groups)
        )
    )
  );

-- ── 8. Trigger updated_at ────────────────────────────────────
DROP TRIGGER IF EXISTS grievances_updated_at ON public.grievances;
CREATE TRIGGER grievances_updated_at
  BEFORE UPDATE ON public.grievances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Vérification ─────────────────────────────────────────────
SELECT COUNT(*) AS total_doleances,
       SUM(CASE WHEN status = 'en_attente' THEN 1 ELSE 0 END) AS en_attente,
       SUM(CASE WHEN status = 'en_cours'   THEN 1 ELSE 0 END) AS en_cours,
       SUM(CASE WHEN status = 'resolu'     THEN 1 ELSE 0 END) AS resolu
FROM public.grievances;
