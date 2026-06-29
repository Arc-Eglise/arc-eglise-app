import { NextRequest, NextResponse } from 'next/server'
import { lunzikoFetch, lunzikoWorkflow } from '@/lib/lunziko'

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

    // For long texts (sermons, documents), use workflow engine — has retry + timeout
    if (trimmed.length > 2000) {
      try {
        const out = await lunzikoWorkflow('ocrToSummary', { text: trimmed })
        if (out.summary) {
          return NextResponse.json({ summary: out.summary, word_count: out.word_count ?? 0 })
        }
      } catch {
        // Fall through to /summarize
      }
    }

    const res = await lunzikoFetch('/summarize', {
      method: 'POST',
      body: JSON.stringify({ text: trimmed, length, format, language: 'fr', provider: 'auto' }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[lunziko/summarize]', res.status, errText)
      return NextResponse.json({ error: 'Erreur lors de la synthèse' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ summary: data.summary, word_count: data.word_count })
  } catch (err) {
    console.error('[lunziko/summarize]', err)
    return NextResponse.json({ error: 'Service indisponible' }, { status: 500 })
  }
}
