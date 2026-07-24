import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { UnauthorizedError, type QuotaCategory, type Role, type RateLimitDecision } from "@arc/core"
import { getOptionalUserWithProfile, type V1Profile } from "./auth"
import { enforceRateLimit } from "./rate-limit"
import { logApiRequest } from "./logging"
import { handleError } from "./response"

/** Contexte transmis à chaque handler de route du socle. */
export interface V1Context {
  requestId: string
  userId:    string | null
  email:     string | null
  role:      Role
  ip:        string
  profile:   V1Profile
}

type V1Handler = (req: NextRequest, ctx: V1Context) => Promise<NextResponse> | NextResponse

interface WithApiV1Options {
  /** Catégorie de quota appliquée (politique définie dans `@arc/core`). */
  category: QuotaCategory
  /** Si vrai, une requête anonyme est rejetée en 401 avant d'atteindre le handler. */
  requireAuth?: boolean
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

function applyRateLimitHeaders(res: NextResponse, d: RateLimitDecision): void {
  res.headers.set("X-RateLimit-Limit", String(d.limit))
  res.headers.set("X-RateLimit-Remaining", String(d.remaining))
  res.headers.set("X-RateLimit-Reset", String(d.resetSeconds))
}

/**
 * Enveloppe un handler de route `/api/v1`. Centralise, dans l'ordre :
 *   1. identification (session optionnelle → userId + rôle),
 *   2. garde d'authentification (si `requireAuth`),
 *   3. rate limiting (par utilisateur, ou par IP en anonyme),
 *   4. exécution du handler,
 *   5. en-têtes `X-RateLimit-*` + `X-Request-Id`,
 *   6. gestion d'erreurs typées (`ArcError` → statut correct, `Retry-After` sur 429),
 *   7. journalisation de la requête (statut + durée).
 */
export function withApiV1(opts: WithApiV1Options, handler: V1Handler) {
  return async function (req: NextRequest): Promise<NextResponse> {
    const requestId = randomUUID()
    const startedAt = Date.now()
    const ip = clientIp(req)

    let userId: string | null = null
    let response: NextResponse

    try {
      const { user, profile } = await getOptionalUserWithProfile()
      userId = user?.id ?? null
      const email = user?.email ?? null
      const role: Role = (profile?.role as Role) ?? "visiteur"

      if (opts.requireAuth && !userId) throw new UnauthorizedError()

      const identity = userId ? `user:${userId}` : `ip:${ip}`
      const decision = await enforceRateLimit({ category: opts.category, role, identity })

      response = await handler(req, { requestId, userId, email, role, ip, profile })
      applyRateLimitHeaders(response, decision)
    } catch (err) {
      response = handleError(err)
    }

    response.headers.set("X-Request-Id", requestId)
    logApiRequest({
      requestId,
      method:     req.method,
      path:       new URL(req.url).pathname,
      status:     response.status,
      category:   opts.category,
      userId,
      ip,
      durationMs: Date.now() - startedAt,
    })
    return response
  }
}
