// ARC AI — Knowledge Engine
// RAG (Retrieval-Augmented Generation) sur les documents de l'église
// Sources : Bible, commentaires, constitution, docs internes, sermons

import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

export interface KnowledgeChunk {
  id: string
  content: string
  source: string
  sourceType: 'bible' | 'sermon' | 'document' | 'constitution' | 'commentary' | 'other'
  similarity: number
}

// Embedding : Ollama local (nomic-embed-text, 768-dim) → fallback OpenAI 768-dim
const EMBED_DIM   = 768
const OLLAMA_BASE = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1').replace('/v1', '')
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small'

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

// Générer un embedding 768-dim via Ollama, avec fallback OpenAI (dimensions: 768)
export async function embedQuery(text: string): Promise<number[]> {
  // 1. Ollama nomic-embed-text (local, gratuit, 768-dim)
  try {
    const res = await fetch(`${OLLAMA_BASE}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nomic-embed-text', input: text }),
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = await res.json() as { data: Array<{ embedding: number[] }> }
      const emb = data.data[0]?.embedding
      if (emb?.length === EMBED_DIM) return emb
    }
  } catch { /* fallback */ }

  // 2. OpenAI avec dimensions: 768 (compatible pgvector 768-dim)
  const response = await getOpenAI().embeddings.create({ model: EMBED_MODEL, input: text, dimensions: EMBED_DIM })
  return response.data[0]?.embedding ?? []
}

// Recherche sémantique dans la base de connaissances
export async function searchKnowledge(
  query: string,
  options: {
    limit?: number
    threshold?: number
    sourceType?: KnowledgeChunk['sourceType']
    churchId?: string
  } = {},
): Promise<KnowledgeChunk[]> {
  const supabase = createAdminClient()
  const limit = options.limit ?? 6
  const threshold = options.threshold ?? 0.72

  let embedding: number[]
  try {
    embedding = await embedQuery(query)
  } catch {
    // Si OpenAI indisponible, fallback sur full-text search
    return searchKnowledgeFulltext(query, options)
  }

  const { data, error } = await supabase.rpc('arc_match_knowledge', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
    filter_source_type: options.sourceType ?? null,
    filter_church_id: options.churchId ?? null,
  })

  if (error) {
    // Fallback full-text si la fonction RPC n'existe pas encore
    return searchKnowledgeFulltext(query, options)
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    content: r.content as string,
    source: r.source as string,
    sourceType: (r.source_type as KnowledgeChunk['sourceType']) ?? 'other',
    similarity: r.similarity as number,
  }))
}

// Fallback full-text search Supabase
async function searchKnowledgeFulltext(
  query: string,
  options: { limit?: number; sourceType?: string; churchId?: string } = {},
): Promise<KnowledgeChunk[]> {
  const supabase = createAdminClient()
  const limit = options.limit ?? 6

  let q = supabase
    .from('arc_knowledge_chunks')
    .select('id, content, source, source_type')
    .textSearch('content', query, { type: 'websearch' })
    .limit(limit)

  if (options.sourceType) q = q.eq('source_type', options.sourceType)
  if (options.churchId) q = q.eq('church_id', options.churchId)

  const { data } = await q
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    content: r.content as string,
    source: r.source as string,
    sourceType: (r.source_type as KnowledgeChunk['sourceType']) ?? 'other',
    similarity: 0.7,
  }))
}

// Indexer un document dans la base de connaissances
export async function indexDocument(doc: {
  content: string
  source: string
  sourceType: KnowledgeChunk['sourceType']
  churchId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const supabase = createAdminClient()
  const embedding = await embedQuery(doc.content)

  await supabase.from('arc_knowledge_chunks').insert({
    content: doc.content,
    source: doc.source,
    source_type: doc.sourceType,
    church_id: doc.churchId,
    embedding,
    metadata: doc.metadata ?? {},
  })
}

// Formatter les chunks pour injection dans un prompt
export function formatChunksForPrompt(chunks: KnowledgeChunk[]): string {
  if (!chunks.length) return ''
  return chunks.map((c, i) => `[Source ${i + 1}: ${c.source}]\n${c.content}`).join('\n\n---\n\n')
}
