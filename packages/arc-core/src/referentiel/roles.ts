// Référentiel officiel — Rôles (ADR-001 v2.1)
// Source de vérité unique : 4 rôles, ordre croissant de privilège

export const ROLES = ["visiteur", "membre", "pasteur", "admin"] as const
export type Role = typeof ROLES[number]

export const ROLE_LABELS: Record<Role, string> = {
  visiteur: "Visiteur",
  membre:   "Membre",
  pasteur:  "Pasteur",
  admin:    "Administrateur",
}

/** Rôles disposant de droits d'administration pastoraux */
export const ROLES_PASTORAUX = ["pasteur", "admin"] as const satisfies readonly Role[]

export function isRoleValide(value: unknown): value is Role {
  return ROLES.includes(value as Role)
}

export function isAdminOuPasteur(role: string | null | undefined): boolean {
  return role === "admin" || role === "pasteur"
}
