import { NextRequest, NextResponse } from "next/server"
import { requireAuth, unauthorizedResponse, badRequestResponse } from "@/lib/bible-ai"
import { chat } from "@/lib/arc-ai/provider-manager"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  try { await requireAuth() } catch { return unauthorizedResponse() }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()
  const category = searchParams.get("category")?.trim()
  const lang = searchParams.get("lang") ?? "fr"

  const supabase = createClient()

  if (q) {
    // Recherche par terme
    const { data } = await supabase
      .from("theological_terms")
      .select("id, term, slug, short_def, category, key_verses, related_terms")
      .eq("language", lang)
      .or(`term.ilike.%${q}%,slug.ilike.%${q}%`)
      .limit(10)
    return NextResponse.json({ results: data ?? [] })
  }

  if (category) {
    const { data } = await supabase
      .from("theological_terms")
      .select("id, term, slug, short_def, category")
      .eq("language", lang)
      .eq("category", category)
      .order("term")
    return NextResponse.json({ results: data ?? [] })
  }

  // Liste toutes les catégories avec leurs termes
  const { data } = await supabase
    .from("theological_terms")
    .select("id, term, slug, short_def, category")
    .eq("language", lang)
    .order("category")
    .order("term")
  return NextResponse.json({ results: data ?? [] })
}

export async function POST(req: NextRequest) {
  try { await requireAuth() } catch { return unauthorizedResponse() }

  const body = await req.json().catch(() => null)
  if (!body) return badRequestResponse("JSON invalide")

  /* ── Recherche de personnages bibliques ────────────────────────── */
  if (body.type === "person") {
    const { name, identifier, lang = "fr" } = body as { name: string; identifier?: string; lang?: string }
    if (!name?.trim()) return badRequestResponse("name requis")

    if (identifier) {
      // Profil complet d'un personnage spécifique
      const result = await chat(
        [{ role: "user", content: `Décris en détail le personnage biblique "${name}" (identifié comme : ${identifier}) en ${lang === "fr" ? "français" : lang}.` }],
        "auto",
        {
          system: `Tu es un expert en histoire biblique. Pour ce personnage, fournis UNIQUEMENT un JSON valide (sans markdown) avec ce format exact:
{"name":"...","identifier":"...","era":"...","testament":"AT|NT|AT+NT","short_bio":"...","full_story":"...","character":"...","legacy":"...","books":[{"book":"Livre","chapters":"Chap. X-Y","key_verses":["Ref1","Ref2"]}],"related_persons":["Nom 1","Nom 2"],"themes":["Thème 1","Thème 2"]}
- full_story: récit complet en 3-5 paragraphes
- character: traits de personnalité et relation avec Dieu
- legacy: impact et enseignement pour les chrétiens aujourd'hui
- books: tous les livres où il/elle apparaît avec versets clés lisibles (ex: "Jean 3:16")`,
          maxTokens: 2048,
        }
      )
      const raw = result.content.trim()
      const cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim()
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (!match) return NextResponse.json({ error: "Profil non disponible" }, { status: 404 })
      try {
        const parsed = JSON.parse(match[0])
        return NextResponse.json({ person: parsed })
      } catch {
        return NextResponse.json({ error: "Erreur de format" }, { status: 500 })
      }
    }

    // Recherche des candidats (plusieurs homonymes possibles)
    const result = await chat(
      [{ role: "user", content: `Liste TOUS les personnages différents nommés "${name}" dans la Bible (Ancien et Nouveau Testament compris). Inclus tous les homonymes.` }],
      "auto",
      {
        system: `Tu es un expert en histoire biblique. Réponds UNIQUEMENT en JSON valide (sans markdown):
{"candidates":[{"id":"identifiant-unique-kebab","name":"Nom complet","brief":"Description d'une phrase","testament":"AT|NT|AT+NT","era":"Période historique","main_book":"Livre principal"}]}
- id doit être unique et descriptif (ex: "marie-magdeleine", "jean-baptiste", "jean-apotre")
- Inclus TOUS les homonymes même mineurs`,
        maxTokens: 800,
      }
    )
    const raw = result.content.trim()
    const cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ candidates: [] })
    try {
      const parsed = JSON.parse(match[0]) as { candidates: unknown[] }
      return NextResponse.json({ candidates: parsed.candidates ?? [] })
    } catch {
      return NextResponse.json({ candidates: [] })
    }
  }

  /* ── Définition d'un terme théologique ────────────────────────── */
  const { term, lang = "fr" } = body as { term: string; lang?: string }
  if (!term?.trim()) return badRequestResponse("term requis")

  const supabase = createClient()
  const slug = term.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")

  // Chercher dans la DB d'abord
  const { data: existing } = await supabase
    .from("theological_terms")
    .select("*")
    .eq("language", lang)
    .or(`slug.eq.${slug},term.ilike.${term}`)
    .maybeSingle()

  if (existing) return NextResponse.json({ term: existing, source: "db" })

  // Générer via IA si non trouvé
  const system = `Tu es un dictionnaire théologique évangélique réformé.
Réponds UNIQUEMENT en JSON sans markdown:
{"term":"...","slug":"...","short_def":"...","definition":"...","extended":"...","category":"...","key_verses":["Référence 1","Référence 2"],"related_terms":["terme1","terme2"]}

Catégories possibles: soteriologie, christologie, pneumatologie, ecclesiologie, eschatologie, theologie-fondamentale, bibliologie, anthropologie, vie-chretienne
Les références bibliques doivent être LISIBLES (ex: "Jean 3:16", "Romains 5:1") pas des codes.`

  try {
    const result = await chat(
      [{ role: "user", content: `Définis le terme théologique: "${term}"` }],
      "auto",
      { system, maxTokens: 1024 }
    )
    const raw = result.content.trim()
    const cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: "Terme non trouvé" }, { status: 404 })

    const parsed = JSON.parse(match[0]) as Record<string, unknown>

    // Sauvegarder en DB pour le futur
    const { data: saved } = await supabase
      .from("theological_terms")
      .insert({ ...parsed, language: lang })
      .select()
      .single()

    return NextResponse.json({ term: saved ?? parsed, source: "ai" })
  } catch {
    return NextResponse.json({ error: "Terme non trouvé" }, { status: 404 })
  }
}
