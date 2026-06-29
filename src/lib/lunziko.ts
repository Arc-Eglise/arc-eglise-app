// ARC Église → Lunziko Platform API
// Architecture: Web/Mobile ne communiquent JAMAIS avec LunzikoEngine directement.
// Toutes les requêtes IA passent par Lunziko Platform API (serveur intermédiaire).

const API_URL   = process.env.LUNZIKO_API_URL   ?? 'https://lunziko-api.vercel.app/v1'
const SUP_URL   = process.env.LUNZIKO_SUPABASE_URL  ?? 'https://xtvfkyfjsnrzmtgnzicc.supabase.co'
const SUP_KEY   = process.env.LUNZIKO_SUPABASE_ANON_KEY
const LZ_EMAIL  = process.env.LUNZIKO_EMAIL
const LZ_PASS   = process.env.LUNZIKO_PASSWORD

// Module-level token cache (server-side, per cold-start)
let _cached: { token: string; exp: number } | null = null

async function getToken(): Promise<string> {
  if (_cached && Date.now() < _cached.exp) return _cached.token

  if (!SUP_KEY || !LZ_EMAIL || !LZ_PASS) {
    throw new Error('Lunziko: LUNZIKO_SUPABASE_ANON_KEY / LUNZIKO_EMAIL / LUNZIKO_PASSWORD non définis')
  }

  const res = await fetch(`${SUP_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUP_KEY },
    body: JSON.stringify({ email: LZ_EMAIL, password: LZ_PASS }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Lunziko auth failed ${res.status}: ${text}`)
  }

  const data = await res.json()
  const expiresIn: number = data.expires_in ?? 3600
  _cached = { token: data.access_token, exp: Date.now() + (expiresIn - 120) * 1000 }
  return _cached.token
}

export async function lunzikoFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken()
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined ?? {}),
    },
  })
}

// ── Agent (ReAct loop + tool calling) ──────────────────────────────────────
// Falls back to /chat on 403 (account without organization) or error.
export async function lunzikoAgent(
  task: string,
  options: {
    agent_type?: 'auto' | 'document' | 'research' | 'data' | 'crm' | 'creative'
    provider?: string
    system?: string
    language?: string
  } = {}
): Promise<{ content: string; provider?: string; tool_call_count?: number; via?: string }> {
  try {
    const res = await lunzikoFetch('/agent/run', {
      method: 'POST',
      body: JSON.stringify({
        task,
        agent_type: options.agent_type ?? 'auto',
        provider: options.provider ?? 'auto',
        context: {},
      }),
    })

    if (res.status === 403 || res.status === 429) throw new Error(`agent/${res.status}`)
    if (!res.ok) throw new Error(`agent/${res.status}`)

    const data = await res.json()
    if (data.status === 'failed') throw new Error(data.error ?? 'agent failed')

    const content = typeof data.result?.response === 'string'
      ? data.result.response
      : JSON.stringify(data.result)

    return { content, provider: data.result?.provider, tool_call_count: data.tool_call_count ?? 0, via: 'agent' }
  } catch {
    // Fallback: plain /chat with system prompt injected
    const res = await lunzikoFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: task,
        history: [],
        context: { language: options.language ?? 'fr', system: options.system },
        provider: options.provider ?? 'auto',
        stream: false,
      }),
    })
    if (!res.ok) throw new Error(`lunziko chat fallback ${res.status}`)
    const data = await res.json()
    return { content: data.content ?? data.message ?? '', via: 'chat' }
  }
}

// ── Workflow (summarize / analyse / report) ────────────────────────────────
// Falls back to /summarize on 403 or error.
export async function lunzikoWorkflow(
  type: 'ocrToSummary' | 'documentAnalysis' | 'reportGeneration' | 'emailDraft',
  input: Record<string, unknown>,
  provider = 'auto'
): Promise<Record<string, unknown>> {
  try {
    const res = await lunzikoFetch('/workflow/run', {
      method: 'POST',
      body: JSON.stringify({ type, input, provider }),
    })

    if (res.status === 403 || res.status === 429) throw new Error(`workflow/${res.status}`)
    if (!res.ok) throw new Error(`workflow/${res.status}`)

    const data = await res.json()
    if (data.status === 'failed') throw new Error(data.error ?? 'workflow failed')
    return data.output ?? {}
  } catch {
    // Fallback: /summarize for ocrToSummary, /chat for others
    if (type === 'ocrToSummary' && typeof input.text === 'string') {
      const res = await lunzikoFetch('/summarize', {
        method: 'POST',
        body: JSON.stringify({ text: input.text.slice(0, 50000), length: 'medium', format: 'bullets', language: 'fr', provider }),
      })
      if (!res.ok) throw new Error(`lunziko summarize fallback ${res.status}`)
      const data = await res.json()
      return { summary: data.summary ?? '', word_count: data.word_count ?? 0 }
    }
    throw new Error(`Workflow type "${type}" unavailable and no fallback configured`)
  }
}
