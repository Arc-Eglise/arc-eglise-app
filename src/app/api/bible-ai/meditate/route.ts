import { NextRequest } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, streamFromLunziko, SSE_HEADERS, sseChunk,
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
  const system = buildMeditationSystemPrompt(verse_ref, style, duration, lang)
  const message = `Guide-moi dans une méditation de ${duration} sur ${verse_ref} (style : ${style}).`

  if (stream) {
    try { return await streamFromLunziko(message, [], system) }
    catch (err) {
      console.error("[bible-ai/meditate]", err)
      const enc = new TextEncoder()
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()
      writer.write(enc.encode(JSON.stringify({ type: "error", error: "Service indisponible" })))
      writer.close()
      return new Response(readable, { headers: SSE_HEADERS })
    }
  }

  const res = await import("@/lib/lunziko").then(m => m.lunzikoFetch("/chat", {
    method: "POST",
    body: JSON.stringify({
      message, history: [],
      context: { language: lang, system },
      provider: "auto", stream: false,
    }),
  }))
  if (!res.ok) return import("next/server").then(m => m.NextResponse.json({ guide: "Service indisponible." }))
  const data = await res.json()
  return import("next/server").then(m => m.NextResponse.json({ guide: data.content ?? data.message ?? "" }))
}
