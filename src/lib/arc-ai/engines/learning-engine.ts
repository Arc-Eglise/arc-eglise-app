// ARC AI — Learning Engine
// Mémoire évolutive : l'IA apprend de chaque interaction, comme un élève-assistant
// Stocke des apprentissages dans Supabase avec embeddings pour RAG futur

import { createAdminClient } from '@/lib/supabase/admin'
import { embedQuery } from './knowledge-engine'
import { chat } from '../provider-manager'
import type { AIProvider } from '../provider-manager'

export interface Learning {
  id: string
  topic: string
  insight: string
  sourceQuery: string
  confidence: number  // 0-1
  useCount: number
  createdAt: string
  lastUsedAt: string
}

// ── Cache en mémoire (intra-request, évite les re-embeddings inutiles) ────────

const _memCache = new Map<string, { result: string; ts: number }>()
const MEM_CACHE_TTL = 10 * 60 * 1000  // 10 minutes

export function getCachedResponse(key: string): string | null {
  const entry = _memCache.get(key)
  if (!entry || Date.now() - entry.ts > MEM_CACHE_TTL) return null
  return entry.result
}

export function setCachedResponse(key: string, result: string): void {
  _memCache.set(key, { result, ts: Date.now() })
  // Nettoyer les entrées expirées (éviter les fuites mémoire)
  if (_memCache.size > 200) {
    const now = Date.now()
    Array.from(_memCache.keys()).forEach(k => {
      const entry = _memCache.get(k)
      if (entry && now - entry.ts > MEM_CACHE_TTL) _memCache.delete(k)
    })
  }
}

// ── Extraction d'apprentissages depuis une interaction ────────────────────────

export async function extractLearnings(
  userQuery: string,
  aiResponse: string,
  provider: AIProvider = 'auto',
): Promise<Array<{ topic: string; insight: string; confidence: number }>> {
  const system = `Tu es un extracteur d'apprentissages bibliques. Analyse une interaction utilisateur-IA et extrait les faits bibliques/théologiques appris. Réponds en JSON uniquement.`

  const prompt = `Question utilisateur : "${userQuery.slice(0, 300)}"
Réponse IA : "${aiResponse.slice(0, 500)}"

Extrais 1-3 apprentissages factuels (verset, doctrine, fait historique, définition) que l'IA devrait mémoriser pour éviter de répéter la recherche.
Réponds en JSON :
[
  { "topic": "sujet court (max 50 chars)", "insight": "fait mémorisable (max 200 chars)", "confidence": 0.9 },
  ...
]
Si aucun apprentissage mémorisable, réponds : []`

  try {
    const result = await chat([{ role: 'user', content: prompt }], provider, { system, maxTokens: 600, temperature: 0.3 })
    const parsed = JSON.parse(result.content.replace(/```json\n?|```/g, '').trim()) as Array<{ topic: string; insight: string; confidence: number }>
    return Array.isArray(parsed) ? parsed.slice(0, 3) : []
  } catch {
    return []
  }
}

// ── Stocker les apprentissages dans Supabase ──────────────────────────────────

export async function storeLearnings(
  learnings: Array<{ topic: string; insight: string; confidence: number }>,
  sourceQuery: string,
): Promise<void> {
  if (!learnings.length) return
  const supabase = createAdminClient()

  for (const learning of learnings) {
    try {
      const embedding = await embedQuery(`${learning.topic}: ${learning.insight}`).catch(() => null)
      await supabase.from('arc_ai_learnings').upsert({
        topic: learning.topic,
        insight: learning.insight,
        source_query: sourceQuery.slice(0, 500),
        confidence: learning.confidence,
        embedding,
        last_used_at: new Date().toISOString(),
      }, { onConflict: 'topic,insight' })
    } catch {
      // Non-bloquant
    }
  }
}

// ── Récupérer les apprentissages pertinents pour une requête ─────────────────

export async function getRelevantLearnings(query: string, limit = 5): Promise<Learning[]> {
  const supabase = createAdminClient()

  // Essayer la recherche vectorielle d'abord
  try {
    const embedding = await embedQuery(query)
    const { data } = await supabase.rpc('arc_match_learnings', {
      query_embedding: embedding,
      match_threshold: 0.75,
      match_count: limit,
    })
    if (data?.length) {
      // Incrémenter use_count
      const ids = (data as Array<Record<string, unknown>>).map(r => r.id as string)
      try {
        await supabase.from('arc_ai_learnings').update({ last_used_at: new Date().toISOString() }).in('id', ids)
      } catch { /* Non-bloquant */ }
      return (data as Array<Record<string, unknown>>).map(mapLearning)
    }
  } catch { /* Fallback */ }

  // Fallback full-text
  const { data } = await supabase
    .from('arc_ai_learnings')
    .select('*')
    .textSearch('insight', query, { type: 'websearch' })
    .order('use_count', { ascending: false })
    .limit(limit)

  return (data ?? []).map(mapLearning)
}

// ── Formatage pour injection dans le prompt ───────────────────────────────────

export function formatLearningsForPrompt(learnings: Learning[]): string {
  if (!learnings.length) return ''
  return `MÉMOIRE ACQUISE :\n${learnings.map(l => `- [${l.topic}] ${l.insight}`).join('\n')}`
}

// ── Processus complet post-interaction (background) ──────────────────────────

export async function processInteractionLearning(
  userQuery: string,
  aiResponse: string,
  provider: AIProvider = 'auto',
): Promise<void> {
  const learnings = await extractLearnings(userQuery, aiResponse, provider)
  await storeLearnings(learnings, userQuery)
}

function mapLearning(r: Record<string, unknown>): Learning {
  return {
    id: r.id as string,
    topic: r.topic as string,
    insight: r.insight as string,
    sourceQuery: r.source_query as string,
    confidence: r.confidence as number,
    useCount: r.use_count as number,
    createdAt: r.created_at as string,
    lastUsedAt: r.last_used_at as string,
  }
}
