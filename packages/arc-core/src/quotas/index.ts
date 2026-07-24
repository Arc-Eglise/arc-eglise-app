// Quotas & rate limiting — politiques (ADR-001 Chantier B / B3)
// Toute la logique est pure et déterministe : le socle (src/app/api/v1) fournit
// le stockage (compteur en base), ce module fournit la politique.

import type { Role } from "../referentiel/roles"
import type { QuotaCategory, RateLimitPolicy, RateLimitDecision } from "./types"

export * from "./types"

/**
 * Politiques de base par catégorie d'endpoint, exprimées par utilisateur (ou par
 * IP pour les endpoints publics). Fenêtre glissante d'une minute.
 */
export const BASE_RATE_LIMITS: Record<QuotaCategory, RateLimitPolicy> = {
  public: { limit: 120, windowSeconds: 60 }, // health, référentiel, openapi
  read:   { limit: 240, windowSeconds: 60 }, // lectures authentifiées
  write:  { limit: 60,  windowSeconds: 60 }, // mutations authentifiées
  ai:     { limit: 20,  windowSeconds: 60 }, // opérations IA coûteuses
}

/** Le staff dispose de plafonds plus larges — multiplicateur appliqué au rôle. */
export const ROLE_MULTIPLIER: Record<Role, number> = {
  visiteur: 1,
  membre:   1,
  pasteur:  4,
  admin:    10,
}

/**
 * Résout la politique de rate limiting effective pour une catégorie d'endpoint
 * et un rôle. Fonction pure — aucun effet de bord.
 */
export function resolveRateLimit(
  category: QuotaCategory,
  role: Role = "visiteur",
): RateLimitPolicy {
  const base = BASE_RATE_LIMITS[category]
  const mult = ROLE_MULTIPLIER[role] ?? 1
  return { limit: base.limit * mult, windowSeconds: base.windowSeconds }
}

/**
 * Clé de la fenêtre courante pour une fenêtre de `windowSeconds` secondes.
 * Déterministe : deux appels dans la même fenêtre renvoient la même clé, ce qui
 * permet au compteur en base d'agréger les requêtes atomiquement.
 */
export function currentWindowKey(windowSeconds: number, nowMs: number = Date.now()): string {
  const windowIndex = Math.floor(nowMs / 1000 / windowSeconds)
  return `${windowSeconds}:${windowIndex}`
}

/** Secondes restantes avant la réinitialisation de la fenêtre courante. */
export function secondsUntilReset(windowSeconds: number, nowMs: number = Date.now()): number {
  const elapsed = Math.floor(nowMs / 1000) % windowSeconds
  return Math.max(1, windowSeconds - elapsed)
}

/**
 * Construit la décision de rate limiting à partir du compteur courant (renvoyé
 * par le stockage) et de la politique effective. Fonction pure.
 */
export function evaluateRateLimit(
  count: number,
  policy: RateLimitPolicy,
  nowMs: number = Date.now(),
): RateLimitDecision {
  return {
    allowed:      count <= policy.limit,
    limit:        policy.limit,
    remaining:    Math.max(0, policy.limit - count),
    resetSeconds: secondsUntilReset(policy.windowSeconds, nowMs),
  }
}
