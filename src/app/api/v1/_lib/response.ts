import { NextResponse } from "next/server"
import { ArcError, RateLimitedError, isArcError } from "@arc/core"

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

export function fromArcError(err: ArcError): NextResponse {
  const res = NextResponse.json(err.toJSON(), { status: err.httpStatus })
  if (err instanceof RateLimitedError && err.retryAfterSeconds != null) {
    res.headers.set("Retry-After", String(err.retryAfterSeconds))
  }
  return res
}

export function handleError(err: unknown): NextResponse {
  if (isArcError(err)) return fromArcError(err)
  console.error("[api/v1]", err)
  return NextResponse.json(
    { error: "Erreur interne du serveur", code: "INTERNAL" },
    { status: 500 }
  )
}
