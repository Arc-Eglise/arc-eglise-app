import { NextRequest, NextResponse } from 'next/server'
import { lunzikoFetch, lunzikoAgent } from '@/lib/lunziko'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decryptKey, claudeStream, openaiStream, geminiStream } from '@/lib/member-ai'
import { buildUserContextBlock } from '@/lib/spiritual-profile'

const ARC_SYSTEM_BASE =
  "Tu es l'assistant IA de l'église ARC (Ambassade du Royaume de Christ), une église chrétienne évangélique basée à La Chaux-de-Fonds, Suisse. " +
  "Tu réponds toujours en français, de manière chaleureuse, bienveillante et fidèle aux valeurs chrétiennes évangéliques. " +
  "Horaires : culte dimanche 9h30 et 17h00, prière mercredi 19h00 — Av. Charles-Naine 39, La Chaux-de-Fonds. Pasteur : Pedro Obova. " +
  "Tu peux aider avec les horaires, l'étude biblique, le soutien spirituel et les démarches pour rejoindre la communauté. " +
  "Sois concis et encourageant. Pour les questions pastorales sensibles, oriente vers le Pasteur Pedro Obova."

function buildArcSystem(profileContext: string): string {
  if (!profileContext) return ARC_SYSTEM_BASE
  return `${ARC_SYSTEM_BASE}\n\nPROFIL DE CET UTILISATEUR :\n${profileContext}`
}

// Tente de récupérer la clé IA personnelle du membre connecté
async function getMemberKey(): Promise<{ provider: string; key: string } | null> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('ai_claude_key, ai_openai_key, ai_gemini_key, ai_provider_pref')
      .eq('id', user.id)
      .single()

    if (!profile) return null

    const pref = profile.ai_provider_pref ?? 'auto'

    // Ordre de priorité : préférence du membre, puis claude → openai → gemini
    const priority =
      pref !== 'auto'
        ? [pref, ...['claude', 'openai', 'gemini'].filter((p) => p !== pref)]
        : ['claude', 'openai', 'gemini']

    for (const p of priority) {
      const col = p === 'claude' ? 'ai_claude_key' : p === 'openai' ? 'ai_openai_key' : 'ai_gemini_key'
      const enc = profile[col as keyof typeof profile] as string | null
      if (enc) return { provider: p, key: decryptKey(enc) }
    }
    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, history = [], stream = true } = body as {
      message: string
      history?: { role: string; content: string }[]
      stream?: boolean
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    const msgs = [...history, { role: 'user', content: message.trim() }]

    // Charger le profil utilisateur pour personnaliser le système prompt
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const profileContext = user ? await buildUserContextBlock(user.id).catch(() => "") : ""
    const ARC_SYSTEM = buildArcSystem(profileContext)

    // ── Priorité 1 : clé personnelle du membre ──────────────────────────────
    const memberKey = await getMemberKey()
    if (memberKey && stream) {
      switch (memberKey.provider) {
        case 'claude':  return claudeStream(memberKey.key, msgs, ARC_SYSTEM)
        case 'openai':  return openaiStream(memberKey.key, msgs, ARC_SYSTEM)
        case 'gemini':  return geminiStream(memberKey.key, msgs, ARC_SYSTEM)
      }
    }

    // ── Priorité 2 : Lunziko Agent (tool calling, mémoire, knowledge search) ──
    // Non-streaming uniquement — l'agent ne supporte pas SSE
    if (!stream) {
      try {
        const result = await lunzikoAgent(message.trim(), { agent_type: 'auto', system: ARC_SYSTEM, language: 'fr' })
        return NextResponse.json({ answer: result.content })
      } catch {
        // Fall through to plain /chat
      }
    }

    // ── Priorité 3 : Lunziko Platform /chat (streaming ou fallback) ──────────
    const res = await lunzikoFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: message.trim(),
        history: history,
        context: { language: 'fr', system: ARC_SYSTEM },
        provider: 'auto',
        stream,
      }),
    })

    if (!res.ok) {
      console.error('[lunziko/chat]', res.status, await res.text())
      return NextResponse.json(
        { answer: "Je suis temporairement indisponible. Merci de réessayer dans un instant." },
        { status: 200 }
      )
    }

    if (stream) {
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
