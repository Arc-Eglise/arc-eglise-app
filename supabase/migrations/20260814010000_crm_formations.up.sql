-- ═══════════════════════════════════════════════════════════════════════════
-- CRM — Formations : créer des formations et y affecter des membres.
-- Affecter un membre le fait passer à l'étape pastorale « formation »
-- (géré côté action serveur) → il apparaît dans la colonne Formation du pipeline.
-- Gestion réservée au staff CRM (admin | pasteur | fonction "suivi").
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.formations (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text,
  start_date          date,
  end_date            date,                                                  -- modifiable si la formation se prolonge
  days                text[] not null default '{}',                          -- jours : lun,mar,mer,jeu,ven,sam,dim
  time_start          time,                                                  -- heure de début
  time_end            time,                                                  -- heure de fin
  formateur_member_id uuid references public.profiles(id) on delete set null, -- formateur interne (membre)
  formateur_externe   text,                                                   -- formateur externe (pasteur externe, texte libre)
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now()
);
-- Idempotence si la table préexistait
alter table public.formations add column if not exists days       text[] not null default '{}';
alter table public.formations add column if not exists time_start time;
alter table public.formations add column if not exists time_end   time;

-- Annonces de présence des membres à une formation
--   sera_present · present · sera_absent · absent
create table if not exists public.formation_attendance (
  id           uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations(id) on delete cascade,
  member_id    uuid not null references public.profiles(id) on delete cascade,
  status       text not null check (status in ('sera_present','present','sera_absent','absent')),
  note         text,
  updated_at   timestamptz not null default now(),
  unique (formation_id, member_id)
);
create index if not exists formation_attendance_formation_idx on public.formation_attendance (formation_id);
create index if not exists formation_attendance_member_idx    on public.formation_attendance (member_id);

create table if not exists public.formation_enrollments (
  id           uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations(id) on delete cascade,
  member_id    uuid not null references public.profiles(id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  unique (formation_id, member_id)
);

create index if not exists formation_enrollments_formation_idx on public.formation_enrollments (formation_id);
create index if not exists formation_enrollments_member_idx    on public.formation_enrollments (member_id);

-- Staff CRM (écriture) = admin | pasteur | fonction "suivi"
create or replace function public.is_crm_writer()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role::text in ('admin','pasteur') or 'suivi' = any(p.groups))
  );
$$;

alter table public.formations enable row level security;
alter table public.formation_enrollments enable row level security;

drop policy if exists formations_rw on public.formations;
create policy formations_rw on public.formations
  for all to authenticated
  using (public.is_crm_writer()) with check (public.is_crm_writer());

-- Inscriptions : le membre voit les siennes ; le staff CRM gère tout
drop policy if exists fenroll_select on public.formation_enrollments;
create policy fenroll_select on public.formation_enrollments
  for select to authenticated
  using (member_id = auth.uid() or public.is_crm_writer());

drop policy if exists fenroll_write on public.formation_enrollments;
create policy fenroll_write on public.formation_enrollments
  for all to authenticated
  using (public.is_crm_writer()) with check (public.is_crm_writer());

-- Présence formation : le membre gère la sienne ; staff CRM (dont pasteur) voit tout
alter table public.formation_attendance enable row level security;

drop policy if exists fatt_select on public.formation_attendance;
create policy fatt_select on public.formation_attendance
  for select to authenticated
  using (member_id = auth.uid() or public.is_crm_writer());

drop policy if exists fatt_write_self on public.formation_attendance;
create policy fatt_write_self on public.formation_attendance
  for all to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());
