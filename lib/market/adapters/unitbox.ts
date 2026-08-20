// Адаптер под партнёрские порталы Unitbox.
//
// Unitbox — единый SaaS, на котором сидит сразу несколько застройщиков, так
// что один адаптер закрывает все их комплексы. Портал отдаёт юниты
// публичным JSON-эндпоинтом `/api/units/developer/<девелопер>`; страница
// шахматки (`/api/chess/<проект>`) несёт только геометрию, без цен и
// статусов, поэтому берём именно список юнитов.
//
// Часть порталов закрыта авторизацией. Они отвечают 200 и пустым списком —
// не ошибкой, — поэтому пустой ответ трактуем как «нужен доступ», иначе
// комплекс молча выглядел бы распроданным.
//
// Если заведён агентский аккаунт (UNITBOX_EMAIL / UNITBOX_PASSWORD),
// сначала логинимся: портал кладёт сессию в httpOnly-куки, и дальше тот
// же публичный эндпоинт отдаёт юниты. Аккаунт на Unitbox один на все
// порталы, но доступ к данным каждый застройщик открывает у себя
// отдельно — до его подтверждения права пустые, а список юнитов приходит
// пустым, как и без входа.

import type { ExtractResult, ScrapedUnit, UnitStatus } from '../types'

const PER_PAGE = 200
// Дефолтная выдача — только непроданное, поэтому статусы перебираем явно.
const STATUSES = ['available', 'reserved', 'sold'] as const

const STATUS_MAP: Record<string, UnitStatus> = {
  available: 'available',
  free: 'available',
  reserved: 'reserved',
  booked: 'reserved',
  sold: 'sold',
}

type UnitboxUnit = {
  name?: string
  status?: string
  floor?: number | string | null
  square?: string | number | null
  plot_square?: string | number | null
  bedrooms?: number | null
  priceInUSD?: string | number | null
  price?: string | number | null
  pricePerSizeInUSD?: string | number | null
  unitTypeName?: string | null
  blockName?: string | null
  projectCode?: string | null
  projectName?: string | null
  soldAt?: string | null
  resale?: boolean | null
}

export type UnitboxRef = { developer: string; projectCode: string }

// https://breig.unitbox.ai/project/aquamarine_i → { breig, aquamarine_i }
export function parseUnitboxUrl(sourceUrl: string): UnitboxRef | null {
  const m = sourceUrl.match(/^https?:\/\/([a-z0-9-]+)\.unitbox\.ai\/project\/([a-zA-Z0-9_-]+)/i)
  return m ? { developer: m[1].toLowerCase(), projectCode: m[2] } : null
}

export function isUnitboxSource(sourceUrl: string): boolean {
  return /\.unitbox\.ai\//i.test(sourceUrl)
}

export async function scrapeUnitbox(sourceUrl: string): Promise<ExtractResult> {
  const ref = parseUnitboxUrl(sourceUrl)
  if (!ref) throw new Error('ссылка не похожа на проект Unitbox — ожидается https://<девелопер>.unitbox.ai/project/<код>')


  const warnings: string[] = []
  // Сначала спрашиваем как аноним: часть порталов открыта, и вход под
  // агентом там наоборот сужает выдачу до «своих» проектов — портал
  // Embrace так терял все 166 юнитов.
  let all = await fetchStatuses(ref.developer, null)
  let cookie: string | null = null
  if (!all.length) {
    cookie = await sessionFor(ref.developer)
    if (cookie) all = await fetchStatuses(ref.developer, cookie)
  }

  if (!all.length) throw new Error(await emptyReason(ref.developer, cookie))

  // Портал отдаёт весь каталог застройщика разом, а строка мастер-таблицы
  // описывает один комплекс, поэтому фильтруем по коду проекта из ссылки.
  const mine = all.filter(u => (u.projectCode ?? '').toLowerCase() === ref.projectCode.toLowerCase())
  if (!mine.length) {
    const codes = [...new Set(all.map(u => u.projectCode).filter(Boolean))].join(', ')
    throw new Error(`в портале нет проекта «${ref.projectCode}» (есть: ${codes || 'ни одного'})`)
  }

  const units: ScrapedUnit[] = mine.map(u => {
    const areaM2 = numOrNull(u.square)
    const priceUsd = positive(numOrNull(u.priceInUSD) ?? numOrNull(u.price))
    return {
      unitKey: String(u.name ?? '').trim() || `id-${JSON.stringify(u).length}`,
      unitType: u.unitTypeName || u.blockName || null,
      bedrooms: typeof u.bedrooms === 'number' ? u.bedrooms : null,
      areaM2,
      landM2: numOrNull(u.plot_square),
      floor: u.floor === null || u.floor === undefined ? null : String(u.floor),
      status: STATUS_MAP[String(u.status ?? '').toLowerCase()] ?? 'unknown',
      priceUsd,
      pricePerM2: positive(numOrNull(u.pricePerSizeInUSD)) ?? (priceUsd && areaM2 ? Math.round(priceUsd / areaM2) : null),
      raw: {
        // Портал отмечает перепродажу отдельно: такой юнит продаёт не
        // застройщик, а инвестор, вышедший из проекта.
        resale: u.resale === true ? 'true' : '',
        status: String(u.status ?? ''),
        projectName: String(u.projectName ?? ''),
        blockName: String(u.blockName ?? ''),
        soldAt: String(u.soldAt ?? ''),
      },
    }
  })

  const unknown = units.filter(u => u.status === 'unknown').length
  if (unknown) warnings.push(`${unknown} юнитов с незнакомым статусом портала`)

  return { units, warnings }
}

async function fetchStatuses(developer: string, cookie: string | null): Promise<UnitboxUnit[]> {
  const out: UnitboxUnit[] = []
  for (const status of STATUSES) out.push(...(await fetchAll(developer, status, cookie)))
  return out
}

// Одна сессия на портал за прогон: у NEXA восемь комплексов, и логиниться
// под каждый незачем. Значение — строка Cookie или null, если аккаунт не
// заведён; промис держим в кеше, чтобы параллельные вызовы не плодили
// входы.
const sessions = new Map<string, Promise<string | null>>()

async function sessionFor(developer: string): Promise<string | null> {
  const email = process.env.UNITBOX_EMAIL
  const password = process.env.UNITBOX_PASSWORD
  if (!email || !password) return null

  const cached = sessions.get(developer)
  if (cached) return cached

  const pending = login(developer, email, password).catch(() => null)
  sessions.set(developer, pending)
  return pending
}

async function login(developer: string, email: string, password: string): Promise<string | null> {
  const r = await fetch(`https://${developer}.unitbox.ai/api/auth/catalog-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: `https://${developer}.unitbox.ai/auth/sing-in`,
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify({ email, password }),
  })
  if (!r.ok) return null

  // Сессия приезжает в httpOnly-куках, поэтому собираем их сами: fetch
  // никаких кук между запросами не носит.
  const jar = r.headers.getSetCookie()
    .map(c => c.split(';')[0])
    .filter(c => /^(accessToken|refreshToken)=/.test(c))
  return jar.length ? jar.join('; ') : null
}

// Пустой ответ у Unitbox значит либо «портал закрыт», либо «аккаунт есть,
// но застройщик ещё не открыл доступ». Разница важная: во втором случае
// делать ничего не надо, кроме как дождаться подтверждения.
async function emptyReason(developer: string, cookie: string | null): Promise<string> {
  if (!cookie) {
    return 'портал Unitbox не отдал ни одного юнита — закрытый партнёрский портал, нужен агентский аккаунт (UNITBOX_EMAIL / UNITBOX_PASSWORD)'
  }
  try {
    const r = await fetch(`https://${developer}.unitbox.ai/api/auth/profile/${developer}`, {
      headers: { Cookie: cookie, 'User-Agent': 'Mozilla/5.0' },
    })
    const body = await r.json() as { permissions?: Record<string, boolean> }
    const granted = Object.entries(body.permissions ?? {}).filter(([, v]) => v).map(([k]) => k)
    if (!granted.length) {
      return `вход на портал Unitbox выполнен, но застройщик ещё не подтвердил аккаунт — прав нет ни на что`
    }
    return `вход выполнен (права: ${granted.join(', ')}), но портал не отдал ни одного юнита`
  } catch {
    return 'вход на портал Unitbox выполнен, но список юнитов пуст'
  }
}

async function fetchAll(developer: string, status: string, cookie: string | null): Promise<UnitboxUnit[]> {
  const out: UnitboxUnit[] = []
  for (let page = 1; page <= 20; page++) {
    const url = `https://${developer}.unitbox.ai/api/units/developer/${developer}?page=${page}&per_page=${PER_PAGE}&status=${status}`
    const r = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        // Портал отвечает пустым списком, если запрос выглядит чужим.
        Referer: `https://${developer}.unitbox.ai/units`,
        'User-Agent': 'Mozilla/5.0',
        ...(cookie ? { Cookie: cookie } : {}),
      },
    })
    if (!r.ok) throw new Error(`Unitbox вернул ${r.status} на ${status}`)
    const body = (await r.json()) as { data?: UnitboxUnit[]; meta?: { page_count?: number } }
    const chunk = body.data ?? []
    out.push(...chunk)
    if (chunk.length < PER_PAGE || page >= (body.meta?.page_count ?? 1)) break
  }
  return out
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Ноль в цене у Unitbox значит «цена не опубликована», а не бесплатно.
function positive(n: number | null): number | null {
  return n !== null && n > 0 ? n : null
}
