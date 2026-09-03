// Разовый ремонт наследственного поля `Цена` в объявлениях сайта.
//
//   npx tsx --env-file=.env.local scripts/fix-legacy-price-field.ts           — что изменится
//   npx tsx --env-file=.env.local scripts/fix-legacy-price-field.ts --apply   — применить
//
// Цена объявления живёт в JSONB в трёх полях: каноничное (`price` у вилл,
// `price_usd` у апартаментов) читает сайт, `Цена` осталась от Airtable,
// `Цена м²` — производная. В /admin/data редактор правит только каноничное,
// поэтому у карточек, заведённых или продублированных вручную, `Цена`
// оставалась пустой или ценой донора. Трекер прайсов читал именно `Цена` —
// и связывал объявление с чужим юнитом либо не связывал вовсе.
//
// Чтение трекера починено (lib/market/site-sync.ts), админка теперь пишет
// все три поля (lib/admin/price-sync.ts) — этот скрипт приводит в порядок
// записи, разошедшиеся до правки. Вместе с `Цена` пересчитывается
// `price_ratio` у уже заведённых пар: он был откалиброван от неверной цены,
// и без пересчёта ночная сверка «вернула» бы на сайт цену донора.
import { sbAdmin } from '../lib/market/apply'

const TABLES = [
  { table: 'raw_villas', kind: 'villa', priceKey: 'price' },
  { table: 'raw_apartments', kind: 'apartment', priceKey: 'price_usd' },
] as const

const LEGACY_PRICE_FIELD = 'Цена'
const PRICE_PER_SQM_FIELD = 'Цена м²'
const AREA_FIELD = 'Площадь'

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

type Row = { airtable_id: string; data: Record<string, unknown> }

async function main() {
  const apply = process.argv.includes('--apply')
  const sb = sbAdmin()

  const { data: links } = await sb
    .from('market_listing_links')
    .select('listing_kind, listing_id, unit_id, price_ratio, base_unit_price')
  const linkOf = new Map((links ?? []).map(l => [`${l.listing_kind}:${l.listing_id}`, l]))

  const { data: units } = await sb.from('market_units').select('id, price_usd')
  const unitById = new Map((units ?? []).map(u => [Number(u.id), u]))

  let fixed = 0
  let recalibrated = 0

  for (const { table, kind, priceKey } of TABLES) {
    const rows: Row[] = []
    for (let from = 0; ; from += 500) {
      const { data, error } = await sb.from(table).select('airtable_id, data').range(from, from + 499)
      if (error) throw new Error(`чтение ${table}: ${error.message}`)
      if (!data?.length) break
      rows.push(...(data as unknown as Row[]))
      if (data.length < 500) break
    }

    for (const row of rows) {
      const canonical = num(row.data[priceKey])
      if (canonical === null) continue
      const legacy = num(row.data[LEGACY_PRICE_FIELD])
      if (legacy !== null && Math.abs(legacy - canonical) < 1) continue

      const area = num(row.data[AREA_FIELD])
      const next: Record<string, unknown> = { ...row.data, [LEGACY_PRICE_FIELD]: canonical }
      if (area !== null) next[PRICE_PER_SQM_FIELD] = Math.round((canonical / area) * 100) / 100

      console.log(`${table} ${row.airtable_id}: Цена ${legacy ?? '—'} → ${canonical}`)
      fixed++
      if (apply) {
        const { error } = await sb.from(table).update({ data: next }).eq('airtable_id', row.airtable_id)
        if (error) throw new Error(`запись ${table} ${row.airtable_id}: ${error.message}`)
      }

      // Пара, заведённая по неверной цене, хранит и неверную надбавку.
      // У проданного юнита цены в прайсе уже нет — калибруем от той, от
      // которой надбавку считали (base_unit_price), иначе кривое отношение
      // дождётся, пока юнит вернётся в продажу, и уедет ценой на сайт.
      const link = linkOf.get(`${kind}:${row.airtable_id}`)
      const unitPrice = link
        ? num(unitById.get(Number(link.unit_id))?.price_usd) ?? num(link.base_unit_price)
        : null
      if (!link || unitPrice === null) continue
      const ratio = canonical / unitPrice
      console.log(`  пара с юнитом ${link.unit_id}: надбавка ${Number(link.price_ratio).toFixed(4)} → ${ratio.toFixed(4)}`)
      recalibrated++
      if (apply) {
        const { error } = await sb
          .from('market_listing_links')
          .update({ price_ratio: ratio, base_listing_price: canonical, base_unit_price: unitPrice })
          .eq('listing_kind', kind)
          .eq('listing_id', row.airtable_id)
        if (error) throw new Error(`запись market_listing_links ${row.airtable_id}: ${error.message}`)
      }
    }
  }

  console.log(`\nобъявлений с расхождением: ${fixed}, пересчитанных пар: ${recalibrated}`)
  if (!apply) console.log('сухой прогон — повторите с --apply, чтобы записать')
}

main().catch(e => { console.error(e); process.exit(1) })
