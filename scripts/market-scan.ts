// Ручной прогон трекера рынка: синхронизирует реестр источников с
// мастер-таблицей и обходит порцию источников, записывая срез и события.
//   npx tsx --env-file=.env.local scripts/market-scan.ts [лимит] [--sync-only] [--key=gs:...]
import { syncSources } from '../lib/market/sync-sources'
import { scanBatch } from '../lib/market/scan'
import { sbAdmin } from '../lib/market/apply'

async function main() {
  const args = process.argv.slice(2)
  const limit = Number(args.find(a => /^\d+$/.test(a)) ?? '5')
  const syncOnly = args.includes('--sync-only')
  const sourceKey = args.find(a => a.startsWith('--key='))?.slice(6)

  const sb = sbAdmin()

  const sync = await syncSources(sb)
  console.log('реестр источников:', sync)
  if (syncOnly) return

  // Ручной прогон не ограничен временем serverless-функции.
  const result = await scanBatch(sb, { limit, sourceKey, staleHours: 0, budgetMs: 6 * 3600_000, note: 'вручную из консоли' })
  console.log(`\nобход: ${result.ok} ок, ${result.failed} с ошибкой, юнитов ${result.units}, событий ${result.events}`)
  for (const o of result.outcomes) {
    if (o.status === 'ok') {
      console.log(`  ✓ ${o.developer} / ${o.complex}: юнитов ${o.units}, новых ${o.created}, событий ${o.events}, пропало ${o.gone}`)
      for (const w of o.warnings ?? []) console.log(`      ! ${w}`)
    } else {
      console.log(`  ✗ ${o.developer} / ${o.complex}: ${o.error}`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
