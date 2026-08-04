-- ============================================================================
-- ADR-002 — Notes & Tâches — Phase 3 (Partage) + Phase 4 (Rappels/Récurrence)
-- Branche : feat/notes-taches
-- ============================================================================

-- ── PHASE 3 : partage (individus + fonctions), opt-in + acceptation + audit ──
create table if not exists public.shares (
  id                    uuid primary key default gen_random_uuid(),
  resource_type         text not null,               -- 'note' | 'task'
  resource_id           uuid not null,
  shared_by             uuid not null references auth.users(id) on delete cascade,
  target_kind           text not null,               -- 'user' | 'function'
  shared_with_id        uuid references auth.users(id) on delete cascade,
  shared_with_function  text,                         -- slug de fonction (ex. 'chorale')
  permission            text not null default 'copie',-- 'lecture' | 'copie'
  status                text not null default 'en_attente', -- 'en_attente'|'accepte'|'refuse'
  message               text,
  created_at            timestamptz not null default now(),
  responded_at          timestamptz,
  constraint chk_shares_resource_type check (resource_type in ('note','task')),
  constraint chk_shares_target_kind   check (target_kind in ('user','function')),
  constraint chk_shares_permission    check (permission in ('lecture','copie')),
  constraint chk_shares_status        check (status in ('en_attente','accepte','refuse')),
  constraint chk_shares_target check (
    (target_kind = 'user'     and shared_with_id is not null) or
    (target_kind = 'function' and shared_with_function is not null)
  )
);

create index if not exists idx_shares_recipient_user on public.shares(shared_with_id) where target_kind = 'user';
create index if not exists idx_shares_recipient_fn   on public.shares(shared_with_function) where target_kind = 'function';
create index if not exists idx_shares_by             on public.shares(shared_by);
create index if not exists idx_shares_resource       on public.shares(resource_type, resource_id);

comment on table public.shares is
  'Journal des partages de notes/tâches (audit nLPD). Opt-in : le destinataire accepte avant copie dans son espace.';

alter table public.shares enable row level security;

-- fonctions du membre courant (profiles.groups = text[])
create or replace function public.current_member_functions()
returns setof text language sql stable security definer set search_path = public as $$
  select unnest(coalesce(groups, '{}')) from public.profiles where id = auth.uid()
$$;

-- SELECT : émetteur, destinataire direct, ou membre de la fonction ciblée
create policy shares_select on public.shares
  for select using (
    shared_by = auth.uid()
    or (target_kind = 'user' and shared_with_id = auth.uid())
    or (target_kind = 'function' and shared_with_function in (select public.current_member_functions()))
  );

-- INSERT : on ne partage qu'en son nom
create policy shares_insert on public.shares
  for insert with check (shared_by = auth.uid());

-- UPDATE : le destinataire répond (accepte/refuse)
create policy shares_update_recipient on public.shares
  for update using (
    (target_kind = 'user' and shared_with_id = auth.uid())
    or (target_kind = 'function' and shared_with_function in (select public.current_member_functions()))
  );

-- DELETE : l'émetteur révoque
create policy shares_delete_owner on public.shares
  for delete using (shared_by = auth.uid());

-- ── PHASE 4 : rappels + récurrence sur les tâches ───────────────────────────
alter table public.tasks add column if not exists remind_at   timestamptz;
alter table public.tasks add column if not exists reminded_at timestamptz;
-- RRULE simplifié : 'FREQ=DAILY|WEEKLY|MONTHLY;INTERVAL=n'
alter table public.tasks add column if not exists recurrence  text;

create index if not exists idx_tasks_remind
  on public.tasks(remind_at) where remind_at is not null and reminded_at is null;
