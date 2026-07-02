// OpenAI-compatible "Custom LLM" endpoint for ElevenLabs Conversational AI.
// ElevenLabs runs the real-time voice (streaming STT + TTS + turn-taking) and
// calls THIS endpoint for the brain — so the live phone call is still Балина
// with her full RAG tools (search_listings etc.), not a generic voice bot.
//
// Contract: ElevenLabs POSTs an OpenAI /chat/completions request (messages,
// stream). We replace whatever system prompt it sent with Балина's real one +
// a voice directive, run the Azure tool loop (same as /api/chat), and stream
// the final answer back as OpenAI SSE chunks.
import { AzureOpenAI } from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { getSystemPrompt, TOOLS, executeToolCall } from '@/lib/consultant'
import { logUsage, overDailySpendCap } from '@/lib/usage-tracker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_TOOL_HOPS = 4

// Spoken-reply directive — voice needs short, plain, TTS-friendly answers.
const VOICE_DIRECTIVE =
  '\n\nРЕЖИМ ЗВОНКА (голос, реальное время): отвечай КОРОТКО и разговорно, как по телефону — обычно 1–3 предложения. Без markdown, без ссылок, без [CHIPS], без списков-буллетов и без длинных перечислений. Числа и цены проговаривай словами естественно (например «около четырёхсот тысяч долларов»). Если нужно уточнение — задай ОДИН короткий вопрос и жди ответа. Не зачитывай URL и технические детали, говори как живой брокер.'

function sseChunk(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`
}

export async function POST(req: Request) {
  // Shared-secret auth — ElevenLabs sends the key we configure on the agent
  // as `Authorization: Bearer <key>`. Fail closed: an unset secret means the
  // paid Azure endpoint would be open, so refuse.
  const secret = process.env.CONVAI_LLM_SECRET
  if (!secret) return Response.json({ error: 'not_configured' }, { status: 503 })
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview'
  const chatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'
  if (!apiKey || !endpoint) return Response.json({ error: 'azure_unconfigured' }, { status: 500 })

  let body: { messages?: { role: string; content?: string }[]; stream?: boolean; model?: string }
  try { body = await req.json() } catch { return Response.json({ error: 'invalid_json' }, { status: 400 }) }

  // Keep only the conversation turns; drop ElevenLabs' own system prompt —
  // we inject Балина's.
  const turns: ChatCompletionMessageParam[] = (body.messages ?? [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-14)
    .map(m => ({ role: m.role as 'user' | 'assistant', content: String(m.content) }))
  if (turns.length === 0) return Response.json({ error: 'no_messages' }, { status: 400 })

  if (await overDailySpendCap()) {
    const text = 'Извините, ассистент сейчас недоступен, скоро вернусь. Можно оставить заявку — менеджер перезвонит.'
    return streamText(text)
  }

  const client = new AzureOpenAI({ apiKey, endpoint, apiVersion })
  const systemPrompt = (await getSystemPrompt()) + VOICE_DIRECTIVE
  const messages: ChatCompletionMessageParam[] = [{ role: 'system', content: systemPrompt }, ...turns]

  // Run the tool loop server-side; ElevenLabs only ever sees the final text.
  let finalText = 'Извините, не расслышала. Повторите, пожалуйста?'
  for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
    const completion = await client.chat.completions.create({
      model: chatDeployment,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.5,
    })
    logUsage({
      feature: 'chat-voice-call',
      deployment: chatDeployment,
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
      meta: { hop },
    })
    const msg = completion.choices[0].message
    messages.push(msg)
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      finalText = (msg.content ?? '').replace(/\[CHIPS\][\s\S]*$/i, '').replace(/https?:\/\/\S+/g, '').trim() || finalText
      break
    }
    for (const tc of msg.tool_calls) {
      if (tc.type !== 'function') continue
      const result = await executeToolCall(tc.function.name, tc.function.arguments)
      messages.push({ role: 'tool', tool_call_id: tc.id, content: result })
    }
  }

  return streamText(finalText, body.model ?? chatDeployment)
}

// Emit the answer as OpenAI-compatible SSE so ElevenLabs streams it to TTS.
function streamText(text: string, model = 'balina'): Response {
  const id = 'chatcmpl-balina'
  const created = 0 // deterministic — real time not needed by the consumer
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder()
      controller.enqueue(enc.encode(sseChunk({
        id, object: 'chat.completion.chunk', created, model,
        choices: [{ index: 0, delta: { role: 'assistant', content: text }, finish_reason: null }],
      })))
      controller.enqueue(enc.encode(sseChunk({
        id, object: 'chat.completion.chunk', created, model,
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      })))
      controller.enqueue(enc.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' },
  })
}
