// Обновление цен объявлений сайта из прайсов застройщиков.
//   npx tsx --env-file=.env.local scripts/market-site-sync.ts            — что изменится
//   npx tsx --env-file=.env.local scripts/market-site-sync.ts --apply    — применить
//   npx tsx --env-file=.env.local scripts/market-site-sync.ts --link     — завести новые пары
import { sbAdmin } from '../lib/market/apply'
import { applySiteSync, linkListings, planSiteSync } from '../lib/market/site-sync'

async function main() {
  const args = process.argv.slice(2)
  const sb = sbAdmin()

  if (args.includes('--link')) {
    const r = await linkListings(sb)
    console.log(`пары: заведено ${r.linked}, неоднозначных ${r.ambiguous}, без пары ${r.unmatched}`)
  }

  const plan = await planSiteSync(sb)
  const apply = plan.changes.filter(c => c.outcome === 'applied')
  const hold = plan.changes.filter(c => c.outcome === 'skipped_big_change')

  console.log(`\nсверено пар: ${plan.checked}`)
  console.log(`к обновлению: ${apply.length}, отложено на человека: ${hold.length}, юнитов продано/бронь: ${plan.soldUnits.length}`)

  for (const c of [...apply, ...hold]) {
    const pct = c.oldPrice ? Math.round((c.newPrice - c.oldPrice) / c.oldPrice * 100) : null
    const mark = c.outcome === 'applied' ? '→' : '‼'
    console.log(`  ${mark} ${c.listingName ?? c.listingId} (${c.complex}, юнит ${c.unitKey}): $${(c.oldPrice ?? 0).toLocaleString()} → $${c.newPrice.toLocaleString()}${pct === null ? '' : ` (${pct > 0 ? '+' : ''}${pct}%)`}`)
  }
  for (const s of plan.soldUnits) {
    console.log(`  • ${s.listingName ?? s.listingId}: юнит ${s.unitKey} — ${s.status === 'sold' ? 'продан' : 'бронь'}`)
  }

  if (!args.includes('--apply')) {
    console.log('\nсухой прогон, в базу ничего не записано. Применить: --apply')
    return
  }

  const written = await applySiteSync(sb, plan)
  console.log(`\nобновлено объявлений: ${written}`)
}

main().catch(e => { console.error(e); process.exit(1) })
