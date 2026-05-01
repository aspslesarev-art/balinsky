import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { SYSTEM_PROMPT, TOOLS, executeToolCall, ensureFeedbackBucket } from '@/lib/consultant'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TOOL_HOPS = 4
const MAX_INPUT_MESSAGES = 30

type IncomingMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY is not configured on the server' }, { status: 500 })
  }

  let body: unknown
  try { body = await req.json() } catch { return Response.json({ error: 'invalid_json' }, { status: 400 }) }
  const incoming: IncomingMessage[] = Array.isArray((body as { messages?: unknown }).messages)
    ? (body as { messages: IncomingMessage[] }).messages.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    : []
  if (incoming.length === 0) {
    return Response.json({ error: 'no_messages' }, { status: 400 })
  }
  const trimmed = incoming.slice(-MAX_INPUT_MESSAGES)

  // Lazy-create the feedback bucket on first chat (cheap idempotent call).
  await ensureFeedbackBucket().catch(() => null)

  const client = new OpenAI({ apiKey })
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...trimmed,
  ]

  for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
    })
    const choice = completion.choices[0]
    const msg = choice.message
    messages.push(msg)

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return Response.json({
        message: { role: 'assistant', content: msg.content ?? '' },
        usage: completion.usage,
      })
    }

    for (const tc of msg.tool_calls) {
      if (tc.type !== 'function') continue
      const result = await executeToolCall(tc.function.name, tc.function.arguments)
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      })
    }
  }

  return Response.json({
    message: {
      role: 'assistant',
      content: 'Извините, не получилось довести запрос до конца. Попробуйте переформулировать.',
    },
  })
}
