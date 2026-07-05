-- iOS App — CRM pastoral (table : crm_contacts)

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        text        NOT NULL,
  email      text,
  phone      text,
  source     text,
  etape      text        NOT NULL DEFAULT 'nouveau'
             CHECK (etape IN ('nouveau','qualifie','suivi','converti')),
  notes      text,
  created_by uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

-- Admins et pasteurs gèrent les contacts CRM
CREATE POLICY "Staff CRM voit et gère les contacts"
ON public.crm_contacts FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (
      role IN ('admin','pasteur')
      OR 'communication' = ANY(COALESCE(groups, '{}'))
      OR 'support' = ANY(COALESCE(groups, '{}'))
    )
  )
);

CREATE INDEX IF NOT EXISTS crm_contacts_etape_idx ON public.crm_contacts(etape);
CREATE INDEX IF NOT EXISTS crm_contacts_created_at_idx ON public.crm_contacts(created_at DESC);
