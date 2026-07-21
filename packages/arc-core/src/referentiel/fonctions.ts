// Référentiel officiel — Fonctions (ADR-001 v2.1)
// Source de vérité unique : 13 fonctions, slugs canoniques
// ⚠️ "groups" est un mot réservé PostgreSQL — toujours entre guillemets en SQL

export const FONCTIONS = [
  "pasteur",
  "chorale",
  "media",
  "social",
  "hospitalite",
  "sanitaire",
  "finance",
  "support",
  "jeunesse",
  "femmes",
  "ecodim",
  "suivi",
  "communication",
] as const

export type Fonction = typeof FONCTIONS[number]

export const FONCTION_LABELS: Record<Fonction, string> = {
  pasteur:       "Pasteur",
  chorale:       "Chorale",
  media:         "Équipe Média",
  social:        "Social & Hospitalité",
  hospitalite:   "Hospitalité",
  sanitaire:     "Sanitaire & Propreté",
  finance:       "Finance",
  support:       "Support",
  jeunesse:      "La Jeunesse",
  femmes:        "Groupe des Femmes",
  ecodim:        "Écodim",
  suivi:         "Suivi d'âmes",
  communication: "Communication",
}

export function isFonctionValide(value: unknown): value is Fonction {
  return FONCTIONS.includes(value as Fonction)
}

export function fonctionsValides(values: unknown[]): values is Fonction[] {
  return values.every(isFonctionValide)
}
