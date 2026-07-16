// ARC AI — Adaptateurs de modèles open-source
// Inspirés de : GLM-5.2 (zai-org), DeepSeek-R1 (deepseek-ai), Qwen2.5 (Qwen)
// Ces adaptateurs reproduisent les techniques clés de chaque architecture
// dans le contexte ARC Église — sans fine-tuning payant.
//
// Architecture source :
//   GLM-5.2    → attention à contexte très long, masque causal bidirectionnel
//   DeepSeek-R1 → GRPO (Group Relative Policy Optimization), CoT natif
//   Qwen2.5    → GQA (Grouped Query Attention), sliding window, multilingue

import type { ChatMessage } from '../provider-manager'

// =============================================================================
// QWEN-STYLE : Prompt structuré multilingue + GQA simulation
// Inspiré de l'architecture Qwen2.5 (Alibaba Cloud)
// Technique : system prompt riche avec détection langue + sliding window context
// =============================================================================

const QWEN_LANG_TOKENS: Record<string, string> = {
  fr: '<|fr|>', en: '<|en|>', ar: '<|ar|>', zh: '<|zh|>',
  es: '<|es|>', pt: '<|pt|>', sw: '<|sw|>', de: '<|de|>',
}

function detectLanguage(text: string): string {
  if (/[؀-ۿ]/.test(text)) return 'ar'
  if (/[一-鿿]/.test(text)) return 'zh'
  if (/\b(the|is|are|was|were|have|has|will|would|can|could|should)\b/i.test(text)) return 'en'
  if (/\b(le|la|les|du|de|et|est|sont|vous|nous|je|il)\b/i.test(text)) return 'fr'
  if (/\b(el|la|los|las|es|son|está|tienen|puede|para)\b/i.test(text)) return 'es'
  if (/\b(o|a|os|as|um|uma|é|são|está|para|com)\b/i.test(text)) return 'pt'
  return 'fr'
}

// Sliding window : garde les N derniers tokens de contexte (simule GQA)
function applyQwenSlidingWindow(messages: ChatMessage[], windowSize = 6): ChatMessage[] {
  const system = messages.filter(m => m.role === 'system')
  const dialog = messages.filter(m => m.role !== 'system')
  const windowed = dialog.length > windowSize ? dialog.slice(-windowSize) : dialog
  return [...system, ...windowed]
}

export function buildQwenPrompt(
  messages: ChatMessage[],
  systemOverride?: string,
): { messages: ChatMessage[]; detectedLang: string } {
  const lastUser = messages.filter(m => m.role === 'user').at(-1)?.content ?? ''
  const detectedLang = detectLanguage(lastUser)
  const langToken = QWEN_LANG_TOKENS[detectedLang] ?? '<|fr|>'

  const windowed = applyQwenSlidingWindow(messages)

  const system: ChatMessage = {
    role: 'system',
    content: (systemOverride ?? '') + `\n\n${langToken} Réponds en ${detectedLang === 'fr' ? 'français' : detectedLang}.`,
  }

  const nonSystem = windowed.filter(m => m.role !== 'system')
  return { messages: [system, ...nonSystem], detectedLang }
}

// =============================================================================
// DEEPSEEK-R1-STYLE : Chain-of-Thought natif avec GRPO-inspired prompting
// Inspiré de l'architecture DeepSeek-R1 (DeepSeek AI)
// Technique : forcer le modèle à raisonner avant de répondre (Process Reward)
// =============================================================================

export interface DeepSeekR1Result {
  thinking: string
  answer: string
  raw: string
}

const DEEPSEEK_THINK_OPEN  = '<think>'
const DEEPSEEK_THINK_CLOSE = '</think>'

// Injecter un prompt qui force le raisonnement étape par étape (GRPO-style)
export function buildDeepSeekR1Prompt(
  task: string,
  context?: string,
  mode: 'fast' | 'balanced' | 'deep' = 'balanced',
): string {
  const steps = mode === 'fast' ? 2 : mode === 'balanced' ? 4 : 6

  const contextBlock = context ? `\nCONTEXTE :\n${context}\n` : ''

  return `${contextBlock}
QUESTION : ${task}

Raisonne en ${steps} étapes avant de répondre :
${Array.from({ length: steps }, (_, i) => `${i + 1}. [Étape de réflexion]`).join('\n')}

Réponds avec ta réflexion entre ${DEEPSEEK_THINK_OPEN}...${DEEPSEEK_THINK_CLOSE} puis ta réponse finale.`
}

// Parser la réponse DeepSeek-R1 (sépare thinking et answer)
export function parseDeepSeekR1Response(raw: string): DeepSeekR1Result {
  const thinkStart = raw.indexOf(DEEPSEEK_THINK_OPEN)
  const thinkEnd   = raw.indexOf(DEEPSEEK_THINK_CLOSE)

  if (thinkStart === -1 || thinkEnd === -1) {
    return { thinking: '', answer: raw.trim(), raw }
  }

  const thinking = raw.slice(thinkStart + DEEPSEEK_THINK_OPEN.length, thinkEnd).trim()
  const answer   = raw.slice(thinkEnd + DEEPSEEK_THINK_CLOSE.length).trim()
  return { thinking, answer, raw }
}

// Scoring de qualité GRPO-inspired (évalue la réponse sans LLM)
export function scoreDeepSeekResponse(
  answer: string,
  task: string,
): number {
  let score = 0.5

  // Récompenser les références bibliques (livre:chapitre:verset)
  const bibleRefs = answer.match(/\b\w+\s+\d+:\d+/g)?.length ?? 0
  score += Math.min(bibleRefs * 0.05, 0.2)

  // Récompenser la longueur appropriée
  const words = answer.split(/\s+/).length
  if (words > 50 && words < 500) score += 0.1
  if (words < 10) score -= 0.2

  // Récompenser la réponse à la question posée
  const taskWords = task.toLowerCase().split(/\s+/).filter(w => w.length > 4)
  const answerLower = answer.toLowerCase()
  const covered = taskWords.filter(w => answerLower.includes(w)).length
  score += (covered / Math.max(taskWords.length, 1)) * 0.2

  return Math.min(Math.max(score, 0), 1)
}

// =============================================================================
// GLM-STYLE : Attention bidirectionnelle simulée + découpage de longs contextes
// Inspiré de l'architecture GLM-5.2 (ZhipuAI / zai-org)
// Technique : chunking + récapitulation progressive pour très longs textes
// =============================================================================

export interface GlmChunk {
  index: number
  content: string
  summary?: string
}

const GLM_CHUNK_SIZE = 2000  // caractères par chunk (simule le token budget)

// Découper un long texte en chunks gérables (GLM long-context technique)
export function splitIntoGlmChunks(text: string, chunkSize = GLM_CHUNK_SIZE): GlmChunk[] {
  const chunks: GlmChunk[] = []
  let index = 0

  while (index < text.length) {
    // Couper aux frontières de phrases
    let end = Math.min(index + chunkSize, text.length)
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end)
      const lastNewline = text.lastIndexOf('\n', end)
      const breakPoint = Math.max(lastPeriod, lastNewline)
      if (breakPoint > index + chunkSize * 0.5) end = breakPoint + 1
    }

    chunks.push({ index: chunks.length, content: text.slice(index, end).trim() })
    index = end
  }

  return chunks
}

// Construire un prompt GLM-style avec récapitulation progressive
export function buildGlmLongContextPrompt(
  chunks: GlmChunk[],
  query: string,
  summaries: string[] = [],
): string {
  const contextParts: string[] = []

  // Inclure les summaries des chunks précédents (mémoire compressée)
  if (summaries.length > 0) {
    contextParts.push(`RÉSUMÉ DES PARTIES PRÉCÉDENTES :\n${summaries.join('\n---\n')}`)
  }

  // Inclure le chunk actuel complet
  const currentChunk = chunks[summaries.length]
  if (currentChunk) {
    contextParts.push(`TEXTE ACTUEL (partie ${currentChunk.index + 1}/${chunks.length}) :\n${currentChunk.content}`)
  }

  return `${contextParts.join('\n\n')}\n\nQUESTION : ${query}\n\nRéponds en t'appuyant sur tout le contexte fourni.`
}

// Masque d'attention GLM (bidirectionnel pour les tokens système, causal pour la génération)
export function applyGlmAttentionMask(messages: ChatMessage[]): {
  systemContext: string
  dialogHistory: ChatMessage[]
} {
  // Système = attention bidirectionnelle (tout voit tout)
  const systemParts = messages
    .filter(m => m.role === 'system')
    .map(m => m.content)
    .join('\n\n')

  // Dialogue = attention causale (chaque token ne voit que le passé)
  const dialogHistory = messages.filter(m => m.role !== 'system')

  return { systemContext: systemParts, dialogHistory }
}

// =============================================================================
// SÉLECTEUR AUTOMATIQUE : choisit l'adaptateur selon le type de tâche
// =============================================================================

export type ModelAdapter = 'qwen' | 'deepseek-r1' | 'glm'

export function selectBestAdapter(task: string, contextLength = 0): ModelAdapter {
  // GLM pour les très longs contextes
  if (contextLength > 4000 || /\b(livre|chapitre|intégral|complet|résumé|série|plan de lecture)\b/i.test(task)) {
    return 'glm'
  }

  // DeepSeek-R1 pour le raisonnement complexe
  if (/\b(pourquoi|expliqu|doctrine|théolog|exégès|interprét|comparer|analys|profond|difficile|contredire|apologétique)\b/i.test(task)) {
    return 'deepseek-r1'
  }

  // Qwen par défaut (multilingue, polyvalent)
  return 'qwen'
}

// =============================================================================
// PIPELINE UNIFIÉ : applique le bon adaptateur selon la tâche
// =============================================================================

export interface AdaptedPrompt {
  messages: ChatMessage[]
  adapter: ModelAdapter
  metadata: Record<string, unknown>
}

export function adaptPromptForTask(
  messages: ChatMessage[],
  task: string,
  systemOverride?: string,
  contextText?: string,
): AdaptedPrompt {
  const contextLength = contextText?.length ?? messages.reduce((acc, m) => acc + m.content.length, 0)
  const adapter = selectBestAdapter(task, contextLength)

  if (adapter === 'qwen') {
    const { messages: qwenMsgs, detectedLang } = buildQwenPrompt(messages, systemOverride)
    return { messages: qwenMsgs, adapter, metadata: { detectedLang } }
  }

  if (adapter === 'deepseek-r1') {
    const enrichedContent = buildDeepSeekR1Prompt(task, contextText, 'balanced')
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user')
    const msgs = [...messages]
    if (lastUserIdx !== -1) {
      const idx = msgs.length - 1 - lastUserIdx
      msgs[idx] = { ...msgs[idx]!, content: enrichedContent }
    }
    return { messages: msgs, adapter, metadata: { mode: 'balanced' } }
  }

  // GLM : découper si contexte long
  if (contextText && contextText.length > GLM_CHUNK_SIZE) {
    const chunks = splitIntoGlmChunks(contextText)
    const { systemContext, dialogHistory } = applyGlmAttentionMask(messages)
    const glmPrompt = buildGlmLongContextPrompt(chunks, task)
    const combined: ChatMessage[] = [
      { role: 'system', content: systemContext || systemOverride || '' },
      ...dialogHistory.slice(0, -1),
      { role: 'user', content: glmPrompt },
    ]
    return { messages: combined, adapter, metadata: { chunks: chunks.length } }
  }

  return { messages, adapter, metadata: {} }
}
