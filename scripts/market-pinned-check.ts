// Сверка закреплённых разборов (lib/market/pinned.ts) с живыми листами и
// с тем, что уже лежит в базе. Ничего не пишет.
//   npx tsx --env-file=.env.local scripts/market-pinned-check.ts
import { createClient } from '@supabase/supabase-js'
import { fetchGrid } from '../lib/market/grid'
import { PINNED, runPinned } from '../lib/market/pinned'

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
  const { data: sources } = await sb.from('market_sources').select('id, row_no, complex, source_key, source_url, last_scan_at').in('source_key', Object.keys(PINNED)).order('row_no')
  for (const s of sources ?? []) {
    const day = String(s.last_scan_at ?? '').slice(0, 10)
    const { data: prev } = await sb.from('market_units').select('unit_key, status, price_usd').eq('source_id', s.id).gte('last_seen', day)
    const before = new Map((prev ?? []).map(u => [u.unit_key, u]))
    try {
      const r = runPinned(await fetchGrid(s.source_url), PINNED[s.source_key])
      const by: Record<string, number> = {}
      let priced = 0, statusDiff = 0, priceDiff = 0, fresh = 0
      for (const u of r.units) {
        by[u.status] = (by[u.status] ?? 0) + 1
        if (u.priceUsd) priced++
        const p = before.get(u.unitKey)
        if (!p) fresh++
        else {
          if (p.status !== u.status) statusDiff++
          if (p.price_usd !== null && u.priceUsd !== null && Number(p.price_usd) !== u.priceUsd) priceDiff++
        }
      }
      const lost = [...before.keys()].filter(k => !r.units.some(u => u.unitKey === k)).length
      console.log(`#${s.row_no} ${s.complex}: ${r.units.length} ${JSON.stringify(by)} цен ${priced} | было ${before.size}, новых ${fresh}, пропало ${lost}, статус≠ ${statusDiff}, цена≠ ${priceDiff}${r.warnings.length ? ' | ! ' + r.warnings.join('; ') : ''}`)
    } catch (e) {
      console.log(`#${s.row_no} ${s.complex}: ОШИБКА ${e instanceof Error ? e.message : e}`)
    }
  }
}
main().catch(e => { console.error(e); process.exit(1) })
