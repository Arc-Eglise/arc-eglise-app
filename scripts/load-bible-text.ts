// =============================================================================
// Script : Chargement du texte biblique complet dans bible_verses
// Source : bolls.life (gratuit, sans clé API)
// Usage  : npx tsx scripts/load-bible-text.ts [--translation LSG] [--from 1] [--to 66]
//
// Charge la Bible entière (31 102 versets) — relançable sans risque (upsert)
// Après ce script, lancer : npx tsx scripts/index-bible-embeddings.ts --version LSG
// =============================================================================

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Variables manquantes : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Lire les arguments CLI
const args = process.argv.slice(2)
const translationArg = (args[args.indexOf('--translation') + 1] ?? 'LSG') as 'LSG' | 'KJV'
const fromBook = parseInt(args[args.indexOf('--from') + 1] ?? '1') || 1
const toBook   = parseInt(args[args.indexOf('--to') + 1]   ?? '66') || 66

// Nombre de chapitres par livre (AT 1-39, NT 40-66)
const CHAPTERS_PER_BOOK = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24,  // 1-10  : Gn–Rt
  22, 25, 29, 36, 10, 13, 10, 42, 150, 31, // 11-20 : 1S–Pr
  12, 8, 66, 52, 5, 48, 12, 14, 3, 9,      // 21-30 : Ec–Am
  1, 4, 7, 3, 3, 3, 2, 14, 4,              // 31-39 : Ab–Ml
  28, 16, 24, 21, 28, 16, 16, 13, 6, 6,    // 40-49 : Mt–Ep
  4, 4, 5, 3, 6, 4, 3, 1, 13, 5,           // 50-59 : Ph–Jc
  5, 3, 5, 1, 1, 1, 22,                     // 60-66 : 1P–Ap
]

// Noms français des livres (correspondant au mapping BOOK_NUMBERS dans bible-api.ts)
const BOOK_NAMES_FR = [
  'Genèse', 'Exode', 'Lévitique', 'Nombres', 'Deutéronome',
  'Josué', 'Juges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Rois', '2 Rois', '1 Chroniques', '2 Chroniques', 'Esdras',
  'Néhémie', 'Esther', 'Job', 'Psaumes', 'Proverbes',
  'Ecclésiaste', 'Cantique', 'Ésaïe', 'Jérémie', 'Lamentations',
  'Ézéchiel', 'Daniel', 'Osée', 'Joël', 'Amos',
  'Abdias', 'Jonas', 'Michée', 'Nahoum', 'Habacuc',
  'Sophonie', 'Aggée', 'Zacharie', 'Malachie',
  'Matthieu', 'Marc', 'Luc', 'Jean', 'Actes',
  'Romains', '1 Corinthiens', '2 Corinthiens', 'Galates', 'Éphésiens',
  'Philippiens', 'Colossiens', '1 Thessaloniciens', '2 Thessaloniciens', '1 Timothée',
  '2 Timothée', 'Tite', 'Philémon', 'Hébreux', 'Jacques',
  '1 Pierre', '2 Pierre', '1 Jean', '2 Jean', '3 Jean',
  'Jude', 'Apocalypse',
]

interface BollsVerse {
  pk: number
  verse: number
  text: string
}

async function fetchChapter(translation: string, bookNum: number, chapterNum: number): Promise<BollsVerse[]> {
  const url = `https://bolls.life/get-text/${translation}/${bookNum}/${chapterNum}/`
  const res = await fetch(url)
  if (!res.ok) return []
  return res.json() as Promise<BollsVerse[]>
}

async function upsertVerses(rows: object[]): Promise<number> {
  const { error } = await supabase
    .from('bible_verses')
    .upsert(rows, { onConflict: 'version_id,book_name,chapter,verse' })
  if (error) {
    console.error('\n⚠️  Erreur upsert:', error.message)
    return 0
  }
  return rows.length
}

async function main() {
  const translation = translationArg
  console.log(`\n📖 Chargement Bible ${translation} — livres ${fromBook} à ${toBook}`)
  console.log('   Source : bolls.life (gratuit, sans clé)')
  console.log('   Opération : UPSERT (sécurisé — relançable)\n')

  let totalVerses = 0
  let totalErrors = 0

  for (let bookNum = fromBook; bookNum <= toBook; bookNum++) {
    const bookName = BOOK_NAMES_FR[bookNum - 1] ?? `Livre ${bookNum}`
    const chapCount = CHAPTERS_PER_BOOK[bookNum - 1] ?? 0
    let bookVerses = 0

    process.stdout.write(`  [${bookNum}/66] ${bookName.padEnd(20)} `)

    for (let chap = 1; chap <= chapCount; chap++) {
      try {
        const verses = await fetchChapter(translation, bookNum, chap)
        if (!verses.length) continue

        const rows = verses.map(v => ({
          version_id: translation,
          book_name: bookName,
          chapter: chap,
          verse: v.verse,
          text: v.text.trim(),
        }))

        await upsertVerses(rows)
        bookVerses += rows.length

        // Délai léger pour respecter bolls.life (100ms entre chapitres)
        await new Promise(r => setTimeout(r, 100))

      } catch (err) {
        totalErrors++
        if (totalErrors > 10) {
          console.error('\n❌ Trop d\'erreurs réseau, arrêt.')
          process.exit(1)
        }
        await new Promise(r => setTimeout(r, 2000))
      }
    }

    totalVerses += bookVerses
    process.stdout.write(`${bookVerses} versets ✓\n`)
  }

  console.log(`\n✅ Import terminé : ${totalVerses} versets, ${totalErrors} erreurs`)
  console.log('\n📌 Prochaine étape — générer les embeddings :')
  console.log(`   npx tsx scripts/index-bible-embeddings.ts --version ${translation}`)
}

main().catch(console.error)
