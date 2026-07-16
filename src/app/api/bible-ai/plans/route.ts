import { NextRequest, NextResponse } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, arcAIRequest, SSE_HEADERS, sseChunk,
} from "@/lib/bible-ai"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient }      from "@/lib/supabase/server"
import type { BibleLevel }   from "@/lib/bible-ai-prompts"

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const { action } = body as { action: string }
  const supabase = createClient()
  const admin    = createAdminClient()

  switch (action) {
    // ── Créer un plan ──────────────────────────────────────────────
    case "create": {
      const { title, level, duration_days = 30, language, focus, generate = false } = body as {
        title?: string
        level?: BibleLevel
        duration_days?: number
        language?: string
        focus?: string
        generate?: boolean
      }
      const prefs = await getUserPrefs(userId)
      const lang  = language ?? prefs.language
      const lvl   = level    ?? prefs.level
      const planTitle = title ?? (focus ? `Plan : ${focus}` : `Plan ${duration_days} jours`)

      const { data: plan, error } = await admin.from("ai_reading_plans").insert({
        user_id: userId, title: planTitle, level: lvl,
        duration_days, language: lang, focus: focus ?? null, created_by_ai: generate,
      }).select("id, title").single()

      if (error || !plan) return NextResponse.json({ error: "Erreur création plan" }, { status: 500 })

      if (!generate) return NextResponse.json({ plan })

      // Générer les jours via IA (streaming)
      const system = `Tu génères un plan de lecture biblique structuré.
RÈGLES :
- Exactement ${duration_days} jours
- Chaque jour : 1-2 passages max (format: ["GEN.1", "PSA.23"])
- Niveau : ${lvl} (${lvl === "enfant" ? "passages courts et connus" : lvl === "avance" ? "passages plus longs et complexes" : "équilibrés"})
- Langue : ${lang}
${focus ? `- Focus : ${focus}` : "- Équilibre AT/NT"}
- Inclure une question de réflexion par jour (courte)
- Répondre UNIQUEMENT en JSON valide :
{"days":[{"day":1,"title":"...","passages":["GEN.1"],"reflection":"...","prayer_guide":"..."}]}`

      const message = `Génère un plan de lecture de ${duration_days} jours${focus ? ` sur "${focus}"` : ""}.`

      const enc = new TextEncoder()
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()

      ;(async () => {
        try {
          await writer.write(enc.encode(sseChunk({ type: "start", plan_id: plan.id })))
          const raw = await arcAIRequest(message, system)
          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          if (!jsonMatch) throw new Error("JSON invalide")
          const parsed = JSON.parse(jsonMatch[0]) as { days: { day: number; title: string; passages: string[]; reflection: string; prayer_guide: string }[] }

          // Insérer les jours en DB
          const rows = parsed.days.slice(0, duration_days).map(d => ({
            plan_id: plan.id,
            day_number: d.day,
            title: d.title ?? `Jour ${d.day}`,
            passages: d.passages ?? [],
            reflection: d.reflection ?? null,
            prayer_guide: d.prayer_guide ?? null,
          }))
          await admin.from("ai_reading_plan_days").insert(rows)
          await writer.write(enc.encode(sseChunk({ type: "end", plan_id: plan.id, days_count: rows.length })))
        } catch (err) {
          await writer.write(enc.encode(sseChunk({ type: "error", error: String(err) })))
        } finally {
          await writer.close()
        }
      })()

      return new Response(readable, { headers: SSE_HEADERS })
    }

    // ── Lister les plans ────────────────────────────────────────────
    case "list": {
      const { data: plans } = await supabase
        .from("ai_reading_plans")
        .select("id, title, level, duration_days, language, focus, is_active, created_at, updated_at, created_by_ai")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
      return NextResponse.json({ plans: plans ?? [] })
    }

    // ── Lire les jours d'un plan ────────────────────────────────────
    case "get_days": {
      const { plan_id } = body as { plan_id: string }
      if (!plan_id) return badRequestResponse("plan_id requis")
      const { data: days } = await supabase
        .from("ai_reading_plan_days")
        .select("*")
        .eq("plan_id", plan_id)
        .order("day_number")
      return NextResponse.json({ days: days ?? [] })
    }

    // ── Marquer un jour complété ────────────────────────────────────
    case "complete_day": {
      const { plan_id, day_number } = body as { plan_id: string; day_number: number }
      if (!plan_id || !day_number) return badRequestResponse("plan_id et day_number requis")
      const { error } = await supabase
        .from("ai_reading_plan_days")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("plan_id", plan_id)
        .eq("day_number", day_number)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // ── Supprimer un plan ───────────────────────────────────────────
    case "delete": {
      const { plan_id } = body as { plan_id: string }
      if (!plan_id) return badRequestResponse("plan_id requis")
      await supabase.from("ai_reading_plans").update({ is_active: false }).eq("id", plan_id).eq("user_id", userId)
      return NextResponse.json({ ok: true })
    }

    default:
      return badRequestResponse(`Action inconnue: ${action}`)
  }
}
