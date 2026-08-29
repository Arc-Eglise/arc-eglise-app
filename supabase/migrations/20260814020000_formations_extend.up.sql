-- ═══════════════════════════════════════════════════════════════════════════
-- Formations — extension : récurrence, nombre de jours à faire, lieu,
-- et suivi de progression (jours effectués par élève).
--   • recurring    : la formation se répète chaque semaine sur les jours choisis
--   • total_days   : nombre de jours/séances à effectuer (objectif)
--   • location     : lieu (NULL = Église ARC par défaut)
--   • days_completed (par inscription) : nombre de jours déjà effectués par l'élève
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.formations add column if not exists recurring  boolean not null default false;
alter table public.formations add column if not exists total_days integer;              -- objectif de jours (NULL = libre)
alter table public.formations add column if not exists location   text;                 -- NULL = Église ARC

-- Progression : jours effectués comptabilisés par le formateur / staff CRM.
alter table public.formation_enrollments add column if not exists days_completed integer not null default 0;

-- Garde-fou : days_completed >= 0
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'formation_enrollments_days_completed_nonneg'
  ) then
    alter table public.formation_enrollments
      add constraint formation_enrollments_days_completed_nonneg check (days_completed >= 0);
  end if;
end $$;

-- ── Lecture des formations par l'élève inscrit et le formateur ──────────────
-- La policy `formations_rw` (migration crm_formations) réserve TOUT accès au
-- staff CRM. On ajoute une policy SELECT permissive (OR) pour que l'élève
-- inscrit ET le formateur interne puissent lire les détails de LEUR formation
-- (profil, activités, prochains événements). L'écriture reste au staff CRM.
drop policy if exists formations_select_own on public.formations;
create policy formations_select_own on public.formations
  for select to authenticated
  using (
    formateur_member_id = auth.uid()
    or exists (
      select 1 from public.formation_enrollments e
      where e.formation_id = formations.id and e.member_id = auth.uid()
    )
  );
