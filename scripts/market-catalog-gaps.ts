// Чего из прайсов застройщиков нет на сайте.
//
//   npx tsx --env-file=.env.local scripts/market-catalog-gaps.ts              — сводка
//   npx tsx --env-file=.env.local scripts/market-catalog-gaps.ts <комплекс>   — подробно по комплексу
//
// Только читает. Завести карточки можно в /admin/market/site → «Нет на сайте».
import { sbAdmin } from '../lib/market/apply'
import { loadCatalogGaps } from '../lib/market/catalog-gaps'

const usd = (n: number) => `$${Math.round(n).toLocaleString('ru-RU')}`

async function main() {
  const needle = process.argv.slice(2).join(' ').trim().toLowerCase()
  const gaps = await loadCatalogGaps(sbAdmin())

  if (needle) {
    for (const g of gaps.filter(x => x.complex.toLowerCase().includes(needle))) {
      console.log(`\n${g.complex} · ${g.developer} · ${g.kind === 'villa' ? 'виллы' : 'апартаменты'} · надбавка ${g.ratio.toFixed(3)}`)
      console.log(`образец: ${g.donorName ?? 'НЕТ — первую карточку заведите руками'}`)
      for (const o of g.missing) {
        console.log(`  ${o.unitKeys.join(', ')} | ${o.area ?? '—'} м² | этаж ${o.floor ?? '—'} | ${usd(o.price)} → карточка ${usd(o.price * g.ratio)} | ${o.unitType ?? ''}`)
      }
    }
    return
  }

  const total = gaps.reduce((s, g) => s + g.missing.length, 0)
  console.log(`не представлено на сайте: ${total} предложений в ${gaps.length} строках комплекс×вид\n`)
  for (const g of gaps) {
    console.log(`${String(g.missing.length).padStart(4)} нет / ${String(g.covered).padStart(3)} есть | ${g.kind === 'villa' ? 'виллы ' : 'апарт.'} | ${g.complex} | образец: ${g.donorName ?? 'НЕТ'}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
