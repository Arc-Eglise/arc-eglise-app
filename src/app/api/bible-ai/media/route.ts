import { NextRequest, NextResponse } from "next/server"
import {
  requireAuth, unauthorizedResponse, badRequestResponse,
  getUserPrefs, buildCacheKey, getCachedResponse, setCachedResponse,
} from "@/lib/bible-ai"
import { createClient }      from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { lunzikoFetch }      from "@/lib/lunziko"

const CURATED_BOOKS_FR = [
  { title: "Connaître Dieu", author: "J.I. Packer", topics: ["théologie","dieu","foi"], level: "intermediaire" },
  { title: "Le Christianisme pur et simple", author: "C.S. Lewis", topics: ["apologétique","foi"], level: "debutant" },
  { title: "Théologie Systématique", author: "Wayne Grudem", topics: ["doctrine","théologie"], level: "avance" },
  { title: "La Croix du Christ", author: "John Stott", topics: ["expiation","salut","croix"], level: "intermediaire" },
  { title: "Instituts de la Religion Chrétienne", author: "Jean Calvin", topics: ["théologie réformée"], level: "enseignant" },
  { title: "La Grâce Souveraine", author: "Arthur W. Pink", topics: ["grâce","prédestination"], level: "avance" },
  { title: "Dieu : le seul sage", author: "Tim Keller", topics: ["sagesse","prière"], level: "intermediaire" },
  { title: "Bible d'Étude Semeur", author: "Collectif", topics: ["étude biblique"], level: "debutant" },
]

const CURATED_PODCASTS_FR = [
  { title: "La Croix d'Émeraude", url: "https://www.lacroixdemeraude.com/podcast", description: "Enseignements réformés en français", topics: ["théologie","prédication"] },
  { title: "Institut Biblique en Ligne", url: "https://www.inboli.com", description: "Cours d'étude biblique francophones", topics: ["étude biblique","formation"] },
  { title: "Christ Seul", url: "https://christseul.fr/podcast", description: "Prédication évangélique réformée", topics: ["évangile","prédication"] },
]

const AUDIO_BIBLES = [
  { language: "fr", title: "Bible du Semeur Audio", url: "https://www.wordproject.org/bibles/audio/38_french_semeur/index.htm", note: "" },
  { language: "fr", title: "Louis Segond 1910 Audio", url: "https://www.wordproject.org/bibles/audio/37_french/index.htm", note: "" },
  { language: "en", title: "ESV Audio Bible", url: "https://www.esv.org/audio/", note: "" },
  { language: "es", title: "Reina-Valera 1960 Audio", url: "https://www.wordproject.org/bibles/audio/13_spanish/index.htm", note: "" },
]

export async function POST(req: NextRequest) {
  let userId: string
  try { userId = await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  const { action = "recommend" } = body as { action?: string }
  const supabase = createClient()
  const admin    = createAdminClient()

  switch (action) {
    case "recommend": {
      const { topic, verse_ref, language, types } = body as {
        topic?: string
        verse_ref?: string
        language?: string
        types?: string[]
      }
      const prefs  = await getUserPrefs(userId)
      const lang   = language ?? prefs.language
      const context = topic ?? verse_ref ?? "étude biblique générale"

      const cacheKey = buildCacheKey({ type: "media", context, lang, level: prefs.level })
      const cached = await getCachedResponse(cacheKey)
      if (cached) {
        try { return NextResponse.json(JSON.parse(cached)) } catch { /* fallthrough */ }
      }

      // ── Sermons locaux ──────────────────────────────────────────
      const { data: localSermons } = await admin
        .from("sermons")
        .select("id, title, pastor, reference, excerpt, youtube_id, date")
        .eq("is_published", true)
        .order("date", { ascending: false })
        .limit(3)

      const sermons = (localSermons ?? []).map(s => ({
        title:       `Sermon ARC : ${s.title}`,
        author:      s.pastor,
        type:        "sermon",
        url:         s.youtube_id ? `https://youtube.com/watch?v=${s.youtube_id}` : null,
        description: s.excerpt ?? `Prédication sur ${s.reference ?? "la Parole de Dieu"}`,
        verse_refs:  s.reference ? [s.reference] : [],
        topics:      [],
        language:    lang,
        source:      "arc",
        saved:       false,
      }))

      // ── Audio Bible ─────────────────────────────────────────────
      const audioBibles = AUDIO_BIBLES.filter(a => a.language === lang || lang === "fr").slice(0, 2).map(a => ({
        title: a.title, author: "Bible", type: "audio_bible",
        url: a.url, description: "Bible audio gratuite", verse_refs: [], topics: ["lecture"],
        language: a.language, source: "curated", saved: false,
      }))

      // ── Recommandations IA ──────────────────────────────────────
      const allowedTypes = types ?? ["book", "podcast", "article"]
      const booksForPrompt = CURATED_BOOKS_FR.map(b => `- "${b.title}" de ${b.author} (${b.topics.join(", ")}) — niveau ${b.level}`).join("\n")
      const podcastsForPrompt = CURATED_PODCASTS_FR.map(p => `- "${p.title}" : ${p.description}`).join("\n")

      const res = await lunzikoFetch("/chat", {
        method: "POST",
        body: JSON.stringify({
          message: `Recommande 3 ressources chrétiennes sur "${context}" pour un niveau ${prefs.level} en ${lang}.
Types souhaités : ${allowedTypes.join(", ")}.
Choisis parmi ces livres :\n${booksForPrompt}\nOu ces podcasts :\n${podcastsForPrompt}`,
          history: [],
          context: {
            language: lang,
            system: `Tu es un bibliothécaire chrétien. Recommande uniquement parmi les ressources listées.
Réponds en JSON : [{"title":"...","author":"...","type":"book|podcast|article","url":null,"description":"...","verse_refs":[],"topics":[],"language":"${lang}"}]`,
          },
          provider: "auto",
          stream: false,
        }),
      })

      let aiRecs: Record<string, unknown>[] = []
      if (res.ok) {
        const d = await res.json()
        const raw = d.content ?? d.message ?? "[]"
        const jsonMatch = raw.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          try { aiRecs = JSON.parse(jsonMatch[0]) } catch { /* skip */ }
        }
      }

      const result = {
        recommendations: [...sermons, ...audioBibles, ...aiRecs.slice(0, 4)].map(r => ({ ...r, saved: false })),
      }
      setCachedResponse(cacheKey, JSON.stringify(result), "media", lang, prefs.level, 24)
      return NextResponse.json(result)
    }

    case "save": {
      const { recommendation } = body as { recommendation: Record<string, unknown> }
      if (!recommendation) return badRequestResponse("recommendation requis")
      const { data } = await admin.from("ai_media_recommendations").insert({
        user_id:     userId,
        title:       recommendation.title ?? "",
        type:        recommendation.type  ?? "article",
        url:         recommendation.url   ?? null,
        author:      recommendation.author ?? null,
        description: recommendation.description ?? null,
        verse_refs:  recommendation.verse_refs ?? [],
        topics:      recommendation.topics ?? [],
        language:    recommendation.language ?? "fr",
        saved:       true,
        source:      recommendation.source ?? "ai",
      }).select("id").single()
      return NextResponse.json({ ok: true, id: data?.id })
    }

    case "rate": {
      const { recommendation_id, rating } = body as { recommendation_id: string; rating: number }
      if (!recommendation_id || !rating) return badRequestResponse("recommendation_id et rating requis")
      await supabase.from("ai_media_recommendations")
        .update({ rating })
        .eq("id", recommendation_id)
        .eq("user_id", userId)
      return NextResponse.json({ ok: true })
    }

    case "list_saved": {
      const { data: saved } = await supabase
        .from("ai_media_recommendations")
        .select("*")
        .eq("user_id", userId)
        .eq("saved", true)
        .order("created_at", { ascending: false })
      return NextResponse.json({ saved: saved ?? [] })
    }

    default:
      return badRequestResponse(`Action inconnue: ${action}`)
  }
}
