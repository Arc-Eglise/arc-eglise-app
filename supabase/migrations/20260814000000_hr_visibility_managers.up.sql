-- ═══════════════════════════════════════════════════════════════════════════
-- RH — Visibilité des absences/pointage/déclarations
-- Peuvent VOIR les données RH d'un membre :
--   • le membre concerné (les siennes),
--   • les MANAGERS d'un groupe de fonction auquel le membre appartient,
--   • les fonctions PASTEUR et SUPPORT (+ admin) — voient tout.
-- L'ÉCRITURE reste réservée à l'encadrement (admin/pasteur/support) — inchangée.
-- ═══════════════════════════════════════════════════════════════════════════

-- Fonction d'autorisation (SECURITY DEFINER : lit profiles sans dépendre du RLS
-- de l'appelant ; ne renvoie qu'un booléen).
create or replace function public.hr_can_view(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- soi-même
    target = auth.uid()
    -- encadrement global : admin / pasteur / support
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.role::text in ('admin','pasteur') or 'support' = any(p.groups))
    )
    -- manager d'un groupe auquel appartient la cible
    or exists (
      select 1
      from public.profiles mgr
      join public.profiles tgt on tgt.id = target
      where mgr.id = auth.uid()
        and coalesce(array_length(mgr.managed_groups, 1), 0) > 0
        and mgr.managed_groups && tgt.groups
    );
$$;

-- Pointage journalier
drop policy if exists "hr_select" on public.hr_attendance;
create policy "hr_select" on public.hr_attendance
  for select to authenticated
  using (public.hr_can_view(member_id));

-- Déclarations self-service
drop policy if exists "hr_decl_select" on public.hr_declarations;
create policy "hr_decl_select" on public.hr_declarations
  for select to authenticated
  using (public.hr_can_view(member_id));
