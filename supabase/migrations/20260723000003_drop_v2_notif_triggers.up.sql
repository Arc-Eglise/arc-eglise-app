-- ════════════════════════════════════════════════════════════════════════
-- Suppression des 12 triggers de notification v2 — ARC Église — 2026-07-23
-- Ces événements sont désormais gérés par le service applicatif unifié
-- (src/lib/notify.ts appelé depuis les server actions), qui écrit la notif
-- in-app ET envoie le Web Push. Sans cette suppression, chaque événement
-- créerait une notif in-app EN DOUBLE (trigger + service).
--
-- ⚠️ On NE touche PAS aux 4 triggers de notification_triggers.sql (v1) :
--    trig_new_message_notif, trig_new_prayer_notif, trig_new_event_notif,
--    trig_event_update_notif — encore actifs (in-app seul, pas de push).
--    À migrer dans une étape ultérieure.
-- ════════════════════════════════════════════════════════════════════════

-- profiles
drop trigger if exists trig_profile_validated on profiles;
drop trigger if exists trig_role_change       on profiles;
drop trigger if exists trig_groups_change      on profiles;
drop trigger if exists trig_pastoral_stage     on profiles;

-- prayer_requests
drop trigger if exists trig_prayer_answered   on prayer_requests;
drop trigger if exists trig_prayer_milestone  on prayer_requests;

-- sermons
drop trigger if exists trig_new_sermon_notif  on sermons;
drop trigger if exists trig_sermon_published  on sermons;

-- grievances
drop trigger if exists trig_grievance_response on grievances;
drop trigger if exists trig_new_grievance      on grievances;

-- rsvp / présences
drop trigger if exists trig_rsvp_going on event_rsvp;
drop trigger if exists trig_check_in   on event_attendance;

-- Fonctions associées
drop function if exists notify_profile_validated();
drop function if exists notify_role_change();
drop function if exists notify_groups_change();
drop function if exists notify_pastoral_stage();
drop function if exists notify_prayer_answered();
drop function if exists notify_prayer_milestone();
drop function if exists notify_new_sermon();
drop function if exists notify_sermon_published();
drop function if exists notify_grievance_response();
drop function if exists notify_new_grievance();
drop function if exists notify_rsvp_going();
drop function if exists notify_check_in();
