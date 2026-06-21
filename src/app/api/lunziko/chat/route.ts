import { NextRequest, NextResponse } from 'next/server'
import { lunzikoFetch } from '@/lib/lunziko'

const ARC_SYSTEM =
  "Tu es l'assistant IA de l'église ARC (Alliance Réconciliée en Christ), une église chrétienne évangélique basée en Suisse (Genève / Lausanne). " +
  "Tu réponds toujours en français, de manière chaleureuse, bienveillante et fidèle aux valeurs chrétiennes évangéliques. " +
  "Informations utiles : cultes le dimanche à 9h30 et 17h00, prière le mercredi à 19h00. " +
  "Tu peux aider avec les horaires et événements, l'étude biblique, le soutien spirituel et les démarches pour rejoindre la communauté. " +
  "Sois concis et encourageant. Pour les questions pastorales sensibles, oriente vers un pasteur ou un ancien."

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, history, stream = false } = body as {
      message: string
      history?: { role: string; content: string }[]
      stream?: boolean
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    const res = await lunzikoFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: message.trim(),
        history: history ?? [],
        context: { language: 'fr', system: ARC_SYSTEM },
        provider: 'auto',
        stream,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[lunziko/chat]', res.status, text)
      return NextResponse.json(
        { answer: "Je suis temporairement indisponible. Merci de réessayer dans un instant." },
        { status: 200 }
      )
    }

    if (stream) {
      // Proxy SSE stream directly to the client
      return new Response(res.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    }

    const data = await res.json()
    return NextResponse.json({ answer: data.content ?? data.message ?? '' })
  } catch (err) {
    console.error('[lunziko/chat]', err)
    return NextResponse.json(
      { answer: "Le service IA est temporairement indisponible. Merci de réessayer dans un instant." },
      { status: 200 }
    )
  }
}
