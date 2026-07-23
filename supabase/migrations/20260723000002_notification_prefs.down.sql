-- Rollback préférences notifications — ARC Église — 2026-07-23
alter table public.profiles drop column if exists notification_prefs;
