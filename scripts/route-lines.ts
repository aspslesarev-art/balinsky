// Линии маршрутов для карты «Как добраться»: от каждого объекта до
// аэропорта, Чангу, Убуда, Улувату и Санура — по дорогам, через бесплатный
// демо-сервер OSRM (лимит ~1 запрос/с). Время в блоке остаётся прежним
// (scripts/routes-free.ts, Google) — здесь только форма линии на карте.
// Объекты одного комплекса стоят в одной точке: считаем точку один раз.
//
//   npx tsx --env-file=.env.local scripts/route-lines.ts            # посчитать, ничего не писать
//   npx tsx --env-file=.env.local scripts/route-lines.ts --apply    # записать route_lines
//   ... --only-missing    # только объекты без линий
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const APPLY = process.argv.includes('--apply')
const ONLY_MISSING = process.argv.includes('--only-missing')

// Те же точки, что в scripts/routes-free.ts.
const DESTS: Array<[string, number, number]> = [
  ['airport', -8.7467, 115.1668],
  ['canggu', -8.66, 115.138],
  ['ubud', -8.5069, 115.2625],
  ['uluwatu', -8.82914, 115.0849],
  ['sanur', -8.688, 115.262],
]

type Row = { kind: string; airtable_id: string; lat: number; lng: number; route_lines: unknown }
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function loadRows(): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('listing_geo_facts').select('kind, airtable_id, lat, lng, route_lines').range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data as unknown as Row[]))
    if (!data || data.length < 1000) break
  }
  return out
}

async function route(lat: number, lng: number, dLat: number, dLng: number): Promise<number[][] | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${dLng},${dLat}?overview=simplified&geometries=geojson`
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'balinsky-route-lines/1.0' } }).catch(() => null)
    if (r?.ok) {
      const j = await r.json() as { code: string; routes?: { geometry: { coordinates: number[][] } }[] }
      const c = j.code === 'Ok' ? j.routes?.[0]?.geometry.coordinates : null
      // 5 знаков ≈ 1 м — точнее карта не покажет, а JSON вдвое короче.
      return c ? c.map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]) : null
    }
    await sleep(2000 * (attempt + 1))
  }
  return null
}

async function main() {
  const rows = (await loadRows()).filter(r => r.lat != null && r.lng != null && (!ONLY_MISSING || r.route_lines == null))
  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const k = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`
    groups.set(k, [...(groups.get(k) ?? []), r])
  }
  console.log(`${rows.length} объектов, ${groups.size} точек, ${groups.size * DESTS.length} запросов`)
  let done = 0, failed = 0
  for (const [, g] of groups) {
    const { lat, lng } = g[0]
    const lines: Record<string, number[][]> = {}
    for (const [name, dLat, dLng] of DESTS) {
      const c = await route(lat, lng, dLat, dLng)
      if (c) lines[name] = c
      await sleep(1100)
    }
    if (Object.keys(lines).length === 0) failed++
    else if (APPLY) {
      for (const r of g) {
        const { error } = await sb.from('listing_geo_facts').update({ route_lines: lines }).eq('kind', r.kind).eq('airtable_id', r.airtable_id)
        if (error) throw new Error(error.message)
      }
    }
    done++
    process.stdout.write(`\r  ${done}/${groups.size}${failed ? `, без маршрута: ${failed}` : ''}`)
  }
  process.stdout.write('\n')
  console.log(APPLY ? 'записано' : 'пробный прогон, ничего не записано (--apply)')
}

main().catch(e => { console.error(e); process.exit(1) })
