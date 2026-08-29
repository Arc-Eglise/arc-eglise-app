-- Retour à la lecture « soi-même OU encadrement » (sans les managers de groupe)
drop policy if exists "hr_select" on public.hr_attendance;
create policy "hr_select" on public.hr_attendance
  for select to authenticated
  using (
    member_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid()
               and (role::text in ('admin','pasteur') or 'support' = any(groups)))
  );

drop policy if exists "hr_decl_select" on public.hr_declarations;
create policy "hr_decl_select" on public.hr_declarations
  for select to authenticated
  using (
    member_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid()
               and (role::text in ('admin','pasteur') or 'support' = any(groups)))
  );

drop function if exists public.hr_can_view(uuid);
