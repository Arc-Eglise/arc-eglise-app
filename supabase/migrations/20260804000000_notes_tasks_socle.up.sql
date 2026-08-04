-- ============================================================================
-- ADR-002 — Modules Notes & Tâches — Phase 1 (Socle)
-- Branche : feat/notes-taches — NE PAS exécuter en production sans accord écrit.
-- ============================================================================

-- ── Table NOTES (façon Sticky Notes, personnelles) ─────────────────────────
create table if not exists public.notes (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  title          text not null default '',
  body           text not null default '',
  color          text not null default 'yellow',
  is_pinned      boolean not null default false,
  position       integer not null default 0,
  reference      text,                     -- référence biblique (repris de biblical_notes)
  source_kind    text,                     -- Phase 2 : priere_bible|agenda|messagerie|streaming|mail
  source_ref_id  text,                     -- Phase 2
  source_snapshot jsonb,                   -- Phase 2 : contexte dénormalisé (survit à la suppression de la source)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  archived_at    timestamptz,
  constraint chk_notes_color check (color in
    ('yellow','green','pink','blue','purple','orange','gray','white')),
  constraint chk_notes_source_kind check (source_kind is null or source_kind in
    ('priere_bible','agenda','messagerie','streaming','mail'))
);

create index if not exists idx_notes_owner       on public.notes(owner_id);
create index if not exists idx_notes_owner_pinned on public.notes(owner_id, is_pinned, position);

-- ── Table TASKS (façon Todoist / TickTick, personnelles) ───────────────────
create table if not exists public.tasks (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  title          text not null,
  description    text not null default '',
  status         text not null default 'a_faire',
  priority       text not null default 'moyenne',
  due_at         timestamptz,
  parent_task_id uuid references public.tasks(id) on delete cascade,   -- sous-tâches
  position       integer not null default 0,
  source_kind    text,                     -- Phase 2
  source_ref_id  text,                     -- Phase 2
  source_snapshot jsonb,                   -- Phase 2
  assignee_id    uuid references auth.users(id) on delete set null,    -- Phase 3 (assignation)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  completed_at   timestamptz,
  constraint chk_tasks_status check (status in ('a_faire','en_cours','bloque','termine')),
  constraint chk_tasks_priority check (priority in ('haute','moyenne','basse')),
  constraint chk_tasks_source_kind check (source_kind is null or source_kind in
    ('priere_bible','agenda','messagerie','streaming','mail'))
);

create index if not exists idx_tasks_owner        on public.tasks(owner_id);
create index if not exists idx_tasks_owner_status on public.tasks(owner_id, status, position);
create index if not exists idx_tasks_parent       on public.tasks(parent_task_id);
create index if not exists idx_tasks_due          on public.tasks(owner_id, due_at);

-- ── Étiquettes (tags) partagées entre notes et tâches ──────────────────────
create table if not exists public.user_tags (
  id        uuid primary key default gen_random_uuid(),
  owner_id  uuid not null references auth.users(id) on delete cascade,
  label     text not null,
  color     text not null default 'gray',
  created_at timestamptz not null default now(),
  unique(owner_id, label)
);
create index if not exists idx_user_tags_owner on public.user_tags(owner_id);

create table if not exists public.note_tags (
  note_id uuid not null references public.notes(id) on delete cascade,
  tag_id  uuid not null references public.user_tags(id) on delete cascade,
  primary key (note_id, tag_id)
);

create table if not exists public.task_tags (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id  uuid not null references public.user_tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

-- ── updated_at auto ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_notes_updated_at on public.notes;
create trigger trg_notes_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ── RLS : propriétaire seul (Phase 1). Partage = Phase 3. ──────────────────
alter table public.notes     enable row level security;
alter table public.tasks     enable row level security;
alter table public.user_tags enable row level security;
alter table public.note_tags enable row level security;
alter table public.task_tags enable row level security;

create policy notes_owner_all on public.notes
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy tasks_owner_all on public.tasks
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy user_tags_owner_all on public.user_tags
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- jointures : accès si le propriétaire de la note/tâche liée = utilisateur courant
create policy note_tags_owner_all on public.note_tags
  for all using (exists (select 1 from public.notes n where n.id = note_id and n.owner_id = auth.uid()))
  with check (exists (select 1 from public.notes n where n.id = note_id and n.owner_id = auth.uid()));

create policy task_tags_owner_all on public.task_tags
  for all using (exists (select 1 from public.tasks t where t.id = task_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from public.tasks t where t.id = task_id and t.owner_id = auth.uid()));

-- ── Reprise des notes bibliques existantes (D8) ────────────────────────────
-- Copie idempotente : n'insère que ce qui n'a pas déjà été repris.
-- biblical_notes est CONSERVÉE (rollback trivial) ; l'app cesse de la lire.
insert into public.notes (owner_id, title, body, color, reference, created_at, updated_at)
select b.user_id, coalesce(b.title,''), coalesce(b.content,''), 'yellow', b.reference,
       b.created_at, b.updated_at
from public.biblical_notes b
where not exists (
  select 1 from public.notes n
  where n.owner_id = b.user_id
    and n.title = coalesce(b.title,'')
    and n.body  = coalesce(b.content,'')
    and n.created_at = b.created_at
);
