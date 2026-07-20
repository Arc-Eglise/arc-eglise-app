import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { streamArcAI, arcAIRequest } from "@/lib/bible-ai"

const CHURCH_BASE =
  "Tu es l'assistant IA de l'église ARC (Ambassade du Royaume de Christ), une église chrétienne évangélique basée à La Chaux-de-Fonds, Suisse. " +
  "Tu réponds toujours en français, de manière chaleureuse, bienveillante et fidèle aux valeurs chrétiennes évangéliques. " +
  "Adresse : Av. Charles-Naine 39, 2300 La Chaux-de-Fonds. Pasteur : Pedro Obova. " +
  "Sois concis et encourageant. Pour les questions pastorales sensibles, oriente vers le Pasteur Pedro Obova. " +
  "Ne parle jamais de systèmes informatiques ou de technologie."

async function buildSystemPrompt(): Promise<string> {
  try {
    const admin = createAdminClient()

    // Fetch real upcoming events and site settings in parallel
    const [{ data: events }, { data: settings }] = await Promise.all([
      admin
        .from("events")
        .select("title, date, time_start, location, description")
        .eq("is_published", true)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(8),
      admin
        .from("site_settings")
        .select("key, value")
        .in("key", ["verset_du_jour", "verset_reference", "culte_1_label", "culte_2_label", "culte_3_label"]),
    ])

    const s = Object.fromEntries((settings ?? []).map((r: any) => [r.key, r.value]))

    const culte1 = s.culte_1_label ?? "Dimanche 09h30 — Culte principal"
    const culte2 = s.culte_2_label ?? "Dimanche 17h00 — Culte du soir"
    const culte3 = s.culte_3_label ?? "Mercredi 19h00 — Prière & Parole"

    let prompt = `${CHURCH_BASE}\n\nHORAIRES :\n- ${culte1}\n- ${culte2}\n- ${culte3}`

    if (events && events.length > 0) {
      prompt += "\n\nPROCHAINS ÉVÉNEMENTS :\n"
      for (const ev of events) {
        const d = new Date(ev.date).toLocaleDateString("fr-CH", {
          weekday: "long", day: "numeric", month: "long",
        })
        const time = ev.time_start ? ` à ${ev.time_start.slice(0, 5)}` : ""
        const loc = ev.location ? ` (${ev.location})` : ""
        prompt += `- ${ev.title} — ${d}${time}${loc}\n`
        if (ev.description) prompt += `  ${ev.description.slice(0, 120)}\n`
      }
    }

    if (s.verset_du_jour) {
      prompt += `\nVERSET DU JOUR : ${s.verset_du_jour}`
      if (s.verset_reference) prompt += ` — ${s.verset_reference}`
    }

    return prompt
  } catch {
    return `${CHURCH_BASE}\n\nHORAIRES : Dimanche 09h30 et 17h00 | Mercredi 19h00 (prière)`
  }
}

export async function POST(req: NextRequest) {
  try {
    // Vérification d'authentification — IA réservée aux membres connectés
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Accès non autorisé — connexion requise" }, { status: 401 })
    }

    const body = await req.json()
    const { message, history = [], stream = true } = body as {
      message: string
      history?: { role: string; content: string }[]
      stream?: boolean
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message requis" }, { status: 400 })
    }

    const systemPrompt = await buildSystemPrompt()

    if (stream) {
      return streamArcAI(message.trim(), history, systemPrompt)
    }

    const answer = await arcAIRequest(message.trim(), systemPrompt, history).catch(() => "Je suis temporairement indisponible. Merci de réessayer dans un instant.")
    return NextResponse.json({ answer })
  } catch (err) {
    console.error("[api/copilot]", err)
    return NextResponse.json(
      { answer: "Le service d'assistance est temporairement indisponible. Merci de réessayer dans un instant." },
      { status: 200 }
    )
  }
}
