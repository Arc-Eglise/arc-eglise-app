// Test rapide de la recherche sémantique Bible
// Usage: npx tsx scripts/test-bible-search.ts "amour de Dieu"

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const supabase   = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const OLLAMA_URL = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1').replace('/v1', '')

const query = process.argv.slice(2).join(' ') || 'amour de Dieu'

async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', input: text }),
  })
  const data = await res.json() as { data: Array<{ embedding: number[] }> }
  return data.data[0].embedding
}

async function main() {
  console.log(`\n🔍 Recherche : "${query}"\n`)

  const embedding = await embedQuery(query)
  console.log(`   Embedding : ${embedding.length} dim\n`)

  // Appel direct à PostgREST avec timeout étendu (bypass supabase-js qui n'expose pas ce header)
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/arc_search_bible`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      'Prefer': 'return=representation,statement-timeout=60000',
    },
    body: JSON.stringify({
      query_embedding: embedding,
      version_filter:  'BDS',
      book_filter:     null,
      match_threshold: 0.60,
      match_count:     8,
    }),
  })

  if (!res.ok) { console.error('Erreur RPC:', res.status, await res.text()); return }
  const data = await res.json() as Array<Record<string, unknown>>
  if (!data?.length) { console.log('Aucun résultat (essaie un seuil plus bas)'); return }

  console.log(`📖 ${data.length} versets trouvés :\n`)
  for (const v of data) {
    console.log(`  [${((v.similarity as number) * 100).toFixed(1)}%] ${v.book_name} ${v.chapter}:${v.verse}`)
    console.log(`         "${v.text}"\n`)
  }
}

main().catch(console.error)
