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
import { appendLearnedRule } from '@/lib/assistant-knowledge'
import { listMessages, logMessage } from '@/lib/bot-storage'
import { downloadTelegramFile } from '@/lib/chat-media'

const MAX_HISTORY = 24                  // rows pulled from bot_messages → assistant context
const MAX_TOOL_HOPS = 4
const MAX_LISTING_CARDS = 5             // top-N to actually send as photos

// Trainer mode is owner-only — random visitors saying "запомни" must
// not be able to mutate the system prompt. Hardcoded default keeps
// it working out of the box; comma-separated env var
// BALINA_OWNER_CHAT_IDS can extend the set without a code change
// (still needs a deploy on Vercel, but no edit here).
const DEFAULT_OWNER_IDS = new Set<number>([555450800])
const OWNER_CHAT_IDS: Set<number> = (() => {
  const env = (process.env.BALINA_OWNER_CHAT_IDS ?? '').trim()
  if (!env) return DEFAULT_OWNER_IDS
  const set = new Set<number>(DEFAULT_OWNER_IDS)
  for (const tok of env.split(',')) {
    const n = Number(tok.trim())
    if (Number.isFinite(n)) set.add(n)
  }
  return set
})()
// Daily cap disabled — owner wants unlimited testing. Re-enable by
// setting this to a positive number; isOverDailyLimit returns false
// while it's null/<=0 so the gate becomes a no-op.
const DAILY_LIMIT_PER_CHAT: number | null = null

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

  // Trainer mode: "слушай и запоминай: <правило>" appends a line
  // to the learned_rules section in assistant_knowledge so future
  // turns honour the correction. Owner-gated — random visitors must
  // NOT be able to rewrite the system prompt. Non-owners get a
  // polite decline + their message is forwarded to Балина as a
  // normal turn (so they don't sit in a dead end).
  const correction = extractCorrection(textIn)
  if (correction) {
    if (!OWNER_CHAT_IDS.has(chatId)) {
      await sendText(token, chatId,
        '🔒 Обучение Балины доступно только владельцу. Ваше сообщение я обработаю как обычный запрос — пишите, что ищете.')
      // fall through into the normal chat flow with the original
      // text (still containing the trigger phrase — model can choose
      // to reply normally to it).
    } else {
      try {
        await appendLearnedRule(correction)
        await sendText(token, chatId, `✅ Запомнила: «${escape(correction)}»\n\n<i>В следующих ответах буду этого придерживаться. Все правки видно в /admin/balina.</i>`)
        await logMessage({
          chat_id: chatId, direction: 'out', source: 'bot',
          text: `Запомнила правку: ${correction}`, media_type: null,
        }).catch(() => {})
      } catch (err) {
        console.error('[balina-tg] appendLearnedRule failed:', err)
        await sendText(token, chatId, '❌ Не получилось сохранить правку. Попробуй ещё раз через минуту.')
      }
      return { handled: true, reason: 'correction_saved' }
    }
  }

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
            '5b. Когда запрос широкий (тип объекта — «вилла», «апарты», «жильё», «недвижка» — без явного отсева комплексов) — ВСЕГДА делай ДВА параллельных вызова search_listings: kind=villa И kind=complex с теми же фильтрами. Многие желанные объекты (Maison Boheme и аналоги) проходят как complex, а не villa, и теряются если искать только в одном bucket. Объедини результаты, отсортируй по релевантности и отдай топ-5.',
            '5c. Когда посетитель упомянул "белый песок / white sand" — это ЖЁСТКОЕ требование. Подходят ТОЛЬКО: Букит (Uluwatu, Bingin, Padang Padang, Balangan, Dreamland, Pecatu, Ungasan, Nusa Dua, Jimbaran, Pandawa, Melasti, Green Bowl), Сануре, Танджунг-Беноа, Амед, Туламбен. Чёрный песок — Чангу, Берава, Перененан, Семиньяк, Кута, Легиан, Сесех, Танах-Лот, Ньяньи, Кедунгу, Балиан, Медеви, Ловина — ИХ ИСКЛЮЧИ. Если в выборке вышли чёрно-песочные — переспроси search с query, ограниченным белыми районами.',
            '5d. Когда посетитель сказал "пешком до пляжа / в пешей доступности / walking distance" — даже Umalas, Kerobokan, Tibubeneng, Dalung, Padonan не подходят (они 1-2 км от воды). Только Berawa, Batu Bolong, Pererenan beachfront, Echo Beach, Seminyak beachfront, Jimbaran bay, Sanur beachfront, Bukit cliffside проектов с явным «beachfront / 1 минута / на пляже».',
            '6. ⚠️ КРИТИЧНО: Никогда НЕ выдумывай конкретные виллы, проекты, районы как «варианты». Если в этом ходу ты НЕ вызвала search_listings — НЕЛЬЗЯ упоминать «Вилла в Нуса-Дуа», «Вилла в Чангу» и т.п. в виде списка вариантов. Если посетитель ждёт варианты, а ты не вызвала search_listings — это твоя ошибка, исправь: вызови tool ПЕРЕД ответом. Никаких списков из головы, только из tool результата.',
            '7. ⚠️ ЖЁСТКО: после буллитов с недостающими параметрами — СТОП. НЕ пиши «Вот виллы которые подходят:», НЕ пиши «1. Вилла X», НЕ пиши «Ссылка на виллу». Карточки с фото и кнопками отрисуются автоматически отдельными сообщениями. Любое перечисление вилл в тексте — БАГ.',
            '8. ⚠️ ЧИСЛО ВАРИАНТОВ: когда говоришь «ниже N вариантов», бери N ИСКЛЮЧИТЕЛЬНО из длины массива results в последнем результате search_listings (после серверной фильтрации). Если в результате 1 объект — пиши «ниже 1 вариант». Если 0 — НЕ обещай карточек, скажи честно «под жёсткие фильтры (например, белый песок + пешком + 2BR) ничего не нашлось, могу расширить — что готов смягчить?»',
            '9. ГЛУБОКИЙ ИНСПЕКТ: на конкретные вопросы про объект («процент готовности у X?», «что внутри Y?», «когда сдают Z?», «есть ли бассейн / охрана / парковка?», «что в презентации?», «расскажи подробнее про W») — вызови get_listing_full({kind, slug}) с slug объекта (есть в URL карточки или из контекста). Это вернёт ВСЕ поля из Airtable — то же что видит человек на странице. Цитируй конкретные значения, а не общие фразы.',
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

      // Pass the FILTERED list to the model — not the raw tool result
      // — so the model's narration ("ниже 5 вариантов") matches
      // exactly what the visitor will actually receive. Without this
      // the model claimed N from the raw count and we sent K<N
      // actual cards, leaving the visitor with "Окей, ниже 6
      // вариантов" + 1 photo and asking "где они?".
      let parsed: unknown = null
      try { parsed = JSON.parse(result) } catch { /* tool returned non-json — ignore */ }
      const r = parsed as { results?: ListingCard[]; [k: string]: unknown } | null
      let toolContent = result
      if (r && Array.isArray(r.results)) {
        const filtered = postFilterCards(r.results, textIn, history)
        for (const c of filtered) {
          if (!seenUrls.has(c.url)) { seenUrls.add(c.url); allListings.push(c) }
        }
        const dropped = r.results.length - filtered.length
        const filteredPayload = {
          ...r,
          results: filtered,
          // Be explicit so the model knows what happened and can
          // honestly say "вышло мало" instead of pretending more
          // exist. Visible only in the model's tool-message context.
          _filtered_out: dropped > 0
            ? `${dropped} object(s) dropped by server-side white-sand / walking / inland filter`
            : undefined,
        }
        toolContent = JSON.stringify(filteredPayload)
      }

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: toolContent,
      })
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

// Inland districts + their sub-villages that should NEVER appear
// when the visitor asked for ocean / beach proximity. Includes
// known Ubud-area villages (Kedewatan, Singakerta, Penestanan,
// Sayan, Peliatan, Mas, Lod Tunduh) since Airtable often files
// villas under the village name, not "Ubud".
const INLAND_TOKENS = [
  'убуд', 'ubud',
  'табан', 'tabanan',
  'бедугул', 'bedugul',
  'мундук', 'munduk',
  'кинтамани', 'kintamani',
  'сидеман', 'sideman', 'sidemen',
  'паянган', 'payangan',
  'тегаллаланг', 'tegallalang', 'tegalalang',
  'кедеват', 'kedewat',
  'сингакерт', 'singakerta',
  'пенестан', 'penestanan',
  'саян', 'sayan',
  'пелиатан', 'peliatan',
  'lod tunduh', 'лод тундух',
  'tampaksiring', 'тампаксиринг',
]

// Districts that are technically Bali-coast-adjacent but actually
// 1–3 km inland from the actual beach (Mengwi/Canggu hinterlands).
// Block these when the visitor asked for WALKING distance to the
// ocean (which means <500m). Kept separate from INLAND_TOKENS
// because Mengwi-as-a-regency includes Canggu beachfront — only
// the named inland villages get blocked.
const NON_WALKING_TOKENS = [
  'umalas', 'умалас',
  'kerobokan', 'керобокан',
  'tibubeneng', 'тибубенен',
  'dalung', 'далунг',
  'padonan', 'падонан',
]

// Districts where the beach is primarily WHITE coral sand. Used
// when the visitor asked for "белый песок / white sand". Anything
// outside this set gets dropped — Чангу/Берава/Перененан/Семиньяк
// /Кута/Легиан are all volcanic black-sand and don't qualify.
const WHITE_SAND_TOKENS = [
  // Bukit peninsula
  'букит', 'bukit', 'улуват', 'uluwatu', 'бинг', 'bingin',
  'паданг', 'padang', 'балинг', 'balang', 'дримленд', 'dreamland',
  'нуса-дуа', 'nusa dua', 'nusa-dua', 'nusadua',
  'джимбар', 'jimbaran',
  'pecatu', 'пекату', 'ungasan', 'унгасан', 'kutuh', 'кутух',
  'melasti', 'меласти', 'green bowl', 'грин боул',
  'pandawa', 'пандава',
  // East / north-east white-sand zones
  'sanur', 'сануре', 'санур',
  'tanjung benoa', 'танджунг беноа', 'танджунг-беноа',
  'amed', 'амед', 'tulamben', 'туламбен',
]

// Detect ocean intent across the immediate user message + recent
// history. Conservative — once the visitor said "у океана" we
// keep enforcing the coastal filter for the rest of the chat unless
// they explicitly say "не важно где" / "и горы тоже".
function userWantsOcean(userText: string, history: ChatCompletionMessageParam[]): boolean {
  return matchesAcrossHistory(userText, history, /океан|у мор[яею]\b|прибрежн|пляж|у воды|на пляж|beachfront|beach\b|ocean|seaside|sea\b|surf|waves/i)
}

// Stronger ocean ask — visitor explicitly wants WALKING distance
// (≤500m). Triggers the NON_WALKING_TOKENS filter on top of the
// ocean filter.
function userWantsWalkingToBeach(userText: string, history: ChatCompletionMessageParam[]): boolean {
  return matchesAcrossHistory(
    userText, history,
    /пешк|пешей|walking|walkable|до пляж[ауе]|ден[оье] с пляж|у самого моря|первой линии|beachfront|first line/i,
  )
}

// White-sand-only ask. Drops black-sand districts (Чангу / Берава /
// Перененан / Семиньяк / Кута / Легиан / Сесех / Танах-Лот /
// Кедунгу / Балиан / Медеви / Ньяньи / Ловина).
function userWantsWhiteSand(userText: string, history: ChatCompletionMessageParam[]): boolean {
  return matchesAcrossHistory(
    userText, history,
    /белый песок|белого песк|white sand|белый пляж|белого пляж|coral sand|кораллов/i,
  )
}

function matchesAcrossHistory(userText: string, history: ChatCompletionMessageParam[], re: RegExp): boolean {
  if (re.test(userText)) return true
  const recentUserText = history
    .filter(m => m.role === 'user' && typeof m.content === 'string')
    .slice(-10)
    .map(m => String(m.content))
    .join(' ')
  return re.test(recentUserText)
}

// Server-side reinforcement of geographic constraints. The model
// keeps shipping district=Чангу even when the visitor explicitly
// wants white sand (which would mean Сануре / Букит). We:
//   - splice in max_distance_to_beach='walking' for ocean asks
//   - DROP the district filter when the visitor asked for white
//     sand AND the model's chosen district isn't on the white-sand
//     list. Without this the search never even reaches Sanur or
//     Bukit because Airtable has no overlap between Чангу and
//     Сануре, and postFilter drops everything → empty result.
function enforceConstraintsFromHistory(
  toolName: string,
  rawArgs: string,
  userText: string,
  history: ChatCompletionMessageParam[],
): string {
  if (toolName !== 'search_listings') return rawArgs
  const wantOcean = userWantsOcean(userText, history)
  const wantWhite = userWantsWhiteSand(userText, history)
  if (!wantOcean && !wantWhite) return rawArgs

  let args: Record<string, unknown>
  try { args = JSON.parse(rawArgs) ?? {} } catch { return rawArgs }

  if (wantOcean && (typeof args.max_distance_to_beach !== 'string' || args.max_distance_to_beach === 'any')) {
    args.max_distance_to_beach = 'walking'
  }

  if (wantWhite && typeof args.district === 'string' && args.district.length > 0) {
    const districtLower = args.district.toLowerCase()
    const isWhite = WHITE_SAND_TOKENS.some(t => districtLower.includes(t))
    if (!isWhite) {
      // Throw the district away so the search returns candidates from
      // every region; postFilterCards then keeps only white-sand ones.
      delete args.district
    }
  }

  return JSON.stringify(args)
}

// Last line of defence: drop returned cards that don't match the
// visitor's stated geographic constraints. Triple-source check
// (district + title + url) because Airtable sometimes stores the
// village in title and leaves district blank / set to a sub-name
// we don't recognise.
//
// Layers (each AND-ed with the prior):
//   1. Inland → drop if visitor asked for the ocean.
//   2. Non-walking → drop Mengwi-hinterland villages (Umalas etc.)
//      if visitor explicitly asked for walking distance.
//   3. White-sand → drop everything outside WHITE_SAND_TOKENS if
//      visitor asked for white sand. This is a HARD whitelist
//      because anything that isn't on the whitelist is, by Bali
//      geography, almost certainly black-sand.
function postFilterCards(
  cards: ListingCard[],
  userText: string,
  history: ChatCompletionMessageParam[],
): ListingCard[] {
  const wantOcean = userWantsOcean(userText, history)
  const wantWalk = userWantsWalkingToBeach(userText, history)
  const wantWhite = userWantsWhiteSand(userText, history)
  if (!wantOcean && !wantWalk && !wantWhite) return cards

  return cards.filter(c => {
    const haystack = [c.district, c.title, c.url].filter(Boolean).join(' ').toLowerCase()

    // Layer 1: kill all inland.
    if (wantOcean && INLAND_TOKENS.some(t => haystack.includes(t))) return false

    // Layer 2: kill Mengwi-hinterland (Umalas / Kerobokan etc.) if
    // walking distance was asked.
    if (wantWalk && NON_WALKING_TOKENS.some(t => haystack.includes(t))) return false

    // Layer 3: positive whitelist for white sand. If the haystack
    // doesn't mention any known white-sand district, drop.
    if (wantWhite && !WHITE_SAND_TOKENS.some(t => haystack.includes(t))) return false

    return true
  })
}

// Trainer trigger detection. Matches a wide range of Russian +
// English phrasings the owner might say to teach Балина a new
// rule:
//   «слушай и запоминай: …»
//   «запомни: …»
//   «учти на будущее: …»
//   «remember: …»
//   «note this: …»
// Whisper sometimes drops the colon, so we also accept «слушай и
// запоминай …» with just whitespace. Returns the instruction
// (whatever follows the trigger) trimmed and de-quoted, or null
// if no trigger was found / the instruction body was empty.
function extractCorrection(text: string): string | null {
  const TRIGGERS = [
    /^\s*(?:слушай и|а теперь слушай и|теперь)?\s*запоминай\s*[:,.\-—–]?\s*/i,
    /^\s*запомни\s*[:,.\-—–]?\s*/i,
    /^\s*учти(?: на будущее)?\s*[:,.\-—–]?\s*/i,
    /^\s*remember(?: this)?\s*[:,.\-—–]?\s*/i,
    /^\s*note(?: this)?\s*[:,.\-—–]?\s*/i,
    /^\s*new rule\s*[:,.\-—–]?\s*/i,
  ]
  for (const re of TRIGGERS) {
    const m = text.match(re)
    if (!m) continue
    const rest = text.slice(m[0].length).trim()
    if (!rest) return null  // trigger phrase alone — wait for next message instead
    // Strip surrounding "«»" / "''" / '""' that voice-to-text often adds.
    return rest.replace(/^[«"'"]+|[»"'"]+$/g, '').trim() || null
  }
  return null
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
    /сравн/i, /compare/i, /\bvs\b/i, /что лучше/i, /which is better/i, /разниц/i, /difference/i,
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
// Also truncate aggressively at the first sign that the model
// started enumerating property names — the cards already do that.
function stripChipsAndUrls(text: string): string {
  let out = text
    .replace(/\[CHIPS\][^\n]*/g, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')

  // Hard cut: if the model started listing villas in prose ("1.
  // Вилла X" / "Вот виллы:" / "Ссылка на виллу") despite the
  // directive, truncate at the first such marker. This is the
  // "do what I say not what I want" safety net for when gpt-4o
  // still ignores the no-list rule.
  const cutPatterns = [
    /\n\s*\d+\.\s+\*?\*?(вилл|апартамент|комплекс)/i,
    /\n\s*[-•]\s*ссылк[аи] на (вилл|объект|апартамент)/i,
    /\n\s*вот (виллы|варианты|объекты|подбор|карточки)/i,
    /\n\s*ниже (виллы|варианты|объекты|карточки)/i,
    /\n\s*here (are|'s) (villas|options|listings|cards)/i,
  ]
  for (const p of cutPatterns) {
    const m = out.match(p)
    if (m && m.index != null) {
      out = out.slice(0, m.index)
      break
    }
  }

  // Drop any leftover "Ссылка на виллу" / "Link to villa" stub line.
  out = out.replace(/^\s*ссылк[аи] на .+$/gim, '').replace(/^\s*link to .+$/gim, '')

  return out
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
  if (DAILY_LIMIT_PER_CHAT == null || DAILY_LIMIT_PER_CHAT <= 0) return false
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()
  // Reuse listMessages — bounded to 200 rows which is more than
  // enough for a daily-cap check.
  const rows = await listMessages(chatId, 200)
  const count = rows.filter(r => r.direction === 'out' && r.source === 'bot' && r.created_at >= since).length
  return count >= DAILY_LIMIT_PER_CHAT
}
