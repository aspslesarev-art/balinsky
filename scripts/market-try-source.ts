// Прогон одного источника трекера без записи в базу — им проверяют, что
// прайс вообще разбирается, и что даёт правка адаптера.
//   npx tsx --env-file=.env.local scripts/market-try-source.ts 111 127
import { createClient } from '@supabase/supabase-js'
import { scrapeSource } from '../lib/market/scrape'

async function main() {
const ids = process.argv.slice(2).map(Number)
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

for (const id of ids) {
  const { data } = await sb.from('market_sources').select('*').eq('id', id).single()
  if (!data) { console.log(`#${id} не найден`); continue }
  console.log(`\n■ #${id} ${data.developer} / ${data.complex}  [${data.source_kind}]`)
  try {
    const r = await scrapeSource({ ...data, layout: null, layout_fingerprint: null } as never)
    const by: Record<string, number> = {}
    for (const u of r.units) by[u.status] = (by[u.status] ?? 0) + 1
    const prices = r.units.map(u => u.priceUsd).filter((p): p is number => p !== null)
    console.log(`   → юнитов ${r.units.length}`, by, `цен ${prices.length}`, prices.length ? `от $${Math.min(...prices).toLocaleString()} до $${Math.max(...prices).toLocaleString()}` : '')
    if (r.layout && 'transposed' in r.layout) console.log(`   поворот: ${(r.layout as {transposed?: boolean}).transposed ? 'да' : 'нет'}`)
    for (const w of r.warnings) console.log(`   ! ${w}`)
    if (r.units.length) console.log('   пример:', JSON.stringify({ ...r.units[0], raw: undefined }))
  } catch (e) {
    console.log(`   ОШИБКА: ${e instanceof Error ? e.message : e}`)
  }
}
}
main().catch(e => { console.error(e); process.exit(1) })
