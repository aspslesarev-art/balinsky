// Balina inside the Telegram bot.
//
// When the bot receives a non-command text or voice message in a
// private chat, route it to Balina (the AI consultant) and reply
// with her answer + listing cards as separate sendPhoto messages.
//
// Reuses lib/consultant for SYSTEM_PROMPT, TOOLS, and executeToolCall —
// the assistant's behaviour is the same as on the web. The only
// differences are:
//   1. Output format: HTML messages instead of React cards. Listings
//      render as photo-cards (sendPhoto + HTML caption).
//   2. History: pulled from bot_messages (the existing log) so the
//      conversation persists across days without extra storage.
//   3. Voice input: downloaded from Telegram and transcribed via
//      OpenAI Whisper before being passed as a user turn.
//   4. Soft daily limit per chat to avoid runaway OpenAI cost from
//      a single bored visitor.
//
// Operator-handover (`shouldBotAutoReply`) is checked OUTSIDE this
// module by the route — same pattern the existing fallback uses.

import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { getSystemPrompt, TOOLS, executeToolCall, type ListingCard } from '@/lib/consultant'
import { listMessages, logMessage } from '@/lib/bot-storage'
import { downloadTelegramFile } from '@/lib/chat-media'

const MAX_HISTORY = 24                  // rows pulled from bot_messages → assistant context
const MAX_TOOL_HOPS = 4
const MAX_LISTING_CARDS = 5             // top-N to actually send as photos
const DAILY_LIMIT_PER_CHAT = 30         // outbound assistant messages per 24 h

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// === public entry: handle one inbound message ============================

export async function replyAsBalina({
  chatId, token, lang = 'ru', userText, voiceFileId,
}: {
  chatId: number
  token: string
  lang?: 'ru' | 'en'
  userText?: string
  voiceFileId?: string | null
}): Promise<{ handled: boolean; reason?: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { handled: false, reason: 'no_openai_key' }

  // Show "печатает…" in Telegram for the entire turn so the visitor
  // sees the bot is alive while we transcribe / call OpenAI / send
  // photo cards. Telegram's chat-action expires after ~5 s, so we
  // re-ping every 4 s. A single stopper at the end clears the
  // interval no matter which exit path we take.
  const stopTyping = startTypingPing(token, chatId)
  try {
    return await runTurn(apiKey, { chatId, token, lang, userText, voiceFileId })
  } finally {
    stopTyping()
  }
}

async function runTurn(
  apiKey: string,
  { chatId, token, lang, userText, voiceFileId }: {
    chatId: number; token: string; lang: 'ru' | 'en'; userText?: string; voiceFileId?: string | null
  },
): Promise<{ handled: boolean; reason?: string }> {

  // Soft rate limit — count assistant outbound in the last 24h. We
  // do this BEFORE Whisper so a bored visitor can't burn quota on
  // transcriptions either.
  if (await isOverDailyLimit(chatId)) {
    await sendText(token, chatId, lang === 'en'
      ? `Daily message limit reached for this chat (${DAILY_LIMIT_PER_CHAT}/day). Try again tomorrow, or open <a href="https://balinsky.info">balinsky.info</a> — there's no limit on the website.`
      : `На сегодня лимит сообщений по этому чату исчерпан (${DAILY_LIMIT_PER_CHAT}/сутки). Попробуйте завтра или откройте <a href="https://balinsky.info">balinsky.info</a> — на сайте без лимита.`)
    return { handled: true, reason: 'rate_limited' }
  }

  // Voice → transcribe to text. If transcription fails we tell the
  // user explicitly rather than silently dropping their message.
  let textIn = userText?.trim() ?? ''
  if (!textIn && voiceFileId) {
    const client = new OpenAI({ apiKey })
    const transcript = await transcribeVoice(client, token, voiceFileId).catch(err => {
      console.error('[balina-tg] transcribe failed:', err)
      return null
    })
    if (!transcript) {
      await sendText(token, chatId, lang === 'en'
        ? 'Sorry, I couldn\'t transcribe that voice message. Try sending it as text?'
        : 'Не получилось распознать голосовое. Можно текстом?')
      return { handled: true, reason: 'transcribe_failed' }
    }
    textIn = transcript
    // Persist the transcript as a separate "in" row so the chat
    // history shows what we actually heard. The original voice was
    // already logged with media_type=voice by the route.
    await logMessage({
      chat_id: chatId, direction: 'in', source: 'user',
      text: `🎙 «${transcript}»`, media_type: null,
    }).catch(() => {})
  }
  if (!textIn) return { handled: false, reason: 'no_text' }

  // Build history from bot_messages — last MAX_HISTORY rows. We
  // skip rows whose text starts with `/` (commands) and rows from
  // the bot's own boilerplate fallback so the model's working
  // memory is the actual conversation.
  const history = await loadHistory(chatId)
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: await getSystemPrompt() },
    {
      role: 'system',
      content: lang === 'en'
        ? [
            'CHANNEL: Telegram, NOT the website. Hard rules:',
            '1. SHORT. 3–5 lines max. NEVER repeat listing facts (price, area, lease, land, status) in prose — the cards already show all of that. Listing those again is the single most annoying thing you can do here.',
            '2. NO [CHIPS] blocks (Telegram won\'t render them).',
            '3. NO raw URLs in prose — listing cards are separate photo messages with tap-through buttons.',
            '4. SEARCH-RESULT REPLY TEMPLATE — use this shape every time you return cards:',
            '     Line 1: short ack — "Окей, ниже 5 вариантов под твой запрос."',
            '     Line 2: self-assess — honestly estimate match-confidence as a percent ("Сейчас понимаю запрос примерно на ~30 %") based on how many of the key dials are filled (goal, budget, district, bedrooms, beach proximity, str_only, готовность, leasehold).',
            '     Lines 3–5: list the 2–4 SPECIFIC missing parameters that would push to 100 %, picked from what\'s actually not yet known. Each as a short bullet with an example. NOT generic "район / бюджет / спален" — be concrete and useful.',
            '   Then the cards. Nothing else after.',
            '5. If the user names a SPECIFIC property ("почему не показал X", "что про Y"), call search_listings with query="<name>" and try kind=villa first; if 0, try kind=apartment, then kind=complex. Don\'t guess — find or say "под этим именем не нашёл, проверь написание".',
          ].join(' ')
        : [
            'КАНАЛ: Telegram, не сайт. Жёсткие правила:',
            '1. КРАТКО. 3–5 строк максимум. НИКОГДА не повторяй данные из карточек (цена, площадь, лизхолд, земля, статус) в тексте — это самое раздражающее что можно сделать. Карточки уже всё показывают.',
            '2. НЕ выводи блоки [CHIPS] — Telegram их не рендерит.',
            '3. НЕ вставляй URL-ы в текст — карточки приходят отдельными сообщениями с фото и кнопкой.',
            '4. ШАБЛОН ОТВЕТА С ПОИСКОМ — используй ровно эту структуру каждый раз когда отдаёшь карточки:',
            '     Строка 1: короткое ack — «Окей, ниже 5 вариантов под твой запрос.»',
            '     Строка 2: честно оцени насколько ты понял запрос в процентах («Сейчас понимаю запрос примерно на ~30 %») — исходя из того, сколько ключевых параметров заполнено (цель, бюджет, район, спальни, близость к морю, str_only, готовность, лизхолд).',
            '     Строки 3–5: перечисли 2–4 КОНКРЕТНЫХ недостающих параметра которые помогут попасть в 100 %, выбирая из того что реально ещё не известно. Каждый — отдельным буллитом с примером. НЕ обобщённое «район / бюджет / спальни», а конкретно, по делу.',
            '   Потом карточки. Больше ничего.',
            '5. Если посетитель называет КОНКРЕТНЫЙ объект по имени («почему не показал X», «что про Y», «а Maison Boheme?») — вызови search_listings с query="<имя>" и попробуй kind=villa, если 0 — попробуй kind=apartment, потом kind=complex. Не гадай — либо найди и расскажи, либо честно скажи «под этим именем не нашёл, проверь написание».',
            '6. ⚠️ КРИТИЧНО: Никогда НЕ выдумывай конкретные виллы, проекты, районы как «варианты». Если в этом ходу ты НЕ вызвала search_listings — НЕЛЬЗЯ упоминать «Вилла в Нуса-Дуа», «Вилла в Чангу» и т.п. в виде списка вариантов. Если посетитель ждёт варианты, а ты не вызвала search_listings — это твоя ошибка, исправь: вызови tool ПЕРЕД ответом. Никаких списков из головы, только из tool результата.',
            '',
            'ПРИМЕР ИДЕАЛЬНОГО ОТВЕТА с поиском:',
            '«Окей, ниже 5 вариантов под твой запрос.',
            'Сейчас понимаю запрос примерно на ~30 % — без этого не попаду точнее:',
            '— бюджет (например, до $300k или $300–500k)',
            '— готовность (сдан / строится / котлован)',
            '— важна ли близость к серфу или нужен пологий вход для семьи',
            'Уточни — пришлю подборку точнее.»',
            '(дальше идут карточки)',
          ].join('\n'),
    },
    ...history,
    { role: 'user', content: textIn },
  ]

  const client = new OpenAI({ apiKey })
  const allListings: ListingCard[] = []
  const seenUrls = new Set<string>()

  // Force a tool call on the first hop when the visitor's message
  // clearly requests listings — gpt-4o-mini was hallucinating
  // villa names from training data instead of going to the catalog.
  // Once a tool result is in the conversation we drop back to
  // 'auto' so follow-up turns can answer general questions without
  // a forced search.
  const wantsListings = looksLikeListingRequest(textIn)

  for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
    const toolChoice: 'required' | 'auto' = (hop === 0 && wantsListings) ? 'required' : 'auto'
    const completion = await client.chat.completions.create({
      // gpt-4o (not -mini) for Telegram: better instruction-following,
      // 8× pricing but daily cap + low Telegram volume keep cost
      // bounded. Saw -mini hallucinate villas + ignore the no-prose-
      // facts directive, so the upgrade pays for itself in fewer
      // bad responses.
      model: 'gpt-4o',
      messages,
      tools: TOOLS,
      tool_choice: toolChoice,
      temperature: 0.5,
    })
    const choice = completion.choices[0]
    const msg = choice.message
    messages.push(msg)

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const assistantText = stripChipsAndUrls(msg.content ?? '')

      // Send the prose first, then up to MAX_LISTING_CARDS as
      // photo messages (Telegram doesn't allow >10 photos in one
      // sendMediaGroup call and per-message photos let us include
      // a tap-through "Открыть" inline button per object).
      if (assistantText) {
        const sent = await sendText(token, chatId, htmlSanitize(assistantText))
        if (sent) {
          await logMessage({
            chat_id: chatId, direction: 'out', source: 'bot',
            text: assistantText, media_type: null,
          }).catch(() => {})
        }
      }

      for (const card of allListings.slice(0, MAX_LISTING_CARDS)) {
        await sendListingCard(token, chatId, card, lang)
      }

      return { handled: true }
    }

    // Process tool calls; collect ListingCards from search_listings.
    for (const tc of msg.tool_calls) {
      if (tc.type !== 'function') continue

      // Server-side safety net for the most common model failure
      // mode: visitor said "у океана / в пешей доступности к морю"
      // and the model called search_listings WITHOUT
      // max_distance_to_beach. We mutate the args here so the tool
      // applies the coastal whitelist + post-filter the result so
      // any inland match (Убуд / Табанан / Бедугул etc) gets
      // dropped even if Airtable's district field was unusual.
      const enforcedArgs = enforceConstraintsFromHistory(tc.function.name, tc.function.arguments, textIn, history)
      const result = await executeToolCall(tc.function.name, enforcedArgs)
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      })
      let parsed: unknown = null
      try { parsed = JSON.parse(result) } catch { /* tool returned non-json — ignore */ }
      const r = parsed as { results?: ListingCard[] } | null
      if (r && Array.isArray(r.results)) {
        const filtered = postFilterCards(r.results, textIn, history)
        for (const c of filtered) {
          if (!seenUrls.has(c.url)) { seenUrls.add(c.url); allListings.push(c) }
        }
      }
    }
  }

  return { handled: true, reason: 'max_hops' }
}

// === voice → text via OpenAI Whisper =====================================

async function transcribeVoice(client: OpenAI, token: string, fileId: string): Promise<string | null> {
  const file = await downloadTelegramFile(token, fileId)
  if (!file) return null
  // OpenAI's audio.transcriptions.create wants a File-like input.
  // The Web `File` constructor exists in Node 20+ and works with
  // the OpenAI SDK out of the box.
  const blob = new File([new Uint8Array(file.buf)], 'voice.ogg', { type: file.mime || 'audio/ogg' })
  const r = await client.audio.transcriptions.create({
    file: blob,
    model: 'whisper-1',
  })
  return (r.text ?? '').trim() || null
}

// Inland districts that should NEVER appear when the visitor asked
// for ocean / beach proximity. Mirrors the list in lib/consultant.ts
// + lib/subscriptions.ts. Kept in sync by hand because importing
// would create a circular module graph; the set is short and
// stable enough that drift is acceptable.
const INLAND_TOKENS = [
  'убуд', 'ubud', 'табан', 'tabanan', 'бедугул', 'bedugul',
  'мундук', 'munduk', 'кинтамани', 'kintamani', 'сидеман',
  'sideman', 'sidemen', 'паянган', 'payangan',
  'тегаллаланг', 'tegallalang', 'tegalalang',
]

// Detect ocean intent across the immediate user message + recent
// history. Conservative — once the visitor said "у океана" we
// keep enforcing the coastal filter for the rest of the chat unless
// they explicitly say "не важно где" / "и горы тоже".
function userWantsOcean(userText: string, history: ChatCompletionMessageParam[]): boolean {
  const OCEAN_RE = /океан|у мор[яею]\b|прибрежн|пляж|у воды|на пляж|beachfront|beach\b|ocean|seaside|sea\b|surf|waves/i
  if (OCEAN_RE.test(userText)) return true
  // Skim last 10 user turns from history.
  const recentUserText = history
    .filter(m => m.role === 'user' && typeof m.content === 'string')
    .slice(-10)
    .map(m => String(m.content))
    .join(' ')
  return OCEAN_RE.test(recentUserText)
}

// If the model called search_listings without max_distance_to_beach
// despite the visitor asking for the ocean, splice it in. JSON-parse
// the model's args, mutate, JSON-stringify back. Safe because
// executeToolCall expects a string and parses with try/catch.
function enforceConstraintsFromHistory(
  toolName: string,
  rawArgs: string,
  userText: string,
  history: ChatCompletionMessageParam[],
): string {
  if (toolName !== 'search_listings') return rawArgs
  if (!userWantsOcean(userText, history)) return rawArgs
  let args: Record<string, unknown>
  try { args = JSON.parse(rawArgs) ?? {} } catch { return rawArgs }
  if (typeof args.max_distance_to_beach !== 'string' || args.max_distance_to_beach === 'any') {
    args.max_distance_to_beach = 'walking'
  }
  return JSON.stringify(args)
}

// Last line of defence: drop any returned card whose district
// matches the inland blocklist when the visitor asked for the
// ocean. Catches cases where Airtable's "Location filter" doesn't
// align with our coastal whitelist heuristic in lib/consultant.ts.
function postFilterCards(
  cards: ListingCard[],
  userText: string,
  history: ChatCompletionMessageParam[],
): ListingCard[] {
  if (!userWantsOcean(userText, history)) return cards
  return cards.filter(c => {
    if (!c.district) return true
    const lower = c.district.toLowerCase()
    return !INLAND_TOKENS.some(t => lower.includes(t))
  })
}

// Heuristic: does the visitor's message look like a property-search
// request? If yes, force the first OpenAI hop to call a tool —
// otherwise gpt-4o(-mini) sometimes hallucinates "вилла в Чангу"
// from training data instead of querying the live catalog.
//
// We only check the immediate user message (not history) because
// follow-up clarifications ("Чангу" / "до $300k") should also
// trigger a fresh search, and they will because the keywords match.
function looksLikeListingRequest(text: string): boolean {
  const t = text.toLowerCase()
  // Property-type words OR explicit ask verbs OR price/bedroom hints.
  const PATTERNS = [
    /вилл/i, /villa/i,
    /апартамент/i, /apartment/i,
    /жк\b/i, /комплекс/i, /complex/i,
    /аренд/i, /rental/i, /сдат/i, /сним/i,
    /\bbr\b/i, /спален/i, /спальн/i, /bedroom/i,
    /до \$?\d/i, /\$\d+\s*k/i, /\$\d+\s*m/i, /бюджет/i, /budget/i,
    /найди/i, /покажи/i, /подбер/i, /варианты/i, /искать/i, /find/i, /show/i, /search/i,
    /у океана/i, /у моря/i, /near beach/i, /рядом с пляж/i,
    /чангу/i, /canggu/i, /берав/i, /berawa/i, /перенен/i, /pererenan/i, /букит/i, /bukit/i, /улуват/i, /uluwatu/i, /сануре/i, /sanur/i, /убуд/i, /ubud/i, /семинья/i, /seminyak/i, /джимбар/i, /jimbaran/i, /нуса.дуа/i, /nusa.dua/i,
  ]
  return PATTERNS.some(p => p.test(t))
}

// === Telegram chat-action (the "печатает…" indicator) ====================

// Telegram drops the indicator after ~5 seconds, so we re-ping
// every 4 s while the turn is processing. Returns a stopper that
// clears the interval; call it in a finally block so the typing
// indicator never gets stuck even on errors.
function startTypingPing(token: string, chatId: number, action: ChatAction = 'typing'): () => void {
  void sendChatAction(token, chatId, action)
  const id = setInterval(() => { void sendChatAction(token, chatId, action) }, 4000)
  return () => clearInterval(id)
}

type ChatAction = 'typing' | 'upload_photo' | 'record_voice' | 'upload_voice'

async function sendChatAction(token: string, chatId: number, action: ChatAction): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
    })
  } catch { /* indicator failures are not worth surfacing */ }
}

// === Telegram sender helpers =============================================

async function sendText(token: string, chatId: number, text: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    return r.ok
  } catch (err) { console.error('[balina-tg] sendMessage:', err); return false }
}

async function sendListingCard(token: string, chatId: number, card: ListingCard, lang: 'ru' | 'en'): Promise<void> {
  const caption = formatCaption(card, lang)
  const openLabel = lang === 'en' ? 'Open' : 'Открыть'
  const reply_markup = {
    inline_keyboard: [[
      { text: `🔗 ${openLabel}`, url: card.url },
    ]],
  }
  // Brief "uploading photo…" hint before the actual sendPhoto so
  // the visitor sees a per-card progress beat instead of a wall of
  // silence between the prose and the cards.
  if (card.photo) void sendChatAction(token, chatId, 'upload_photo')
  try {
    if (card.photo) {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: card.photo,
          caption,
          parse_mode: 'HTML',
          reply_markup,
        }),
      })
      if (r.ok) return
      // Fall through to text-only on photo failure — Telegram is
      // strict about photo URLs (size limits, signed URLs expire).
    }
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: caption,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
        reply_markup,
      }),
    })
  } catch (err) {
    console.error('[balina-tg] sendListingCard:', err)
  }
}

// Compact card caption — title (linked), 1 line of facts, optional
// 1 line of investment cues. Capped at Telegram's 1024-char caption
// limit with safety margin.
function formatCaption(card: ListingCard, lang: 'ru' | 'en'): string {
  const facts: string[] = []
  if (card.district) facts.push(escape(card.district))
  if (card.bedrooms != null) facts.push(`${card.bedrooms} BR`)
  if (card.area_sqm != null) facts.push(`${card.area_sqm} м²`)
  if (card.price_usd != null) facts.push(`$${card.price_usd.toLocaleString('en-US')}`)
  else if (card.rent_per_month_usd != null) facts.push(`$${card.rent_per_month_usd.toLocaleString('en-US')}/мес`)
  if (card.price_per_sqm_usd != null) facts.push(`$${card.price_per_sqm_usd.toLocaleString('en-US')}/м²`)

  const investBits: string[] = []
  if (card.cap_rate_good != null) investBits.push(`cap rate (good) ${(card.cap_rate_good * 100).toFixed(1)}%`)
  if (card.land_zone && card.land_zone !== 'unknown') investBits.push(`land ${card.land_zone}`)
  if (card.lease_years != null) investBits.push(`лизхолд ${card.lease_years}л`)

  const lines = [
    `🏡 <b>${escape(card.title)}</b>`,
    facts.join(' · '),
  ]
  if (investBits.length > 0) lines.push(`<i>${investBits.join(' · ')}</i>`)
  const out = lines.filter(Boolean).join('\n')
  if (lang === 'en') {
    // simple swap for ru-only labels
    return out.replace(/лизхолд (\d+)л/g, 'lease $1y').replace(/\$(\S+)\/мес/, '$$$1/mo').replace(/(\d+) м²/g, '$1 m²')
  }
  return out
}

// Strip the model's [CHIPS] block + bare URLs (Telegram will render
// listing cards separately, prose shouldn't compete with them).
function stripChipsAndUrls(text: string): string {
  return text
    .replace(/\[CHIPS\][^\n]*/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Ensure Telegram-safe HTML — escape angle brackets except for the
// model's intended <b> / <i> formatting (we don't intentionally
// emit those, but stay defensive). The model is told to write
// plain text, so practically this just escapes.
function htmlSanitize(text: string): string {
  return escape(text)
}

// === history =============================================================

async function loadHistory(chatId: number): Promise<ChatCompletionMessageParam[]> {
  const rows = await listMessages(chatId, 200)
  // Take the most recent MAX_HISTORY non-command, non-empty rows.
  const filtered = rows
    .filter(r => r.text && r.text.trim() && !r.text.trim().startsWith('/'))
    .slice(-MAX_HISTORY)
  return filtered.map(r => ({
    role: r.direction === 'in' ? 'user' as const : 'assistant' as const,
    content: r.text!.replace(/^🎙 «(.+)»$/, '$1'),
  }))
}

// === rate limit ==========================================================

async function isOverDailyLimit(chatId: number): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()
  // Reuse listMessages — bounded to 200 rows which is more than
  // enough for a daily-cap check.
  const rows = await listMessages(chatId, 200)
  const count = rows.filter(r => r.direction === 'out' && r.source === 'bot' && r.created_at >= since).length
  return count >= DAILY_LIMIT_PER_CHAT
}
