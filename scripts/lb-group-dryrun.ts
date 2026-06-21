// Dry-run для парсера LB Group: гоняет РЕАЛЬНЫЙ extractLbUnits по всем
// вкладкам всех комплексов из LB_COMPLEXES и печатает сводку (комплекс →
// вкладка → юниты/статусы). НИЧЕГО не пишет в Airtable.
//   npx tsx scripts/lb-group-dryrun.ts
import { LB_SPREADSHEET_ID, LB_COMPLEXES, extractLbUnits } from '../lib/parsers/lb-group'
import { fetchXlsxFromGoogleSheet } from '../lib/parsers/_xlsx'

const url = (gid: number) => `https://docs.google.com/spreadsheets/d/${LB_SPREADSHEET_ID}/edit?gid=${gid}`

async function main() {
let grand = 0
for (const [cid, info] of Object.entries(LB_COMPLEXES)) {
  console.log(`\n■ ${info.name}  (${cid})`)
  let cTotal = 0
  for (const gid of info.gids) {
    try {
      const cells = await fetchXlsxFromGoogleSheet(url(gid))
      const { units, layout } = extractLbUnits(cells)
      const bs: Record<string, number> = {}
      for (const u of units) bs[u.status ?? '?'] = (bs[u.status ?? '?'] ?? 0) + 1
      const noBr = units.filter(u => u.bedrooms == null).length
      const noPrice = units.filter(u => u.price == null).length
      const tag = layout === 'apartment' ? 'A' : layout === 'villa' ? 'V' : 'G'
      console.log(`   [${tag}] gid ${String(gid).padEnd(11)} ${String(units.length).padStart(3)} юн  ${Object.entries(bs).map(([k, v]) => `${k}:${v}`).join(' ')}${noBr ? `  no-BR:${noBr}` : ''}${noPrice ? `  no-price:${noPrice}` : ''}`)
      cTotal += units.length
    } catch (e) {
      console.log(`   [!] gid ${gid}: ${(e as Error).message}`)
    }
  }
  console.log(`   = ${cTotal} юнитов`)
  grand += cTotal
}
console.log(`\n=== ИТОГО по ${Object.keys(LB_COMPLEXES).length} комплексам LB Group: ${grand} юнитов ===`)
}

main().catch(e => { console.error(e); process.exit(1) })
