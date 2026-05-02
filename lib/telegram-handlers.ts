// Maps the deep-link `/start <param>` payload to a reply + chat tags.
// Tags get persisted on bot_chats.tags so that /admin/broadcast can later
// message everyone who, e.g., asked about a specific event.
//
// Params follow the contract documented in lib/bot-link.ts.

import type { ManagerItem } from '@/lib/managers'
import type { RentalItem } from '@/lib/rental'
import { loadAllEvents, type EventItem } from '@/lib/events'

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
    const r = await fetch(RENTAL_URL, { cache: 'no-store' })
    if (!r.ok) return _rentalCache?.items ?? []
    const j = await r.json() as { items?: RentalItem[] }
    const items = Array.isArray(j.items) ? j.items : []
    _rentalCache = { ts: Date.now(), items }
    return items
  } catch { return _rentalCache?.items ?? [] }
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function defaultGreeting(): Reply {
  return {
    text:
      '<b>Привет! Я Balinsky Bot.</b>\n\n' +
      'Я подключаю с менеджерами застройщиков и владельцами вилл на помесячную аренду.\n\n' +
      'Откройте сайт <a href="https://balinsky.info">balinsky.info</a>, выберите объект и нажмите кнопку «Написать в Telegram» — я свяжу с нужным человеком.',
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

async function handleEvent(slug: string): Promise<StartResult> {
  let ev: EventItem | undefined
  try {
    const all = await loadAllEvents()
    ev = all.find(x => x.slug === slug)
  } catch { /* fall through */ }
  if (!ev) {
    return { reply: {
      text: 'Не нашёл это мероприятие — возможно, ссылка устарела. Актуальная афиша: <a href="https://balinsky.info/ru/meropriyatiya">balinsky.info/ru/meropriyatiya</a>.',
      parseMode: 'HTML',
    }, tags: ['event:' + slug] }
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

export async function handleStart(payload: string | null): Promise<StartResult> {
  if (!payload) return { reply: defaultGreeting() }
  const m = payload.match(/^(manager|rental|event|review|error)_(.+)$/)
  if (!m) return { reply: defaultGreeting() }
  const [, kind, raw] = m
  const decoded = raw
  switch (kind) {
    case 'manager': return await handleManager(decoded)
    case 'rental':  return await handleRental(decoded)
    case 'event':   return await handleEvent(decoded)
    case 'review':  return handleReview(decoded.replace(/_/g, ' '))
    case 'error':   return handleError(decoded.replace(/_/g, ' '))
    default:        return { reply: defaultGreeting() }
  }
}

export function fallbackReply(): Reply {
  return {
    text: 'Я Balinsky Bot — соединяю с менеджерами застройщиков и владельцами вилл на сайте <a href="https://balinsky.info">balinsky.info</a>. Откройте карточку объекта и нажмите «Написать в Telegram» — я подключусь.',
    parseMode: 'HTML',
  }
}
