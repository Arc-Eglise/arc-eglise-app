-- ADR-001 Chantier B / B3 — Quotas, rate limiting, journalisation du socle /api/v1
-- Tables PROPRES AU SOCLE, préfixées arc_api_* pour ne pas interférer avec l'app
-- existante (ai_rate_limit reste dédiée aux routes bible-ai héritées).
--
-- ⚠️ NE PAS EXÉCUTER avant le feu vert écrit de Joe (Chantier C = bascule, bloqué).
--     Fait partie du périmètre B3 ; exécuté lors de la validation du socle (B4).

-- ── Rate limiting ────────────────────────────────────────────────────────────
-- Compteur générique : une ligne par (bucket, fenêtre). Le bucket encode déjà la
-- catégorie et l'identité (ex : "read:user:<uuid>", "public:ip:<ip>").
CREATE TABLE IF NOT EXISTS arc_api_rate_limit (
  bucket        TEXT        NOT NULL,
  window_key    TEXT        NOT NULL, -- ex : "60:29876543" (fenêtreSecondes:index)
  request_count INT         NOT NULL DEFAULT 1,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, window_key)
);

ALTER TABLE arc_api_rate_limit ENABLE ROW LEVEL SECURITY;
-- Aucune policy : accès réservé au service role (bypass RLS). Le client anon ne
-- doit jamais lire/écrire directement le compteur.

-- Incrément atomique + renvoi du compteur courant.
-- Le socle compare ensuite ce compteur au plafond calculé par @arc/core.
CREATE OR REPLACE FUNCTION arc_api_increment_rate_limit(
  p_bucket     TEXT,
  p_window_key TEXT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO arc_api_rate_limit(bucket, window_key, request_count, updated_at)
  VALUES (p_bucket, p_window_key, 1, now())
  ON CONFLICT (bucket, window_key)
  DO UPDATE SET request_count = arc_api_rate_limit.request_count + 1,
                updated_at    = now()
  RETURNING request_count INTO v_count;

  RETURN v_count;
END;
$$;

-- ── Journalisation ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arc_api_log (
  id          BIGSERIAL   PRIMARY KEY,
  request_id  UUID        NOT NULL,
  method      TEXT        NOT NULL,
  path        TEXT        NOT NULL,
  status      INT         NOT NULL,
  category    TEXT,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  ip          TEXT,
  duration_ms INT         NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arc_api_log_created_at ON arc_api_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arc_api_log_user_id    ON arc_api_log (user_id);

ALTER TABLE arc_api_log ENABLE ROW LEVEL SECURITY;
-- Lecture réservée aux administrateurs ; écriture réservée au service role.
CREATE POLICY "arc_api_log_admin_read" ON arc_api_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ── Nettoyage (optionnel via pg_cron) ────────────────────────────────────────
-- Purge des compteurs de rate limit périmés (> 1h) et des logs > 90 jours :
-- SELECT cron.schedule('arc-api-cleanup', '15 * * * *', $$
--   DELETE FROM arc_api_rate_limit WHERE updated_at < now() - INTERVAL '1 hour';
--   DELETE FROM arc_api_log         WHERE created_at < now() - INTERVAL '90 days';
-- $$);
