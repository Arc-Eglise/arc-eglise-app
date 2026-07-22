// ARC Église AI — Helper partagé (server-side uniquement)
import { createClient }      from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse }      from "next/server"
import type { BibleLevel }   from "@/lib/bible-ai-prompts"
import crypto                from "crypto"
import { arcAIChat } from "@/lib/arc-ai"
import { streamChat } from "@/lib/arc-ai/provider-manager"

// ── Types ──────────────────────────────────────────────────────────

export interface AIUserPreferences {
  user_id:            string
  language:           string
  level:              BibleLevel
  default_bible:      string
  fav_books:          string[]
  fav_topics:         string[]
  memory_enabled:     boolean
  notification_plans: boolean
}

const PREFS_DEFAULTS: Omit<AIUserPreferences, "user_id"> = {
  language:           "fr",
  level:              "intermediaire",
  default_bible:      "61fd76eafa1ef5f7-01",
  fav_books:          [],
  fav_topics:         [],
  memory_enabled:     true,
  notification_plans: true,
}

// ── Auth ────────────────────────────────────────────────────────────

export async function requireAuth(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("UNAUTHORIZED")
  return user.id
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
}

export function badRequestResponse(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "Accès interdit" }, { status: 403 })
}

// ── Préférences utilisateur ─────────────────────────────────────────

export async function getUserPrefs(userId: string): Promise<AIUserPreferences> {
  const supabase = createClient()
  const { data } = await supabase
    .from("ai_user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (data) return data as AIUserPreferences
  return { user_id: userId, ...PREFS_DEFAULTS }
}

export async function upsertUserPrefs(
  userId: string,
  partial: Partial<Omit<AIUserPreferences, "user_id">>,
): Promise<void> {
  const supabase = createClient()
  await supabase.from("ai_user_preferences").upsert({
    user_id: userId,
    ...partial,
    updated_at: new Date().toISOString(),
  })
}

// ── Mémoire sessions ────────────────────────────────────────────────

export async function getRecentSessionSummaries(userId: string, limit = 3): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("ai_bible_sessions")
    .select("summary")
    .eq("user_id", userId)
    .not("summary", "is", null)
    .order("updated_at", { ascending: false })
    .limit(limit)

  return (data ?? []).map(s => s.summary as string).filter(Boolean)
}

export async function createSession(
  userId: string,
  mode: string,
  language: string,
  level: BibleLevel,
): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("ai_bible_sessions")
    .insert({ user_id: userId, mode, language, level })
    .select("id")
    .single()
  return data?.id ?? crypto.randomUUID()
}

export async function persistMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  verseRefs: string[] = [],
  tokensIn = 0,
  tokensOut = 0,
): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from("ai_session_messages").insert({
      session_id: sessionId,
      role,
      content,
      verse_refs: verseRefs,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
    })
    await admin
      .from("ai_bible_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId)
  } catch {
    // Non bloquant — la persistence des messages ne doit pas casser le stream
  }
}

export async function autoSummarizeSession(
  sessionId: string,
  transcript: string,
): Promise<void> {
  try {
    const result = await arcAIChat({
      message: `Résume en 2-3 phrases ce que l'utilisateur a exploré dans cette conversation biblique :\n\n${transcript.slice(0, 8000)}`,
      system: "Tu résumes brièvement des conversations bibliques. Réponds en français, en 2-3 phrases courtes.",
      provider: "auto",
    })
    const summary = result.content
    if (!summary) return

    const admin = createAdminClient()
    await admin
      .from("ai_bible_sessions")
      .update({ summary, updated_at: new Date().toISOString() })
      .eq("id", sessionId)
  } catch {
    // Non bloquant
  }
}

// ── Cache réponses ──────────────────────────────────────────────────

export function buildCacheKey(parts: Record<string, string>): string {
  const str = Object.entries(parts).sort().map(([k, v]) => `${k}=${v}`).join("|")
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 32)
}

export async function getCachedResponse(key: string): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from("ai_response_cache")
      .select("response, hit_count")
      .eq("cache_key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()

    if (data?.response) {
      // Incrémenter hit_count (non bloquant)
      admin.from("ai_response_cache").update({ hit_count: (data.hit_count ?? 0) + 1 }).eq("cache_key", key).then(() => {})
      return stripAIFormatting(data.response as string)
    }
    return null
  } catch {
    return null
  }
}

export async function setCachedResponse(
  key: string,
  response: string,
  mode: string,
  language: string,
  level: string,
  ttlHours = 24,
): Promise<void> {
  try {
    const admin = createAdminClient()
    const expires = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString()
    await admin.from("ai_response_cache").upsert({
      cache_key: key,
      response,
      mode,
      language,
      level,
      expires_at: expires,
      hit_count: 0,
    })
  } catch {
    // Non bloquant
  }
}

// ── Limitation de débit AI ──────────────────────────────────────────

export async function checkAiRateLimit(userId: string, limit = 60): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.rpc("ai_increment_rate_limit", {
      p_user_id: userId,
      p_limit:   limit,
    })
    return data !== false
  } catch {
    return true // fail open — ne pas bloquer si le check échoue
  }
}

export function rateLimitedResponse() {
  return NextResponse.json(
    { error: "Quota horaire atteint. Réessayez dans quelques minutes." },
    { status: 429 }
  )
}

// ── Rôle utilisateur ────────────────────────────────────────────────

export async function getUserRole(userId: string): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()
  return data?.role ?? "visiteur"
}

// ── SSE Helpers ─────────────────────────────────────────────────────

export function sseChunk(obj: Record<string, unknown>): string {
  return `data: ${JSON.stringify(obj)}\n\n`
}

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  "Connection": "keep-alive",
  "X-Accel-Buffering": "no",
}

// ── Extraction des références bibliques ────────────────────────────

export function extractVerseRefs(text: string): string[] {
  // Cherche les patterns comme "Jean 3:16", "Génèse 1:1-3", "Rm 8:28"
  const pattern = /\b(?:[1-3]\s*)?[A-ZÉÈÊa-zéèê]{2,20}(?:\s+\d+)?\s*:\s*\d+(?:\s*[-–]\s*\d+)?\b/g
  const matches = text.match(pattern) ?? []
  return Array.from(new Set(matches)).slice(0, 20)
}

// ── Nettoyage des réponses IA ───────────────────────────────────────

export function stripAIFormatting(text: string): string {
  return text
    // Balises HTML
    .replace(/<[^>]+>/g, "")
    // Markdown gras/italique (**bold**, *italic*, __bold__, _italic_)
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/__([\s\S]+?)__/g, "$1")
    .replace(/\*([\s\S]+?)\*/g, "$1")
    .replace(/_([\s\S]+?)_/g, "$1")
    // Titres Markdown (# ## ###)
    .replace(/^#{1,6}\s+/gm, "")
    // Listes à puces (* - •)
    .replace(/^[*\-•]\s+/gm, "")
    // Liens Markdown [texte](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Code inline `code`
    .replace(/`([^`]+)`/g, "$1")
    // Blocs de code ```...```
    .replace(/```[\s\S]*?```/g, "")
    // Entités HTML courantes
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    // Lignes multiples consécutives → max 2 sauts de ligne
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ── ARC AI helpers ──────────────────────────────────────────────────

// Non-stream : retourne le texte de réponse de l'ARC engine
export async function arcAIRequest(
  message: string,
  system: string,
  history: { role: string; content: string }[] = [],
): Promise<string> {
  const result = await arcAIChat({
    message,
    history: history as Array<{ role: "user" | "assistant"; content: string }>,
    system,
    provider: "auto",
  })
  return stripAIFormatting(result.content)
}

// Strip léger par chunk (HTML uniquement — suffisant pour les tags courts comme <b></b>)
function stripChunk(text: string): string {
  return text.replace(/<[^>]{0,40}>/g, "")
}

// Stream : retourne une Response SSE avec fallback multi-provider
export async function streamArcAI(
  message: string,
  history: { role: string; content: string }[],
  systemPrompt: string,
  onChunk?: (text: string) => void,
): Promise<Response> {
  const messages = [
    ...history as Array<{ role: "user" | "assistant"; content: string }>,
    { role: "user" as const, content: message },
  ]
  const rawStream = streamChat(messages, "auto", { system: systemPrompt, maxTokens: 4096 })

  const enc = new TextEncoder()
  const dec = new TextDecoder()
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()

  ;(async () => {
    const reader = rawStream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const raw  = dec.decode(value, { stream: true })
        const text = stripChunk(raw)
        if (onChunk && text) onChunk(text)
        await writer.write(enc.encode(`data: ${JSON.stringify({ type: "chunk", content: text })}\n\n`))
      }
      await writer.write(enc.encode('data: {"type":"end"}\n\n'))
    } catch (err) {
      await writer.write(enc.encode(`data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`))
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, { headers: SSE_HEADERS })
}
