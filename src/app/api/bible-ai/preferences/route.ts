import { NextRequest, NextResponse } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, upsertUserPrefs,
} from "@/lib/bible-ai"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const { action, data } = body as { action: string; data?: Record<string, unknown> }

  switch (action) {
    case "get": {
      const prefs = await getUserPrefs(userId)
      return NextResponse.json({ prefs })
    }

    case "update": {
      if (!data) return badRequestResponse("data requis")
      const allowed = ["language","level","default_bible","fav_books","fav_topics","memory_enabled","notification_plans"]
      const patch = Object.fromEntries(
        Object.entries(data).filter(([k]) => allowed.includes(k))
      )
      await upsertUserPrefs(userId, patch)
      return NextResponse.json({ ok: true })
    }

    case "clear_history": {
      const admin = createAdminClient()
      await admin.from("ai_bible_sessions").delete().eq("user_id", userId)
      return NextResponse.json({ ok: true })
    }

    case "sessions": {
      const admin = createAdminClient()
      const { data: sessions } = await admin
        .from("ai_bible_sessions")
        .select("id, title, mode, language, level, summary, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(20)
      return NextResponse.json({ sessions: sessions ?? [] })
    }

    default:
      return badRequestResponse(`Action inconnue: ${action}`)
  }
}
