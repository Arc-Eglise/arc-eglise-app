import { NextRequest, NextResponse } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, streamFromLunziko, SSE_HEADERS,
  buildCacheKey, getCachedResponse, setCachedResponse, sseChunk,
} from "@/lib/bible-ai"
import { buildExplainSystemPrompt } from "@/lib/bible-ai-prompts"
import type { BibleLevel } from "@/lib/bible-ai-prompts"

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const { verse_ref, level, language, stream = true } = body as {
    verse_ref: string
    level?: BibleLevel
    language?: string
    stream?: boolean
  }

  if (!verse_ref?.trim()) return badRequestResponse("verse_ref requis")

  const prefs  = await getUserPrefs(userId)
  const lang   = language ?? prefs.language
  const lvl    = level    ?? prefs.level

  // Cache pour les non-stream
  if (!stream) {
    const cacheKey = buildCacheKey({ type: "explain", verse_ref, level: lvl, lang })
    const cached = await getCachedResponse(cacheKey)
    if (cached) {
      return NextResponse.json({ explanation: cached, verse_ref, level: lvl, language: lang })
    }

    const system  = buildExplainSystemPrompt(lvl, lang)
    const message = `Explique ce passage biblique : ${verse_ref}`
    const res = await import("@/lib/lunziko").then(m => m.lunzikoFetch("/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        history: [],
        context: { language: lang, system },
        provider: "auto",
        stream: false,
      }),
    }))

    if (!res.ok) return NextResponse.json({ explanation: "Service indisponible.", verse_ref, level: lvl })
    const data = await res.json()
    const explanation = data.content ?? data.message ?? ""
    setCachedResponse(cacheKey, explanation, "explain", lang, lvl, 24)
    return NextResponse.json({ explanation, verse_ref, level: lvl, language: lang })
  }

  // Streaming
  const system  = buildExplainSystemPrompt(lvl, lang)
  const message = `Explique ce passage biblique en détail pour le niveau ${lvl} : ${verse_ref}`

  try {
    return await streamFromLunziko(message, [], system, undefined, { reasoning: 'high' })
  } catch (err) {
    console.error("[bible-ai/explain]", err)
    const enc = new TextEncoder()
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    writer.write(enc.encode(sseChunk({ type: "error", error: "Service indisponible" })))
    writer.close()
    return new Response(readable, { headers: SSE_HEADERS })
  }
}
