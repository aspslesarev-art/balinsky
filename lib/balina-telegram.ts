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
const MAX_LISTING_CARDS = 4             // top-N to actually send as photos
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
        ? 'CHANNEL: Telegram. The user is on Telegram, NOT the website. Don\'t emit [CHIPS] blocks (Telegram won\'t render them). Don\'t paste raw URLs in your prose — listing cards are sent as separate photo messages with their own links.'
        : 'КАНАЛ: Telegram. Посетитель пишет из Telegram, не с сайта. НЕ выводи блоки [CHIPS] — Telegram их не рендерит. НЕ вставляй URL-ы в текст ответа — карточки объектов уйдут отдельными сообщениями с фото и кнопками.',
    },
    ...history,
    { role: 'user', content: textIn },
  ]

  const client = new OpenAI({ apiKey })
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
      const result = await executeToolCall(tc.function.name, tc.function.arguments)
      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      })
      let parsed: unknown = null
      try { parsed = JSON.parse(result) } catch { /* tool returned non-json — ignore */ }
      const r = parsed as { results?: ListingCard[] } | null
      if (r && Array.isArray(r.results)) {
        for (const c of r.results) {
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
