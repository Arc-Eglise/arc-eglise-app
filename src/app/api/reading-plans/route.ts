import { NextRequest, NextResponse } from "next/server"
import { requireAuth, unauthorizedResponse, badRequestResponse, stripAIFormatting } from "@/lib/bible-ai"
import { chat } from "@/lib/arc-ai/provider-manager"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const { action } = body as { action: string }
  const supabase = createClient()
  const admin    = createAdminClient()

  switch (action) {

    // ── Récupérer les versets du jour courant pour un plan ─────
    case "get_day_content": {
      const { plan_id, day_number } = body as { plan_id: string; day_number: number }
      if (!plan_id || !day_number) return badRequestResponse("plan_id et day_number requis")

      // Vérifier que l'utilisateur est inscrit à ce plan
      const { data: progress } = await supabase
        .from("reading_plan_progress")
        .select("current_day")
        .eq("plan_id", plan_id)
        .eq("user_id", userId)
        .single()
      if (!progress) return NextResponse.json({ error: "Plan non trouvé" }, { status: 404 })

      // Chercher le contenu en cache
      const { data: cached } = await supabase
        .from("reading_plan_days")
        .select("title, passages, reflection, prayer_guide")
        .eq("plan_id", plan_id)
        .eq("day_number", day_number)
        .single()

      if (cached?.passages?.length) {
        // Le contenu existe — récupérer les textes des versets
        const verseTexts = await fetchVerseTexts(cached.passages)
        return NextResponse.json({ day: { ...cached, verse_texts: verseTexts } })
      }

      // Pas de contenu — générer avec IA
      const { data: plan } = await supabase
        .from("reading_plans")
        .select("titre, description, total_days")
        .eq("id", plan_id)
        .single()
      if (!plan) return NextResponse.json({ error: "Plan introuvable" }, { status: 404 })

      const generated = await generateDayContent(plan.titre, plan.description, day_number, plan.total_days)
      if (!generated) return NextResponse.json({ error: "Génération impossible" }, { status: 500 })

      // Sauvegarder en cache
      await admin.from("reading_plan_days").upsert({
        plan_id, day_number,
        title:        generated.title,
        passages:     generated.passages,
        reflection:   generated.reflection,
        prayer_guide: generated.prayer_guide,
      }, { onConflict: "plan_id,day_number" })

      const verseTexts = await fetchVerseTexts(generated.passages)
      return NextResponse.json({ day: { ...generated, verse_texts: verseTexts } })
    }

    // ── Générer tous les jours d'un plan (appelé à l'inscription) ─
    case "generate_all_days": {
      const { plan_id } = body as { plan_id: string }
      if (!plan_id) return badRequestResponse("plan_id requis")

      const { data: plan } = await supabase
        .from("reading_plans")
        .select("titre, description, total_days")
        .eq("id", plan_id)
        .single()
      if (!plan) return NextResponse.json({ error: "Plan introuvable" }, { status: 404 })

      // Vérifier combien de jours existent déjà
      const { count } = await supabase
        .from("reading_plan_days")
        .select("*", { count: "exact", head: true })
        .eq("plan_id", plan_id)
      if ((count ?? 0) >= plan.total_days) return NextResponse.json({ ok: true, cached: true })

      // Générer tous les jours via IA
      const system = `Tu génères un plan de lecture biblique en français.
RÈGLES :
- Exactement ${plan.total_days} jours numérotés de 1 à ${plan.total_days}
- Chaque jour : 1-2 références bibliques précises (ex: "Jean 3:16", "Psaumes 23", "Romains 8:1-4")
- Question de réflexion : courte, personnelle, pratique
- Guide de prière : 1-2 phrases
- Réponds UNIQUEMENT en JSON valide sans markdown :
{"days":[{"day":1,"title":"Titre court","passages":["Référence 1","Référence 2"],"reflection":"Question ?","prayer_guide":"Guide."}]}`

      const message = `Génère un plan de lecture de ${plan.total_days} jours sur le thème "${plan.titre}"${plan.description ? ` (${plan.description})` : ""}. JSON uniquement.`

      try {
        const result = await chat([{ role: "user", content: message }], "auto", { system, maxTokens: 8192 })
        const cleaned = result.content.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim()
        const match = cleaned.match(/\{[\s\S]*\}/)
        if (!match) return NextResponse.json({ error: "IA n'a pas retourné de JSON" }, { status: 500 })

        const parsed = JSON.parse(match[0]) as { days: { day: number; title: string; passages: string[]; reflection: string; prayer_guide: string }[] }
        const rows = parsed.days.slice(0, plan.total_days).map(d => ({
          plan_id, day_number: d.day,
          title: stripAIFormatting(d.title ?? `Jour ${d.day}`),
          passages: Array.isArray(d.passages) ? d.passages : [],
          reflection: d.reflection ? stripAIFormatting(d.reflection) : null,
          prayer_guide: d.prayer_guide ? stripAIFormatting(d.prayer_guide) : null,
        }))
        await admin.from("reading_plan_days").upsert(rows, { onConflict: "plan_id,day_number" })
        return NextResponse.json({ ok: true, days_generated: rows.length })
      } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 })
      }
    }

    default:
      return badRequestResponse(`Action inconnue: ${action}`)
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function fetchVerseTexts(passages: string[]): Promise<{ reference: string; text: string }[]> {
  const bibleKey  = (process.env.BIBLE_API_KEY ?? "").replace(/^﻿/, "").trim()
  const bibleId   = process.env.BIBLE_DEFAULT_ID ?? "61fd76eafa1ef5f7-01"
  const bibleBase = process.env.BIBLE_API_BASE   ?? "https://api.scripture.api.bible/v1"
  const results: { reference: string; text: string }[] = []

  if (bibleKey && bibleKey !== "your_api_bible_key_here") {
    for (const passage of passages) {
      try {
        const r = await fetch(
          `${bibleBase}/bibles/${bibleId}/search?query=${encodeURIComponent(passage)}&limit=1&sort=relevance`,
          { headers: { "api-key": bibleKey } }
        )
        if (r.ok) {
          const { data } = await r.json()
          const v = data?.verses?.[0]
          if (v?.text) results.push({ reference: v.reference ?? passage, text: v.text.trim() })
        }
      } catch { /* skip */ }
    }
  }

  // Fallback IA si Bible API vide
  if (results.length === 0 && passages.length > 0) {
    try {
      const ai = await chat(
        [{ role: "user", content: `Donne le texte exact en français (Louis Segond) des versets : ${passages.join(", ")}. Une ligne par verset, format "Référence : texte".` }],
        "auto",
        { maxTokens: 600 }
      )
      const lines = ai.content.split("\n").filter(l => l.trim())
      if (lines.length >= passages.length) {
        passages.forEach((p, i) => {
          const line = lines[i] ?? ""
          const col  = line.indexOf(":")
          results.push({ reference: p, text: stripAIFormatting(col > -1 ? line.slice(col + 1).trim() : line.trim()) })
        })
      } else {
        results.push({ reference: passages.join(" · "), text: stripAIFormatting(ai.content.trim()) })
      }
    } catch { /* skip */ }
  }

  return results
}

async function generateDayContent(
  titre: string,
  description: string | null,
  day: number,
  totalDays: number
): Promise<{ title: string; passages: string[]; reflection: string; prayer_guide: string } | null> {
  try {
    const message = `Pour un plan de lecture "${titre}"${description ? ` (${description})` : ""} de ${totalDays} jours, génère le contenu du jour ${day}.
Réponds en JSON : {"title":"Titre court du jour","passages":["Référence 1","Référence 2"],"reflection":"Question de réflexion personnelle ?","prayer_guide":"Guide de prière."}`
    const result = await chat([{ role: "user", content: message }], "auto", { maxTokens: 400 })
    const cleaned = result.content.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    return {
      ...parsed,
      title:        stripAIFormatting(parsed.title ?? ""),
      reflection:   parsed.reflection   ? stripAIFormatting(parsed.reflection)   : null,
      prayer_guide: parsed.prayer_guide ? stripAIFormatting(parsed.prayer_guide) : null,
    }
  } catch {
    return null
  }
}
