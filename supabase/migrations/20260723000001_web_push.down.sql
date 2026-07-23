-- Rollback Web Push — ARC Église — 2026-07-23
drop trigger if exists trg_notify_push on public.notifications;
drop function if exists public.notify_push_on_notification();
drop table if exists public.push_config;
drop table if exists public.push_subscriptions;
-- (extension pg_net conservée : potentiellement utilisée ailleurs)
