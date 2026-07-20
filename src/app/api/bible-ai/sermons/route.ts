import { NextRequest, NextResponse } from "next/server"
import { requireAuth, unauthorizedResponse, badRequestResponse } from "@/lib/bible-ai"
import { chat } from "@/lib/arc-ai/provider-manager"
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

    case "list_sermons": {
      const { data: sermons } = await supabase
        .from("sermons")
        .select("id, title, pastor, date, is_featured, is_published")
        .eq("is_published", true)
        .order("date", { ascending: false })
        .limit(50)

      const { data: summaries } = await supabase
        .from("sermon_ai_summaries")
        .select("sermon_id")

      const summarizedIds = new Set((summaries ?? []).map((s: { sermon_id: string }) => s.sermon_id))

      return NextResponse.json({
        sermons: (sermons ?? []).map((s: { id: string; [key: string]: unknown }) => ({
          ...s,
          has_summary: summarizedIds.has(s.id),
        })),
      })
    }

    case "get_summary": {
      const { sermon_id } = body
      if (!sermon_id) return badRequestResponse("sermon_id requis")

      const { data } = await supabase
        .from("sermon_ai_summaries")
        .select("summary, key_verses, themes, created_at")
        .eq("sermon_id", sermon_id)
        .single()

      return NextResponse.json(data ?? { summary: null })
    }

    case "summarize": {
      const { sermon_id, title, pastor, notes, language = "fr" } = body
      if (!sermon_id || !title) return badRequestResponse("sermon_id et title requis")

      const lang = language === "fr" ? "français" : language

      const prompt = `Tu es l'assistant biblique de l'église ARC (Ambassade du Royaume de Christ). Génère un résumé structuré et édifiant de ce sermon en ${lang}.

Sermon : "${title}"
Prédicateur : ${pastor ?? "Inconnu"}
${notes ? `Notes/Texte : ${notes.slice(0, 2000)}` : "(Pas de notes disponibles — génère sur la base du titre)"}

Réponds UNIQUEMENT en JSON valide sans markdown, avec ce format :
{
  "summary": "Résumé en 3-4 paragraphes clairs, spirituellement riches",
  "key_verses": ["Livre Chap:Verset1", "Livre Chap:Verset2", "Livre Chap:Verset3"],
  "themes": ["Thème principal", "Thème secondaire", "Application pratique"]
}`

      try {
        const result = await chat(
          [{ role: "user", content: prompt }],
          "auto",
          { system: "Tu es l'assistant biblique de l'église ARC. Réponds uniquement en JSON valide.", maxTokens: 2048 }
        )
        const raw = result.content.trim()

        let parsed: { summary?: string; key_verses?: string[]; themes?: string[] } = {}
        try {
          const cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim()
          const jsonStart = cleaned.indexOf("{")
          const jsonEnd   = cleaned.lastIndexOf("}") + 1
          parsed = jsonStart >= 0 ? JSON.parse(cleaned.slice(jsonStart, jsonEnd)) : JSON.parse(cleaned)
        } catch { parsed = {} }
        if (!parsed.summary) return NextResponse.json({ error: "Génération échouée" }, { status: 500 })

        await admin.from("sermon_ai_summaries").upsert({
          sermon_id,
          summary: parsed.summary,
          key_verses: parsed.key_verses ?? [],
          themes: parsed.themes ?? [],
          generated_by: userId,
        })

        return NextResponse.json({
          summary: parsed.summary,
          key_verses: parsed.key_verses ?? [],
          themes: parsed.themes ?? [],
          cached: false,
        })
      } catch (err: unknown) {
        return NextResponse.json({ error: (err as Error).message ?? "Erreur IA" }, { status: 500 })
      }
    }

    case "update_summary": {
      const { sermon_id, summary, key_verses, themes } = body as {
        sermon_id: string
        summary?: string
        key_verses?: string[]
        themes?: string[]
      }
      if (!sermon_id) return badRequestResponse("sermon_id requis")

      const update: Record<string, unknown> = {}
      if (summary   !== undefined) update.summary    = summary
      if (key_verses !== undefined) update.key_verses = key_verses
      if (themes    !== undefined) update.themes     = themes

      const { error } = await admin
        .from("sermon_ai_summaries")
        .update(update)
        .eq("sermon_id", sermon_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    case "delete_summary": {
      const { sermon_id } = body
      if (!sermon_id) return badRequestResponse("sermon_id requis")
      await admin.from("sermon_ai_summaries").delete().eq("sermon_id", sermon_id)
      return NextResponse.json({ ok: true })
    }

    case "search_theme": {
      const { theme } = body
      if (!theme) return badRequestResponse("theme requis")

      const result = await chat(
        [{ role: "user", content: `Explique le thème biblique et théologique "${theme}" de façon claire et édifiante : son sens dans les Écritures, les versets principaux qui l'illustrent, et son application pratique pour les croyants aujourd'hui.` }],
        "auto",
        { system: "Tu es l'assistant biblique de l'église ARC (Ambassade du Royaume de Christ). Réponds en français de façon structurée et accessible.", maxTokens: 600 }
      )
      return NextResponse.json({ result: result.content })
    }

    case "get_verse": {
      const { ref } = body
      if (!ref) return badRequestResponse("ref requis")

      const result = await chat(
        [{ role: "user", content: `Donne-moi le texte du verset "${ref}" (version Segond 21 ou Bible du Semeur), puis une courte explication en 1-2 phrases sur son contexte et sa signification.` }],
        "auto",
        { system: "Tu es un assistant biblique. Fournis le texte du verset demandé puis une brève explication. Réponds en français.", maxTokens: 300 }
      )
      return NextResponse.json({ text: result.content })
    }

    /* ── Pasteurs ─────────────────────────────────────────────────── */

    case "list_pastors": {
      // Membres ARC avec rôle pasteur OU fonction pasteur dans groups[]
      const { data: arcPastors } = await admin
        .from("profiles")
        .select("id, first_name, last_name, role, groups")
        .or("role.eq.pasteur,groups.cs.{pasteur}")
        .eq("validated", true)
        .order("last_name")

      // Pasteurs visiteurs
      const { data: visitors } = await admin
        .from("visiting_pastors")
        .select("*")
        .order("name")

      return NextResponse.json({ arc_pastors: arcPastors ?? [], visitors: visitors ?? [] })
    }

    case "assign_pastor": {
      const { sermon_id, pastor_name, pastor_member_id, pastor_visitor_id } = body as {
        sermon_id: string
        pastor_name: string
        pastor_member_id?: string | null
        pastor_visitor_id?: string | null
      }
      if (!sermon_id || !pastor_name) return badRequestResponse("sermon_id et pastor_name requis")

      const { error } = await admin.from("sermons").update({
        pastor: pastor_name,
        pastor_member_id: pastor_member_id ?? null,
        pastor_visitor_id: pastor_visitor_id ?? null,
      }).eq("id", sermon_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    case "add_visiting_pastor": {
      const { name, title = "Pasteur", church, city, country = "Suisse", notes } = body as {
        name: string; title?: string; church?: string; city?: string; country?: string; notes?: string
      }
      if (!name?.trim()) return badRequestResponse("name requis")

      const { data, error } = await admin
        .from("visiting_pastors")
        .insert({ name: name.trim(), title, church, city, country, notes, created_by: userId })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ pastor: data })
    }

    case "update_visiting_pastor": {
      const { id, name, title, church, city, country, notes } = body as {
        id: string; name?: string; title?: string; church?: string; city?: string; country?: string; notes?: string
      }
      if (!id) return badRequestResponse("id requis")

      const update: Record<string, unknown> = {}
      if (name    !== undefined) update.name    = name
      if (title   !== undefined) update.title   = title
      if (church  !== undefined) update.church  = church
      if (city    !== undefined) update.city    = city
      if (country !== undefined) update.country = country
      if (notes   !== undefined) update.notes   = notes

      await admin.from("visiting_pastors").update(update).eq("id", id)
      return NextResponse.json({ ok: true })
    }

    case "delete_visiting_pastor": {
      const { id } = body as { id: string }
      if (!id) return badRequestResponse("id requis")
      await admin.from("visiting_pastors").delete().eq("id", id)
      return NextResponse.json({ ok: true })
    }

    default:
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 })
  }
}
