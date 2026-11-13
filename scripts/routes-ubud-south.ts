// «Южный Убуд» (Пенгосекан: магазины, кафе, спа) — вторая точка Убуда рядом
// с центром-дворцом, где пробки (владелец 13.11.2026: от CITRINE до центра
// 16 мин, а до жилой части Убуда 10).
//
// Бесплатно, без Google Routes: OSRM (дороги OpenStreetMap) даёт время по пустой
// дороге до обеих точек; у каждого объекта уже есть время Google до центра —
// переносим его отношение «Google / OSRM» на новую точку.
//
//   npx tsx --env-file=.env.local scripts/routes-ubud-south.ts           # посчитать и показать
//   npx tsx --env-file=.env.local scripts/routes-ubud-south.ts --apply   # записать routes(.peak).ubud_south
import { sbAdmin } from '../lib/market/apply'

const sb = sbAdmin()
const APPLY = process.argv.includes('--apply')
const CENTER: [number, number] = [-8.5069, 115.2625] // как в build-listing-routes.mjs
const SOUTH: [number, number] = [-8.5245, 115.2636]  // Jl. Raya Pengosekan

type Leg = { s: number; static_s?: number | null; m: number | null }
type Row = { kind: string; airtable_id: string; lat: number; lng: number; routes: Record<string, Leg> | null; routes_peak: Record<string, Leg> | null }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function loadRows(): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('listing_geo_facts').select('kind, airtable_id, lat, lng, routes, routes_peak').range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data as unknown as Row[]))
    if (!data || data.length < 1000) break
  }
  return out.filter(r => r.lat != null && r.lng != null)
}

async function osrm(rows: Row[]) {
  const out = new Map<string, { centerS: number; southS: number; southM: number }>()
  for (let i = 0; i < rows.length; i += 90) {
    const batch = rows.slice(i, i + 90)
    const coords = [...batch.map(r => `${r.lng},${r.lat}`), `${CENTER[1]},${CENTER[0]}`, `${SOUTH[1]},${SOUTH[0]}`].join(';')
    const sources = batch.map((_, k) => k).join(';')
    const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=${sources}&destinations=${batch.length};${batch.length + 1}&annotations=duration,distance`
    let j: { code: string; durations: number[][]; distances: number[][] } | null = null
    for (let attempt = 0; attempt < 5 && !j; attempt++) {
      const r = await fetch(url).catch(() => null)
      if (r?.ok) j = await r.json()
      else await sleep(3000 * (attempt + 1))
    }
    if (!j || j.code !== 'Ok') throw new Error(`OSRM: ${j?.code ?? 'нет ответа'}`)
    batch.forEach((r, k) => {
      const [c, s] = j!.durations[k], [, sm] = j!.distances[k]
      if (c != null && s != null) out.set(`${r.kind}:${r.airtable_id}`, { centerS: c, southS: s, southM: sm })
    })
    process.stdout.write(`\rOSRM ${Math.min(i + 90, rows.length)}/${rows.length}`)
    await sleep(1500)
  }
  console.log()
  return out
}

const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)] }

async function main() {
  const rows = await loadRows()
  const o = await osrm(rows)
  // Общий коэффициент — для объектов в самом центре, где своё отношение неустойчиво.
  const ratios = rows.flatMap(r => {
    const g = r.routes_peak?.ubud ?? r.routes?.ubud, x = o.get(`${r.kind}:${r.airtable_id}`)
    return g && x && x.centerS >= 300 ? [g.s / x.centerS] : []
  })
  const kAll = median(ratios)
  console.log(`объектов ${rows.length}, с временем Google ${ratios.length}, медиана Google/OSRM ${kAll.toFixed(2)}`)

  let n = 0
  const sample: string[] = []
  for (const r of rows) {
    const x = o.get(`${r.kind}:${r.airtable_id}`)
    if (!x) continue
    const leg = (g: Leg | undefined): Leg => {
      const k = g && x.centerS >= 300 ? g.s / x.centerS : kAll
      const kStatic = g?.static_s != null && x.centerS >= 300 ? g.static_s / x.centerS : null
      return { s: Math.round(x.southS * k), static_s: kStatic != null ? Math.round(x.southS * kStatic) : null, m: Math.round(x.southM) }
    }
    const routes = r.routes ? { ...r.routes, ubud_south: leg(r.routes.ubud) } : null
    const routesPeak = r.routes_peak ? { ...r.routes_peak, ubud_south: leg(r.routes_peak.ubud) } : null
    if (!routes && !routesPeak) continue
    if (/citrine/.test(r.airtable_id) || sample.length < 5) {
      const c = (routesPeak ?? routes)! as Record<string, Leg>
      sample.push(`${r.airtable_id}: центр ${Math.round((c.ubud?.s ?? 0) / 60)} мин, юг ${Math.round(c.ubud_south.s / 60)} мин`)
    }
    if (APPLY) {
      const { error } = await sb.from('listing_geo_facts').update({ routes, routes_peak: routesPeak }).eq('kind', r.kind).eq('airtable_id', r.airtable_id)
      if (error) throw new Error(`${r.airtable_id}: ${error.message}`)
    }
    n++
  }
  console.log(sample.slice(0, 12).join('\n'))
  console.log(APPLY ? `записано ${n}` : `посчитано ${n}, запись — с --apply`)
}

main().catch(e => { console.error(e); process.exit(1) })
