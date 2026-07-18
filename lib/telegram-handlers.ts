// Maps the deep-link `/start <param>` payload to a reply + chat tags.
// Tags get persisted on bot_chats.tags so that /admin/broadcast can later
// message everyone who, e.g., asked about a specific event.
//
// Params follow the contract documented in lib/bot-link.ts.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ManagerItem } from '@/lib/managers'
import type { RentalItem } from '@/lib/rental'
import { loadAllEvents, type EventItem } from '@/lib/events'
import { cdnManifestUrl } from '@/lib/photo-cdn'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANAGERS_URL = `${SUPABASE_URL}/storage/v1/object/public/managers/_managers.json`
const RENTAL_URL   = `${SUPABASE_URL}/storage/v1/object/public/rental/_rental.json`

type Reply = { text: string; parseMode?: 'HTML' | 'MarkdownV2' }
type StartResult = { reply: Reply; tags?: string[] }

// Tiny in-memory caches, fine on per-instance Vercel functions.
let _managersCache: { ts: number; items: ManagerItem[] } | null = null
let _rentalCache: { ts: number; items: RentalItem[] } | null = null
const TTL_MS = 60_000

async function loadManagers(): Promise<ManagerItem[]> {
  if (_managersCache && Date.now() - _managersCache.ts < TTL_MS) return _managersCache.items
  try {
    const r = await fetch(MANAGERS_URL, { cache: 'no-store' })
    if (!r.ok) return _managersCache?.items ?? []
    const j = await r.json() as { items?: ManagerItem[] }
    const items = Array.isArray(j.items) ? j.items : []
    _managersCache = { ts: Date.now(), items }
    return items
  } catch { return _managersCache?.items ?? [] }
}
async function loadRentals(): Promise<RentalItem[]> {
  if (_rentalCache && Date.now() - _rentalCache.ts < TTL_MS) return _rentalCache.items
  try {
    const r = await fetch(cdnManifestUrl(RENTAL_URL, 600), { cache: 'no-store' })
    if (!r.ok) return _rentalCache?.items ?? []
    const j = await r.json() as { items?: RentalItem[] }
    const items = Array.isArray(j.items) ? j.items : []
    _rentalCache = { ts: Date.now(), items }
    return items
  } catch { return _rentalCache?.items ?? [] }
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// First-touch greeting — fired when a fresh user hits /start with no
// deep-link payload. Reads as Балина (the AI broker), not the old
// "I just connect you to managers" persona. Lists the four ways to
// drive the bot (text / voice / trainer phrase / commands) and gives
// three concrete example queries so the visitor doesn't have to
// invent one.
function defaultGreeting(): Reply {
  return {
    text:
      '<b>Привет! Я Балиса — AI-брокер по недвижимости на Бали.</b>\n\n' +
      'Помогу подобрать виллу, апартаменты, ЖК или помесячную аренду. ' +
      'Расскажу про лизхолд, цены, доходность и безопасность пляжей — без воды, по делу.\n\n' +
      '<b>Как общаться:</b>\n' +
      '• Напишите запрос текстом или голосом\n' +
      '• «Слушай и запоминай: …» — обучить меня\n' +
      '• /мои — ваши подписки на новые объекты\n' +
      '• /стоп — отключить уведомления\n\n' +
      '<b>Например:</b>\n' +
      '🏡 Вилла 2 спальни в Сануре, белый песок, до $300k\n' +
      '🏖 Апартаменты у океана под посуточную аренду\n' +
      '🤝 Сравни Maison Boheme и Origins\n\n' +
      'Что ищете?',
    parseMode: 'HTML',
  }
}

// Slugify a free-form name for use as a tag, so "LB Group (LOYO&BONDAR)"
// and "lb-group" hash to the same bucket.
function tagSlug(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

async function handleManager(id: string): Promise<StartResult> {
  const all = await loadManagers()
  const m = all.find(x => x.id === id)
  if (!m) {
    return { reply: {
      text: 'Не получилось найти менеджера 🤷‍♂️ Возможно, карточка обновилась. Откройте <a href="https://balinsky.info">сайт</a> ещё раз и нажмите кнопку контакта.',
      parseMode: 'HTML',
    } }
  }
  const dev = m.developerNames?.[0] ?? 'застройщика'
  const lines: string[] = [
    `<b>${escape(m.name)}</b> — менеджер ${escape(dev)}.`,
    '',
    'Можете написать напрямую:',
  ]
  if (m.telegram) lines.push(`✈️ <a href="${m.telegram}">Telegram</a>`)
  if (m.whatsapp) lines.push(`💬 <a href="${m.whatsapp}">WhatsApp</a>`)
  lines.push('', 'Если будут вопросы по сделке или нужна вторая пара глаз — пишите мне сюда, помогу.')
  const devSlug = m.developerSlugs?.[0] ?? tagSlug(dev)
  const tags = ['developer:' + devSlug]
  return { reply: { text: lines.join('\n'), parseMode: 'HTML' }, tags }
}

async function handleRental(id: string): Promise<StartResult> {
  const all = await loadRentals()
  const r = all.find(x => x.id === id)
  if (!r) {
    return { reply: {
      text: 'Этот объект помесячной аренды уже не активен. Свежая подборка — на <a href="https://balinsky.info/ru/arenda">balinsky.info/ru/arenda</a>.',
      parseMode: 'HTML',
    } }
  }
  const lines: string[] = [
    `<b>${escape(r.title)}</b>`,
    `${r.location ?? ''}${r.bedrooms != null ? ` · ${r.bedrooms} BR` : ''}`,
    `Аренда: $${Math.round(r.priceMonthUsd).toLocaleString('en-US')} / мес`,
    '',
  ]
  if (r.telegram) {
    lines.push(`Контакт хозяина: ${escape(r.telegram)}`)
  } else {
    lines.push('Контакт хозяина не указан в карточке. Напишите сюда — попробую найти его.')
  }
  lines.push('', `Карточка на сайте: https://balinsky.info/ru/arenda/o/${r.slug}`)
  return { reply: { text: lines.join('\n'), parseMode: 'HTML' }, tags: ['rental:' + r.slug] }
}

async function handleEvent(key: string): Promise<StartResult> {
  // `key` is the Airtable record id ("rec…") for new links; old links
  // shipped slugs, so we fall back to slug lookup. Some legacy slugs
  // also exceeded Telegram's 64-char `start` limit and arrived
  // truncated — match by prefix as a last resort so a partial slug
  // still finds its event.
  let ev: EventItem | undefined
  try {
    const all = await loadAllEvents()
    ev = all.find(x => x.id === key)
        ?? all.find(x => x.slug === key)
        ?? (key.length >= 20 ? all.find(x => x.slug.startsWith(key)) : undefined)
  } catch { /* fall through */ }
  if (!ev) {
    return { reply: {
      text: 'Не нашёл это мероприятие — возможно, ссылка устарела. Актуальная афиша: <a href="https://balinsky.info/ru/meropriyatiya">balinsky.info/ru/meropriyatiya</a>.',
      parseMode: 'HTML',
    }, tags: ['event:' + key] }
  }
  const when = ev.startsAt ? new Date(ev.startsAt).toLocaleString('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar',
  }) : null
  const lines: string[] = [
    `<b>${escape(ev.title)}</b>`,
  ]
  if (when) lines.push(`📅 ${escape(when)} (Бали)`)
  if (ev.format) lines.push(`📍 ${escape(ev.format)}`)
  lines.push('')
  if (ev.registerUrl) {
    lines.push(`Регистрация: <a href="${ev.registerUrl}">${ev.registerUrl}</a>`)
    lines.push('')
    lines.push('Откройте ссылку и заполните форму. Если что-то не работает — напишите сюда, помогу с регистрацией вручную.')
  } else {
    lines.push('Чтобы записаться — оставьте ваше имя и телефон/Telegram прямо в этом чате, передам организаторам.')
  }
  lines.push('', `Подробности: https://balinsky.info/ru/meropriyatiya/${ev.slug}`)
  return { reply: { text: lines.join('\n'), parseMode: 'HTML' }, tags: ['event:' + ev.slug] }
}

// Resale-villa seller contact. Listing carries the seller's Telegram URL
// in raw_villas.data['Контакт продавца изначальный']; the public-facing
// "buy" button links here to the bot, so we see the lead before the user
// gets the seller's chat. Tagged with seller:<id> for follow-up broadcasts.
async function handleSeller(airtableId: string): Promise<StartResult> {
  const sb = sellerSb()
  const { data } = await sb
    .from('raw_villas')
    .select('data')
    .eq('airtable_id', airtableId)
    .maybeSingle()
  const d = (data?.data ?? {}) as Record<string, unknown>
  const sellerRaw =
    (typeof d['Контакт продавца изначальный'] === 'string' && d['Контакт продавца изначальный']) ||
    (typeof d['Контакт продавца оригинал'] === 'string' && d['Контакт продавца оригинал']) ||
    null
  const seller = typeof sellerRaw === 'string' && /^https?:\/\/(t\.me|wa\.me)\//.test(sellerRaw)
    ? sellerRaw : null
  const titleRaw =
    (typeof d['ИИ Имя'] === 'object' && d['ИИ Имя'] !== null && 'value' in (d['ИИ Имя'] as object)
      ? (d['ИИ Имя'] as { value?: string }).value : null) ||
    (typeof d['Имя ENG'] === 'object' && d['Имя ENG'] !== null && 'value' in (d['Имя ENG'] as object)
      ? (d['Имя ENG'] as { value?: string }).value : null) ||
    (typeof d['Name'] === 'string' ? d['Name'] : null) || 'эта вилла'
  const lines: string[] = [
    `<b>${escape(titleRaw)}</b>`,
    '',
  ]
  if (seller) {
    lines.push('Контакт продавца:')
    lines.push(`✈️ <a href="${seller}">${escape(seller)}</a>`)
    lines.push('')
    lines.push('Если что-то непонятно по объекту — спрашивайте здесь, помогу разобраться.')
  } else {
    lines.push('Это вторичка — продавцом занимается отдельный агент.')
    lines.push('Напишите сюда коротко: какой бюджет и сроки — я свяжу с продавцом и помогу с проверкой документов.')
  }
  return { reply: { text: lines.join('\n'), parseMode: 'HTML' }, tags: ['seller:' + tagSlug(airtableId)] }
}

let _sellerSb: SupabaseClient | null = null
function sellerSb(): SupabaseClient {
  if (!_sellerSb) _sellerSb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)
  return _sellerSb
}

function handleReview(devName: string): StartResult {
  return {
    reply: {
      text:
        `Спасибо, что хотите оставить отзыв о застройщике <b>${escape(devName)}</b>. ` +
        'Опишите свой опыт прямо в этом чате — мы сохраним и опубликуем после модерации.',
      parseMode: 'HTML',
    },
    tags: ['developer:' + tagSlug(devName)],
  }
}
function handleError(devName: string): StartResult {
  return {
    reply: {
      text:
        `Нашли неточность на странице <b>${escape(devName)}</b>? Опишите тут что не так — поправим. ` +
        'Скриншот можно прикрепить, чтобы было понятнее.',
      parseMode: 'HTML',
    },
    tags: ['developer:' + tagSlug(devName)],
  }
}

export async function handleStart(payload: string | null, chatId?: number): Promise<StartResult> {
  if (!payload) return { reply: defaultGreeting() }
  const m = payload.match(/^(manager|rental|event|review|error|seller|sub)_(.+)$/)
  if (!m) return { reply: defaultGreeting() }
  const [, kind, raw] = m
  const decoded = raw
  switch (kind) {
    case 'manager': return await handleManager(decoded)
    case 'rental':  return await handleRental(decoded)
    case 'event':   return await handleEvent(decoded)
    case 'seller':  return await handleSeller(decoded)
    case 'review':  return handleReview(decoded.replace(/_/g, ' '))
    case 'error':   return handleError(decoded.replace(/_/g, ' '))
    case 'sub':     return await handleSubscribe(decoded, chatId)
    default:        return { reply: defaultGreeting() }
  }
}

// Saved-search alert claim. The visitor created a draft on the site
// (POST /api/subscriptions/draft) and was sent here via deep-link.
// Look up the token, attach this chat_id, mark active, send back a
// confirmation with the first 3 currently-matching listings.
async function handleSubscribe(token: string, chatId: number | undefined): Promise<StartResult> {
  if (!chatId) return { reply: defaultGreeting() }
  const { claimDraft, describeFilter } = await import('@/lib/subscriptions')
  const result = await claimDraft(token, chatId).catch(err => {
    console.error('[telegram] claimDraft failed:', err)
    return null
  })
  if (!result) {
    return {
      reply: {
        text: '<b>Ссылка недействительна или уже использована.</b>\n\nВернитесь на сайт <a href="https://balinsky.info">balinsky.info</a>, задайте фильтры и нажмите «🔔 Уведомлять в Telegram» ещё раз.',
        parseMode: 'HTML',
      },
    }
  }
  const { subscription, matches } = result
  const top3 = matches.slice(0, 3)
  const listLines = top3.map(m => formatMatchLine(m)).join('\n\n')
  const tail = matches.length > 3
    ? `\n\nЕщё ${matches.length - 3} объектов в этом фильтре — посмотреть на сайте.`
    : ''
  const summary = describeFilter(subscription.filter)
  return {
    reply: {
      text:
        `<b>✅ Подписка оформлена</b>\n\n` +
        `Буду присылать новые объекты раз в день в 10:00 (Бали) под фильтр:\n` +
        `<b>${escape(summary)}</b>\n\n` +
        (matches.length > 0
          ? `Вот что подходит прямо сейчас (топ-3):\n\n${listLines}${tail}`
          : 'Сейчас под этот фильтр пусто, но как только появится — пришлю.') +
        `\n\nКоманды: /мои — список подписок · /стоп — отключить все`,
      parseMode: 'HTML',
    },
    tags: ['subscription'],
  }
}

// Compact one-listing block for digests + claim confirmation. HTML
// because the bot already uses HTML parse_mode everywhere.
function formatMatchLine(m: { title: string; district: string | null; bedrooms: number | null; priceUsd: number | null; pricePerSqm: number | null; url: string }): string {
  const bits: string[] = []
  if (m.district) bits.push(escape(m.district))
  if (m.bedrooms != null) bits.push(`${m.bedrooms} BR`)
  if (m.priceUsd != null) bits.push(`$${m.priceUsd.toLocaleString('en-US')}`)
  if (m.pricePerSqm != null) bits.push(`$${m.pricePerSqm.toLocaleString('en-US')}/м²`)
  return `🏡 <b><a href="${escape(m.url)}">${escape(m.title)}</a></b>\n   ${bits.join(' · ')}`
}

// Bot text-command handlers — invoked by app/api/telegram/route.ts
// when the inbound message starts with /мои or /стоп etc.
export async function handleSubscriptionCommand(text: string, chatId: number): Promise<Reply | null> {
  const cmd = text.trim().toLowerCase().split(/\s+/)[0]
  if (cmd !== '/мои' && cmd !== '/my' && cmd !== '/subs' && cmd !== '/стоп' && cmd !== '/stop') return null

  const { listForChat, deleteSubscription, describeFilter } = await import('@/lib/subscriptions')

  if (cmd === '/стоп' || cmd === '/stop') {
    const subs = await listForChat(chatId)
    for (const s of subs) await deleteSubscription(s.id, chatId)
    return {
      text: subs.length > 0
        ? `Отключил ${subs.length} ${pluralize(subs.length, 'подписку', 'подписки', 'подписок')}. Можно подписаться заново через сайт.`
        : 'У вас не было активных подписок.',
      parseMode: 'HTML',
    }
  }

  // /мои — list active subscriptions.
  const subs = await listForChat(chatId)
  if (subs.length === 0) {
    return {
      text: 'У вас нет активных подписок.\n\nЗайдите на <a href="https://balinsky.info">balinsky.info</a>, задайте фильтры в каталоге и нажмите «🔔 Уведомлять в Telegram».',
      parseMode: 'HTML',
    }
  }
  const lines = subs.map((s, i) =>
    `${i + 1}. <b>${escape(describeFilter(s.filter))}</b>\n   /удалить_${s.id}`
  ).join('\n\n')
  return {
    text: `<b>Ваши подписки:</b>\n\n${lines}\n\nЧтобы отключить все: /стоп`,
    parseMode: 'HTML',
  }
}

// Handle /удалить_<id> command emitted from the /мои listing.
export async function handleDeleteCommand(text: string, chatId: number): Promise<Reply | null> {
  const m = text.trim().match(/^\/(удалить|delete)_(\d+)/i)
  if (!m) return null
  const { deleteSubscription } = await import('@/lib/subscriptions')
  await deleteSubscription(Number(m[2]), chatId)
  return { text: 'Подписка удалена. /мои — посмотреть что осталось.', parseMode: 'HTML' }
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function fallbackReply(): Reply {
  return {
    text: 'Я Balinsky Bot — соединяю с менеджерами застройщиков и владельцами вилл на сайте <a href="https://balinsky.info">balinsky.info</a>. Откройте карточку объекта и нажмите «Написать в Telegram» — я подключусь.',
    parseMode: 'HTML',
  }
}
