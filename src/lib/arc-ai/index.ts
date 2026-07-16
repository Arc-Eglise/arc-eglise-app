// ARC Église AI Core — Point d'entrée principal
// Architecture self-contained, remplace progressivement Lunziko IA

export * from './provider-manager'
export * from './thinking-engine'
export * from './arc-skills'
export * from './arc-personas'
export * from './agents/arc-agents'

// Engines — exports nommés pour éviter les conflits
export {
  searchVerses,
  getPassage,
  compareVersions,
  formatVersesForPrompt,
  BIBLE_THEMES,
} from './engines/bible-engine'

export {
  searchKnowledge,
  indexDocument,
  formatChunksForPrompt,
} from './engines/knowledge-engine'

export {
  getRelevantLearnings,
  processInteractionLearning,
  formatLearningsForPrompt,
  getCachedResponse,
  setCachedResponse,
} from './engines/learning-engine'

export {
  quickBibleSearch,
  fetchVerseFromBolls,
} from './engines/bible-api'

export {
  getUserMemory,
  updateUserProgress,
  getRecentSessions,
  getChurchMemory,
  formatMemoryForPrompt,
} from './engines/memory-engine'

export {
  createPrayerRequest,
  getUserPrayerRequests,
  getPublicPrayerRequests,
  prayForRequest,
  markAnswered,
} from './engines/prayer-engine'

export {
  generateServiceOrder,
  suggestSongs,
  formatServiceOrderForDisplay,
} from './engines/worship-engine'

export {
  generateCourseModule,
  generateBaptismPath,
} from './engines/education-engine'

export {
  getUpcomingEvents,
  createEvent,
  searchMembers,
  getMemberStats,
  getGroups,
} from './engines/church-engine'

export {
  arcSearch,
  thematicSearch,
  formatSearchResultsForPrompt,
} from './engines/search-engine'

export {
  explainDoctrine,
  compareDoctrines,
  ARC_DOCTRINES,
} from './engines/theology-engine'

// Adaptateurs modèles open-source (GLM / DeepSeek-R1 / Qwen2.5)
export {
  buildQwenPrompt,
  buildDeepSeekR1Prompt,
  parseDeepSeekR1Response,
  scoreDeepSeekResponse,
  splitIntoGlmChunks,
  buildGlmLongContextPrompt,
  applyGlmAttentionMask,
  adaptPromptForTask,
  selectBestAdapter,
} from './engines/arc-model-adapters'
export type { ModelAdapter, AdaptedPrompt, DeepSeekR1Result, GlmChunk } from './engines/arc-model-adapters'

// ── Fonction principale : réponse IA pour le chat biblique ───────────────────
// Drop-in replacement de streamFromLunziko()

import { streamArcAgent, runArcAgent } from './agents/arc-agents'
import type { AgentInput, AgentResult } from './agents/arc-agents'
import type { AIProvider } from './provider-manager'

export interface ArcAIInput {
  message: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  system?: string
  userId?: string
  provider?: AIProvider
  personaSlug?: string
  stream?: boolean
}

// Stream — pour les routes API Next.js (remplace streamFromLunziko)
export function arcAIStream(input: ArcAIInput): ReadableStream<Uint8Array> {
  return streamArcAgent({
    task: input.message,
    history: input.history,
    userId: input.userId,
    provider: input.provider ?? 'auto',
    personaSlug: input.personaSlug,
    stream: true,
  })
}

// Non-stream — pour les tâches en arrière-plan
export async function arcAIChat(input: ArcAIInput): Promise<AgentResult> {
  return runArcAgent({
    task: input.message,
    history: input.history,
    userId: input.userId,
    provider: input.provider ?? 'auto',
    personaSlug: input.personaSlug,
  })
}
