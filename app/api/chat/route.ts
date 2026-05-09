import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { getSystemPrompt, TOOLS, executeToolCall, ensureFeedbackBucket, type ListingCard } from '@/lib/consultant'
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

type WishlistEntry = {
  kind: string
  slug: string
  title?: string | null
  district?: string | null
  priceUsd?: number | null
  bedrooms?: number | null
  area?: number | null
}
type RecentEntry = { kind: string; slug: string; title?: string | null; at?: string }
type UserContext = { wishlist?: WishlistEntry[]; recentlyViewed?: RecentEntry[] }

const KIND_LABEL_RU: Record<string, string> = {
  villa: 'вилла', apartment: 'апартаменты', complex: 'ЖК', developer: 'застройщик',
  rental: 'аренда', event: 'событие', news: 'новость', promo: 'акция', knowledge: 'статья',
}
const KIND_LABEL_EN: Record<string, string> = {
  villa: 'villa', apartment: 'apartment', complex: 'complex', developer: 'developer',
  rental: 'rental', event: 'event', news: 'news', promo: 'promo', knowledge: 'guide',
}

// Build a short system message describing the visitor's catalog
// footprint so Балина can refer to wishlist + recently-viewed
// listings without re-asking. Skipped entirely when both lists
// are empty so we don't burn tokens on a useless preamble.
function buildUserContextSystemMessage(ctx: UserContext, lang: 'ru' | 'en'): string | null {
  const wl = (ctx.wishlist ?? []).slice(0, 10)
  const rv = (ctx.recentlyViewed ?? []).slice(0, 6)
  if (wl.length === 0 && rv.length === 0) return null

  const labels = lang === 'en' ? KIND_LABEL_EN : KIND_LABEL_RU
  const lines: string[] = []

  if (lang === 'ru') {
    lines.push('КОНТЕКСТ ПОСЕТИТЕЛЯ (с прошлых сессий и текущей навигации, не из этого диалога — не подтверждай факт «как я вижу», а используй естественно):')
  } else {
    lines.push('VISITOR CONTEXT (from prior sessions and current browsing — do not say "I see you have…", just use it naturally):')
  }

  if (wl.length > 0) {
    lines.push(lang === 'ru' ? '\nЛайки (избранное):' : '\nWishlist:')
    for (const it of wl) {
      const kindLabel = labels[it.kind] ?? it.kind
      const bits: string[] = []
      if (it.district) bits.push(it.district)
      if (it.bedrooms != null) bits.push(`${it.bedrooms}BR`)
      if (it.area != null) bits.push(`${it.area} м²`)
      if (it.priceUsd != null) bits.push(`$${Math.round(it.priceUsd).toLocaleString('en-US')}`)
      lines.push(`  • [${kindLabel}] ${it.title ?? it.slug}${bits.length ? ' — ' + bits.join(', ') : ''}`)
    }
  }

  if (rv.length > 0) {
    lines.push(lang === 'ru' ? '\nНедавно открывал страницы (свежие → старые):' : '\nRecently viewed (newest first):')
    for (const it of rv) {
      const kindLabel = labels[it.kind] ?? it.kind
      lines.push(`  • [${kindLabel}] ${it.title ?? it.slug}`)
    }
  }

  if (lang === 'ru') {
    lines.push('\nКак использовать: если посетитель спрашивает «сравни», «что лучше», «есть похожее» — опирайся на этот список. Если из него уже видно бюджет/район/спальни — не переспрашивай, действуй.')
  } else {
    lines.push('\nHow to use: if the visitor says "compare", "which is better", "anything similar" — anchor on this list. If budget / district / bedrooms are already implied by it, don\'t re-ask.')
  }

  return lines.join('\n')
}

// Funnel stage = how warm the visitor is. Drives tone: browsing
// → wide & exploratory; comparing → side-by-side detail; ready →
// money / mortgage / managers. Computed cheaply from message
// volume + wishlist size + recent decision-y phrases. The model
// gets a single label, not the heuristic.
type FunnelStage = 'browsing' | 'comparing' | 'ready'
function detectFunnelStage(
  messages: IncomingMessage[],
  ctx: UserContext,
  lastUserMessage: string,
): FunnelStage {
  const wlCount = (ctx.wishlist ?? []).length
  const rvCount = (ctx.recentlyViewed ?? []).length
  const userMsgs = messages.filter(m => m.role === 'user').length
  const text = lastUserMessage.toLowerCase()

  // Decision/transaction triggers — same set in RU + EN.
  const READY_HINTS = [
    'ипотек', 'mortgage', 'оплат', 'payment', 'договор', 'contract',
    'забронир', 'reserve', 'купить', 'buy', 'покуп', 'покажи менеджер',
    'связаться', 'contact', 'manager', 'визит', 'visit', 'осмотр', 'viewing',
    'whatsapp', 'телеграм', 'telegram', 'сделка', 'deal', 'юрист', 'lawyer',
  ]
  if (READY_HINTS.some(h => text.includes(h))) return 'ready'

  // Comparing — multiple shortlist items OR explicit comparison ask.
  const COMPARE_HINTS = ['сравни', 'compare', 'что лучше', 'which is better', 'разница', 'difference', 'или']
  if (wlCount >= 2 || rvCount >= 3 || COMPARE_HINTS.some(h => text.includes(h))) return 'comparing'
  if (userMsgs >= 4) return 'comparing'

  return 'browsing'
}

function funnelStageDirective(stage: FunnelStage, lang: 'ru' | 'en'): string {
  if (lang === 'ru') {
    if (stage === 'ready') return 'СТАДИЯ: ready — посетитель готов действовать. Тон: коротко, конкретно, цифры/сроки. После ответа предложи связь с менеджером (через [CHIPS] или явно).'
    if (stage === 'comparing') return 'СТАДИЯ: comparing — посетитель сравнивает варианты. Тон: бок-о-бок, плюсы/минусы каждого, без воды. Можно подсветить лучший по критерию.'
    return 'СТАДИЯ: browsing — посетитель в поиске. Тон: широко, спрашивай уточняющий бюджет/район/цель, предлагай 2-4 варианта.'
  }
  if (stage === 'ready') return 'STAGE: ready — visitor is ready to act. Tone: short, concrete, numbers/dates. After your answer offer a manager handoff (via [CHIPS] or explicitly).'
  if (stage === 'comparing') return 'STAGE: comparing — visitor is weighing options. Tone: side-by-side, pros/cons, no fluff. Call out the winner by criterion.'
  return 'STAGE: browsing — visitor is exploring. Tone: open, ask for budget/district/goal, surface 2-4 options.'
}

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

  const userContext: UserContext = (body as { userContext?: UserContext }).userContext ?? {}

  // Lazy-create the feedback bucket on first chat (cheap idempotent call).
  await ensureFeedbackBucket().catch(() => null)

  // Resolve / create the visitor's assistant session BEFORE the
  // model call so we have a chat_id to log against. The user's
  // last message in `incoming` is what we'll persist as the inbound
  // turn — earlier history is already in the DB from prior calls.
  const session = await ensureAssistantSession().catch(() => null)
  const lastUserMessage = [...trimmed].reverse().find(m => m.role === 'user')?.content ?? ''

  const client = new OpenAI({ apiKey })
  const basePrompt = await getSystemPrompt()
  const systemPrompt = lang === 'en' ? basePrompt + EN_LANG_DIRECTIVE : basePrompt

  // Per-turn dynamic context: visitor's wishlist + recently-viewed
  // pages + funnel stage. Both go in as separate system messages
  // so the static prompt stays cacheable while these turn-specific
  // bits ride along fresh each call.
  const userContextMsg = buildUserContextSystemMessage(userContext, lang)
  const stage = detectFunnelStage(trimmed, userContext, lastUserMessage)
  const stageDirective = funnelStageDirective(stage, lang)

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...(userContextMsg ? [{ role: 'system' as const, content: userContextMsg }] : []),
    { role: 'system', content: stageDirective },
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
