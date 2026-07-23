-- ════════════════════════════════════════════════════════════════════════
-- Web Push (PWA) — ARC Église — 2026-07-23
-- Table d'abonnements + configuration dispatch + trigger de synchro avec
-- les notifications in-app (public.notifications).
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Abonnements push (un par navigateur/appareil) ────────────────────
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- L'utilisateur ne gère que ses propres abonnements.
drop policy if exists push_sub_select on public.push_subscriptions;
create policy push_sub_select on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists push_sub_insert on public.push_subscriptions;
create policy push_sub_insert on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists push_sub_update on public.push_subscriptions;
create policy push_sub_update on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists push_sub_delete on public.push_subscriptions;
create policy push_sub_delete on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- ── 2. Configuration du dispatch (URL + secret) ─────────────────────────
-- Ligne unique. Aucune policy RLS → lisible uniquement par le trigger
-- SECURITY DEFINER et le service_role. À remplir après déploiement (voir bas).
create table if not exists public.push_config (
  id              int primary key default 1,
  dispatch_url    text not null,
  dispatch_secret text not null,
  constraint push_config_single_row check (id = 1)
);

alter table public.push_config enable row level security;
-- (pas de policy = personne côté client ; le trigger DEFINER contourne la RLS)

-- ── 3. Extension réseau (appels HTTP sortants depuis Postgres) ──────────
create extension if not exists pg_net;

-- ── 4. Trigger : à chaque notification in-app insérée, on POST le dispatch
-- Couvre AUSSI bien les notifs créées par le code applicatif que celles
-- créées par les 12 triggers existants → point de synchro unique.
create or replace function public.notify_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
declare
  cfg public.push_config;
begin
  select * into cfg from public.push_config where id = 1;
  if cfg.dispatch_url is null then
    return new; -- config absente : on ne bloque jamais l'insertion
  end if;

  perform net.http_post(
    url     := cfg.dispatch_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', cfg.dispatch_secret
    ),
    body    := jsonb_build_object(
      'user_id', new.user_id,
      'type',    new.type,
      'title',   new.title,
      'body',    new.body,
      'link',    new.link
    )
  );
  return new;
exception when others then
  -- Un échec d'envoi push ne doit jamais faire échouer la notification in-app.
  return new;
end;
$$;

drop trigger if exists trg_notify_push on public.notifications;
create trigger trg_notify_push
  after insert on public.notifications
  for each row execute function public.notify_push_on_notification();

-- ════════════════════════════════════════════════════════════════════════
-- APRÈS DÉPLOIEMENT — exécuter une fois avec le vrai secret (= PUSH_DISPATCH_SECRET
-- de Vercel/.env.local). Remplacer <SECRET> :
--
--   insert into public.push_config (id, dispatch_url, dispatch_secret)
--   values (1, 'https://arc-eglise.ch/api/notifications/dispatch', '<SECRET>')
--   on conflict (id) do update
--     set dispatch_url = excluded.dispatch_url,
--         dispatch_secret = excluded.dispatch_secret;
-- ════════════════════════════════════════════════════════════════════════
