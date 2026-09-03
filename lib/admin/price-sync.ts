import type { CollectionConfig } from './adapters/types'

// Держит наследственную `Цена` в согласии с ценой, которую редактор правит
// в /admin/data.
//
// У объявления три цены в JSONB: каноничная (`price` у вилл, `price_usd` у
// апартаментов) — её читает сайт; `Цена` — колонка из Airtable, оставшаяся
// как запасной вариант; и производная `Цена м²`. В админке есть только
// каноничная, поэтому после ручного создания или «Дублировать» в `Цена`
// оставалась цена донора: у четырёх апартаментов Amani Melasti на сайте
// стояли $157 900…$199 900, а в `Цена` у всех четырёх — $157 000. Ночная
// синхронизация с прайсом застройщика (lib/market/site-sync.ts) писала обе,
// а админка — только одну, и записи расходились.
//
// Тот же расчёт `Цена м²`, что и в writePrice() site-sync.ts: цена, делённая
// на площадь, до сотых.

const LEGACY_PRICE_FIELD = 'Цена'
const PRICE_PER_SQM_FIELD = 'Цена м²'
const AREA_FIELD = 'Площадь'

/** Каноничная цена по коллекции — виллы хранят `price`, апартаменты `price_usd`. */
const PRICE_FIELDS = ['price', 'price_usd'] as const

function numberOrNull(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.').replace(/[^\d.]/g, ''))
    return Number.isFinite(n) && n > 0 ? n : null
  }
  return null
}

/** Поле каноничной цены, объявленное в конфиге коллекции (или null). */
function priceFieldOf(cfg: CollectionConfig): string | null {
  return PRICE_FIELDS.find(key => cfg.fields.some(f => f.key === key)) ?? null
}

/**
 * Поля, которые надо записать вместе с правкой админки, чтобы у записи была
 * одна цена, а не три разные. Пустой объект, если правка цену не двигает.
 */
export function priceSyncPatch(
  cfg: CollectionConfig,
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const priceField = priceFieldOf(cfg)
  if (!priceField || !(priceField in patch)) return {}

  const next = numberOrNull(patch[priceField])
  if (next === null) return {}

  const out: Record<string, unknown> = {}
  if (numberOrNull(current[LEGACY_PRICE_FIELD]) !== next) out[LEGACY_PRICE_FIELD] = next

  // Площадь может меняться той же правкой — берём новую, если она в patch.
  const area = numberOrNull(patch[AREA_FIELD] ?? current[AREA_FIELD])
  if (area !== null && !(PRICE_PER_SQM_FIELD in patch)) {
    const perSqm = Math.round((next / area) * 100) / 100
    if (numberOrNull(current[PRICE_PER_SQM_FIELD]) !== perSqm) out[PRICE_PER_SQM_FIELD] = perSqm
  }
  return out
}
