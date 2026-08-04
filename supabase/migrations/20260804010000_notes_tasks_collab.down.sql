-- ============================================================================
-- ADR-002 — Rollback Phase 3 (Partage) + Phase 4 (Rappels/Récurrence)
-- ============================================================================

drop table if exists public.shares cascade;
drop function if exists public.current_member_functions();

alter table public.tasks drop column if exists remind_at;
alter table public.tasks drop column if exists reminded_at;
alter table public.tasks drop column if exists recurrence;
