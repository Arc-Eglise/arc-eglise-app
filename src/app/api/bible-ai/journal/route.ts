import { NextRequest, NextResponse } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, streamFromLunziko, arcAIRequest, SSE_HEADERS, sseChunk,
} from "@/lib/bible-ai"
import { createClient }      from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const { action } = body as { action: string }
  const supabase = createClient()
  const admin    = createAdminClient()

  switch (action) {
    // ── Créer ou mettre à jour une entrée ──────────────────────────
    case "upsert": {
      const { content, date, verse_refs, mood, prayer_request_id, session_id, generate_reflection } = body as {
        content: string
        date?: string
        verse_refs?: string[]
        mood?: string
        prayer_request_id?: string
        session_id?: string
        generate_reflection?: boolean
      }
      if (!content?.trim()) return badRequestResponse("content requis")
      const entryDate = date ?? new Date().toISOString().split("T")[0]

      const { data: entry, error } = await admin
        .from("ai_spiritual_journal")
        .upsert({
          user_id: userId,
          date: entryDate,
          content: content.trim(),
          verse_refs: verse_refs ?? [],
          mood: mood ?? null,
          prayer_request_id: prayer_request_id ?? null,
          session_id: session_id ?? null,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Générer une réflexion IA si demandé
      if (generate_reflection && entry?.id) {
        const prefs = await getUserPrefs(userId)
        const reflection = await arcAIRequest(
          `Lis cette entrée de journal spirituel et offre une courte réflexion biblique encourageante (3-4 phrases, avec un verset):\n\n"${content.trim().slice(0, 1000)}"`,
          "Tu es un conseiller spirituel bienveillant. Tu lis des journaux de foi et offres des réflexions brèves, bibliquement fondées, encourageantes. Ne diagnostique pas et ne juge pas. Cite un verset. Termine par une invitation à prier.",
        ).catch(() => "")
        if (reflection) {
          await admin.from("ai_spiritual_journal")
            .update({ ai_reflection: reflection })
            .eq("id", entry.id)
        }
        void prefs // prefs.language disponible si besoin dans future itération
      }

      return NextResponse.json({ ok: true, id: entry?.id })
    }

    // ── Générer une réflexion pour une entrée existante ────────────
    case "reflect": {
      const { journal_id, stream = false } = body as { journal_id: string; stream?: boolean }
      if (!journal_id) return badRequestResponse("journal_id requis")

      const { data: entry } = await supabase
        .from("ai_spiritual_journal")
        .select("content, verse_refs, mood")
        .eq("id", journal_id)
        .eq("user_id", userId)
        .single()

      if (!entry) return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 })

      const message = `Lis cette entrée de journal spirituel et offre une réflexion biblique encourageante :\n\n"${entry.content.slice(0, 1500)}"${entry.mood ? `\n\nHumeur : ${entry.mood}` : ""}`
      const system  = "Tu es un conseiller spirituel bienveillant. Offre une réflexion brève (5-6 phrases), bibliquement fondée, encourageante. Cite 1-2 versets. Ne diagnostique pas. Termine par une invitation à prier."

      if (stream) {
        try { return await streamFromLunziko(message, [], system) }
        catch { return NextResponse.json({ error: "Service indisponible" }, { status: 502 }) }
      }

      const reflection = await arcAIRequest(message, system).catch(() => "")

      // Persister la réflexion
      await admin.from("ai_spiritual_journal")
        .update({ ai_reflection: reflection })
        .eq("id", journal_id)

      return NextResponse.json({ reflection })
    }

    // ── Lister les entrées ─────────────────────────────────────────
    case "list": {
      const { from, to, limit = 30 } = body as { from?: string; to?: string; limit?: number }
      const query = supabase
        .from("ai_spiritual_journal")
        .select("id, date, content, verse_refs, mood, ai_reflection, updated_at")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(Math.min(limit, 100))

      if (from) query.gte("date", from)
      if (to)   query.lte("date", to)

      const { data: entries } = await query
      return NextResponse.json({ entries: entries ?? [] })
    }

    // ── Supprimer une entrée ────────────────────────────────────────
    case "delete": {
      const { journal_id } = body as { journal_id: string }
      if (!journal_id) return badRequestResponse("journal_id requis")
      await supabase.from("ai_spiritual_journal").delete().eq("id", journal_id).eq("user_id", userId)
      return NextResponse.json({ ok: true })
    }

    default:
      return badRequestResponse(`Action inconnue: ${action}`)
  }
}
