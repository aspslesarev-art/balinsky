import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { SYSTEM_PROMPT, TOOLS, executeToolCall, ensureFeedbackBucket, type ListingCard } from '@/lib/consultant'
import { ensureAssistantSession, logAssistantTurn } from '@/lib/assistant-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TOOL_HOPS = 4
const MAX_INPUT_MESSAGES = 30

// The model insists on inlining URLs / markdown links / image embeds in its
// reply even when the system prompt says cards render below. Strip them so
// the chat doesn't show duplicate noisy URLs alongside the structured cards.
function stripRedundantLinks(text: string): string {
  return text
    // markdown image: ![alt](url) — drop entirely
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // markdown link: [text](url) → keep just text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // bare https:// urls
    .replace(/https?:\/\/\S+/g, '')
    // collapse extra whitespace from removals
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

type IncomingMessage = { role: 'user' | 'assistant'; content: string }

// SYSTEM_PROMPT is in Russian. When the visitor is on the English
// site we tack on a short directive so the model replies in English.
// Cheaper than maintaining a parallel translated prompt.
const EN_LANG_DIRECTIVE =
  '\n\nIMPORTANT: The user is on the English version of the site. Always respond in English, including any [CHIPS] suggestions. Translate any examples (city names like "Чангу" → "Canggu", "Убуд" → "Ubud") naturally.'

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
  const langRaw = (body as { lang?: unknown }).lang
  const lang: 'ru' | 'en' = langRaw === 'en' ? 'en' : 'ru'
  const trimmed = incoming.slice(-MAX_INPUT_MESSAGES)

  // Lazy-create the feedback bucket on first chat (cheap idempotent call).
  await ensureFeedbackBucket().catch(() => null)

  // Resolve / create the visitor's assistant session BEFORE the
  // model call so we have a chat_id to log against. The user's
  // last message in `incoming` is what we'll persist as the inbound
  // turn — earlier history is already in the DB from prior calls.
  const session = await ensureAssistantSession().catch(() => null)
  const lastUserMessage = [...trimmed].reverse().find(m => m.role === 'user')?.content ?? ''

  const client = new OpenAI({ apiKey })
  const systemPrompt = lang === 'en' ? SYSTEM_PROMPT + EN_LANG_DIRECTIVE : SYSTEM_PROMPT
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...trimmed,
  ]

  // Accumulate listing cards from all search_listings tool calls in this turn.
  // De-duped by URL because the model occasionally calls the tool twice with
  // overlapping filters.
  const allListings: ListingCard[] = []
  const seenUrls = new Set<string>()

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
      const assistantText = stripRedundantLinks(msg.content ?? '')
      // Persist turn in bot_chats / bot_messages so the admin inbox
      // sees the conversation. Failures here never block the user.
      if (session && lastUserMessage) {
        logAssistantTurn({
          chatId: session.chatId,
          isNew: session.isNew,
          userText: lastUserMessage,
          assistantText,
          lang,
        }).catch(err => console.error('[chat] log turn:', err))
      }
      const headers: Record<string, string> = {}
      if (session?.setCookieHeader) headers['set-cookie'] = session.setCookieHeader
      return Response.json({
        message: { role: 'assistant', content: assistantText },
        listings: allListings,
        usage: completion.usage,
      }, { headers })
    }

    for (const tc of msg.tool_calls) {
      if (tc.type !== 'function') continue
      const result = await executeToolCall(tc.function.name, tc.function.arguments)
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      })
      if (tc.function.name === 'search_listings') {
        try {
          const parsed = JSON.parse(result) as { results?: ListingCard[] }
          for (const card of parsed.results ?? []) {
            if (card?.url && !seenUrls.has(card.url)) {
              seenUrls.add(card.url)
              allListings.push(card)
            }
          }
        } catch { /* ignore */ }
      }
    }
  }

  const fallbackText = 'Извините, не получилось довести запрос до конца. Попробуйте переформулировать.'
  if (session && lastUserMessage) {
    logAssistantTurn({
      chatId: session.chatId,
      isNew: session.isNew,
      userText: lastUserMessage,
      assistantText: fallbackText,
      lang,
    }).catch(err => console.error('[chat] log turn (fallback):', err))
  }
  const headers: Record<string, string> = {}
  if (session?.setCookieHeader) headers['set-cookie'] = session.setCookieHeader
  return Response.json({
    message: { role: 'assistant', content: fallbackText },
    listings: allListings,
  }, { headers })
}
