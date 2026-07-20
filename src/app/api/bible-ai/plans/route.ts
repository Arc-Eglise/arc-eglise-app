import { NextRequest, NextResponse } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, SSE_HEADERS, sseChunk,
} from "@/lib/bible-ai"
import { chat } from "@/lib/arc-ai/provider-manager"
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
      const system = `Tu génères un plan de lecture biblique structuré en ${lang}.
RÈGLES ABSOLUES :
- Exactement ${duration_days} jours numérotés de 1 à ${duration_days}
- Chaque jour : 1-2 références bibliques LISIBLES (ex: "Jean 3:16", "Psaumes 23", "Genèse 1:1-10")
- Niveau : ${lvl === "enfant" ? "passages courts et bien connus, vocabulaire simple" : lvl === "avance" || lvl === "enseignant" ? "passages plus longs et profonds" : "équilibre entre facilité et profondeur"}
${focus ? `- Thème central : ${focus}` : "- Équilibre Ancien Testament et Nouveau Testament"}
- Question de réflexion par jour : courte, personnelle, pratique
- Guide de prière par jour : 1-2 phrases d'invitation à la prière
- Répondre UNIQUEMENT avec du JSON valide, sans markdown, sans texte avant ou après :
{"days":[{"day":1,"title":"Titre court du jour","passages":["Jean 3:16","Romains 8:1"],"reflection":"Question de réflexion personnelle ?","prayer_guide":"Prière d'invitation courte."}]}`

      const message = `Génère un plan de lecture biblique de ${duration_days} jours${focus ? ` centré sur "${focus}"` : " avec un bon équilibre AT/NT"} pour un niveau ${lvl} en ${lang}. Réponds uniquement en JSON.`

      const enc = new TextEncoder()
      const { readable, writable } = new TransformStream()
      const writer = writable.getWriter()

      ;(async () => {
        try {
          await writer.write(enc.encode(sseChunk({ type: "start", plan_id: plan.id })))
          const result = await chat(
            [{ role: "user", content: message }],
            "auto",
            { system, maxTokens: 8192 }
          )
          const raw = result.content
          // Nettoyer markdown éventuel (```json ... ```)
          const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
          if (!jsonMatch) throw new Error("Le modèle IA n'a pas retourné de JSON valide")
          const parsed = JSON.parse(jsonMatch[0]) as { days: { day: number; title: string; passages: string[]; reflection: string; prayer_guide: string }[] }

          // Insérer les jours en DB
          const rows = parsed.days.slice(0, duration_days).map(d => ({
            plan_id: plan.id,
            day_number: d.day,
            title: d.title ?? `Jour ${d.day}`,
            // Normaliser passages : accepte string[] ou [{reference}] ou string
            passages: Array.isArray(d.passages)
              ? d.passages.map((p: unknown) => typeof p === "string" ? p : (p as Record<string,string>)?.reference ?? String(p))
              : [],
            reflection: d.reflection ?? null,
            prayer_guide: d.prayer_guide ?? null,
          }))
          const { error: insertError } = await admin.from("ai_reading_plan_days").insert(rows)
          if (insertError) {
            console.error("[plans/create] Erreur insertion jours:", insertError.message)
            await writer.write(enc.encode(sseChunk({ type: "error", error: `Erreur base de données: ${insertError.message}` })))
          } else {
            await writer.write(enc.encode(sseChunk({ type: "end", plan_id: plan.id, days_count: rows.length })))
          }
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
