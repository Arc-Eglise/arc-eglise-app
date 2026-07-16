import { NextRequest, NextResponse } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, buildCacheKey, getCachedResponse, setCachedResponse,
  arcAIRequest,
} from "@/lib/bible-ai"

const BASE = "https://api.scripture.api.bible/v1"

async function fetchVerseFromAPI(bibleId: string, verseRef: string, apiKey: string) {
  try {
    const res = await fetch(`${BASE}/bibles/${bibleId}/verses/${verseRef}?content-type=text&include-verse-numbers=false`, {
      headers: { "api-key": apiKey },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.data?.content ?? "").replace(/<[^>]*>/g, "").trim()
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const { verse_ref, bible_ids, language, with_commentary = false } = body as {
    verse_ref: string
    bible_ids: string[]
    language?: string
    with_commentary?: boolean
  }

  if (!verse_ref?.trim()) return badRequestResponse("verse_ref requis")
  if (!Array.isArray(bible_ids) || bible_ids.length < 2) return badRequestResponse("Au moins 2 bible_ids requis")

  const apiKey  = process.env.BIBLE_API_KEY ?? ""
  const prefs   = await getUserPrefs(userId)
  const lang    = language ?? prefs.language

  const cacheKey = buildCacheKey({ type: "compare", verse_ref, bibles: bible_ids.sort().join(",") })
  const cached = await getCachedResponse(cacheKey)
  if (cached) {
    try { return NextResponse.json(JSON.parse(cached)) } catch { /* fallthrough */ }
  }

  // Récupérer tous les textes en parallèle
  const textsRaw = await Promise.all(
    bible_ids.slice(0, 6).map(id => fetchVerseFromAPI(id, verse_ref, apiKey))
  )

  // Récupérer les noms des versions (simplifiés)
  const VERSION_NAMES: Record<string, { name: string; abbr: string; language: string }> = {
    "61fd76eafa1ef5f7-01": { name: "Bible du Semeur", abbr: "BDS", language: "Français" },
    "9879dbb7cfe39e4d-01": { name: "King James Version", abbr: "KJV", language: "English" },
    "592420522e16049f-01": { name: "Reina-Valera 1960", abbr: "RVR1960", language: "Español" },
    "39423fc596f18578-01": { name: "Lutherbibel", abbr: "LUT", language: "Deutsch" },
  }

  const translations = bible_ids.slice(0, 6).map((id, i) => ({
    bible_id: id,
    name:     VERSION_NAMES[id]?.name ?? id,
    abbr:     VERSION_NAMES[id]?.abbr ?? id.slice(0, 6),
    language: VERSION_NAMES[id]?.language ?? "Unknown",
    text:     textsRaw[i] ?? "(non disponible)",
  })).filter(t => t.text !== "(non disponible)")

  let ai_commentary: string | undefined
  if (with_commentary && translations.length >= 2) {
    const comparisonText = translations.map(t => `${t.name} (${t.abbr}): "${t.text}"`).join("\n")
    ai_commentary = await arcAIRequest(
      `Compare ces traductions de ${verse_ref} et commente les différences significatives :\n${comparisonText}`,
      "Tu es un spécialiste des traductions bibliques. Analyse les différences lexicales et théologiques entre les traductions. Sois concis (3-5 phrases).",
      []
    ).catch(() => undefined)
  }

  const result = { verse_ref, translations, ai_commentary }
  setCachedResponse(cacheKey, JSON.stringify(result), "compare", lang, "intermediaire", 48)
  return NextResponse.json(result)
}
