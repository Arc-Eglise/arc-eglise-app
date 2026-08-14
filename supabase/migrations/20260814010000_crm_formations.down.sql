drop policy if exists fatt_write_self on public.formation_attendance;
drop policy if exists fatt_select on public.formation_attendance;
drop policy if exists fenroll_write on public.formation_enrollments;
drop policy if exists fenroll_select on public.formation_enrollments;
drop policy if exists formations_rw on public.formations;
drop table if exists public.formation_attendance;
drop table if exists public.formation_enrollments;
drop table if exists public.formations;
drop function if exists public.is_crm_writer();
