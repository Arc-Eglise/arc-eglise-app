import { NextRequest, NextResponse } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, getRecentSessionSummaries, streamFromLunziko, arcAIRequest, SSE_HEADERS, sseChunk,
} from "@/lib/bible-ai"
import { buildMeditationSystemPrompt } from "@/lib/bible-ai-prompts"

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const {
    verse_ref,
    duration = "10min",
    style    = "lectio-divina",
    language,
    stream   = true,
  } = body as {
    verse_ref: string
    duration?: "5min" | "10min" | "20min"
    style?: string
    language?: string
    stream?: boolean
  }

  if (!verse_ref?.trim()) return badRequestResponse("verse_ref requis")

  const prefs  = await getUserPrefs(userId)
  const lang   = language ?? prefs.language
  
  // BUG FIX 2: Charger le contexte utilisateur (summaries de sessions précédentes)
  const summaries = prefs.memory_enabled ? await getRecentSessionSummaries(userId) : []
  
  const system = buildMeditationSystemPrompt(verse_ref, style, duration, lang)
  // TODO: Passer summaries au system prompt si besoin
  const message = `Guide-moi dans une méditation de ${duration} sur ${verse_ref} (style : ${style}).`

  if (stream) {
    try { return await streamFromLunziko(message, [], system) }
    catch (err) {
      console.error("[bible-ai/meditate]", err)
      const enc = new TextEncoder()
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()
      // BUG FIX 1: Utiliser sseChunk() au lieu de JSON.stringify() direct
      writer.write(enc.encode(sseChunk({ type: "error", error: "Service indisponible" })))
      writer.close()
      return new Response(readable, { headers: SSE_HEADERS })
    }
  }

  const guide = await arcAIRequest(message, system).catch(() => "Service indisponible.")
  return NextResponse.json({ guide })
}
