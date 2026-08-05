-- Réservations de salle (remplace la maquette « Confirmer la réservation »).
create table if not exists public.room_reservations (
  id           uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  room         text not null,
  date         date not null,
  start_time   text not null,
  end_time     text not null,
  group_name   text,
  purpose      text not null,
  status       text not null default 'en_attente',   -- en_attente | approuvee | refusee
  decided_by   uuid references auth.users(id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  constraint chk_room_res_status check (status in ('en_attente','approuvee','refusee'))
);

create index if not exists idx_room_res_by   on public.room_reservations(requested_by);
create index if not exists idx_room_res_date on public.room_reservations(date);

alter table public.room_reservations enable row level security;

-- Le demandeur voit/crée/annule ses propres réservations
create policy room_res_owner_select on public.room_reservations
  for select using (requested_by = auth.uid());
create policy room_res_owner_insert on public.room_reservations
  for insert with check (requested_by = auth.uid());
create policy room_res_owner_delete on public.room_reservations
  for delete using (requested_by = auth.uid() and status = 'en_attente');

-- Le staff (admin/pasteur) voit et décide toutes les réservations
create policy room_res_staff_select on public.room_reservations
  for select using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','pasteur')
  ));
create policy room_res_staff_update on public.room_reservations
  for update using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','pasteur')
  ));
