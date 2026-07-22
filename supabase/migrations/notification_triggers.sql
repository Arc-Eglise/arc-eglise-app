-- ═══════════════════════════════════════════════════════════════════
-- TRIGGERS DE NOTIFICATIONS — ARC Église
-- À exécuter dans le SQL Editor de Supabase (en une seule fois)
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Nouveau message interne → notifier l'autre participant ────────
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient  UUID;
  sndr_name  TEXT;
BEGIN
  SELECT COALESCE(
    NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''),
    'Un membre'
  ) INTO sndr_name
  FROM profiles WHERE id = NEW.sender_id;

  FOR recipient IN
    SELECT user_id FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id
  LOOP
    INSERT INTO notifications (user_id, type, title, body, link)
    VALUES (
      recipient, 'message',
      '💬 ' || sndr_name,
      LEFT(NEW.content, 90),
      '/espace-membres/messagerie/' || NEW.conversation_id
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_new_message_notif ON messages;
CREATE TRIGGER trig_new_message_notif
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();


-- ─── 2. Nouvelle demande de prière → notifier selon la visibilité ────
CREATE OR REPLACE FUNCTION notify_new_prayer()
RETURNS TRIGGER AS $$
DECLARE
  recipient  UUID;
  author     TEXT;
BEGIN
  SELECT CASE WHEN NEW.is_anonymous THEN 'Un membre'
    ELSE COALESCE(
      NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''),
      'Un membre'
    )
  END INTO author
  FROM profiles WHERE id = NEW.user_id;

  -- ── Tous les membres validés ──
  IF NEW.visibility = 'all' OR NEW.visibility IS NULL THEN
    FOR recipient IN
      SELECT id FROM profiles WHERE validated = true AND id <> NEW.user_id LIMIT 500
    LOOP
      INSERT INTO notifications (user_id, type, title, body, link)
      VALUES (recipient, 'prayer',
        '🙏 Prière de ' || author,
        LEFT(NEW.title, 90),
        '/espace-membres?p=priere');
    END LOOP;

  -- ── Pasteurs et admins uniquement ──
  ELSIF NEW.visibility = 'pasteur' THEN
    FOR recipient IN
      SELECT id FROM profiles WHERE role IN ('pasteur','admin') AND id <> NEW.user_id
    LOOP
      INSERT INTO notifications (user_id, type, title, body, link)
      VALUES (recipient, 'prayer',
        '🙏 Prière (pasteurs) — ' || author,
        LEFT(NEW.title, 90),
        '/espace-membres?p=priere');
    END LOOP;

  -- ── Membres des groupes ciblés ──
  ELSIF NEW.visibility = 'groups' AND array_length(NEW.target_groups, 1) > 0 THEN
    FOR recipient IN
      SELECT id FROM profiles
      WHERE validated = true
        AND id <> NEW.user_id
        AND groups && NEW.target_groups
    LOOP
      INSERT INTO notifications (user_id, type, title, body, link)
      VALUES (recipient, 'prayer',
        '🙏 Prière dans ton groupe — ' || author,
        LEFT(NEW.title, 90),
        '/espace-membres?p=priere');
    END LOOP;

  -- ── Membres individuels ciblés ──
  ELSIF NEW.visibility = 'members' AND array_length(NEW.target_members, 1) > 0 THEN
    FOR recipient IN
      SELECT unnest(NEW.target_members)
    LOOP
      IF recipient <> NEW.user_id THEN
        INSERT INTO notifications (user_id, type, title, body, link)
        VALUES (recipient, 'prayer',
          '🙏 ' || author || ' partage une prière avec toi',
          LEFT(NEW.title, 90),
          '/espace-membres?p=priere');
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_new_prayer_notif ON prayer_requests;
CREATE TRIGGER trig_new_prayer_notif
  AFTER INSERT ON prayer_requests
  FOR EACH ROW EXECUTE FUNCTION notify_new_prayer();


-- ─── 3. Nouvel événement publié → notifier tous les membres ──────────
CREATE OR REPLACE FUNCTION notify_new_event()
RETURNS TRIGGER AS $$
DECLARE
  recipient UUID;
  evt_date  TEXT;
BEGIN
  IF NEW.is_published AND NEW.date >= CURRENT_DATE THEN
    evt_date := TO_CHAR(NEW.date::date, 'DD Mon');
    FOR recipient IN
      SELECT id FROM profiles WHERE validated = true LIMIT 500
    LOOP
      INSERT INTO notifications (user_id, type, title, body, link)
      VALUES (
        recipient, 'event',
        '📅 Nouvel événement : ' || NEW.title,
        evt_date || CASE WHEN NEW.location IS NOT NULL THEN ' · ' || NEW.location ELSE '' END,
        '/espace-membres/agenda'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_new_event_notif ON events;
CREATE TRIGGER trig_new_event_notif
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION notify_new_event();


-- ─── 4. Modification d'événement → notifier les inscrits ─────────────
CREATE OR REPLACE FUNCTION notify_event_update()
RETURNS TRIGGER AS $$
DECLARE
  recipient UUID;
BEGIN
  -- Notifier si date, heure, lieu ou statut publication change
  IF NEW.is_published AND (
    NEW.date       IS DISTINCT FROM OLD.date OR
    NEW.time_start IS DISTINCT FROM OLD.time_start OR
    NEW.location   IS DISTINCT FROM OLD.location OR
    NEW.is_published IS DISTINCT FROM OLD.is_published
  ) THEN
    FOR recipient IN
      SELECT user_id FROM event_attendance WHERE event_id = NEW.id
    LOOP
      INSERT INTO notifications (user_id, type, title, body, link)
      VALUES (
        recipient, 'event',
        '📅 Événement modifié : ' || NEW.title,
        'Date, heure ou lieu mis à jour — vérifiez les nouvelles informations.',
        '/espace-membres/agenda'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trig_event_update_notif ON events;
CREATE TRIGGER trig_event_update_notif
  AFTER UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION notify_event_update();


-- ─── 5. Politique RLS pour que les users puissent insérer pour eux-mêmes ──
-- (nécessaire pour les self-notifications côté serveur Next.js)
-- À ajuster selon votre configuration RLS existante

-- Si la table notifications n'a pas de policy INSERT pour les authenticated users :
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='allow_self_insert'
--   ) THEN
--     CREATE POLICY allow_self_insert ON notifications
--       FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
--   END IF;
-- END$$;
