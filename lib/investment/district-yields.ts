// Медианная доходность вилл района «до налогов» — та же цифра, что на
// странице каждой виллы (listing_yields, scripts/build-listing-yields.ts).
// Страница «Инвестиции в <район>» раньше считала выручку сама: ставка × 65% ×
// 365 и минус 51% — по модели, которой больше нет.
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// Меньше 5 вилл — не медиана района, а пара случайных объектов.
const MIN_VILLAS = 5

export type DistrictYield = { cap: number; n: number }

const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y)
  const m = Math.floor(a.length / 2)
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2
}

/** Все виллы с доходностью → район (Location 2, как в каталоге). */
const loadVillaYieldsByDistrict = unstable_cache(async (): Promise<Record<string, number[]>> => {
  const { data: ly, error } = await sb.from('listing_yields').select('airtable_id, cap_before').eq('kind', 'villa').limit(5000)
  if (error) throw new Error(`listing_yields: ${error.message}`)
  const cap = new Map((ly ?? []).map(r => [String(r.airtable_id), Number(r.cap_before)]))
  const out: Record<string, number[]> = {}
  const ids = [...cap.keys()]
  for (let i = 0; i < ids.length; i += 300) {
    const { data, error: e2 } = await sb.from('raw_villas').select('airtable_id, l2:data->"Location 2", l:data->Location').in('airtable_id', ids.slice(i, i + 300))
    if (e2) throw new Error(`raw_villas: ${e2.message}`)
    for (const r of data ?? []) {
      const pick = (v: unknown) => (Array.isArray(v) ? v[0] : v)
      const loc = String(pick(r.l2) ?? pick(r.l) ?? '').trim()
      const c = cap.get(String(r.airtable_id))
      if (!loc || c == null || !Number.isFinite(c)) continue
      ;(out[loc] ??= []).push(c)
    }
  }
  return out
}, ['district-villa-yields-v1'], { revalidate: 604800, tags: ['content:villas'] })

/** Медиана по району; null — данных мало или загрузка не удалась. */
export async function districtVillaYield(district: string): Promise<DistrictYield | null> {
  try {
    const xs = (await loadVillaYieldsByDistrict())[district] ?? []
    return xs.length >= MIN_VILLAS ? { cap: median(xs), n: xs.length } : null
  } catch (e) {
    console.error('[district-yields]', String(e).slice(0, 200))
    return null
  }
}
