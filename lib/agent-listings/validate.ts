import type { ListingDraft, ListingKind } from './types'

// Проверка того, что приходит из формы. Всё, что попадает в `data`, ограничено
// белым списком полей: JSONB без списка — это открытая дверь, через которую в
// карточку можно положить что угодно, включая поля, которыми управляет админка.

const ALLOWED: Record<ListingKind, string[]> = {
  villa: ['Комнаты', 'Площадь', 'Земля', 'Leasehold', 'Разрешение', 'Year of completion',
    'Статус', 'Location', 'Location 2', 'Geo', 'Geo 2', 'Type', 'Тип сделки',
    'Комплекс 1', 'Developer1', 'Land color'],
  apartment: ['Комнаты', 'Площадь', 'Этаж', 'Leasehold', 'Разрешение', 'Year of completion',
    'Статус', 'Location', 'Location filter', 'Geo', 'Geo 2', 'Тип сделки',
    'Комплекс 1', 'Developer1', 'Land color'],
}

const MAX_PHOTOS = 20
const MAX_COMMENT = 2000
const MAX_TITLE = 160
const MAX_PRICE = 100_000_000

export type ParseResult =
  | { ok: true; draft: ListingDraft }
  | { ok: false; error: string }

function cleanString(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().replace(/\s+/g, ' ')
  return s ? s.slice(0, max) : null
}

function cleanFacts(kind: ListingKind, raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const allowed = new Set(ALLOWED[kind])
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.has(k)) continue
    if (v === null || v === undefined || v === '') continue
    if (typeof v === 'number') { if (Number.isFinite(v)) out[k] = v; continue }
    if (typeof v === 'string') { out[k] = v.trim().slice(0, 200); continue }
    if (Array.isArray(v)) { out[k] = v.filter(x => typeof x === 'string' || typeof x === 'number').slice(0, 10) }
  }
  return out
}

// Фото принимаются только как ссылки в наши бакеты: карточка агента не должна
// уметь тянуть картинку с произвольного домена (и подставлять её нашим читателям).
function cleanPhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const okHost = /^https:\/\/([a-z0-9-]+\.)?(supabase\.co|balinsky\.info)\//i
  return raw
    .filter((u): u is string => typeof u === 'string' && okHost.test(u))
    .slice(0, MAX_PHOTOS)
}

export function parseDraft(body: unknown): ParseResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Пустой запрос' }
  const b = body as Record<string, unknown>

  const kind: ListingKind = b.kind === 'apartment' ? 'apartment' : b.kind === 'villa' ? 'villa' : 'villa'
  if (b.kind !== 'villa' && b.kind !== 'apartment') return { ok: false, error: 'Выберите тип объекта' }

  const price = typeof b.priceUsd === 'number' ? b.priceUsd : Number(b.priceUsd)
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: 'Укажите цену в долларах' }
  if (price > MAX_PRICE) return { ok: false, error: 'Цена выглядит ошибочной' }

  const title = cleanString(b.title, MAX_TITLE)
  if (!title || title.length < 4) return { ok: false, error: 'Название объекта слишком короткое' }

  const complexId = cleanString(b.complexId, 60)
  const baseUnitId = cleanString(b.baseUnitId, 60)
  const facts = cleanFacts(kind, b.data)

  // Юнит вне каталога должен нести минимум фактов, иначе карточка выйдет
  // пустой: ни площади, ни спален — показывать нечего.
  if (!baseUnitId) {
    if (!facts['Площадь']) return { ok: false, error: 'Укажите площадь' }
    if (!facts['Комнаты']) return { ok: false, error: 'Укажите количество спален' }
  }

  return {
    ok: true,
    draft: {
      kind,
      complexId,
      baseUnitId,
      title,
      priceUsd: Math.round(price),
      comment: cleanString(b.comment, MAX_COMMENT),
      data: facts,
      photos: cleanPhotos(b.photos),
    },
  }
}
