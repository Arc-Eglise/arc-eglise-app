// ARC Église AI — Provider Manager
// Gère plusieurs providers IA avec fallback automatique
// Cloud  : Anthropic → DeepSeek → OpenAI → Mistral → Gemini
// Local  : Ollama/Qwen2.5 → Ollama/DeepSeek-R1 → Ollama/GLM

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

// ── Types ───────────────────────────────────────────────────────────────────

export type AIProvider =
  | 'anthropic'
  | 'openai'
  | 'deepseek'
  | 'gemini'
  | 'mistral'
  | 'ollama'          // Ollama générique (env OLLAMA_MODEL)
  | 'ollama-qwen'     // Qwen2.5 — multilingue FR/EN/AR/ZH — ARC LLM principal
  | 'ollama-deepseek' // DeepSeek-R1-Distill — raisonnement théologique profond
  | 'ollama-glm'      // GLM-4/GLM-5.2 — très long contexte (passages bibliques)
  | 'auto'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatOptions {
  system?: string
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

export interface ChatResult {
  content: string
  provider: AIProvider
  model: string
  tokensIn?: number
  tokensOut?: number
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required?: string[]
  }
}

export interface ToolCallResult {
  content: string
  provider: AIProvider
  model: string
  toolCallLog: Array<{ tool: string; args: Record<string, unknown>; result: unknown }>
}

// ── Modèles par provider ─────────────────────────────────────────────────────

const MODELS: Record<Exclude<AIProvider, 'auto'>, string> = {
  anthropic:      process.env.ANTHROPIC_MODEL     ?? 'claude-sonnet-4-6',
  openai:         process.env.OPENAI_MODEL        ?? 'gpt-4o-mini',
  deepseek:       process.env.DEEPSEEK_MODEL      ?? 'deepseek-chat',
  gemini:         process.env.GEMINI_MODEL        ?? 'gemini-2.0-flash',
  mistral:        process.env.MISTRAL_MODEL       ?? 'mistral-small-latest',
  ollama:         process.env.OLLAMA_MODEL        ?? 'arc-llm',
  'ollama-qwen':  process.env.OLLAMA_QWEN_MODEL   ?? 'arc-llm-qwen',    // ollama create arc-llm-qwen -f Modelfile.qwen
  'ollama-deepseek': process.env.OLLAMA_DS_MODEL  ?? 'arc-llm-deepseek', // ollama create arc-llm-deepseek -f Modelfile.deepseek
  'ollama-glm':   process.env.OLLAMA_GLM_MODEL    ?? 'arc-llm-glm',     // ollama create arc-llm-glm -f Modelfile.glm
}

// ── Vérification disponibilité ───────────────────────────────────────────────

export function isAvailable(provider: Exclude<AIProvider, 'auto'>): boolean {
  const ollamaUp = !!process.env.OLLAMA_BASE_URL
  switch (provider) {
    case 'anthropic':      return !!process.env.ANTHROPIC_API_KEY
    case 'openai':         return !!process.env.OPENAI_API_KEY
    case 'deepseek':       return !!process.env.DEEPSEEK_API_KEY
    case 'gemini':         return !!process.env.GEMINI_API_KEY
    case 'mistral':        return !!process.env.MISTRAL_API_KEY
    case 'ollama':         return ollamaUp
    case 'ollama-qwen':    return ollamaUp
    case 'ollama-deepseek': return ollamaUp
    case 'ollama-glm':     return ollamaUp
  }
}

// Fallback cloud → local (coût décroissant, gratuit en local)
const FALLBACK_CHAIN: Exclude<AIProvider, 'auto'>[] = [
  'anthropic', 'deepseek', 'openai', 'mistral', 'gemini',
  'ollama-qwen', 'ollama-deepseek', 'ollama-glm', 'ollama',
]

function resolveProvider(requested: AIProvider): Exclude<AIProvider, 'auto'> {
  if (requested !== 'auto') return requested
  return FALLBACK_CHAIN.find(isAvailable) ?? 'anthropic'
}

// ── Clients (lazy) ───────────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

let _deepseek: OpenAI | null = null
function getDeepSeek(): OpenAI {
  if (!_deepseek) _deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
  })
  return _deepseek
}

let _mistral: OpenAI | null = null
function getMistral(): OpenAI {
  if (!_mistral) _mistral = new OpenAI({
    apiKey: process.env.MISTRAL_API_KEY,
    baseURL: 'https://api.mistral.ai/v1',
  })
  return _mistral
}

let _gemini: OpenAI | null = null
function getGemini(): OpenAI {
  if (!_gemini) _gemini = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  })
  return _gemini
}

let _ollama: OpenAI | null = null
function getOllama(): OpenAI {
  if (!_ollama) _ollama = new OpenAI({
    apiKey: 'ollama',
    baseURL: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
  })
  return _ollama
}

// ── Chat (non-streaming) ─────────────────────────────────────────────────────

export async function chat(
  messages: ChatMessage[],
  providerReq: AIProvider = 'auto',
  options: ChatOptions = {},
): Promise<ChatResult> {
  const provider = resolveProvider(providerReq)
  const model = MODELS[provider]
  const maxTokens = options.maxTokens ?? 2048
  const temperature = options.temperature ?? 0.7

  try {
    if (provider === 'anthropic') {
      const userMessages = messages.filter(m => m.role !== 'system')
      const system = options.system ?? messages.find(m => m.role === 'system')?.content
      const response = await getAnthropic().messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: userMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      })
      const content = response.content[0]?.type === 'text' ? response.content[0].text : ''
      return { content, provider, model, tokensIn: response.usage.input_tokens, tokensOut: response.usage.output_tokens }
    }

    // OpenAI-compatible (openai, deepseek, mistral, gemini, ollama-*)
    const client = provider === 'openai' ? getOpenAI()
      : provider === 'deepseek' ? getDeepSeek()
      : provider === 'mistral' ? getMistral()
      : provider === 'gemini' ? getGemini()
      : getOllama()  // ollama, ollama-qwen, ollama-deepseek, ollama-glm

    const oaiMessages: OpenAI.ChatCompletionMessageParam[] = []
    if (options.system) oaiMessages.push({ role: 'system', content: options.system })
    oaiMessages.push(...messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })))

    const response = await client.chat.completions.create({ model, max_tokens: maxTokens, temperature, messages: oaiMessages })
    const content = response.choices[0]?.message?.content ?? ''
    return { content, provider, model }
  } catch (err) {
    // Fallback auto si le provider demandé échoue
    if (providerReq === 'auto') {
      const nextChain = FALLBACK_CHAIN.filter(p => p !== provider && isAvailable(p))
      if (nextChain.length > 0) {
        return chat(messages, nextChain[0]!, options)
      }
    }
    throw err
  }
}

// ── Stream (retourne ReadableStream pour Next.js) ────────────────────────────

export function streamChat(
  messages: ChatMessage[],
  providerReq: AIProvider = 'auto',
  options: ChatOptions = {},
): ReadableStream<Uint8Array> {
  // Build fallback chain: try each available provider in order
  const providersToTry: Exclude<AIProvider, 'auto'>[] = providerReq === 'auto'
    ? FALLBACK_CHAIN.filter(isAvailable)
    : [resolveProvider(providerReq)]

  if (providersToTry.length === 0) providersToTry.push('anthropic')

  const encoder = new TextEncoder()
  const maxTokens = options.maxTokens ?? 2048
  const temperature = options.temperature ?? 0.7

  return new ReadableStream({
    async start(controller) {
      for (const provider of providersToTry) {
        const model = MODELS[provider]
        try {
          if (provider === 'anthropic') {
            const userMessages = messages.filter(m => m.role !== 'system')
            const system = options.system ?? messages.find(m => m.role === 'system')?.content
            const stream = getAnthropic().messages.stream({
              model,
              max_tokens: maxTokens,
              temperature,
              system,
              messages: userMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            })
            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                controller.enqueue(encoder.encode(event.delta.text))
              }
            }
          } else {
            const client = provider === 'openai' ? getOpenAI()
              : provider === 'deepseek' ? getDeepSeek()
              : provider === 'mistral' ? getMistral()
              : provider === 'gemini' ? getGemini()
              : getOllama()  // ollama, ollama-qwen, ollama-deepseek, ollama-glm

            const oaiMessages: OpenAI.ChatCompletionMessageParam[] = []
            if (options.system) oaiMessages.push({ role: 'system', content: options.system })
            oaiMessages.push(...messages
              .filter(m => m.role !== 'system')
              .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })))

            const stream = await client.chat.completions.create({ model, max_tokens: maxTokens, temperature, messages: oaiMessages, stream: true })
            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content ?? ''
              if (text) controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()
          return
        } catch (err) {
          console.error(`[ARC AI] Provider ${provider} failed:`, String(err))
        }
      }
      controller.error(new Error('Tous les providers IA ont échoué'))
    },
  })
}

// ── Tool Calling (ReAct loop — Anthropic natif) ──────────────────────────────

export async function chatWithTools(
  task: string,
  tools: ToolDefinition[],
  handlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>>,
  providerReq: AIProvider = 'auto',
  options: ChatOptions = {},
  maxIter = 4,
): Promise<ToolCallResult> {
  const provider = resolveProvider(providerReq)
  const model = MODELS[provider]
  const toolCallLog: ToolCallResult['toolCallLog'] = []

  if (provider === 'anthropic') {
    const anthropicTools: Anthropic.Tool[] = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: { type: 'object' as const, properties: t.parameters.properties as Record<string, unknown>, required: t.parameters.required ?? [] },
    }))

    const msgs: Anthropic.MessageParam[] = [{ role: 'user', content: task }]
    let content = ''

    for (let i = 0; i < maxIter; i++) {
      const response = await getAnthropic().messages.create({
        model,
        max_tokens: options.maxTokens ?? 4096,
        system: options.system,
        tools: anthropicTools,
        messages: msgs,
      })

      msgs.push({ role: 'assistant', content: response.content })

      if (response.stop_reason === 'end_turn') {
        content = response.content.find(b => b.type === 'text')?.text ?? ''
        break
      }

      if (response.stop_reason === 'tool_use') {
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue
          const handler = handlers[block.name]
          let result: unknown = 'Tool not found'
          if (handler) {
            try { result = await handler(block.input as Record<string, unknown>) } catch (e) { result = `Error: ${String(e)}` }
          }
          toolCallLog.push({ tool: block.name, args: block.input as Record<string, unknown>, result })
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
        }
        msgs.push({ role: 'user', content: toolResults })
      }
    }

    return { content, provider, model, toolCallLog }
  }

  // Fallback: OpenAI-compatible tool calling
  const isOllamaVariant = provider === 'ollama' || provider === 'ollama-qwen' || provider === 'ollama-deepseek' || provider === 'ollama-glm'
  const client = provider === 'openai' ? getOpenAI()
    : provider === 'deepseek' ? getDeepSeek()
    : isOllamaVariant ? getOllama()
    : getMistral()
  const oaiTools: OpenAI.ChatCompletionTool[] = tools.map(t => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }))

  const oaiMsgs: OpenAI.ChatCompletionMessageParam[] = []
  if (options.system) oaiMsgs.push({ role: 'system', content: options.system })
  oaiMsgs.push({ role: 'user', content: task })

  let content = ''
  for (let i = 0; i < maxIter; i++) {
    const response = await client.chat.completions.create({
      model, max_tokens: options.maxTokens ?? 4096,
      messages: oaiMsgs, tools: oaiTools, tool_choice: 'auto',
    })
    const msg = response.choices[0]?.message
    if (!msg) break
    oaiMsgs.push(msg)

    if (!msg.tool_calls?.length) { content = msg.content ?? ''; break }

    const toolResults: OpenAI.ChatCompletionToolMessageParam[] = []
    for (const tc of msg.tool_calls) {
      const fn = (tc as { function?: { name: string; arguments: string } }).function
      if (!fn) continue
      const args = JSON.parse(fn.arguments) as Record<string, unknown>
      const handler = handlers[fn.name]
      let result: unknown = 'Tool not found'
      if (handler) { try { result = await handler(args) } catch (e) { result = `Error: ${String(e)}` } }
      toolCallLog.push({ tool: fn.name, args, result })
      toolResults.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) })
    }
    oaiMsgs.push(...toolResults)
  }

  return { content, provider, model, toolCallLog }
}
