// Quotas & rate limiting — types (ADR-001 Chantier B / B3)
// Logique pure : aucune dépendance I/O, réutilisable côté socle comme côté tests.

/** Catégorie d'endpoint — détermine la politique de quota appliquée. */
export type QuotaCategory = "public" | "read" | "write" | "ai"

export const QUOTA_CATEGORIES = ["public", "read", "write", "ai"] as const

export interface RateLimitPolicy {
  /** Nombre maximum de requêtes autorisées dans la fenêtre. */
  limit: number
  /** Durée de la fenêtre glissante, en secondes. */
  windowSeconds: number
}

/** Décision de rate limiting pour une requête donnée. */
export interface RateLimitDecision {
  /** `true` si la requête est autorisée, `false` si le quota est dépassé. */
  allowed: boolean
  /** Plafond effectif pour ce couple (catégorie, rôle). */
  limit: number
  /** Requêtes restantes dans la fenêtre courante (jamais négatif). */
  remaining: number
  /** Secondes avant réinitialisation de la fenêtre. */
  resetSeconds: number
}
