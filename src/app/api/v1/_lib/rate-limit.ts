import { createAdminClient } from "@/lib/supabase/admin"
import {
  resolveRateLimit,
  currentWindowKey,
  evaluateRateLimit,
  RateLimitedError,
  type QuotaCategory,
  type RateLimitDecision,
  type Role,
} from "@arc/core"

export interface RateLimitInput {
  category: QuotaCategory
  role?: Role
  /** Identité stable : `user:<uuid>` si authentifié, sinon `ip:<ip>`. */
  identity: string
}

/**
 * Applique le rate limiting pour une requête du socle. Incrémente le compteur en
 * base de façon atomique (RPC `arc_api_increment_rate_limit`), puis lève
 * `RateLimitedError` si le plafond calculé par `@arc/core` est dépassé.
 *
 * Renvoie la décision (limit / remaining / reset) pour alimenter les en-têtes
 * `X-RateLimit-*`.
 *
 * Tolérant aux pannes : si le stockage est indisponible (table absente avant
 * migration B3, DB en erreur), on journalise l'incident et on laisse passer
 * (fail-open) — une panne d'infra ne doit pas rendre le socle indisponible.
 */
export async function enforceRateLimit(input: RateLimitInput): Promise<RateLimitDecision> {
  const policy = resolveRateLimit(input.category, input.role)
  const bucket = `${input.category}:${input.identity}`
  const windowKey = currentWindowKey(policy.windowSeconds)

  let count: number
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("arc_api_increment_rate_limit", {
      p_bucket: bucket,
      p_window_key: windowKey,
    })
    if (error) throw error
    count = typeof data === "number" ? data : Number(data)
    if (!Number.isFinite(count)) throw new Error("compteur invalide")
  } catch (err) {
    console.warn("[api/v1] rate-limit indisponible (fail-open):", (err as Error)?.message)
    return { allowed: true, limit: policy.limit, remaining: policy.limit, resetSeconds: policy.windowSeconds }
  }

  const decision = evaluateRateLimit(count, policy)
  if (!decision.allowed) {
    throw new RateLimitedError("Quota de requêtes dépassé", decision.resetSeconds)
  }
  return decision
}
