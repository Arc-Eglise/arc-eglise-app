// ARC AI — Bible Engine
// Gère les versets, cross-références, chronologie, comparaison de versions
// RAG sémantique avec cache + API.Bible externe comme fallback

import { createClient } from '@/lib/supabase/server'
import { quickBibleSearch } from './bible-api'
import type { ExternalVerse } from './bible-api'
import { embedQuery } from './knowledge-engine'
import crypto from 'crypto'

export interface BibleVerse {
  id: string
  book: string
  chapter: number
  verse: number
  text: string
  version: string
}

export interface BibleSearchResult {
  verse_id: string
  book_name: string
  chapter: number
  verse: number
  text: string
  version_id: string
  similarity?: number
}

// Cache mémoire pour les recherches fréquentes
const _verseCache = new Map<string, { results: BibleSearchResult[]; ts: number }>()
const VERSE_CACHE_TTL = 15 * 60 * 1000  // 15 minutes

// Recherche de versets — sémantique (si embeddings disponibles) + full-text + API externe
export async function searchVerses(
  query: string,
  options: { versionId?: string; limit?: number; book?: string; semantic?: boolean } = {},
): Promise<BibleSearchResult[]> {
  const limit = options.limit ?? 8
  const cacheKey = `${query}::${options.versionId ?? ''}::${options.book ?? ''}::${limit}`

  // Vérifier le cache mémoire
  const cached = _verseCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < VERSE_CACHE_TTL) return cached.results

  const supabase = createClient()

  // 1. Essayer la recherche sémantique (si pgvector disponible)
  if (options.semantic !== false) {
    try {
      const embedding = await embedQuery(query)
      const { data } = await supabase.rpc('arc_search_bible', {
        query_embedding: embedding,
        version_filter: options.versionId ?? null,
        book_filter: options.book ?? null,
        match_threshold: 0.65,
        match_count: limit,
      })
      if (data?.length) {
        const results = (data as Array<Record<string, unknown>>).map(r => ({
          verse_id: r.id as string,
          book_name: r.book_name as string,
          chapter: r.chapter as number,
          verse: r.verse as number,
          text: r.text as string,
          version_id: r.version_id as string,
          similarity: r.similarity as number,
        }))
        _verseCache.set(cacheKey, { results, ts: Date.now() })
        return results
      }
    } catch { /* Fallback full-text */ }
  }

  // 2. Full-text search Supabase
  let q = supabase
    .from('bible_verses')
    .select('id, book_name, chapter, verse, text, version_id')
    .textSearch('text', query, { type: 'websearch', config: 'french' })
    .limit(limit)

  if (options.versionId) q = q.eq('version_id', options.versionId)
  if (options.book) q = q.eq('book_name', options.book)

  const { data, error } = await q

  if (!error && data?.length) {
    const results = data.map(r => ({ verse_id: r.id, book_name: r.book_name, chapter: r.chapter, verse: r.verse, text: r.text, version_id: r.version_id }))
    _verseCache.set(cacheKey, { results, ts: Date.now() })
    return results
  }

  // 3. Fallback : API Bible externe (Bolls.life gratuit ou API.Bible)
  const external = await quickBibleSearch(query, options.versionId).catch(() => null)
  if (external) {
    const results = [externalToResult(external)]
    _verseCache.set(cacheKey, { results, ts: Date.now() })
    return results
  }

  return []
}

function externalToResult(v: ExternalVerse): BibleSearchResult {
  return {
    verse_id: crypto.randomUUID(),
    book_name: v.book,
    chapter: v.chapter,
    verse: v.verse,
    text: v.text,
    version_id: v.versionId,
    similarity: 0.9,
  }
}

// Récupérer un passage (livre chapitre:verset)
export async function getPassage(
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd?: number,
  versionId?: string,
): Promise<BibleSearchResult[]> {
  const supabase = createClient()

  let q = supabase
    .from('bible_verses')
    .select('id, book_name, chapter, verse, text, version_id')
    .eq('book_name', book)
    .eq('chapter', chapter)
    .gte('verse', verseStart)
    .order('verse')

  if (verseEnd) q = q.lte('verse', verseEnd)
  if (versionId) q = q.eq('version_id', versionId)

  const { data, error } = await q
  if (error) throw new Error(`BibleEngine.getPassage: ${error.message}`)
  return (data ?? []).map(r => ({ verse_id: r.id, book_name: r.book_name, chapter: r.chapter, verse: r.verse, text: r.text, version_id: r.version_id }))
}

// Comparer un passage dans plusieurs versions
export async function compareVersions(
  book: string,
  chapter: number,
  verse: number,
  versionIds: string[],
): Promise<BibleSearchResult[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('bible_verses')
    .select('id, book_name, chapter, verse, text, version_id')
    .eq('book_name', book)
    .eq('chapter', chapter)
    .eq('verse', verse)
    .in('version_id', versionIds)

  if (error) throw new Error(`BibleEngine.compareVersions: ${error.message}`)
  return (data ?? []).map(r => ({ verse_id: r.id, book_name: r.book_name, chapter: r.chapter, verse: r.verse, text: r.text, version_id: r.version_id }))
}

// Formater les résultats pour injection dans un prompt
export function formatVersesForPrompt(verses: BibleSearchResult[]): string {
  if (!verses.length) return 'Aucun verset trouvé.'
  return verses.map(v => `${v.book_name} ${v.chapter}:${v.verse} — "${v.text}" (${v.version_id})`).join('\n')
}

// Thèmes bibliques prédéfinis pour la recherche sémantique
export const BIBLE_THEMES = {
  miracles: ['miracle', 'prodige', 'signe', 'guérison', 'résurrection', 'multiplication'],
  paraboles: ['parabole', 'semeur', 'fils prodigue', 'bon samaritain', 'vignerons', 'talents'],
  promesses: ['promesse', 'alliance', 'covenant', 'éternel', 'héritage', 'bénédiction'],
  prophéties: ['prophétie', 'prophète', 'accompli', 'annoncé', 'prédit', 'messie'],
  prières: ['prière', 'supplique', 'intercession', 'notre père', 'psaume'],
  commandements: ['commandement', 'loi', 'décalogue', 'obéissance', 'statut'],
} as const
