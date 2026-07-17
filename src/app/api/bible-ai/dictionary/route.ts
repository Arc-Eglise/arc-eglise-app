import { NextRequest, NextResponse } from "next/server"
import { requireAuth, unauthorizedResponse, badRequestResponse, arcAIRequest } from "@/lib/bible-ai"
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
    const raw = await arcAIRequest(`Définis le terme théologique: "${term}"`, system)
    const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim()
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
