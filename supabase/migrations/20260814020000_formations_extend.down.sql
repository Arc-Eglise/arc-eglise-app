-- Rollback extension formations
drop policy if exists formations_select_own on public.formations;
alter table public.formation_enrollments drop constraint if exists formation_enrollments_days_completed_nonneg;
alter table public.formation_enrollments drop column if exists days_completed;
alter table public.formations drop column if exists location;
alter table public.formations drop column if exists total_days;
alter table public.formations drop column if exists recurring;
