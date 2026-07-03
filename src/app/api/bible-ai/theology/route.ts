import { NextRequest } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, streamFromLunziko, SSE_HEADERS, sseChunk,
} from "@/lib/bible-ai"
import { buildTheologySystemPrompt } from "@/lib/bible-ai-prompts"
import type { BibleLevel } from "@/lib/bible-ai-prompts"

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const { question, history = [], language, level, stream = true } = body as {
    question: string
    history?: { role: string; content: string }[]
    language?: string
    level?: BibleLevel
    stream?: boolean
  }

  if (!question?.trim()) return badRequestResponse("question requise")

  const prefs  = await getUserPrefs(userId)
  const lang   = language ?? prefs.language
  const lvl    = level    ?? prefs.level
  const system = buildTheologySystemPrompt(lvl, lang)

  if (stream) {
    try { return await streamFromLunziko(question.trim(), history, system) }
    catch (err) {
      console.error("[bible-ai/theology]", err)
      const enc = new TextEncoder()
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()
      writer.write(enc.encode(sseChunk({ type: "error", error: "Service indisponible" })))
      writer.close()
      return new Response(readable, { headers: SSE_HEADERS })
    }
  }

  const res = await import("@/lib/lunziko").then(m => m.lunzikoFetch("/chat", {
    method: "POST",
    body: JSON.stringify({
      message: question.trim(),
      history,
      context: { language: lang, system },
      provider: "auto",
      stream: false,
    }),
  }))

  if (!res.ok) return import("next/server").then(m => m.NextResponse.json({ answer: "Service indisponible." }))
  const data = await res.json()
  return import("next/server").then(m => m.NextResponse.json({ answer: data.content ?? data.message ?? "" }))
}
