-- ════════════════════════════════════════════════════════════════════════
-- Suppression des 4 triggers de notification v1 — ARC Église — 2026-07-23
-- Ces événements sont désormais gérés par le service applicatif unifié
-- (notifyUser/notifyMany/broadcastNotify) → push + in-app. Sans suppression,
-- doublons in-app.
--   • message   → messagerie.ts sendMessage
--   • prière    → membres.ts createPrayerRequest / submitPrayerRequest
--                 (EspaceMembresClient + BibleAIClient routés vers l'action)
--   • événement → membres.ts createEvent + cms.ts createEvent
--   • évt modif → cms.ts updateEvent (notifie les inscrits)
-- ════════════════════════════════════════════════════════════════════════

drop trigger if exists trig_new_message_notif   on messages;
drop trigger if exists trig_new_prayer_notif     on prayer_requests;
drop trigger if exists trig_new_event_notif      on events;
drop trigger if exists trig_event_update_notif   on events;

drop function if exists notify_new_message();
drop function if exists notify_new_prayer();
drop function if exists notify_new_event();
drop function if exists notify_event_update();
