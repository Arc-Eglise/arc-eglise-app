// ARC Église → Lunziko Platform API
// Architecture: Web/Mobile ne communiquent JAMAIS avec LunzikoEngine directement.
// Toutes les requêtes IA passent par Lunziko Platform API (serveur intermédiaire).

const API_URL   = process.env.LUNZIKO_API_URL   ?? 'http://localhost:3001/v1'
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
