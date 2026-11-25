// Привести цену в текстах всех вилл и апартаментов к текущей цене объекта.
//   npx tsx --env-file=.env.local scripts/fix-text-prices.ts                 — что изменится
//   npx tsx --env-file=.env.local scripts/fix-text-prices.ts --apply [--backup=dir] [--skip=id,id]
// Ночной крон market-site-sync делает то же для объектов, у которых сменил цену.
import { sbAdmin } from '../lib/market/apply'
import { bumpContentRev } from '../lib/content-version'
import { fixTextPrices, stalePrices, type ListingKind, type TextPriceTarget } from '../lib/market/text-price'

const PRICE_FIELD: Record<ListingKind, string> = { villa: 'price', apartment: 'price_usd' }
const TABLE: Record<ListingKind, string> = { villa: 'raw_villas', apartment: 'raw_apartments' }

async function main() {
  const apply = process.argv.includes('--apply')
  const backupDir = process.argv.find(a => a.startsWith('--backup='))?.slice(9)
  // --skip=id1,id2 — объекты, где под сомнением сама цена, а не текст.
  const skip = new Set(process.argv.find(a => a.startsWith('--skip='))?.slice(7).split(',') ?? [])
  const sb = sbAdmin()

  // База знаний: прежняя цена в meta и текст страницы — лёгким запросом на всё сразу.
  const kb = new Map<string, { metaPrice: number | null; texts: string[] }>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('assistant_kb').select('ref_id, meta, page_body, summary').in('kind', ['villa', 'apartment']).range(from, from + 999)
    if (error) throw new Error(error.message)
    for (const r of data ?? []) {
      const m = (r.meta ?? {}) as Record<string, unknown>
      kb.set(String(r.ref_id), { metaPrice: m.price_usd == null ? null : Number(m.price_usd), texts: [r.page_body ?? '', r.summary ?? ''] })
    }
    if (!data || data.length < 1000) break
  }

  const targets: TextPriceTarget[] = []
  for (const kind of ['villa', 'apartment'] as const) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from(TABLE[kind])
        .select(`airtable_id, price:data->>${PRICE_FIELD[kind]}, legacy:data->>"Цена", seo:data->>"SEO Text", clean:data->>"Post Text Clean", descr:data->>"SEO:Description"`)
        .range(from, from + 999)
      if (error) throw new Error(error.message)
      for (const r of (data ?? []) as unknown as Array<Record<string, string | null>>) {
        const price = Number(r.price ?? r.legacy)
        if (!Number.isFinite(price) || price <= 0) continue
        const k = kb.get(String(r.airtable_id))
        const olds = stalePrices([r.seo, r.clean, r.descr, ...(k?.texts ?? [])], price, [k?.metaPrice])
        if (olds.length && !skip.has(String(r.airtable_id))) targets.push({ kind, id: String(r.airtable_id), price, oldPrices: olds })
      }
      if (!data || data.length < 1000) break
    }
  }
  console.log(`объектов с устаревшей ценой в текстах: ${targets.length}`)

  const changes = await fixTextPrices(sb, targets, { dry: !apply, backupDir, log: s => console.log('  ' + s) })
  const big = changes.filter(c => c.from.some(f => Math.abs(f - c.to) / c.to > 0.3))
  console.log(`\nпоправлено объектов: ${changes.length}; из них цена в тексте отличалась больше чем на 30%: ${big.length}`)
  for (const c of big) console.log(`  ‼ ${c.kind} ${c.id}: ${c.from.join('/')} → ${c.to}`)

  if (!apply) { console.log('\nсухой прогон, ничего не записано. Применить: --apply'); return }
  for (const kind of new Set(changes.map(c => (c.kind === 'villa' ? 'villas' : 'apartments')))) await bumpContentRev(kind)
  console.log('кэш объектов сброшен (content_version)')
}

main().catch(e => { console.error(e); process.exit(1) })
