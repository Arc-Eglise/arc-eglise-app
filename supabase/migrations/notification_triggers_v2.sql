-- ═══════════════════════════════════════════════════════════════════
-- TRIGGERS NOTIFICATIONS v2 — ARC Église
-- À exécuter dans le SQL Editor Supabase (après notification_triggers.sql)
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Compte validé → notif user ───────────────────────────────────
CREATE OR REPLACE FUNCTION notify_profile_validated()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    NEW.id, 'system',
    '✅ Ton compte a été validé !',
    'Bienvenue dans l''Espace Membres ARC. Tu as maintenant accès à toutes les fonctionnalités.',
    '/espace-membres'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_profile_validated ON profiles;
CREATE TRIGGER trig_profile_validated
  AFTER UPDATE OF validated ON profiles
  FOR EACH ROW
  WHEN (NEW.validated = true AND (OLD.validated IS DISTINCT FROM NEW.validated))
  EXECUTE FUNCTION notify_profile_validated();


-- ─── 2. Rôle changé → notif user ─────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_role_change()
RETURNS TRIGGER AS $$
DECLARE
  label TEXT;
BEGIN
  label := CASE NEW.role
    WHEN 'admin'   THEN 'Administrateur'
    WHEN 'pasteur' THEN 'Pasteur'
    WHEN 'membre'  THEN 'Membre'
    WHEN 'visiteur' THEN 'Visiteur'
    ELSE NEW.role
  END;
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    NEW.id, 'system',
    '🏅 Nouveau rôle : ' || label,
    NULL,
    '/espace-membres/profil'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_role_change ON profiles;
CREATE TRIGGER trig_role_change
  AFTER UPDATE OF role ON profiles
  FOR EACH ROW
  WHEN (NEW.role IS DISTINCT FROM OLD.role)
  EXECUTE FUNCTION notify_role_change();


-- ─── 3. Ajouté à un groupe → notif user (seulement les nouveaux groupes) ──
CREATE OR REPLACE FUNCTION notify_groups_change()
RETURNS TRIGGER AS $$
DECLARE
  added_group TEXT;
  group_labels JSONB := '{
    "pasteur":"Pasteur","media":"Équipe Média","chorale":"Chorale",
    "jeunesse":"La Jeunesse","femmes":"Groupe des Femmes",
    "social":"Social & Hospitalité","hospitalite":"Hospitalité",
    "sanitaire":"Sanitaire & Propreté","ecodim":"Écodim",
    "suivi":"Suivi d''âmes","communication":"Communication",
    "support":"Support","finance":"Finance"
  }'::JSONB;
BEGIN
  FOR added_group IN
    SELECT unnest(COALESCE(NEW.groups,'{}'))
    EXCEPT
    SELECT unnest(COALESCE(OLD.groups,'{}'))
  LOOP
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      NEW.id, 'system',
      '👥 Tu as rejoint : ' || COALESCE(group_labels->>added_group, added_group),
      'Tu fais maintenant partie de ce groupe de fonctions ARC.',
      '/espace-membres'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_groups_change ON profiles;
CREATE TRIGGER trig_groups_change
  AFTER UPDATE OF groups ON profiles
  FOR EACH ROW
  WHEN (COALESCE(NEW.groups,'{}') IS DISTINCT FROM COALESCE(OLD.groups,'{}'))
  EXECUTE FUNCTION notify_groups_change();


-- ─── 4. Prière exaucée → notif auteur ────────────────────────────────
CREATE OR REPLACE FUNCTION notify_prayer_answered()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    NEW.user_id, 'prayer',
    '✨ Ta prière a été exaucée !',
    LEFT(NEW.title, 90),
    '/espace-membres?p=priere'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_prayer_answered ON prayer_requests;
CREATE TRIGGER trig_prayer_answered
  AFTER UPDATE OF is_answered ON prayer_requests
  FOR EACH ROW
  WHEN (NEW.is_answered = true AND (OLD.is_answered IS DISTINCT FROM NEW.is_answered))
  EXECUTE FUNCTION notify_prayer_answered();


-- ─── 5. Jalons de prière (1 / 5 / 10 / 25 / 50 prières) → notif auteur ──
CREATE OR REPLACE FUNCTION notify_prayer_milestone()
RETURNS TRIGGER AS $$
DECLARE
  milestones INT[] := ARRAY[1, 5, 10, 25, 50, 100];
  m INT;
BEGIN
  FOREACH m IN ARRAY milestones LOOP
    IF NEW.prayer_count >= m AND OLD.prayer_count < m THEN
      INSERT INTO notifications (user_id, type, title, body, link)
      VALUES (
        NEW.user_id, 'prayer',
        '🙏 ' || m || ' frère' || CASE WHEN m > 1 THEN 's prient' ELSE ' prie' END || ' pour toi !',
        LEFT(NEW.title, 80),
        '/espace-membres?p=priere'
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_prayer_milestone ON prayer_requests;
CREATE TRIGGER trig_prayer_milestone
  AFTER UPDATE OF prayer_count ON prayer_requests
  FOR EACH ROW
  WHEN (NEW.prayer_count IS DISTINCT FROM OLD.prayer_count)
  EXECUTE FUNCTION notify_prayer_milestone();


-- ─── 6. Nouveau sermon publié → notif tous les membres ───────────────
CREATE OR REPLACE FUNCTION notify_new_sermon()
RETURNS TRIGGER AS $$
DECLARE
  recipient UUID;
BEGIN
  FOR recipient IN
    SELECT id FROM profiles WHERE validated = true LIMIT 500
  LOOP
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      recipient, 'sermon',
      '🎙 ' || NEW.title,
      CASE WHEN NEW.pastor IS NOT NULL THEN 'Prêché par ' || NEW.pastor ELSE 'Nouveau sermon disponible' END,
      '/'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_new_sermon_notif ON sermons;
CREATE TRIGGER trig_new_sermon_notif
  AFTER INSERT ON sermons
  FOR EACH ROW
  WHEN (NEW.is_published = true)
  EXECUTE FUNCTION notify_new_sermon();


-- ─── 7. Sermon mis en ligne (UPDATE is_published) ─────────────────────
CREATE OR REPLACE FUNCTION notify_sermon_published()
RETURNS TRIGGER AS $$
DECLARE
  recipient UUID;
BEGIN
  FOR recipient IN
    SELECT id FROM profiles WHERE validated = true LIMIT 500
  LOOP
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      recipient, 'sermon',
      '🎙 ' || NEW.title,
      CASE WHEN NEW.pastor IS NOT NULL THEN 'Prêché par ' || NEW.pastor ELSE 'Sermon maintenant disponible' END,
      '/'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_sermon_published ON sermons;
CREATE TRIGGER trig_sermon_published
  AFTER UPDATE OF is_published ON sermons
  FOR EACH ROW
  WHEN (NEW.is_published = true AND (OLD.is_published IS DISTINCT FROM NEW.is_published))
  EXECUTE FUNCTION notify_sermon_published();


-- ─── 8. Doléance traitée → notif utilisateur concerné ───────────────
CREATE OR REPLACE FUNCTION notify_grievance_response()
RETURNS TRIGGER AS $$
DECLARE
  notif_title TEXT;
BEGIN
  notif_title := CASE NEW.status
    WHEN 'resolved'    THEN '✅ Ta doléance a été résolue'
    WHEN 'closed'      THEN '📬 Ta doléance a été clôturée'
    WHEN 'in_progress' THEN '🔄 Ta doléance est en cours de traitement'
    ELSE '📬 Mise à jour de ta doléance'
  END;
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    NEW.user_id, 'system',
    notif_title,
    CASE WHEN NEW.admin_response IS NOT NULL THEN LEFT(NEW.admin_response, 90) ELSE LEFT(NEW.title, 90) END,
    '/espace-membres/doleances'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_grievance_response ON grievances;
CREATE TRIGGER trig_grievance_response
  AFTER UPDATE OF status ON grievances
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status AND NEW.status != 'pending')
  EXECUTE FUNCTION notify_grievance_response();


-- ─── 9. RSVP "going" → self-notif (table event_rsvp) ────────────────
CREATE OR REPLACE FUNCTION notify_rsvp_going()
RETURNS TRIGGER AS $$
DECLARE
  evt_title TEXT;
BEGIN
  SELECT title INTO evt_title FROM events WHERE id = NEW.event_id;
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    NEW.user_id, 'event',
    '✅ RSVP confirmé : ' || COALESCE(evt_title, 'événement'),
    'Ton inscription est enregistrée. On t''y attend !',
    '/espace-membres/agenda'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_rsvp_going ON event_rsvp;
CREATE TRIGGER trig_rsvp_going
  AFTER INSERT OR UPDATE ON event_rsvp
  FOR EACH ROW
  WHEN (NEW.status = 'going')
  EXECUTE FUNCTION notify_rsvp_going();


-- ─── 10. Check-in / présence confirmée → notif user ──────────────────
CREATE OR REPLACE FUNCTION notify_check_in()
RETURNS TRIGGER AS $$
DECLARE
  evt_title TEXT;
BEGIN
  SELECT title INTO evt_title FROM events WHERE id = NEW.event_id;
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    NEW.user_id, 'event',
    '✅ Présence confirmée : ' || COALESCE(evt_title, 'événement'),
    CASE
      WHEN NEW.checked_in_by IS DISTINCT FROM NEW.user_id
        THEN 'Ton passage a été enregistré par l''administration.'
      ELSE 'Ton passage a bien été enregistré.'
    END,
    '/espace-membres/agenda'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_check_in ON event_attendance;
CREATE TRIGGER trig_check_in
  AFTER INSERT ON event_attendance
  FOR EACH ROW
  EXECUTE FUNCTION notify_check_in();


-- ─── 11. Étape pastorale mise à jour → notif membre ──────────────────
CREATE OR REPLACE FUNCTION notify_pastoral_stage()
RETURNS TRIGGER AS $$
DECLARE
  label TEXT;
BEGIN
  label := CASE NEW.pastoral_stage
    WHEN 'visiteur'    THEN 'Visiteur'
    WHEN 'integration' THEN 'Intégration'
    WHEN 'actif'       THEN 'Membre actif'
    WHEN 'formation'   THEN 'En formation'
    WHEN 'responsable' THEN 'Responsable'
    ELSE NEW.pastoral_stage
  END;
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    NEW.id, 'system',
    '🌱 Nouvelle étape : ' || label,
    'Ton parcours dans l''église a été mis à jour.',
    '/espace-membres/profil'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_pastoral_stage ON profiles;
CREATE TRIGGER trig_pastoral_stage
  AFTER UPDATE OF pastoral_stage ON profiles
  FOR EACH ROW
  WHEN (NEW.pastoral_stage IS DISTINCT FROM OLD.pastoral_stage AND NEW.pastoral_stage IS NOT NULL)
  EXECUTE FUNCTION notify_pastoral_stage();


-- ─── 12. Nouvelle doléance soumise → notif admins/pasteurs ──────────────────
CREATE OR REPLACE FUNCTION notify_new_grievance()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
BEGIN
  FOR admin_id IN
    SELECT id FROM profiles
    WHERE (role IN ('admin','pasteur') OR 'support' = ANY(COALESCE(groups,'{}')))
      AND validated = true
    LIMIT 20
  LOOP
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      admin_id, 'system',
      '📬 Nouvelle doléance : ' || COALESCE(NEW.category, 'autre'),
      LEFT(NEW.title, 80),
      '/admin/doleances'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_new_grievance ON grievances;
CREATE TRIGGER trig_new_grievance
  AFTER INSERT ON grievances
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_grievance();
