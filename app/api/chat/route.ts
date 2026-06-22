import { AzureOpenAI } from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { getSystemPrompt, TOOLS, executeToolCall, ensureFeedbackBucket, type ListingCard } from '@/lib/consultant'
import { ensureAssistantSession, logAssistantTurn } from '@/lib/assistant-session'
import { logUsage, overDailySpendCap } from '@/lib/usage-tracker'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TOOL_HOPS = 4
const MAX_INPUT_MESSAGES = 14
// Abuse guards for this unauthenticated, paid (gpt-5.4) endpoint.
const RL_MAX = 20            // requests
const RL_WINDOW_MS = 60_000  // per minute per IP
const MAX_MSG_CHARS = 8_000  // per message
const MAX_TOTAL_CHARS = 32_000 // combined across the kept messages

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
type CurrentPage = {
  kind: string
  slug: string
  url: string
  title?: string | null
  airtableId?: string | null
}
type UserContext = {
  wishlist?: WishlistEntry[]
  recentlyViewed?: RecentEntry[]
  currentPage?: CurrentPage | null
}

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
// Strong, separate system message for the page the visitor is staring
// at right now. Kept apart from the wishlist/recently-viewed block
// because it's a completely different signal: "current focus" >
// "history". The model needs to treat any "эту виллу / этот объект /
// здесь / тут" as referring to THIS slug, not ask "о какой вилле речь".
function buildCurrentPageSystemMessage(cp: CurrentPage | null | undefined, lang: 'ru' | 'en'): string | null {
  if (!cp) return null
  const labelsRu: Record<string, string> = {
    villa: 'виллы', apartment: 'апартаментов', complex: 'жилого комплекса',
    developer: 'застройщика', rental: 'арендной виллы', event: 'события',
    promo: 'акции', news: 'новости', knowledge: 'статьи',
  }
  const labelsEn: Record<string, string> = {
    villa: 'villa', apartment: 'apartment', complex: 'complex',
    developer: 'developer', rental: 'rental', event: 'event',
    promo: 'promo', news: 'news', knowledge: 'guide',
  }
  if (lang === 'ru') {
    const what = labelsRu[cp.kind] ?? cp.kind
    return [
      'ТЕКУЩАЯ СТРАНИЦА — посетитель прямо сейчас СМОТРИТ на эту страницу:',
      `- Тип: ${what}`,
      `- Название: ${cp.title ?? '(пока не получено, используй slug)'}`,
      `- Slug: ${cp.slug}`,
      `- URL: ${cp.url}`,
      '',
      'ОБЯЗАТЕЛЬНО: на любой вопрос вида «что скажешь про эту виллу / этот объект / тут / здесь / эти апартаменты» — это ИМЕННО этот объект, не переспрашивай «о какой вилле речь».',
      `Подними свежие данные через search_listings({ kind: '${cp.kind}', slug: '${cp.slug}' }) и сразу разверни экспертный комментарий по нашему шаблону (топ-выбор / риски / что брать / что не брать) применительно к этому объекту. Карточку UI отрисует сам.`,
    ].join('\n')
  }
  const what = labelsEn[cp.kind] ?? cp.kind
  return [
    `CURRENT PAGE — the visitor is RIGHT NOW looking at this ${what} page:`,
    `- Title: ${cp.title ?? '(not captured yet, use the slug)'}`,
    `- Slug: ${cp.slug}`,
    `- URL: ${cp.url}`,
    '',
    'IMPORTANT: any question like "what about this villa / this listing / what do you think of it / how is the yield here" — refers to THIS listing. Do not ask "which villa do you mean".',
    `Fetch fresh data via search_listings({ kind: '${cp.kind}', slug: '${cp.slug}' }) and run the expert-commentary template (top pick / risks / what to take / what to skip) on this exact listing. The UI renders the card itself.`,
  ].join('\n')
}

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
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview'
  const chatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? 'gpt-5.4'
  if (!apiKey || !endpoint) {
    return Response.json({ error: 'Azure OpenAI is not configured on the server' }, { status: 500 })
  }

  // Rate limit per IP — blunts scripted cost-amplification abuse.
  if (!rateLimit(`chat:${clientIp(req)}`, RL_MAX, RL_WINDOW_MS)) {
    return Response.json({ error: 'rate_limited' }, { status: 429 })
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
  // Clamp input size before it reaches the LLM — caps per-request token
  // cost (each message bounded, and total bounded) regardless of how much
  // text the client sends.
  const trimmed = incoming.slice(-MAX_INPUT_MESSAGES).map(m => ({
    ...m,
    content: m.content.length > MAX_MSG_CHARS ? m.content.slice(0, MAX_MSG_CHARS) : m.content,
  }))
  let budget = MAX_TOTAL_CHARS
  for (let i = trimmed.length - 1; i >= 0; i--) {
    if (budget <= 0) { trimmed.splice(0, i + 1); break }
    if (trimmed[i].content.length > budget) trimmed[i] = { ...trimmed[i], content: trimmed[i].content.slice(0, budget) }
    budget -= trimmed[i].content.length
  }

  // Daily Azure spend ceiling — hard stop on cost-DoS. Returns a graceful
  // assistant message so the widget shows it instead of an error.
  if (await overDailySpendCap()) {
    const text = lang === 'en'
      ? 'The assistant is taking a short break and will be back soon. Meanwhile you can browse the catalog or leave a request — a manager will get back to you.'
      : 'Ассистент временно недоступен и скоро вернётся. Пока можно посмотреть каталог или оставить заявку — менеджер свяжется с вами.'
    return Response.json({ message: { role: 'assistant', content: text }, listings: [] }, { status: 200 })
  }

  const userContext: UserContext = (body as { userContext?: UserContext }).userContext ?? {}

  // Lazy-create the feedback bucket on first chat (cheap idempotent call).
  await ensureFeedbackBucket().catch(() => null)

  // Resolve / create the visitor's assistant session BEFORE the
  // model call so we have a chat_id to log against. The user's
  // last message in `incoming` is what we'll persist as the inbound
  // turn — earlier history is already in the DB from prior calls.
  const session = await ensureAssistantSession().catch(() => null)
  const lastUserMessage = [...trimmed].reverse().find(m => m.role === 'user')?.content ?? ''

  const client = new AzureOpenAI({ apiKey, endpoint, apiVersion })
  const basePrompt = await getSystemPrompt()
  const systemPrompt = lang === 'en' ? basePrompt + EN_LANG_DIRECTIVE : basePrompt

  // Per-turn dynamic context: visitor's wishlist + recently-viewed
  // pages + funnel stage. Both go in as separate system messages
  // so the static prompt stays cacheable while these turn-specific
  // bits ride along fresh each call.
  const currentPageMsg = buildCurrentPageSystemMessage(userContext.currentPage ?? null, lang)
  const userContextMsg = buildUserContextSystemMessage(userContext, lang)
  const stage = detectFunnelStage(trimmed, userContext, lastUserMessage)
  const stageDirective = funnelStageDirective(stage, lang)

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    // currentPage goes FIRST among the dynamic blocks because it's
    // the strongest signal — what the visitor is actively looking at
    // beats their wishlist, recent history, and stage classification.
    ...(currentPageMsg ? [{ role: 'system' as const, content: currentPageMsg }] : []),
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
      // Azure OpenAI: `model` is the DEPLOYMENT name, configured via
      // AZURE_OPENAI_CHAT_DEPLOYMENT (default gpt-5.4 — provisioned in
      // the balinski-ai-service resource, eastus). Switched off
      // gpt-4o-mini because gpt-5.4 quality difference is meaningful
      // for the broker tone we want and the $1k Azure credit gives
      // us years of runway at current chat volumes.
      model: chatDeployment,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.5,
    })
    // Log Azure spend per chat hop — fire-and-forget.
    logUsage({
      feature: 'chat-web',
      deployment: chatDeployment,
      promptTokens: completion.usage?.prompt_tokens ?? 0,
      completionTokens: completion.usage?.completion_tokens ?? 0,
      meta: { hop, chat_id: session?.chatId ?? null },
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
      if (tc.function.name === 'search_listings' || tc.function.name === 'semantic_search') {
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
