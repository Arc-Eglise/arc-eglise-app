import { NextResponse } from "next/server"
import { ArcError, isArcError } from "@arc/core"

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

export function fromArcError(err: ArcError): NextResponse {
  return NextResponse.json(err.toJSON(), { status: err.httpStatus })
}

export function handleError(err: unknown): NextResponse {
  if (isArcError(err)) return fromArcError(err)
  console.error("[api/v1]", err)
  return NextResponse.json(
    { error: "Erreur interne du serveur", code: "INTERNAL" },
    { status: 500 }
  )
}
