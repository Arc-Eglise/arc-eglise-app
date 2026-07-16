import { NextRequest, NextResponse } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, buildCacheKey, getCachedResponse, setCachedResponse,
  arcAIRequest,
} from "@/lib/bible-ai"
import { buildSearchSystemPrompt } from "@/lib/bible-ai-prompts"

const VALID_MODES = ["semantic","thematic","character","location","event","keyword"]

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const { query, mode = "semantic", language, bible_id, limit = 10 } = body as {
    query: string
    mode?: string
    language?: string
    bible_id?: string
    limit?: number
  }

  if (!query?.trim())      return badRequestResponse("query requis")
  if (!VALID_MODES.includes(mode)) return badRequestResponse("mode invalide")

  const prefs  = await getUserPrefs(userId)
  const lang   = language ?? prefs.language
  const level  = prefs.level
  const bibleId = bible_id ?? prefs.default_bible

  // Cache check
  // BUG FIX 4: Inclure bible_id dans la clé de cache pour éviter les faux positifs
  const cacheKey = buildCacheKey({ 
    type: "search", 
    query: query.trim(), 
    mode, 
    lang, 
    level,
    bible_id: bibleId,  // Nouveau paramètre
  })
  const cached = await getCachedResponse(cacheKey)
  if (cached) {
    try { return NextResponse.json(JSON.parse(cached)) } catch { /* fallthrough */ }
  }

  const system = buildSearchSystemPrompt(mode, level, lang)

  const raw = await arcAIRequest(`Recherche biblique [${mode}] : "${query.trim()}"`, system).catch(() => "")
  if (!raw) {
    return NextResponse.json({ results: [], total: 0, query_interpretation: "" })
  }

  let parsed: { results: unknown[]; query_interpretation: string; total?: number }
  try {
    // Nettoyer markdown éventuel (```json ... ```) avant de parser
    const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { results: [], query_interpretation: cleaned, total: 0 }
  } catch {
    parsed = { results: [], query_interpretation: raw.slice(0, 300), total: 0 }
  }

  const result = {
    results: (parsed.results ?? []).slice(0, limit),
    total: parsed.results?.length ?? 0,
    query_interpretation: parsed.query_interpretation ?? "",
    mode,
    language: lang,
    bible_id: bibleId,  // Inclure la version biblique utilisée dans la réponse
  }

  // Mettre en cache 6h
  setCachedResponse(cacheKey, JSON.stringify(result), "search", lang, level, 6)

  return NextResponse.json(result)
}
