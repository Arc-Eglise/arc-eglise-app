import { NextRequest, NextResponse } from "next/server"
import { requireAuth, unauthorizedResponse, badRequestResponse } from "@/lib/bible-ai"
import { createClient }      from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { lunzikoFetch }      from "@/lib/lunziko"

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
        .limit(20)

      const { data: summaries } = await supabase
        .from("sermon_ai_summaries")
        .select("sermon_id")

      const summarizedIds = new Set((summaries ?? []).map((s: any) => s.sermon_id))

      return NextResponse.json({
        sermons: (sermons ?? []).map((s: any) => ({
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
        const res = await lunzikoFetch("/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt, history: [], context: { language, level: "intermediaire" }, provider: "auto", stream: false }),
        })
        if (!res.ok) throw new Error(`Lunziko error ${res.status}`)
        const data = await res.json()
        const raw  = (data.content ?? data.message ?? "").trim()

        let parsed: { summary?: string; key_verses?: string[]; themes?: string[] } = {}
        try {
          const jsonStart = raw.indexOf("{")
          const jsonEnd   = raw.lastIndexOf("}") + 1
          parsed = jsonStart >= 0 ? JSON.parse(raw.slice(jsonStart, jsonEnd)) : JSON.parse(raw)
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
      } catch (err: any) {
        return NextResponse.json({ error: err.message ?? "Erreur IA" }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 })
  }
}
