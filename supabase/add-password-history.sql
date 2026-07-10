-- ══════════════════════════════════════════════════════════════════
--  ARC Église — Historique des mots de passe (conformité nLPD/FADP)
--  Exécuter dans : Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- Table de stockage des hash bcrypt (jamais de mot de passe en clair)
CREATE TABLE IF NOT EXISTS public.password_history (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT         NOT NULL,  -- bcrypt hash (cost 12)
  created_at    TIMESTAMPTZ  DEFAULT NOW() NOT NULL
);

-- Index pour les requêtes de vérification (user_id + date décroissante)
CREATE INDEX IF NOT EXISTS idx_password_history_user_date
  ON public.password_history (user_id, created_at DESC);

-- RLS activée — aucun accès utilisateur direct ;
-- seul le service_role (API admin côté serveur) peut lire/écrire
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- Résultat
SELECT
  'Table password_history créée avec RLS activée.' AS statut,
  count(*)::text AS lignes_existantes
FROM public.password_history;
