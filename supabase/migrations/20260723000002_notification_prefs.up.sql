-- ════════════════════════════════════════════════════════════════════════
-- Préférences de notifications par utilisateur — ARC Église — 2026-07-23
-- Colonne jsonb sur profiles. Modèle opt-out : clé absente OU true = activé,
-- false = désactivé. Indexée par la `key` de NOTIFICATION_CATEGORIES
-- (src/lib/notification-types.ts). Ex : {"mail": false, "stream": false}
-- ════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;
