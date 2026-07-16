// =============================================================================
// Script : Indexation complète de la Bible avec embeddings
// Usage  : npx tsx scripts/index-bible-embeddings.ts [--version LSG] [--limit 100]
// Ce script charge les embeddings pour tous les versets Bible dans Supabase
// Il peut être relancé sans risque (skip les versets déjà indexés)
// =============================================================================

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const OPENAI_KEY    = process.env.OPENAI_API_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_KEY) {
  console.error('Variables manquantes : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const openai   = new OpenAI({ apiKey: OPENAI_KEY })

const BATCH_SIZE  = 100   // Versets par batch (limite OpenAI)
const EMBED_MODEL = 'text-embedding-3-small'

// Lire les arguments CLI
const args = process.argv.slice(2)
const versionArg = args[args.indexOf('--version') + 1] ?? null
const limitArg   = parseInt(args[args.indexOf('--limit') + 1] ?? '0') || 0

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({ model: EMBED_MODEL, input: texts })
  return response.data.map(e => e.embedding)
}

async function main() {
  console.log('🔄 Démarrage de l\'indexation Bible...')

  // Récupérer les versets sans embedding
  let query = supabase
    .from('bible_verses')
    .select('id, book_name, chapter, verse, text, version_id')
    .is('embedding', null)
    .order('version_id')
    .order('book_name')
    .order('chapter')
    .order('verse')

  if (versionArg) query = query.eq('version_id', versionArg)
  if (limitArg)   query = query.limit(limitArg)
  else            query = query.limit(50000)

  const { data: verses, error } = await query

  if (error) { console.error('Erreur DB:', error.message); process.exit(1) }
  if (!verses?.length) { console.log('✅ Tous les versets sont déjà indexés.'); return }

  console.log(`📖 ${verses.length} versets à indexer...`)

  let processed = 0
  let errors = 0

  // Traitement par batches
  for (let i = 0; i < verses.length; i += BATCH_SIZE) {
    const batch = verses.slice(i, i + BATCH_SIZE)

    // Créer les textes enrichis (contexte + verset pour un meilleur embedding)
    const texts = batch.map(v => `${v.book_name} ${v.chapter}:${v.verse} (${v.version_id}): ${v.text}`)

    try {
      const embeddings = await embedBatch(texts)

      // Mettre à jour en parallèle (groupes de 10)
      const updatePromises = batch.map((v, j) =>
        supabase
          .from('bible_verses')
          .update({ embedding: embeddings[j] })
          .eq('id', v.id)
      )

      await Promise.all(updatePromises)
      processed += batch.length

      const percent = Math.round((processed / verses.length) * 100)
      const version = batch[0]?.version_id ?? ''
      const book    = batch[0]?.book_name ?? ''
      process.stdout.write(`\r  [${percent}%] ${processed}/${verses.length} | Version: ${version} | Livre: ${book}    `)

      // Pause courte pour respecter la rate limit OpenAI
      if (i + BATCH_SIZE < verses.length) await new Promise(r => setTimeout(r, 200))

    } catch (err) {
      errors++
      console.error(`\n⚠️  Erreur batch ${i}-${i + BATCH_SIZE}:`, err)
      if (errors > 5) { console.error('Trop d\'erreurs, arrêt.'); break }
      await new Promise(r => setTimeout(r, 2000))
    }
  }

  console.log(`\n\n✅ Indexation terminée : ${processed} versets traités, ${errors} erreurs.`)

  // Mettre à jour les stats
  try { await supabase.rpc('arc_update_bible_index_stats') } catch { /* Optionnel */ }
  console.log('📊 Statistiques mises à jour.')
}

main().catch(console.error)
