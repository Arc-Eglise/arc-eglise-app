-- Rollback auto-inscription formations
drop policy if exists formations_select_catalog on public.formations;
drop policy if exists fenroll_self_request on public.formation_enrollments;
drop index if exists formation_enrollments_status_idx;
alter table public.formation_enrollments drop column if exists start_from_date;
alter table public.formation_enrollments drop column if exists validated_at;
alter table public.formation_enrollments drop column if exists validated_by;
alter table public.formation_enrollments drop column if exists status;
