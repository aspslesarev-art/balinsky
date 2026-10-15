// Повторить: npx tsx --env-file=.env.local scripts/yield-check/backtest.ts
// Бэктест: наши методы против реальных броней (complex_rental_actuals).
import { createClient } from '@supabase/supabase-js'
import { loadNearby } from '../../lib/competitors'
import { matchCompetitors } from '../../lib/investment/matching'
import { adrPercentiles } from '../../lib/investment/economics'
import { bookingEstimate } from '../../lib/investment/snapshot'
import { BALI_DEFAULTS as BALI } from '../../lib/investment/regions'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const R = [2, 3, 5, 8]
const KEEP = BALI.adrRealizationByScenario.median * (1 - BALI.platformFeePct)

export async function neighbourAdr(lat: number, lng: number, bedrooms: number | null, area: number | null, hasPool: boolean | null) {
  const target = { lat, lng, bedrooms, area, hasPool }
  let m = matchCompetitors(await loadNearby(lat, lng, 2), target, [])
  for (const r of R.slice(1)) {
    if (m.matches.length >= 5) break
    const w = matchCompetitors(await loadNearby(lat, lng, r), target, [], r)
    if (w.matches.length > m.matches.length) m = w
  }
  let basis = m.matches
  if (!basis.length) {
    const wide = await loadNearby(lat, lng, 8)
    basis = wide
    if (bedrooms != null) for (const tol of [1, 2, 3]) { basis = wide.filter(c => c.bedrooms != null && Math.abs(c.bedrooms - bedrooms) <= tol); if (basis.length >= 5) break }
  }
  if (!basis.length) return null
  const q = adrPercentiles(basis)
  return { adr: (q.p50 + q.p75) / 2, n: basis.length }
}

async function main() {
  const { data: rows } = await sb.from('complex_rental_actuals').select('*')
  const { data: cx } = await sb.from('raw_complexes').select('airtable_id, p:data->>Project, lat:data->>Geo, lng:data->>"Geo 2"').in('airtable_id', [...new Set(rows!.map(r => r.complex_id))])
  const { data: bk } = await sb.from('complex_booking_match').select('complex_id, booking_id')
  const out: Record<string, unknown>[] = []
  for (const r of rows!) {
    const c = cx!.find(x => x.airtable_id === r.complex_id)!
    const lat = Number(String(c.lat).trim()), lng = Number(String(c.lng).trim())
    const occT = r.nights_booked / r.nights_total
    const revT = r.revenue_usd != null ? Number(r.revenue_usd) * 365 / ((Date.parse(r.period_to) - Date.parse(r.period_from)) / 864e5 + 1) : null
    const nb = r.bedrooms != null ? await neighbourAdr(lat, lng, r.bedrooms, null, r.unit_kind === 'villa' ? true : null) : null
    const ids = (bk ?? []).filter(b => b.complex_id === r.complex_id).map(b => Number(b.booking_id))
    const be = ids.length ? await bookingEstimate(ids, r.unit_kind, r.bedrooms) : null
    const since = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10)
    let occN = BALI.occupancyByScenario.median
    for (const radius of [1500, 3000]) {
      const { data: mo } = await sb.rpc('booking_market_occupancy', { p_lat: lat, p_lng: lng, p_radius_m: radius, p_unit_kind: r.unit_kind, p_bedrooms: r.bedrooms, p_since: since })
      const row = (mo as { occupancy: number | null; listings: number }[])?.[0]
      if (row?.occupancy != null && row.listings >= 5) { occN = Math.min(0.9, Number(row.occupancy) / 100); break }
    }
    const revN = nb ? nb.adr * KEEP * 365 * occN : null
    const occB = be?.occupancy ?? null
    const adrB = be?.adr ?? nb?.adr ?? null
    const revB = be && adrB != null ? adrB * KEEP * 365 * (occB ?? occN) : null
    out.push({ p: c.p, kind: r.unit_kind, br: r.bedrooms, occT: +occT.toFixed(3), adrT: revT != null ? Math.round(Number(r.revenue_usd) / r.nights_booked) : null, revT: revT && Math.round(revT),
      nbAdr: nb && Math.round(nb.adr), nbN: nb?.n, revN: revN && Math.round(revN), errN: revT && revN ? +(revN / revT - 1).toFixed(3) : null,
      occB, adrB, revB: revB && Math.round(revB), errB: revT && revB ? +(revB / revT - 1).toFixed(3) : null,
      occErrN: +(occN - occT).toFixed(3), occErrB: occB != null ? +(occB - occT).toFixed(3) : null })
  }
  console.table(out)
  const med = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[a.length >> 1] : NaN }
  for (const k of ['errN', 'errB', 'occErrN', 'occErrB'] as const) {
    const xs = out.map(o => o[k]).filter((v): v is number => typeof v === 'number')
    console.log(k, 'n', xs.length, 'median |err|', (med(xs.map(Math.abs)) * 100).toFixed(1) + '%', 'mean err', (xs.reduce((s, x) => s + x, 0) / xs.length * 100).toFixed(1) + '%')
  }
}
main()
