import { NextRequest, NextResponse } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, streamFromLunziko, arcAIRequest, SSE_HEADERS, sseChunk,
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

  const answer = await arcAIRequest(question.trim(), system, history).catch(() => "Service indisponible.")
  return NextResponse.json({ answer })
}
