import { NextRequest, NextResponse } from "next/server"
import { requireAuth, unauthorizedResponse, badRequestResponse, arcAIRequest, buildCacheKey, getCachedResponse, setCachedResponse } from "@/lib/bible-ai"

export async function POST(req: NextRequest) {
  try { await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const { verse_ref, language = "fr" } = body as { verse_ref: string; language?: string }
  if (!verse_ref?.trim()) return badRequestResponse("verse_ref requis")

  const cacheKey = buildCacheKey({ type: "crossrefs", verse_ref: verse_ref.trim(), lang: language })
  const cached = await getCachedResponse(cacheKey)
  if (cached) {
    try { return NextResponse.json(JSON.parse(cached)) } catch { /**/ }
  }

  const system = `Tu es un moteur de références croisées bibliques.
Pour le verset donné, trouve 4 à 6 passages qui y sont thématiquement ou typologiquement liés.
Réponds UNIQUEMENT en JSON sans markdown:
{"crossrefs":[{"reference":"Jean 3:16","connection":"Explique le lien en 1 phrase","theme":"nom du thème commun"}]}`

  const raw = await arcAIRequest(`Références croisées pour : ${verse_ref}`, system, []).catch(() => "")
  if (!raw) return NextResponse.json({ crossrefs: [] })

  try {
    const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ crossrefs: [] })
    const parsed = JSON.parse(match[0]) as { crossrefs: unknown[] }
    const result = { crossrefs: parsed.crossrefs ?? [], verse_ref }
    setCachedResponse(cacheKey, JSON.stringify(result), "crossrefs", language, "intermediaire", 48)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ crossrefs: [] })
  }
}
