// ARC AI — Search Engine
// Recherche sémantique unifiée : miracles, paraboles, promesses, doctrines, sermons

import { searchVerses, BIBLE_THEMES, formatVersesForPrompt } from './bible-engine'
import { searchKnowledge, formatChunksForPrompt } from './knowledge-engine'

export type SearchDomain = 'bible' | 'sermons' | 'knowledge' | 'all'

export interface SearchResult {
  domain: SearchDomain
  type: string
  title: string
  excerpt: string
  reference?: string
  similarity?: number
}

// Recherche unifiée sur toutes les sources
export async function arcSearch(
  query: string,
  options: {
    domains?: SearchDomain[]
    limit?: number
    versionId?: string
  } = {},
): Promise<SearchResult[]> {
  const domains = options.domains ?? ['all']
  const limit = options.limit ?? 8
  const results: SearchResult[] = []

  const searchAll = domains.includes('all')

  // Recherche biblique
  if (searchAll || domains.includes('bible')) {
    const verses = await searchVerses(query, { limit: Math.ceil(limit / 2), versionId: options.versionId }).catch(() => [])
    results.push(...verses.map(v => ({
      domain: 'bible' as SearchDomain,
      type: 'verset',
      title: `${v.book_name} ${v.chapter}:${v.verse}`,
      excerpt: v.text,
      reference: `${v.book_name} ${v.chapter}:${v.verse}`,
      similarity: v.similarity,
    })))
  }

  // Recherche dans la base de connaissances
  if (searchAll || domains.includes('knowledge')) {
    const chunks = await searchKnowledge(query, { limit: Math.ceil(limit / 2) }).catch(() => [])
    results.push(...chunks.map(c => ({
      domain: 'knowledge' as SearchDomain,
      type: c.sourceType,
      title: c.source,
      excerpt: c.content.slice(0, 300),
      similarity: c.similarity,
    })))
  }

  // Tri par similarité décroissante
  return results
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, limit)
}

// Recherche thématique prédéfinie (miracles, paraboles, etc.)
export async function thematicSearch(
  theme: keyof typeof BIBLE_THEMES,
  versionId?: string,
): Promise<SearchResult[]> {
  const keywords = BIBLE_THEMES[theme]
  const query = keywords.join(' ')
  const verses = await searchVerses(query, { limit: 10, versionId }).catch(() => [])

  return verses.map(v => ({
    domain: 'bible' as SearchDomain,
    type: `thème:${theme}`,
    title: `${v.book_name} ${v.chapter}:${v.verse}`,
    excerpt: v.text,
    reference: `${v.book_name} ${v.chapter}:${v.verse}`,
    similarity: v.similarity,
  }))
}

// Formatter les résultats pour un prompt
export function formatSearchResultsForPrompt(results: SearchResult[]): string {
  if (!results.length) return 'Aucun résultat trouvé.'
  return results.map((r, i) => `[${i + 1}] ${r.title} (${r.type})\n${r.excerpt}`).join('\n\n---\n\n')
}
