// Maps the deep-link `/start <param>` payload to a reply.
// Params follow the contract documented in lib/bot-link.ts:
//   manager_<recordId>  — connect to a developer's manager
//   rental_<recordId>   — connect to a monthly-rental owner
//   review_<DevName>    — leave a review (legacy, hand-curated text)
//   error_<DevName>     — report a bug (legacy, hand-curated text)

import type { ManagerItem } from '@/lib/managers'
import type { RentalItem } from '@/lib/rental'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MANAGERS_URL = `${SUPABASE_URL}/storage/v1/object/public/managers/_managers.json`
const RENTAL_URL   = `${SUPABASE_URL}/storage/v1/object/public/rental/_rental.json`

type Reply = { text: string; parseMode?: 'HTML' | 'MarkdownV2' }

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

async function handleManager(id: string): Promise<Reply> {
  const all = await loadManagers()
  const m = all.find(x => x.id === id)
  if (!m) {
    return {
      text: 'Не получилось найти менеджера 🤷‍♂️ Возможно, карточка обновилась. Откройте <a href="https://balinsky.info">сайт</a> ещё раз и нажмите кнопку контакта.',
      parseMode: 'HTML',
    }
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
  return { text: lines.join('\n'), parseMode: 'HTML' }
}

async function handleRental(id: string): Promise<Reply> {
  const all = await loadRentals()
  const r = all.find(x => x.id === id)
  if (!r) {
    return {
      text: 'Этот объект помесячной аренды уже не активен. Свежая подборка — на <a href="https://balinsky.info/ru/arenda">balinsky.info/ru/arenda</a>.',
      parseMode: 'HTML',
    }
  }
  const lines: string[] = [
    `<b>${escape(r.title)}</b>`,
    `${r.location ?? ''}${r.bedrooms != null ? ` · ${r.bedrooms} BR` : ''}`,
    `Аренда: $${Math.round(r.priceMonthUsd).toLocaleString('en-US')} / мес`,
    '',
  ]
  if (r.telegram) {
    // Bare handle / URL — just pass it through. The site already has a
    // parser, but the bot just shows whatever's there.
    lines.push(`Контакт хозяина: ${escape(r.telegram)}`)
  } else {
    lines.push('Контакт хозяина не указан в карточке. Напишите сюда — попробую найти его.')
  }
  lines.push('', `Карточка на сайте: https://balinsky.info/ru/arenda/o/${r.slug}`)
  return { text: lines.join('\n'), parseMode: 'HTML' }
}

function handleReview(devName: string): Reply {
  return {
    text:
      `Спасибо, что хотите оставить отзыв о застройщике <b>${escape(devName)}</b>. ` +
      'Опишите свой опыт прямо в этом чате — мы сохраним и опубликуем после модерации.',
    parseMode: 'HTML',
  }
}
function handleError(devName: string): Reply {
  return {
    text:
      `Нашли неточность на странице <b>${escape(devName)}</b>? Опишите тут что не так — поправим. ` +
      'Скриншот можно прикрепить, чтобы было понятнее.',
    parseMode: 'HTML',
  }
}

export async function handleStart(payload: string | null): Promise<Reply> {
  if (!payload) return defaultGreeting()
  const m = payload.match(/^(manager|rental|review|error)_(.+)$/)
  if (!m) return defaultGreeting()
  const [, kind, raw] = m
  // Restore underscores in dev names for review/error (we sanitised them with _).
  const decoded = raw
  switch (kind) {
    case 'manager': return await handleManager(decoded)
    case 'rental':  return await handleRental(decoded)
    case 'review':  return handleReview(decoded.replace(/_/g, ' '))
    case 'error':   return handleError(decoded.replace(/_/g, ' '))
    default:        return defaultGreeting()
  }
}

export function fallbackReply(): Reply {
  return {
    text: 'Я Balinsky Bot — соединяю с менеджерами застройщиков и владельцами вилл на сайте <a href="https://balinsky.info">balinsky.info</a>. Откройте карточку объекта и нажмите «Написать в Telegram» — я подключусь.',
    parseMode: 'HTML',
  }
}
