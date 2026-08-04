-- ============================================================================
-- ADR-002 — Rollback Phase 1 (Socle) Notes & Tâches
-- Ne touche PAS biblical_notes (conservée intacte durant toute la migration).
-- ============================================================================

drop table if exists public.note_tags cascade;
drop table if exists public.task_tags cascade;
drop table if exists public.user_tags cascade;
drop table if exists public.tasks cascade;
drop table if exists public.notes cascade;

-- set_updated_at() peut être partagée par d'autres tables : on ne la supprime
-- que si plus aucun trigger ne l'utilise.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgfoid = 'public.set_updated_at'::regproc
  ) then
    drop function if exists public.set_updated_at();
  end if;
end $$;
