// Удаляет из базы юниты закреплённых прайсов, которых нет в свежем
// разборе: это мусор, который старый разбор моделью принял за юниты
// («sold», «SOLD~2», рекламные строки под таблицей). Без чистки они
// получили бы событие «пропал» и исказили статистику.
// Трогаем только юниты из последнего обхода: старые юниты с давней
// историей (прайс когда-то менял номера) остаются как есть.
// Юниты, связанные с объявлением сайта, не трогаем — только сообщаем.
//   npx tsx --env-file=.env.local scripts/market-pinned-cleanup.ts          # показать
//   npx tsx --env-file=.env.local scripts/market-pinned-cleanup.ts --apply  # удалить
import { createClient } from '@supabase/supabase-js'
import { fetchGrid } from '../lib/market/grid'
import { PINNED, runPinned } from '../lib/market/pinned'

async function main() {
  const apply = process.argv.includes('--apply')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
  const { data: sources } = await sb.from('market_sources').select('id, row_no, complex, source_key, source_url').in('source_key', Object.keys(PINNED)).order('row_no')
  for (const s of sources ?? []) {
    const fresh = new Set(runPinned(await fetchGrid(s.source_url), PINNED[s.source_key]).units.map(u => u.unitKey))
    const { data: units } = await sb.from('market_units').select('id, unit_key, status, last_seen').eq('source_id', s.id)
    const lastSeen = (units ?? []).reduce((m, u) => (u.last_seen > m ? u.last_seen : m), '')
    const stale = (units ?? []).filter(u => u.last_seen === lastSeen && !fresh.has(u.unit_key))
    if (!stale.length) continue
    const { data: links } = await sb.from('market_listing_links').select('unit_id').in('unit_id', stale.map(u => u.id))
    const linked = new Set((links ?? []).map(l => l.unit_id))
    const drop = stale.filter(u => !linked.has(u.id))
    console.log(`#${s.row_no} ${s.complex}: удалить ${drop.length} [${drop.map(u => u.unit_key).join(', ')}]${linked.size ? `; связаны с сайтом, оставлены: ${stale.filter(u => linked.has(u.id)).map(u => u.unit_key).join(', ')}` : ''}`)
    if (apply && drop.length) {
      const { error } = await sb.from('market_units').delete().in('id', drop.map(u => u.id))
      if (error) throw new Error(error.message)
    }
  }
  if (!apply) console.log('\n(ничего не удалено — запусти с --apply)')
}
main().catch(e => { console.error(e); process.exit(1) })
