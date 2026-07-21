-- Table des dons reçus via Stripe
-- Alimentée par le webhook payment_intent.succeeded

CREATE TABLE IF NOT EXISTS donations (
  id             UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_pi_id   TEXT         UNIQUE NOT NULL,          -- payment_intent.id
  amount_cents   INT          NOT NULL,                  -- montant en centimes CHF
  currency       TEXT         NOT NULL DEFAULT 'chf',
  donor_email    TEXT,                                   -- receipt_email ou metadata.email
  donor_name     TEXT,                                   -- metadata.name si fourni
  status         TEXT         NOT NULL DEFAULT 'completed',
  stripe_payload JSONB,                                  -- payload complet (audit)
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent consulter les dons
CREATE POLICY "admins_read_donations" ON donations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Commentaire sur l'activation future :
-- Activer les dons dans .env.local : NEXT_PUBLIC_DONS_ENABLED=true
-- Configurer : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
