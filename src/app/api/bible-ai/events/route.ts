import { NextRequest, NextResponse } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  buildCacheKey, getCachedResponse, setCachedResponse,
  arcAIRequest,
} from "@/lib/bible-ai"
import { createClient } from "@/lib/supabase/server"

const CHURCH_HOURS = `
Horaires réguliers ARC Église (Ambassade du Royaume de Christ) :
- Mercredi : 18h00 – 19h15
- Vendredi : 18h00 – 19h15
- Dimanche : 10h00 – 12h15
- Adresse : Av. Charles-Naine 39, 2300 La Chaux-de-Fonds, Suisse
`

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const { query = "", scope = "both", language = "fr" } = body as {
    query?: string
    scope?: "church" | "web" | "both"
    language?: string
  }

  // Cache pour les recherches web (6h)
  let cacheKey: string | null = null
  if (scope !== "church" && query.trim()) {
    cacheKey = buildCacheKey({ type: "events", query: query.trim(), scope, language })
    const cached = await getCachedResponse(cacheKey)
    if (cached) {
      try { return NextResponse.json(JSON.parse(cached)) } catch { /* fallthrough */ }
    }
  }

  const result: {
    church_events: unknown[]
    web_results: unknown[]
    church_schedule: string
  } = {
    church_events: [],
    web_results:   [],
    church_schedule: CHURCH_HOURS,
  }

  // ── 1. Événements locaux ──────────────────────────────────────────
  if (scope === "church" || scope === "both") {
    const supabase = createClient()
    const today = new Date().toISOString().split("T")[0]
    const { data: events } = await supabase
      .from("events")
      .select("id, title, description, date, time_start, time_end, location, tags, price_chf")
      .eq("is_published", true)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(10)

    result.church_events = events ?? []
  }

  // ── 2. Recherche web (via Lunziko) ────────────────────────────────
  if ((scope === "web" || scope === "both") && query.trim()) {
    const serperKey = process.env.SERPER_API_KEY

    if (serperKey) {
      // Serper.dev (Google Search)
      try {
        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
          body: JSON.stringify({ q: `${query} chrétien évangélique Suisse`, hl: language, gl: "ch", num: 5 }),
        })
        if (res.ok) {
          const data = await res.json()
          result.web_results = (data.organic ?? []).slice(0, 5).map((r: {
            title: string; link: string; snippet: string; date?: string
          }) => ({
            title:   r.title,
            url:     r.link,
            snippet: r.snippet,
            date:    r.date,
            source:  new URL(r.link).hostname,
          }))
        }
      } catch { /* fallback */ }
    }

    if (!result.web_results.length) {
      // Fallback : ARC Église IA Engine
      try {
        const raw = await arcAIRequest(
          `Recherche web : événements chrétiens évangéliques "${query}" en Suisse ou en ligne 2026. Donne 3-4 résultats avec titre, lien et date si disponible.`,
          `Tu es un assistant de recherche d'événements chrétiens.\nRéponds en JSON : [{"title":"...","url":"...","snippet":"...","date":"...","source":"..."}]\nSi tu n'as pas d'informations fiables, réponds avec un tableau vide [].`
        )
        const jsonMatch = raw.match(/\[[\s\S]*\]/)
        if (jsonMatch) result.web_results = JSON.parse(jsonMatch[0])
      } catch { /* non bloquant */ }
    }
  }

  if (cacheKey && result.web_results.length) {
    setCachedResponse(cacheKey, JSON.stringify(result), "events", language, "intermediaire", 6)
  }

  return NextResponse.json(result)
}
