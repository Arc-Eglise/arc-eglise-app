import { NextRequest, NextResponse } from "next/server"

const USFM = [
  "GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA",
  "1KI","2KI","1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO",
  "ECC","SNG","ISA","JER","LAM","EZK","DAN","HOS","JOL","AMO",
  "OBA","JON","MIC","NAM","HAB","ZEP","HAG","ZEC","MAL",
  "MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH",
  "PHP","COL","1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS",
  "1PE","2PE","1JN","2JN","3JN","JUD","REV",
]

// BDS (Bible du Semeur 2015) — seule Bible française disponible sur scripture.api.bible
const FR_BIBLE_ID = "6f26e199139ea7f1-01"

function cleanKey(k: string | undefined) {
  return (k ?? "").replace(/^﻿/, "").trim()
}

// Retourne les clés dans l'ordre d'essai (BIBLE_API_KEY en premier car accès BDS)
function getApiKeys(): string[] {
  return [
    cleanKey(process.env.BIBLE_API_KEY),
    cleanKey(process.env.BIBLE_EXTRA_KEY),
  ].filter(k => k.length > 0)
}

// Helper : fetch avec fallback sur les deux clés
async function apiFetch(url: string): Promise<Response | null> {
  for (const key of getApiKeys()) {
    const res = await fetch(url, { headers: { "api-key": key } })
    if (res.ok) return res
    if (res.status === 403 || res.status === 401) continue // essayer la clé suivante
    return res // autre erreur (404, 5xx) : inutile de retenter
  }
  return null
}

// ── GET : charger un chapitre complet (pour lecteur biblique italien/lingala) ──
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bibleId = searchParams.get("bibleId")
  const bookNum = parseInt(searchParams.get("bookNum") ?? "0")
  const chapter = parseInt(searchParams.get("chapter") ?? "1")

  if (!bibleId || !bookNum || !chapter) {
    return NextResponse.json({ error: "bibleId, bookNum, chapter requis" }, { status: 400 })
  }

  const bookCode = USFM[bookNum - 1]
  if (!bookCode) return NextResponse.json({ error: "Livre invalide" }, { status: 400 })

  const passageId = `${bookCode}.${chapter}`
  const url = `https://api.scripture.api.bible/v1/bibles/${bibleId}/passages/${passageId}?content-type=text&include-verse-numbers=true&include-chapter-numbers=false&include-titles=false&include-notes=false`

  try {
    const res = await apiFetch(url)
    if (!res || !res.ok) return NextResponse.json({ error: `API erreur` }, { status: 502 })

    const { data } = await res.json()
    const content: string = data?.content ?? ""

    const verses: { verse: number; text: string }[] = []
    const regex = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g
    let match
    while ((match = regex.exec(content)) !== null) {
      const num = parseInt(match[1])
      const text = match[2].replace(/\s+/g, " ").trim()
      if (text) verses.push({ verse: num, text })
    }

    return NextResponse.json({ verses })
  } catch {
    return NextResponse.json({ error: "Erreur de connexion à l'API Bible" }, { status: 502 })
  }
}

// ── POST : recherche de versets (références ou concordance thématique) ──────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.action) return NextResponse.json({ error: "action requis" }, { status: 400 })

  // ── Action 1 : récupérer le texte de références précises ─────────────────
  if (body.action === "fetch_refs") {
    const refs: string[] = (body.refs ?? []).slice(0, 10)
    if (!refs.length) return NextResponse.json({ verses: [] })

    const results: { ref: string; text: string }[] = []
    for (const ref of refs) {
      try {
        const res = await apiFetch(
          `https://api.scripture.api.bible/v1/bibles/${FR_BIBLE_ID}/search?query=${encodeURIComponent(ref)}&limit=1&sort=relevance`
        )
        if (!res?.ok) continue
        const data = await res.json()
        const verse = data?.data?.verses?.[0]
        if (verse?.text) {
          results.push({ ref: verse.reference ?? ref, text: verse.text.replace(/\s+/g, " ").trim() })
        }
      } catch { continue }
    }
    return NextResponse.json({ verses: results })
  }

  // ── Action 2 : concordance thématique ────────────────────────────────────
  if (body.action === "concordance") {
    const query: string = (body.query ?? "").trim()
    if (!query) return NextResponse.json({ verses: [] })

    try {
      const res = await apiFetch(
        `https://api.scripture.api.bible/v1/bibles/${FR_BIBLE_ID}/search?query=${encodeURIComponent(query)}&limit=12&sort=relevance`
      )
      if (!res?.ok) return NextResponse.json({ verses: [] }, { status: 502 })
      const data = await res.json()
      const verses = (data?.data?.verses ?? []).map((v: { reference: string; text: string }) => ({
        ref: v.reference,
        text: v.text.replace(/\s+/g, " ").trim(),
      }))
      return NextResponse.json({ verses, query: data?.data?.query ?? query })
    } catch {
      return NextResponse.json({ verses: [] }, { status: 502 })
    }
  }

  return NextResponse.json({ error: "action inconnue" }, { status: 400 })
}
