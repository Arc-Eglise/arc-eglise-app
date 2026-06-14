-- Sécurité RLS pour apps mobiles
-- Seuls les membres validés (admin, pasteur, membre) accèdent aux données membres
-- À exécuter dans Supabase → SQL Editor

-- Fonction helper : renvoie true si l'utilisateur courant est un membre validé
CREATE OR REPLACE FUNCTION is_validated_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND validated = true
      AND role IN ('admin', 'pasteur', 'membre')
  )
$$;

-- ── PROFILES ─────────────────────────────────────────────────────────────────
-- Lire un profil : membres validés seulement (sauf lire son propre profil)
DROP POLICY IF EXISTS "Membres validés lisent les profils" ON profiles;
CREATE POLICY "Membres validés lisent les profils" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR is_validated_member()
  );

-- ── PRAYER REQUESTS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Membres validés lisent les prières" ON prayer_requests;
CREATE POLICY "Membres validés lisent les prières" ON prayer_requests
  FOR SELECT USING (is_validated_member());

DROP POLICY IF EXISTS "Membres validés créent des prières" ON prayer_requests;
CREATE POLICY "Membres validés créent des prières" ON prayer_requests
  FOR INSERT WITH CHECK (is_validated_member() AND auth.uid() = user_id);

-- ── MESSAGES / CONVERSATIONS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Membres validés lisent leurs messages" ON messages;
CREATE POLICY "Membres validés lisent leurs messages" ON messages
  FOR SELECT USING (
    is_validated_member() AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Membres validés envoient des messages" ON messages;
CREATE POLICY "Membres validés envoient des messages" ON messages
  FOR INSERT WITH CHECK (
    is_validated_member() AND auth.uid() = sender_id
  );

DROP POLICY IF EXISTS "Membres validés lisent leurs conversations" ON conversations;
CREATE POLICY "Membres validés lisent leurs conversations" ON conversations
  FOR SELECT USING (
    is_validated_member() AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Membres validés lisent leurs participations" ON conversation_participants;
CREATE POLICY "Membres validés lisent leurs participations" ON conversation_participants
  FOR SELECT USING (
    is_validated_member() AND user_id = auth.uid()
  );
