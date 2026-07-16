// =============================================================================
// Script : Indexation complète de la Bible avec embeddings
// Modèle : nomic-embed-text via Ollama (local, gratuit, 768 dim)
// Usage  : npx tsx scripts/index-bible-embeddings.ts [--version BDS] [--limit 100]
// Ce script charge les embeddings pour tous les versets Bible dans Supabase
// Il peut être relancé sans risque (skip les versets déjà indexés)
//
// Prérequis : ollama serve + ollama pull nomic-embed-text
// =============================================================================

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const OLLAMA_URL    = process.env.OLLAMA_BASE_URL?.replace('/v1', '') ?? 'http://localhost:11434'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Variables manquantes : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase    = createClient(SUPABASE_URL, SUPABASE_KEY)
const EMBED_MODEL = 'nomic-embed-text'
const BATCH_SIZE  = 20   // Ollama local : batches plus petits (pas de rate limit réseau)

// Lire les arguments CLI
const args       = process.argv.slice(2)
const versionArg = args[args.indexOf('--version') + 1] ?? null
const limitArg   = parseInt(args[args.indexOf('--limit') + 1] ?? '0') || 0

// Appel à l'API embeddings d'Ollama (compatible OpenAI /v1/embeddings)
async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${OLLAMA_URL}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama embeddings error ${res.status}: ${err}`)
  }
  const data = await res.json() as { data: Array<{ embedding: number[] }> }
  return data.data.map(d => d.embedding)
}

async function main() {
  console.log('🔄 Démarrage de l\'indexation Bible (nomic-embed-text / Ollama)...')
  console.log(`   Ollama : ${OLLAMA_URL}`)
  console.log(`   Modèle : ${EMBED_MODEL} (768 dimensions)\n`)

  // Vérifier qu'Ollama répond
  try {
    const ping = await fetch(`${OLLAMA_URL}/api/tags`)
    if (!ping.ok) throw new Error('Ollama non disponible')
    const tags = await ping.json() as { models?: Array<{ name: string }> }
    const hasModel = tags.models?.some(m => m.name.startsWith('nomic-embed-text'))
    if (!hasModel) {
      console.error('❌ nomic-embed-text non trouvé dans Ollama.')
      console.error('   Lance : ollama pull nomic-embed-text')
      process.exit(1)
    }
    console.log('✅ Ollama prêt — nomic-embed-text disponible')
  } catch (e) {
    console.error('❌ Ollama inaccessible :', String(e))
    console.error('   Assure-toi qu\'Ollama est lancé : ollama serve')
    process.exit(1)
  }

  // Récupérer le total de versets sans embedding (pour affichage)
  const countQuery = supabase
    .from('bible_verses')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null)
  if (versionArg) countQuery.eq('version_id', versionArg)
  const { count: totalCount } = await countQuery

  const totalToDo = limitArg || (totalCount ?? 0)
  if (!totalToDo) { console.log('✅ Tous les versets sont déjà indexés.'); return }
  console.log(`📖 ${totalToDo} versets à indexer (pages de 1000, batches de ${BATCH_SIZE})...\n`)

  let processed   = 0
  let errors      = 0
  const PAGE_SIZE = 1000

  // Supabase limite à 1000 lignes/requête → pagination par pages
  pageLoop: while (true) {
    let q = supabase
      .from('bible_verses')
      .select('id, book_name, chapter, verse, text, version_id')
      .is('embedding', null)
      .order('version_id')
      .order('book_name')
      .order('chapter')
      .order('verse')
      .range(0, PAGE_SIZE - 1)

    if (versionArg) q = q.eq('version_id', versionArg)
    if (limitArg)   q = q.limit(Math.min(limitArg - processed, PAGE_SIZE))

    const { data: verses, error } = await q
    if (error) { console.error('\nErreur DB:', error.message); break }
    if (!verses?.length) break

    for (let i = 0; i < verses.length; i += BATCH_SIZE) {
      const batch = verses.slice(i, i + BATCH_SIZE)
      const texts = batch.map(v => `${v.book_name} ${v.chapter}:${v.verse}: ${v.text}`)

      try {
        const embeddings = await embedBatch(texts)

        await Promise.all(batch.map((v, j) =>
          supabase
            .from('bible_verses')
            .update({ embedding: embeddings[j] })
            .eq('id', v.id)
        ))
        processed += batch.length

        const percent = totalToDo ? Math.round((processed / totalToDo) * 100) : '?'
        const book    = batch[0]?.book_name ?? ''
        process.stdout.write(`\r  [${percent}%] ${processed}/${totalToDo} — ${book.padEnd(20)}`)

      } catch (err) {
        errors++
        console.error(`\n⚠️  Erreur batch:`, String(err))
        if (errors > 5) { console.error('Trop d\'erreurs, arrêt.'); break pageLoop }
        await new Promise(r => setTimeout(r, 3000))
      }
    }

    if (limitArg && processed >= limitArg) break
  }

  console.log(`\n\n✅ Indexation terminée : ${processed} versets traités, ${errors} erreurs.`)

  try { await supabase.rpc('arc_update_bible_index_stats') } catch { /* Optionnel */ }
  console.log('📊 Statistiques mises à jour.')
}

main().catch(console.error)
