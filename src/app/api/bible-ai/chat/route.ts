import { NextRequest, NextResponse } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, getRecentSessionSummaries,
  createSession, persistMessage, autoSummarizeSession,
  streamArcAI, arcAIRequest, extractVerseRefs,
} from "@/lib/bible-ai"
import { buildChatSystemPrompt } from "@/lib/bible-ai-prompts"
import type { BibleLevel } from "@/lib/bible-ai-prompts"
import { buildUserContextBlock, inferAndUpdateProfileAsync } from "@/lib/spiritual-profile"

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  let body: {
    message: string
    session_id?: string
    history?: { role: string; content: string }[]
    context?: { mode?: string; language?: string; level?: BibleLevel; verse?: string }
    stream?: boolean
  }
  try { body = await req.json() } catch { return badRequestResponse("JSON invalide") }

  const { message, history = [], context = {}, stream = true } = body
  if (!message?.trim()) return badRequestResponse("Message requis")

  const prefs  = await getUserPrefs(userId)
  const lang   = context.language ?? prefs.language
  const level  = context.level    ?? prefs.level
  const mode   = context.mode     ?? "chat"

  // Mémoire des sessions précédentes + profil spirituel (en parallèle)
  const [summaries, profileContext] = await Promise.all([
    prefs.memory_enabled ? getRecentSessionSummaries(userId) : Promise.resolve([] as string[]),
    buildUserContextBlock(userId),
  ])

  const systemPrompt = buildChatSystemPrompt(level, lang, summaries, prefs.fav_topics, profileContext)

  // Créer la session (non bloquant si échec)
  const sessionId = await createSession(userId, mode, lang, level).catch(() => "")

  // Persister le message utilisateur (non bloquant)
  if (sessionId) persistMessage(sessionId, "user", message.trim())

  // Accumuler la réponse pour persistence
  let assistantText = ""

  try {
    if (stream) {
      const response = await streamArcAI(
        message.trim(),
        history,
        systemPrompt,
        (chunk) => { assistantText += chunk },
      )

      // Persister la réponse et déclencher le résumé après la fin du stream
      if (sessionId) {
        response.clone().body?.pipeTo(new WritableStream({
          close() {
            if (assistantText) {
              persistMessage(sessionId, "assistant", assistantText, extractVerseRefs(assistantText))
              // Résumé si assez de contenu (> 500 chars)
              if (assistantText.length > 500) {
                const transcript = `User: ${message}\nAssistant: ${assistantText}`
                autoSummarizeSession(sessionId, transcript)
              }
              // Inférer les livres bibliques et enrichir le profil (fire-and-forget)
              inferAndUpdateProfileAsync(userId, message, assistantText)
            }
          },
        })).catch(() => {})
      }

      return response
    }

    // Non-streaming
    const answer = await arcAIRequest(message.trim(), systemPrompt, history).catch(() => "Service temporairement indisponible.")
    if (sessionId && answer) {
      persistMessage(sessionId, "assistant", answer, extractVerseRefs(answer))
    }
    return NextResponse.json({ answer, session_id: sessionId })
  } catch (err) {
    console.error("[bible-ai/chat]", err)
    return NextResponse.json(
      { answer: "Le service IA est temporairement indisponible. Merci de réessayer." },
      { status: 200 }
    )
  }
}
