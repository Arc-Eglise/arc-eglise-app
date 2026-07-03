// Gestion des clés IA personnelles des membres
// GET  → retourne les clés masquées de l'utilisateur
// POST → sauvegarde / met à jour une clé
// DELETE → supprime une clé

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptKey, decryptKey, maskKey } from '@/lib/member-ai'

type Provider = 'claude' | 'openai' | 'gemini'

const COLUMN: Record<Provider, string> = {
  claude: 'ai_claude_key',
  openai: 'ai_openai_key',
  gemini: 'ai_gemini_key',
}

async function getUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET — retourne les clés masquées + provider actif
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('ai_claude_key, ai_openai_key, ai_gemini_key, ai_provider_pref')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ keys: {}, provider_pref: 'auto' })

  return NextResponse.json({
    keys: {
      claude: profile.ai_claude_key ? maskKey(decryptKey(profile.ai_claude_key)) : null,
      openai: profile.ai_openai_key ? maskKey(decryptKey(profile.ai_openai_key)) : null,
      gemini: profile.ai_gemini_key ? maskKey(decryptKey(profile.ai_gemini_key)) : null,
    },
    provider_pref: profile.ai_provider_pref ?? 'auto',
    has_any: !!(profile.ai_claude_key || profile.ai_openai_key || profile.ai_gemini_key),
  })
}

// POST — sauvegarde une clé (chiffrée)
export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { provider, api_key, provider_pref } = await req.json() as {
    provider?: Provider
    api_key?: string
    provider_pref?: string
  }

  const admin = createAdminClient()

  // Mettre à jour provider_pref uniquement
  if (provider_pref !== undefined && !provider) {
    await admin.from('profiles').update({ ai_provider_pref: provider_pref }).eq('id', user.id)
    return NextResponse.json({ ok: true })
  }

  if (!provider || !COLUMN[provider]) {
    return NextResponse.json({ error: 'Provider invalide (claude | openai | gemini)' }, { status: 400 })
  }
  if (!api_key?.trim()) {
    return NextResponse.json({ error: 'Clé API requise' }, { status: 400 })
  }

  const encrypted = encryptKey(api_key.trim())
  await admin
    .from('profiles')
    .update({ [COLUMN[provider]]: encrypted })
    .eq('id', user.id)

  return NextResponse.json({ ok: true, masked: maskKey(api_key.trim()) })
}

// DELETE — supprime une clé
export async function DELETE(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { provider } = await req.json() as { provider: Provider }
  if (!provider || !COLUMN[provider]) {
    return NextResponse.json({ error: 'Provider invalide' }, { status: 400 })
  }

  const admin = createAdminClient()
  await admin
    .from('profiles')
    .update({ [COLUMN[provider]]: null })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
