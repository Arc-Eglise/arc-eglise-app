-- ═══════════════════════════════════════════════════════════════════════════
-- Formations — auto-inscription des membres + file d'attente de validation.
--   • Un membre peut demander à s'inscrire librement → inscription « pending ».
--   • Seul le formateur (ou le staff CRM) valide → « active ».
--   • À la validation d'une formation RÉCURRENTE, le formateur peut rattacher
--     le membre à la PROCHAINE session (start_from_date) au lieu de la session
--     en cours (les séances du membre sont alors comptées à partir de cette date).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.formation_enrollments
  add column if not exists status text not null default 'active'
    check (status in ('pending', 'active'));
alter table public.formation_enrollments
  add column if not exists validated_by uuid references public.profiles(id) on delete set null;
alter table public.formation_enrollments
  add column if not exists validated_at timestamptz;
alter table public.formation_enrollments
  add column if not exists start_from_date date;   -- NULL = session en cours (dès le début)

create index if not exists formation_enrollments_status_idx
  on public.formation_enrollments (formation_id, status);

-- Auto-inscription : un membre peut créer SA propre demande, uniquement en
-- statut « pending » (la validation reste au formateur/staff via action serveur).
drop policy if exists fenroll_self_request on public.formation_enrollments;
create policy fenroll_self_request on public.formation_enrollments
  for insert to authenticated
  with check (member_id = auth.uid() and status = 'pending');

-- Catalogue : tout membre authentifié peut LIRE la fiche d'une formation
-- (pour la voir dans « Activités » et demander à s'inscrire). L'écriture
-- (création/édition) reste réservée au staff CRM via `formations_rw`.
drop policy if exists formations_select_catalog on public.formations;
create policy formations_select_catalog on public.formations
  for select to authenticated
  using (true);
