-- Limitation de débit pour les routes AI biblique
-- 60 requêtes par heure par utilisateur (configurable via p_limit)

CREATE TABLE IF NOT EXISTS ai_rate_limit (
  user_id       UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hour_key      TEXT    NOT NULL, -- format "2026-07-21T14" (UTC)
  request_count INT     NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, hour_key)
);

ALTER TABLE ai_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_limit" ON ai_rate_limit
  FOR SELECT USING (auth.uid() = user_id);

-- Incrément atomique + vérification de quota
-- Retourne TRUE si la requête est autorisée, FALSE si le quota est dépassé
CREATE OR REPLACE FUNCTION ai_increment_rate_limit(
  p_user_id UUID,
  p_limit   INT DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_hour  TEXT;
BEGIN
  v_hour := to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24');

  INSERT INTO ai_rate_limit(user_id, hour_key, request_count)
  VALUES (p_user_id, v_hour, 1)
  ON CONFLICT (user_id, hour_key)
  DO UPDATE SET request_count = ai_rate_limit.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

-- Nettoyage automatique des entrées de plus de 2 heures (pg_cron optionnel)
-- SELECT cron.schedule('cleanup-ai-rate-limit', '0 * * * *',
--   $$DELETE FROM ai_rate_limit WHERE hour_key < to_char(NOW() AT TIME ZONE 'UTC' - INTERVAL '2 hours', 'YYYY-MM-DD"T"HH24')$$);
