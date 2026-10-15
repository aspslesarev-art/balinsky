// Повторить: npx tsx --env-file=.env.local scripts/yield-check/calib.ts [rank.json]
// Калибровка: насколько способы оценки «по соседям» попадают в цифры,
// известные точно (свои объявления комплекса на Booking, реальные брони).
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { buildSnapshot, bookingEstimate } from '../../lib/investment/snapshot'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function localMarket(lat: number, lng: number, kind: 'villa' | 'apartment', bedrooms: number | null, exclude: number[], radius = 1500) {
  const { data, error } = await sb.rpc('booking_data_comps', { p_lat: lat, p_lng: lng, p_radius_m: radius, p_unit_kind: kind, p_bedrooms: bedrooms, p_limit: 60 })
  if (error) throw new Error(error.message)
  const ids = (data as { id: number }[]).map(d => Number(d.id)).filter(id => !exclude.includes(id))
  if (ids.length < 5) return null
  const e = await bookingEstimate(ids, kind, bedrooms)
  return e && { occ: e.occupancy, adr: e.adr, n: ids.length }
}

async function main() {
  const rank = JSON.parse(fs.readFileSync(process.argv[2] ?? '.tmp-rank/rank.json', 'utf8')) as { id: string; kind: 'villa' | 'apartment'; complex: string | null; bedrooms: number | null; own: string | null }[]
  const seen = new Set<string>()
  const out: Record<string, unknown>[] = []
  const { data: bk } = await sb.from('complex_booking_match').select('booking_id')
  const allOwn = (bk ?? []).map(b => Number(b.booking_id))
  for (const u of rank.filter(x => x.own === 'booking')) {
    const key = `${u.complex}|${u.kind}|${u.bedrooms}`
    if (seen.has(key)) continue
    seen.add(key)
    const s = await buildSnapshot(u.id, u.kind)
    if (!s?.ownBooking) continue
    const ob = s.ownBooking
    const loc = await localMarket(s.villa.lat, s.villa.lng, u.kind, s.villa.bedrooms, allOwn).catch(e => { console.error(String(e)); return null })
    out.push({
      key, occT: ob.occupancy, adrT: ob.adrSource === 'booking' ? ob.adr : null,
      nb25: s.scenarios?.bad.adrAsking ?? null, nb50: s.scenarios?.median.adrAsking ?? null, nb75: s.scenarios?.good.adrAsking ?? null,
      locOcc: loc?.occ ?? null, locAdr: loc?.adr ?? null, locN: loc?.n ?? null,
    })
    process.stdout.write('.')
  }
  fs.writeFileSync('.tmp-rank/calib.json', JSON.stringify(out, null, 1))
  console.log('\nrows', out.length)
}
main()
