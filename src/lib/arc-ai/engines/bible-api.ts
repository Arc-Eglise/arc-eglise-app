// ARC AI — Bible API Client
// Intégration des APIs Bible externes pour des résultats rapides
// Priorité : API.Bible → Bolls.life (gratuit, sans clé) → DB locale

export interface ExternalVerse {
  reference: string
  text: string
  book: string
  chapter: number
  verse: number
  versionId: string
  versionName: string
}

// ── API.Bible (nécessite API_BIBLE_KEY) ─────────────────────────────────────

// Bible IDs utiles pour ARC Église (Français + Anglais)
const BIBLE_IDS = {
  'LSG':  '61fd76eafa1ef5f7-01',  // Louis Segond 1910 (en DB locale aussi)
  'BDS':  'e0e47be0a6d776e6-01',  // Bible du Semeur (français)
  'KJV':  'de4e12af7f28f599-02',  // King James Version
  'NIV':  '78a9f6124f344018-01',  // NIV
  'NFC':  'bf8f1c7f7f39b9d2-01',  // Nouvelle Français Courant
}

const API_BIBLE_KEY = process.env.BIBLE_API_KEY
const API_BIBLE_URL = process.env.BIBLE_API_BASE ?? 'https://api.scripture.api.bible/v1'
const DEFAULT_BIBLE_ID = process.env.BIBLE_DEFAULT_ID ?? BIBLE_IDS.LSG

export async function fetchVerseFromApiBible(
  reference: string,
  bibleId = DEFAULT_BIBLE_ID,
): Promise<ExternalVerse | null> {
  if (!API_BIBLE_KEY) return null

  try {
    const res = await fetch(`${API_BIBLE_URL}/bibles/${bibleId}/search?query=${encodeURIComponent(reference)}&limit=1`, {
      headers: { 'api-key': API_BIBLE_KEY },
      next: { revalidate: 86400 },  // Cache 24h (Next.js ISR)
    })
    if (!res.ok) return null
    const data = await res.json() as { data?: { passages?: Array<{ reference: string; content: string }> } }
    const passage = data.data?.passages?.[0]
    if (!passage) return null

    // Nettoyer le HTML de l'API.Bible
    const cleanText = passage.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return {
      reference: passage.reference,
      text: cleanText,
      book: reference.split(' ')[0] ?? '',
      chapter: 1,
      verse: 1,
      versionId: bibleId,
      versionName: Object.entries(BIBLE_IDS).find(([, id]) => id === bibleId)?.[0] ?? bibleId,
    }
  } catch {
    return null
  }
}

// ── Bolls.life (gratuit, sans clé API) ─────────────────────────────────────

const BOLLS_URL = 'https://bolls.life/get-verse'

export async function fetchVerseFromBolls(
  translation: 'LSG' | 'LSG21' | 'KJV' | 'NIV' = 'LSG',
  book: number,  // 1=Genèse, 40=Matthieu, 43=Jean, etc.
  chapter: number,
  verse: number,
): Promise<ExternalVerse | null> {
  try {
    const url = `${BOLLS_URL}/${translation}/${book}/${chapter}/${verse}/`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json() as { text?: string; pk?: number; verse?: number; chapter?: number; book?: number; translation?: string }

    return {
      reference: `${bookNumberToName(data.book ?? book)} ${chapter}:${verse}`,
      text: data.text ?? '',
      book: bookNumberToName(data.book ?? book),
      chapter,
      verse,
      versionId: translation,
      versionName: translation,
    }
  } catch {
    return null
  }
}

// Recherche rapide dans les deux APIs avec fallback
export async function quickBibleSearch(
  reference: string,
  versionId?: string,
): Promise<ExternalVerse | null> {
  // Essayer API.Bible en premier si disponible
  if (API_BIBLE_KEY) {
    const result = await fetchVerseFromApiBible(reference, versionId)
    if (result) return result
  }

  // Fallback Bolls.life (sans clé)
  const parsed = parseReference(reference)
  if (parsed) {
    return fetchVerseFromBolls('LSG', parsed.bookNum, parsed.chapter, parsed.verse)
  }

  return null
}

// ── Utilitaires ──────────────────────────────────────────────────────────────

function parseReference(ref: string): { bookNum: number; chapter: number; verse: number } | null {
  // Format "Jean 3:16" ou "Genèse 1:1"
  const match = ref.match(/^(.+?)\s+(\d+):(\d+)/)
  if (!match) return null
  const bookNum = BOOK_NUMBERS[match[1]?.toLowerCase() ?? ''] ?? 0
  if (!bookNum) return null
  return { bookNum, chapter: parseInt(match[2] ?? '1'), verse: parseInt(match[3] ?? '1') }
}

function bookNumberToName(num: number): string {
  return Object.entries(BOOK_NUMBERS).find(([, n]) => n === num)?.[0] ?? String(num)
}

// Mapping livre → numéro Bolls.life (AT 1-39, NT 40-66)
const BOOK_NUMBERS: Record<string, number> = {
  'genèse': 1, 'exode': 2, 'lévitique': 3, 'nombres': 4, 'deutéronome': 5,
  'josué': 6, 'juges': 7, 'ruth': 8, '1 samuel': 9, '2 samuel': 10,
  '1 rois': 11, '2 rois': 12, '1 chroniques': 13, '2 chroniques': 14,
  'esdras': 15, 'néhémie': 16, 'esther': 17, 'job': 18, 'psaumes': 19,
  'proverbes': 20, 'ecclésiaste': 21, 'cantique': 22, 'ésaïe': 23,
  'jérémie': 24, 'lamentations': 25, 'ézéchiel': 26, 'daniel': 27,
  'osée': 28, 'joël': 29, 'amos': 30, 'abdias': 31, 'jonas': 32,
  'michée': 33, 'nahoum': 34, 'habacuc': 35, 'sophonie': 36, 'aggée': 37,
  'zacharie': 38, 'malachie': 39,
  'matthieu': 40, 'marc': 41, 'luc': 42, 'jean': 43, 'actes': 44,
  'romains': 45, '1 corinthiens': 46, '2 corinthiens': 47, 'galates': 48,
  'éphésiens': 49, 'philippiens': 50, 'colossiens': 51,
  '1 thessaloniciens': 52, '2 thessaloniciens': 53,
  '1 timothée': 54, '2 timothée': 55, 'tite': 56, 'philémon': 57,
  'hébreux': 58, 'jacques': 59, '1 pierre': 60, '2 pierre': 61,
  '1 jean': 62, '2 jean': 63, '3 jean': 64, 'jude': 65, 'apocalypse': 66,
}
