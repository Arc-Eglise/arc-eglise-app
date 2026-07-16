import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSpiritualProfile, buildSpiritualContextBlock } from "@/lib/spiritual-profile"
import { getRecentSessionSummaries, arcAIRequest } from "@/lib/bible-ai"

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  try {
    // Charger le profil et les sessions récentes en parallèle
    const [profile, sessionSummaries] = await Promise.all([
      getSpiritualProfile(user.id),
      getRecentSessionSummaries(user.id, 10),
    ])

    // Charger les entrées de journal récentes
    const { data: journalEntries } = await supabase
      .from("ai_spiritual_journal")
      .select("date, content, mood")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(5)

    // Construire le contexte pour Lunziko
    const currentContext = buildSpiritualContextBlock(profile)
    const sessionsBlock  = sessionSummaries.length > 0
      ? `Sessions récentes :\n${sessionSummaries.slice(0, 5).map(s => `- ${s}`).join("\n")}`
      : ""
    const journalBlock = journalEntries && journalEntries.length > 0
      ? `Journal spirituel récent :\n${journalEntries.map(j => `- ${j.date}: ${j.content?.slice(0, 100) ?? ""}${j.mood ? ` (humeur: ${j.mood})` : ""}`).join("\n")}`
      : ""
    const statsBlock = [
      profile.total_chapters > 0 ? `${profile.total_chapters} chapitres lus` : "",
      profile.total_sessions > 0 ? `${profile.total_sessions} sessions IA` : "",
      profile.total_plans    > 0 ? `${profile.total_plans} plans terminés` : "",
    ].filter(Boolean).join(", ")

    const textToSummarize = [
      currentContext,
      sessionsBlock,
      journalBlock,
      statsBlock ? `Statistiques : ${statsBlock}` : "",
    ].filter(Boolean).join("\n\n")

    if (!textToSummarize.trim()) {
      return NextResponse.json({ ok: true, memo: null })
    }

    // Appeler ARC Église IA pour générer un mémo court
    const prompt = `À partir des informations suivantes sur un membre de l'église ARC, rédige un mémo de profil de 300 caractères maximum (en français), en 1-2 phrases, décrivant qui est cet utilisateur spirituellement, ses centres d'intérêt et habitudes d'étude. Sois factuel et concis.

DONNÉES :
${textToSummarize}

MÉMO (300 chars max) :`

    const rawMemo = await arcAIRequest(
      prompt,
      "Tu es un assistant qui génère des mémos de profil utilisateur courts et précis."
    ).catch(() => "")

    if (!rawMemo) {
      return NextResponse.json({ ok: false, error: "Service IA indisponible" }, { status: 500 })
    }

    const memo = rawMemo.trim().slice(0, 500)

    if (!memo) return NextResponse.json({ ok: true, memo: null })

    // Sauvegarder dans spiritual_profile
    const admin = createAdminClient()
    await admin.from("spiritual_profile").upsert({
      user_id:           user.id,
      ai_context_memo:   memo,
      ai_memo_updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, memo })
  } catch (err) {
    console.error("[profile/refresh-memo]", err)
    return NextResponse.json({ ok: false, error: "Erreur interne" }, { status: 500 })
  }
}
