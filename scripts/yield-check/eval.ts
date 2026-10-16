// Повторить: npx tsx --env-file=.env.local scripts/yield-check/eval.ts
// Одна мерка точности для каждого круга проверки: расчёт сайта «по соседям»
// (как у объекта без своих данных) против того, что известно точно:
//   actual  — реальные брони управляющей за год (BREIG, complex_rental_actuals);
//   booking — свои объявления комплекса на Booking (загрузка × цена номера).
// Выручка — то, что приходит владельцу до расходов: цена × реализация ×
// (1 − комиссия площадки) × загрузка × 365.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { buildSnapshot } from '../../lib/investment/snapshot'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
type U = { id: string; kind: 'villa' | 'apartment'; complex: string | null; bedrooms: number | null; own: string | null }

async function main() {
  // Объекты, у которых есть свои данные (listing_yields, scripts/build-listing-yields.ts).
  const { data: ly, error } = await sb.from('listing_yields').select('kind, airtable_id, occ_source').in('occ_source', ['actual', 'booking'])
  if (error) throw new Error(error.message)
  const rank: U[] = []
  for (const kind of ['villa', 'apartment'] as const) {
    const ids = (ly ?? []).filter(r => r.kind === kind).map(r => String(r.airtable_id))
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error: e2 } = await sb.from(kind === 'villa' ? 'raw_villas' : 'raw_apartments')
        .select('airtable_id, k:data->>"Комплекс 1", t:data->>"SEO:Title", br:data->>"Комнаты"').in('airtable_id', ids.slice(i, i + 200))
      if (e2) throw new Error(e2.message)
      for (const r of (data ?? []) as unknown as { airtable_id: string; k: string | null; t: string | null; br: string | null }[]) rank.push({ id: String(r.airtable_id), kind, complex: r.k ?? String(r.t ?? '').slice(0, 30), bedrooms: r.br != null ? Number(r.br) : null,
        own: (ly ?? []).find(x => x.kind === kind && String(x.airtable_id) === String(r.airtable_id))!.occ_source })
    }
  }
  const { data: act } = await sb.from('complex_rental_actuals').select('*')
  const seen = new Set<string>()
  const out: Record<string, unknown>[] = []
  const queue = rank.filter(u => u.own === 'actual' || u.own === 'booking')
  for (const u of queue) {
    const key = `${(u.complex ?? '').trim().toLowerCase()}|${u.kind}|${u.bedrooms}`
    if (seen.has(key)) continue
    seen.add(key)
    const s = await buildSnapshot(u.id, u.kind).catch(() => null)
    if (!s?.ownBooking || !s.scenarios) continue
    const ob = s.ownBooking
    const keep = s.region.adrRealizationByScenario.median * (1 - s.region.platformFeePct)
    let truth: number | null = null, occT: number | null = ob.occupancy
    if (ob.source === 'actual') {
      // Год BREIG с выручкой; у Maison Boheme выручки нет — только загрузка.
      if (ob.adrSource !== 'revenue' || ob.adr == null || ob.occupancy == null) { occT = ob.occupancy; truth = null }
      else truth = ob.adr * keep * ob.occupancy * 365
      // Совпадение по спальням обязательно, иначе сравниваем не то.
      const rows = (act ?? []).filter(a => a.unit_kind === u.kind && a.bedrooms === u.bedrooms)
      if (!rows.length) continue
    } else if (ob.adr != null && ob.occupancy != null) {
      truth = ob.adr * keep * ob.occupancy * 365
    }
    const occM = s.region.occupancyByScenario.median
    const adrM = s.scenarios.median.adrAsking
    const pred = adrM * keep * occM * 365
    out.push({
      lat: s.villa.lat, lng: s.villa.lng, kind: u.kind, br: s.villa.bedrooms, own: ob.listings.map(l => l.id),
      key: key.slice(0, 34), src: ob.source, occT: occT != null ? +occT.toFixed(2) : null, occM: +occM.toFixed(2),
      adrT: ob.adr, adrM: Math.round(adrM), price: s.villa.askingPrice,
      revT: truth != null ? Math.round(truth) : null, revM: Math.round(pred), err: truth ? +(pred / truth - 1).toFixed(3) : null,
    })
    process.stderr.write('.')
  }
  fs.writeFileSync('.tmp-rank/eval.json', JSON.stringify(out, null, 1))
  console.table(out.map(({ lat: _a, lng: _b, kind: _c, br: _d, own: _e, ...o }) => o))
  const med = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2 }
  for (const src of ['actual', 'booking']) {
    const rows = out.filter(o => o.src === src)
    const e = rows.map(o => o.err).filter((v): v is number => typeof v === 'number')
    const oe = rows.filter(o => o.occT != null).map(o => (o.occM as number) - (o.occT as number))
    console.log(`${src}: revenue n=${e.length} median|err| ${(med(e.map(Math.abs)) * 100).toFixed(1)}% bias ${(med(e) * 100).toFixed(1)}%`
      + ` | occupancy n=${oe.length} median|err| ${(med(oe.map(Math.abs)) * 100).toFixed(1)} п. bias ${(med(oe) * 100).toFixed(1)} п.`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
