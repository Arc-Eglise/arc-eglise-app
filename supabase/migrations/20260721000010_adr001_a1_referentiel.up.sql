-- ═══════════════════════════════════════════════════════════════════════
--  ADR-001 · Chantier A1 · Migration 1/3 · UP
--  Table de référence des rôles et des fonctions
--
--  Crée deux tables immuables qui servent de source de vérité au référentiel.
--  Ces tables sont lues par le script de cohérence du chantier B1.
--  Elles ne sont pas exposées par RLS aux clients — usage serveur uniquement.
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Rôles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arc_referentiel_roles (
  slug        TEXT    PRIMARY KEY,
  label       TEXT    NOT NULL,
  sort_order  INT     NOT NULL
);

INSERT INTO arc_referentiel_roles (slug, label, sort_order) VALUES
  ('visiteur', 'Visiteur',  1),
  ('membre',   'Membre',    2),
  ('pasteur',  'Pasteur',   3),
  ('admin',    'Admin',     4)
ON CONFLICT (slug) DO UPDATE SET
  label      = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;

-- ── Fonctions (profiles.groups[]) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arc_referentiel_functions (
  slug        TEXT    PRIMARY KEY,
  label       TEXT    NOT NULL,
  sort_order  INT     NOT NULL
);

INSERT INTO arc_referentiel_functions (slug, label, sort_order) VALUES
  ('pasteur',        'Équipe pastorale',        1),
  ('chorale',        'Chorale',                 2),
  ('media',          'Équipe Média',             3),
  ('social',         'Action sociale',           4),
  ('hospitalite',    'Hospitalité',              5),
  ('sanitaire',      'Équipe sanitaire',         6),
  ('finance',        'Finance',                  7),
  ('support',        'Support technique',        8),
  ('jeunesse',       'Jeunesse',                9),
  ('femmes',         'Ministère des femmes',    10),
  ('ecodim',         'École du dimanche',       11),
  ('suivi',          'Suivi pastoral',          12),
  ('communication',  'Communication',           13)
ON CONFLICT (slug) DO UPDATE SET
  label      = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;

-- ── Pipeline pastoral ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arc_referentiel_pipeline (
  slug        TEXT    PRIMARY KEY,
  label       TEXT    NOT NULL,
  sort_order  INT     NOT NULL
);

INSERT INTO arc_referentiel_pipeline (slug, label, sort_order) VALUES
  ('visiteur',      'Visiteur',       1),
  ('integration',   'Intégration',    2),
  ('actif',         'Actif',          3),
  ('formation',     'En formation',   4),
  ('responsable',   'Responsable',    5)
ON CONFLICT (slug) DO UPDATE SET
  label      = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;

COMMIT;
