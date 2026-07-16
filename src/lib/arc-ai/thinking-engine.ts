// ARC Église AI — Thinking Engine
// Raisonnement CoT avec adaptateurs GLM / DeepSeek-R1 / Qwen2.5

import { chat } from './provider-manager'
import type { AIProvider, ChatMessage } from './provider-manager'
import {
  adaptPromptForTask,
  parseDeepSeekR1Response,
  buildDeepSeekR1Prompt,
  scoreDeepSeekResponse,
} from './engines/arc-model-adapters'

export type ThinkingMode = 'fast' | 'balanced' | 'deep'

export interface ThinkingResult {
  reasoning: string
  answer: string
  provider: AIProvider
  model: string
  mode: ThinkingMode
}

// Patterns qui indiquent un raisonnement profond nécessaire
const DEEP_TRIGGERS = /théologie|doctrine|exégèse|herméneutique|discernement|conflit|souffrance|mort|deuil|guérison|démon|déliv|comparer|analyser|prouver|démontrer|pourquoi.*dieu|libre arbitre|prédestination/i
const FAST_TRIGGERS = /bonjour|merci|horaire|adresse|qui est|quand|où est|combien/i

export function detectMode(task: string): ThinkingMode {
  if (FAST_TRIGGERS.test(task)) return 'fast'
  if (DEEP_TRIGGERS.test(task)) return 'deep'
  return 'balanced'
}

export function extractThinkingBlocks(content: string): { reasoning: string; answer: string } {
  const match = content.match(/<think>([\s\S]*?)<\/think>([\s\S]*)/)
  if (match) return { reasoning: (match[1] ?? '').trim(), answer: (match[2] ?? '').trim() }
  return { reasoning: '', answer: content.trim() }
}

const MODE_PARAMS: Record<ThinkingMode, { maxTokens: number; temperature: number }> = {
  fast:     { maxTokens: 1024, temperature: 0.5 },
  balanced: { maxTokens: 3000, temperature: 0.7 },
  deep:     { maxTokens: 6000, temperature: 0.6 },
}

export async function think(
  messages: ChatMessage[],
  provider: AIProvider = 'auto',
  options: { mode?: ThinkingMode; system?: string; maxTokens?: number; context?: string } = {},
): Promise<ThinkingResult> {
  const userTask = messages.filter(m => m.role === 'user').at(-1)?.content ?? ''
  const mode = options.mode ?? detectMode(userTask)
  const params = MODE_PARAMS[mode]

  // Appliquer l'adaptateur selon le provider local choisi
  const isLocalProvider = provider === 'ollama-qwen' || provider === 'ollama-deepseek' || provider === 'ollama-glm'

  let finalMessages = messages
  let systemWithThinking = options.system ?? ''

  if (isLocalProvider) {
    // Utiliser l'adaptateur optimal selon la tâche et le provider
    const adapted = adaptPromptForTask(messages, userTask, options.system, options.context)
    finalMessages = adapted.messages

    // DeepSeek-R1 : enrichir le prompt avec CoT structuré en mode deep/balanced
    if (provider === 'ollama-deepseek' && mode !== 'fast') {
      const dsMode = mode === 'deep' ? 'deep' : 'balanced'
      const enriched = buildDeepSeekR1Prompt(userTask, options.context, dsMode)
      const lastUserIdx = [...finalMessages].reverse().findIndex(m => m.role === 'user')
      if (lastUserIdx !== -1) {
        const idx = finalMessages.length - 1 - lastUserIdx
        finalMessages = [...finalMessages]
        finalMessages[idx] = { ...finalMessages[idx]!, content: enriched }
      }
    }
  } else if (mode === 'deep') {
    systemWithThinking += '\n\nAvant de répondre, réfléchis en profondeur entre balises <think>...</think>, puis donne ta réponse finale.'
  }

  const result = await chat(finalMessages, provider, {
    system: systemWithThinking || undefined,
    maxTokens: options.maxTokens ?? params.maxTokens,
    temperature: params.temperature,
  })

  // Parser selon le provider
  if (provider === 'ollama-deepseek') {
    const parsed = parseDeepSeekR1Response(result.content)
    const quality = scoreDeepSeekResponse(parsed.answer, userTask)
    return {
      reasoning: parsed.thinking,
      answer: parsed.answer,
      provider: result.provider,
      model: result.model,
      mode,
      ...(quality < 0.4 ? { _lowQuality: true } : {}),
    } as ThinkingResult
  }

  const { reasoning, answer } = extractThinkingBlocks(result.content)
  return { reasoning, answer, provider: result.provider, model: result.model, mode }
}
