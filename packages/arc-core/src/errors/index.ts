// Erreurs métier ARC — typées et hiérarchisées
// Permettent de distinguer les cas d'erreur sans inspecter des messages texte

export type ArcErrorCode =
  | "UNAUTHORIZED"       // non authentifié
  | "FORBIDDEN"          // authentifié mais sans droit
  | "NOT_FOUND"          // ressource introuvable
  | "VALIDATION"         // données invalides
  | "CONFLICT"           // état incompatible (ex : email déjà utilisé)
  | "RATE_LIMITED"       // quota dépassé
  | "INTERNAL"           // erreur serveur inattendue

export class ArcError extends Error {
  readonly code: ArcErrorCode
  readonly httpStatus: number

  constructor(message: string, code: ArcErrorCode, httpStatus: number) {
    super(message)
    this.name    = "ArcError"
    this.code    = code
    this.httpStatus = httpStatus
  }

  toJSON() {
    return { error: this.message, code: this.code }
  }
}

export class UnauthorizedError extends ArcError {
  constructor(message = "Authentification requise") {
    super(message, "UNAUTHORIZED", 401)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends ArcError {
  constructor(message = "Accès refusé") {
    super(message, "FORBIDDEN", 403)
    this.name = "ForbiddenError"
  }
}

export class NotFoundError extends ArcError {
  constructor(resource = "Ressource") {
    super(`${resource} introuvable`, "NOT_FOUND", 404)
    this.name = "NotFoundError"
  }
}

export class ValidationError extends ArcError {
  readonly fields?: Record<string, string[]>

  constructor(message = "Données invalides", fields?: Record<string, string[]>) {
    super(message, "VALIDATION", 400)
    this.name   = "ValidationError"
    this.fields = fields
  }

  toJSON() {
    return { error: this.message, code: this.code, ...(this.fields ? { fields: this.fields } : {}) }
  }
}

export class ConflictError extends ArcError {
  constructor(message = "Conflit de données") {
    super(message, "CONFLICT", 409)
    this.name = "ConflictError"
  }
}

export class RateLimitedError extends ArcError {
  readonly retryAfterSeconds?: number

  constructor(message = "Trop de requêtes", retryAfterSeconds?: number) {
    super(message, "RATE_LIMITED", 429)
    this.name = "RateLimitedError"
    this.retryAfterSeconds = retryAfterSeconds
  }

  toJSON() {
    return {
      error: this.message,
      code:  this.code,
      ...(this.retryAfterSeconds != null ? { retryAfter: this.retryAfterSeconds } : {}),
    }
  }
}

export function isArcError(err: unknown): err is ArcError {
  return err instanceof ArcError
}
