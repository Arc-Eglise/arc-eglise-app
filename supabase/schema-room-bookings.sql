-- Table réservations de salles
create table if not exists public.room_bookings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  room        text not null,
  date        date not null,
  time_start  time not null,
  time_end    time not null,
  groupe      text,
  motif       text not null,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now()
);

alter table public.room_bookings enable row level security;

-- Tout membre authentifié peut créer une réservation
create policy "Membres peuvent réserver" on public.room_bookings
  for insert to authenticated with check (auth.uid() = user_id);

-- Chacun voit ses propres réservations ; admins voient toutes
create policy "Voir ses réservations" on public.room_bookings
  for select to authenticated using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin','pasteur')
    )
  );

-- Admins peuvent mettre à jour le statut
create policy "Admins gèrent les réservations" on public.room_bookings
  for update to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','pasteur'))
  );
