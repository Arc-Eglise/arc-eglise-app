// Appels IA directs avec la clé personnelle du membre
// Utilisé quand le membre a connecté son propre compte IA
// Format de sortie normalisé : même SSE que Lunziko Platform

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// ── Chiffrement AES-256-CBC ─────────────────────────────────────────────────

const ENC_KEY = Buffer.from(
  (process.env.ARC_ENCRYPTION_KEY ?? 'arc-eglise-default-key-32-bytes!!').slice(0, 32),
  'utf8'
)

export function encryptKey(plaintext: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', ENC_KEY, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + enc.toString('hex')
}

export function decryptKey(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', ENC_KEY, iv)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

export function maskKey(key: string): string {
  if (!key || key.length < 12) return '****'
  return key.slice(0, 8) + '****' + key.slice(-4)
}

// ── Streaming SSE normalisé ─────────────────────────────────────────────────

type SseChunk = string // "data: {...}\n\n"

function sse(obj: Record<string, unknown>): SseChunk {
  return `data: ${JSON.stringify(obj)}\n\n`
}

// ── Claude (Anthropic) ──────────────────────────────────────────────────────

export async function claudeStream(
  apiKey: string,
  messages: { role: string; content: string }[],
  system: string
): Promise<Response> {
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enc = new TextEncoder()

  ;(async () => {
    try {
      await writer.write(enc.encode(sse({ type: 'start', provider: 'claude' })))

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system,
          stream: true,
          messages,
        }),
      })

      if (!res.ok || !res.body) {
        const errText = await res.text()
        await writer.write(enc.encode(sse({ type: 'error', error: `Claude: ${errText}` })))
        return
      }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let inputTokens = 0
      let outputTokens = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue
          try {
            const ev = JSON.parse(raw)
            if (ev.type === 'content_block_delta' && ev.delta?.text) {
              await writer.write(enc.encode(sse({ type: 'chunk', content: ev.delta.text })))
            }
            if (ev.type === 'message_delta' && ev.usage) {
              outputTokens = ev.usage.output_tokens ?? 0
            }
            if (ev.type === 'message_start' && ev.message?.usage) {
              inputTokens = ev.message.usage.input_tokens ?? 0
            }
          } catch { /* skip */ }
        }
      }

      await writer.write(enc.encode(sse({ type: 'end', tokens: { input: inputTokens, output: outputTokens } })))
    } catch (err) {
      await writer.write(enc.encode(sse({ type: 'error', error: String(err) })))
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ── OpenAI (ChatGPT) ────────────────────────────────────────────────────────

export async function openaiStream(
  apiKey: string,
  messages: { role: string; content: string }[],
  system: string
): Promise<Response> {
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enc = new TextEncoder()

  ;(async () => {
    try {
      await writer.write(enc.encode(sse({ type: 'start', provider: 'chatgpt' })))

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          stream: true,
          stream_options: { include_usage: true },
          messages: [{ role: 'system', content: system }, ...messages],
        }),
      })

      if (!res.ok || !res.body) {
        const errText = await res.text()
        await writer.write(enc.encode(sse({ type: 'error', error: `ChatGPT: ${errText}` })))
        return
      }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let inputTokens = 0
      let outputTokens = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue
          try {
            const ev = JSON.parse(raw)
            const delta = ev.choices?.[0]?.delta?.content
            if (delta) await writer.write(enc.encode(sse({ type: 'chunk', content: delta })))
            if (ev.usage) {
              inputTokens = ev.usage.prompt_tokens ?? 0
              outputTokens = ev.usage.completion_tokens ?? 0
            }
          } catch { /* skip */ }
        }
      }

      await writer.write(enc.encode(sse({ type: 'end', tokens: { input: inputTokens, output: outputTokens } })))
    } catch (err) {
      await writer.write(enc.encode(sse({ type: 'error', error: String(err) })))
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// ── Google Gemini ───────────────────────────────────────────────────────────

export async function geminiStream(
  apiKey: string,
  messages: { role: string; content: string }[],
  system: string
): Promise<Response> {
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enc = new TextEncoder()

  ;(async () => {
    try {
      await writer.write(enc.encode(sse({ type: 'start', provider: 'gemini' })))

      // Convert messages to Gemini format
      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${apiKey}&alt=sse`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents,
          }),
        }
      )

      if (!res.ok || !res.body) {
        const errText = await res.text()
        await writer.write(enc.encode(sse({ type: 'error', error: `Gemini: ${errText}` })))
        return
      }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(line.slice(6))
            const text = ev.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) await writer.write(enc.encode(sse({ type: 'chunk', content: text })))
          } catch { /* skip */ }
        }
      }

      await writer.write(enc.encode(sse({ type: 'end', tokens: { input: 0, output: 0 } })))
    } catch (err) {
      await writer.write(enc.encode(sse({ type: 'error', error: String(err) })))
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
