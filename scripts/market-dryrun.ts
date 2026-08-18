// Dry-run трекера рынка: читает мастер-таблицу, качает листы прайсов,
// строит layout моделью и разбирает юниты. В базу НИЧЕГО не пишет.
//   npx tsx --env-file=.env.local scripts/market-dryrun.ts [лимит] [фильтр по застройщику]
import { fetchMaster } from '../lib/market/master-sheet'
import { fetchGrid } from '../lib/market/grid'
import { layoutFingerprint } from '../lib/market/fingerprint'
import { buildLayout } from '../lib/market/layout-llm'
import { extractUnits } from '../lib/market/extract'

const limit = Number(process.argv[2] ?? '5')
const filter = (process.argv[3] ?? '').toLowerCase()

async function main() {
  const { rows, skipped } = await fetchMaster()
  const byKind = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.kind]: (acc[r.kind] ?? 0) + 1 }), {})
  console.log(`мастер-таблица: ${rows.length} источников`, byKind)
  console.log(`пропущено строк: ${skipped.length}`)
  for (const s of skipped.slice(0, 8)) console.log(`   – ${s.developer} / ${s.complex}: ${s.reason}`)

  const targets = rows
    .filter(r => r.kind === 'google')
    .filter(r => !filter || r.developer.toLowerCase().includes(filter) || r.complex.toLowerCase().includes(filter))
    .slice(0, limit)

  let totals = { units: 0, available: 0, reserved: 0, sold: 0, unknown: 0 }
  for (const t of targets) {
    process.stdout.write(`\n■ ${t.developer} / ${t.complex}\n`)
    try {
      const grid = await fetchGrid(t.url)
      const fp = layoutFingerprint(grid)
      const { layout, warnings: lw } = await buildLayout(grid, { developer: t.developer, complex: t.complex, unitTypes: t.unitTypes })
      const { units, warnings } = extractUnits(grid, layout)
      const by: Record<string, number> = {}
      for (const u of units) by[u.status] = (by[u.status] ?? 0) + 1
      totals.units += units.length
      for (const k of ['available', 'reserved', 'sold', 'unknown'] as const) totals[k] += by[k] ?? 0
      const prices = units.map(u => u.priceUsd).filter((p): p is number => p !== null)
      console.log(`   лист ${grid.rowCount}×${grid.colCount}, fp=${fp}`)
      console.log(`   layout: header=${layout.headerRow} data→${layout.firstDataRow} cols=${JSON.stringify(layout.cols)}`)
      console.log(`   статус: text=${JSON.stringify(layout.statusText ?? {})} inPrice=${layout.statusInPriceCell} colors=${layout.statusColors?.length ?? 0} default=${layout.defaultStatus}`)
      console.log(`   → юнитов ${units.length}:`, by)
      if (prices.length) console.log(`   → цены: ${prices.length} шт, от $${Math.min(...prices).toLocaleString()} до $${Math.max(...prices).toLocaleString()}`)
      for (const w of [...lw, ...warnings]) console.log(`   ! ${w}`)
      if (units.length) console.log(`   пример:`, JSON.stringify({ ...units[0], raw: undefined }))
    } catch (e) {
      console.log(`   ОШИБКА: ${e instanceof Error ? e.message : e}`)
    }
  }
  console.log('\nИТОГО по прогону:', totals)
}

main().catch(e => { console.error(e); process.exit(1) })
