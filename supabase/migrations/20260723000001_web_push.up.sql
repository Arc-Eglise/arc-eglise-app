-- ════════════════════════════════════════════════════════════════════════
-- Web Push (PWA) — ARC Église — 2026-07-23
-- Table d'abonnements. L'envoi push est piloté par le service applicatif
-- unifié (src/lib/notify.ts → src/lib/push.ts), PAS par un trigger SQL :
-- toute notification passe par notifyUser()/broadcastNotify() qui écrit la
-- ligne in-app ET envoie le push. La notif in-app n'existe qu'via ce service.
-- ════════════════════════════════════════════════════════════════════════

-- ── Abonnements push (un par navigateur/appareil) ──────────────────────
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
