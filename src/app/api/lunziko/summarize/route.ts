import { NextRequest, NextResponse } from 'next/server'
import { arcAIRequest } from '@/lib/bible-ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, length = 'medium', format = 'bullets' } = body as {
      text: string
      length?: 'short' | 'medium' | 'long'
      format?: 'paragraph' | 'bullets' | 'numbered'
    }

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Texte requis' }, { status: 400 })
    }

    const trimmed = text.slice(0, 50000)

    const formatLabel = format === 'bullets' ? 'liste à puces' : format === 'numbered' ? 'liste numérotée' : 'paragraphes'
    const lengthLabel = length === 'short' ? 'court (2-3 phrases)' : length === 'long' ? 'long (8-10 phrases)' : 'moyen (4-6 phrases)'
    const summaryPrompt = `Génère un résumé en ${formatLabel}, de longueur ${lengthLabel}, du texte suivant :\n\n${trimmed}`

    const summary = await arcAIRequest(summaryPrompt, "Tu es un assistant de synthèse. Génère uniquement le résumé demandé, sans introduction ni conclusion.").catch(() => null)
    if (!summary) return NextResponse.json({ error: 'Erreur lors de la synthèse' }, { status: 502 })
    return NextResponse.json({ summary, word_count: summary.split(/\s+/).length })
  } catch (err) {
    console.error('[lunziko/summarize]', err)
    return NextResponse.json({ error: 'Service indisponible' }, { status: 500 })
  }
}
