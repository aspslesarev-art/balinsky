// Время в пути и высота для объектов без них — бесплатно, без Google Routes.
//
// Google Routes платный (~$10 за 1000 пар «объект → точка»). Вместо него:
//   1. OSRM (router.project-osrm.org, дороги OpenStreetMap) даёт время по
//      пустой дороге для любого числа точек бесплатно;
//   2. для ~1000 объектов у нас уже есть точные времена Google (с пробками и
//      без) — по ним для каждого направления подбирается пересчёт
//      OSRM → Google (линейная регрессия);
//   3. точность проверяется на объектах, не участвовавших в подборе, и
//      печатается до записи.
// Высота — OpenTopoData (SRTM 30 м, бесплатно, 100 точек за запрос).
//
//   npx tsx --env-file=.env.local scripts/routes-free.ts           # подбор + проверка точности
//   npx tsx --env-file=.env.local scripts/routes-free.ts --apply   # записать недостающие
import { sbAdmin } from '../lib/market/apply'

const sb = sbAdmin()
const APPLY = process.argv.includes('--apply')

// Те же точки, что в scripts/build-listing-routes.mjs.
const DESTS: Array<[string, number, number]> = [
  ['airport', -8.7467, 115.1668],
  ['canggu', -8.66, 115.138],
  ['ubud', -8.5069, 115.2625],
  ['uluwatu', -8.82914, 115.0849],
  ['sanur', -8.688, 115.262],
]

type Leg = { s: number; static_s?: number | null; m: number | null }
type Row = { kind: string; airtable_id: string; lat: number; lng: number; routes: Record<string, Leg> | null; routes_peak: Record<string, Leg> | null; elevation_m: number | null }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function loadRows(): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('listing_geo_facts').select('kind, airtable_id, lat, lng, routes, routes_peak, elevation_m').range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data as unknown as Row[]))
    if (!data || data.length < 1000) break
  }
  return out
}

// Матрица OSRM: до 90 объектов + 5 точек за запрос (лимит демо-сервера — 100).
async function osrm(rows: Row[]): Promise<Map<string, Record<string, { s: number; m: number }>>> {
  const out = new Map<string, Record<string, { s: number; m: number }>>()
  for (let i = 0; i < rows.length; i += 90) {
    const batch = rows.slice(i, i + 90)
    const coords = [...batch.map(r => `${r.lng},${r.lat}`), ...DESTS.map(([, lat, lng]) => `${lng},${lat}`)].join(';')
    const sources = batch.map((_, k) => k).join(';')
    const dests = DESTS.map((_, k) => batch.length + k).join(';')
    const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=${sources}&destinations=${dests}&annotations=duration,distance`
    let j: { code: string; durations: number[][]; distances: number[][] } | null = null
    for (let attempt = 0; attempt < 4 && !j; attempt++) {
      const r = await fetch(url)
      if (r.ok) j = await r.json()
      else await sleep(2000 * (attempt + 1))
    }
    if (!j || j.code !== 'Ok') throw new Error(`OSRM: ${j?.code ?? 'нет ответа'}`)
    batch.forEach((r, k) => {
      const legs: Record<string, { s: number; m: number }> = {}
      DESTS.forEach(([name], d) => { legs[name] = { s: j!.durations[k][d], m: j!.distances[k][d] } })
      out.set(`${r.kind}|${r.airtable_id}`, legs)
    })
    process.stdout.write(`\r  OSRM: ${Math.min(i + 90, rows.length)}/${rows.length}`)
    await sleep(1100)
  }
  process.stdout.write('\n')
  return out
}

type Fit = { a: number; b: number }
function fit(xs: number[], ys: number[]): Fit {
  const n = xs.length
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2 }
  const a = num / den
  return { a, b: my - a * mx }
}
const apply = (f: Fit, x: number) => Math.max(60, Math.round(f.a * x + f.b))

// Пробки на Бали — свойство места: из Чангу в час пик едут вдвое дольше, чем
// показывает пустая дорога, из Букита — почти как по ней. Поэтому пересчёт
// берётся у ближайших объектов с точным временем Google: медиана их
// отношения «Google / OSRM» по тому же направлению. Регрессия — запасной
// вариант, когда соседей рядом нет.
const K = 5
const NEAR_KM = 3
function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dx = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180)
  const dy = (a.lat - b.lat) * 111
  return Math.hypot(dx, dy)
}
type Ref = { lat: number; lng: number; ratio: Record<string, { peak: number; free: number; night: number | null }> }
function knn(r: { lat: number; lng: number }, refs: Ref[], d: string, field: 'peak' | 'free' | 'night', minKm = 0): number | null {
  const near = refs
    .map(x => ({ x, km: distKm(r, x) }))
    .filter(n => n.km >= minKm && n.km <= NEAR_KM && n.x.ratio[d]?.[field] != null)
    .sort((a, b) => a.km - b.km)
    .slice(0, K)
    .map(n => n.x.ratio[d][field] as number)
    .sort((a, b) => a - b)
  return near.length >= 2 ? near[Math.floor(near.length / 2)] : null
}

async function main() {
  const rows = await loadRows()
  const known = rows.filter(r => r.routes_peak && DESTS.every(([d]) => r.routes_peak![d]?.s && r.routes_peak![d]?.static_s))
  const missing = rows.filter(r => !r.routes && !r.routes_peak)
  console.log(`с точными временами Google: ${known.length} · без маршрутов: ${missing.length}`)

  // Для подбора хватает 400 объектов — меньше нагрузки на бесплатный сервер.
  const shuffled = [...known].sort(() => Math.random() - 0.5)
  // Проверка — на 100 объектах вне подбора; при записи соседями служат все
  // остальные объекты с точными временами.
  const test = shuffled.slice(0, 100)
  const train = shuffled.slice(100)
  const osr = await osrm([...train, ...test, ...missing])
  const key = (r: Row) => `${r.kind}|${r.airtable_id}`

  const fits: Record<string, { peak: Fit; free: Fit; night: Fit }> = {}
  for (const [d] of DESTS) {
    const xs = train.map(r => osr.get(key(r))![d].s)
    fits[d] = {
      peak: fit(xs, train.map(r => r.routes_peak![d].s)),
      free: fit(xs, train.map(r => r.routes_peak![d].static_s!)),
      night: fit(xs, train.filter(r => r.routes?.[d]).map(r => r.routes![d].s)),
    }
  }

  const refs: Ref[] = train.map(r => {
    const o = osr.get(key(r))!
    const ratio: Ref['ratio'] = {}
    for (const [d] of DESTS) {
      ratio[d] = {
        peak: r.routes_peak![d].s / o[d].s,
        free: r.routes_peak![d].static_s! / o[d].s,
        night: r.routes?.[d]?.s ? r.routes[d].s / o[d].s : null,
      }
    }
    return { lat: r.lat, lng: r.lng, ratio }
  })
  const predict = (r: Row, d: string, field: 'peak' | 'free' | 'night', minKm = 0): number => {
    const o = osr.get(key(r))![d].s
    const k = knn(r, refs, d, field, minKm)
    return k != null ? Math.max(60, Math.round(o * k)) : apply(fits[d][field], o)
  }

  console.log('\nпроверка на 100 объектах, не участвовавших в подборе (минуты, «час пик»):')
  const report = (label: string, f: (r: Row, d: string) => number) => {
    console.log(`  ${label}`)
    for (const [d] of DESTS) {
      const errs = test.map(r => Math.abs(f(r, d) - r.routes_peak![d].s) / 60).sort((a, b) => a - b)
      const rel = test.map(r => Math.abs(f(r, d) - r.routes_peak![d].s) / r.routes_peak![d].s).sort((a, b) => a - b)
      const med = errs[Math.floor(errs.length / 2)], p90 = errs[Math.floor(errs.length * 0.9)]
      console.log(`    ${d.padEnd(8)} медиана ${med.toFixed(1)} мин, 90% — до ${p90.toFixed(1)} мин (${Math.round(rel[Math.floor(rel.length * 0.9)] * 100)}%)`)
    }
  }
  report('общая формула:', (r, d) => apply(fits[d].peak, osr.get(key(r))![d].s))
  // Юниты одного ЖК стоят в одной точке — при проверке соседей ближе 300 м
  // не берём, иначе объект «угадывает» сам себя. Новые ЖК стоят в новых местах.
  report('по ближайшим соседям (не ближе 300 м):', (r, d) => predict(r, d, 'peak', 0.3))
  const covered = missing.filter(r => knn(r, refs, 'airport', 'peak') != null).length
  console.log(`  новых объектов с соседями в ${NEAR_KM} км: ${covered} из ${missing.length}`)

  // Высота — только тем, у кого её нет.
  const needElev = rows.filter(r => r.elevation_m == null)
  const elev = new Map<string, number>()
  if (APPLY) {
    for (let i = 0; i < needElev.length; i += 100) {
      const batch = needElev.slice(i, i + 100)
      const r = await fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${batch.map(x => `${x.lat},${x.lng}`).join('|')}`)
      const j = await r.json() as { results?: Array<{ elevation: number | null }> }
      j.results?.forEach((res, k) => { if (res.elevation != null) elev.set(key(batch[k]), Math.round(res.elevation * 10) / 10) })
      await sleep(1100)
    }
    console.log(`высота: ${elev.size} из ${needElev.length}`)
  } else {
    console.log(`высоты нет у ${needElev.length}`)
  }

  if (!APPLY) { console.log('\n(ничего не записано — запусти с --apply)'); return }

  const updates = missing.map(r => {
    const o = osr.get(key(r))!
    const peak: Record<string, Leg> = {}
    const night: Record<string, Leg> = {}
    for (const [d] of DESTS) {
      const m = Math.round(o[d].m)
      peak[d] = { s: predict(r, d, 'peak'), static_s: predict(r, d, 'free'), m }
      night[d] = { s: predict(r, d, 'night'), m }
    }
    return { kind: r.kind, airtable_id: r.airtable_id, lat: r.lat, lng: r.lng, routes: night, routes_peak: peak, ...(elev.has(key(r)) ? { elevation_m: elev.get(key(r)) } : {}) }
  })
  for (let i = 0; i < updates.length; i += 200) {
    const { error } = await sb.from('listing_geo_facts').upsert(updates.slice(i, i + 200), { onConflict: 'kind,airtable_id' })
    if (error) throw new Error(error.message)
  }
  // Высота тем, у кого маршруты уже были, а высоты нет.
  const elevOnly = needElev.filter(r => !missing.includes(r) && elev.has(key(r)))
  for (const r of elevOnly) {
    await sb.from('listing_geo_facts').update({ elevation_m: elev.get(key(r)) }).eq('kind', r.kind).eq('airtable_id', r.airtable_id)
  }
  console.log(`записано маршрутов: ${updates.length}, высот отдельно: ${elevOnly.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
