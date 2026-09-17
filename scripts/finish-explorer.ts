// Ручная сборка среза для /admin/otdelka (то же, что делает недельный крон).
//   npx tsx --env-file=.env.local scripts/finish-explorer.ts          — собрать и показать цифры
//   npx tsx --env-file=.env.local scripts/finish-explorer.ts --publish — собрать и выложить
import { sbAdmin } from '../lib/market/apply'
import { buildFinishExplorer, publishFinishExplorer } from '../lib/finish-explorer/build'

async function main() {
const sb = sbAdmin()
if (process.argv.includes('--publish')) {
  console.log(await publishFinishExplorer(sb))
} else {
  const { payload, stats } = await buildFinishExplorer(sb)
  console.log(stats)
  const rows = payload.rows as any[][]
  const adr = rows.map(r => r[5]).filter((x): x is number => x != null).sort((a, b) => a - b)
  console.log('adr p1/p5/median:', adr[Math.floor(adr.length * .01)], adr[Math.floor(adr.length * .05)], adr[adr.length >> 1])
  const cheapVillas = rows.filter(r => payload.meta.kinds[r[2]] === 'villa' && r[5] != null && r[5] < 20)
  console.log('villas under $20:', cheapVillas.length, cheapVillas.slice(0, 10).map(r => [r[0], r[3], r[5], payload.meta.zones[r[4]]]))
  console.log('matisse:', rows.find(r => r[0] === 'villa-maison-matisse')?.slice(0, 12))
}
}

main().catch(e => { console.error(e); process.exit(1) })
