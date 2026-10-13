import 'server-only'
import { adminSb } from './sb'
import { getCollection } from './collections'
import { revalidateCollection } from './revalidate'

// Точка ЖК → точка его юнитов.
//
// Страница виллы и апартамента берёт координаты только из своей записи
// (`Geo` / `Geo 2`), а не из ЖК. Юнит, заведённый раньше, чем ЖК получил точку,
// так и оставался без «Как добраться», «Что вокруг» и доходности — так было с
// Maison Verde и Base (13.10.2026). Поэтому, когда у ЖК меняется точка, она
// переезжает на юниты: на пустые и на те, что стояли в старой точке ЖК (то есть
// тоже были унаследованы). Юнит со своей, отличной точкой не трогаем.

const str = (v: unknown): string => {
  if (Array.isArray(v)) return str(v[0])
  return v == null ? '' : String(v).trim()
}

const UNIT_TABLES = [
  { table: 'raw_villas', collection: 'villas' },
  { table: 'raw_apartments', collection: 'apartments' },
] as const

/**
 * @param oldGeo точка ЖК до правки (для узнавания унаследованных точек)
 * @param next   новая точка ЖК; пустая — ничего не делаем
 * @returns сколько юнитов обновлено
 */
export async function propagateComplexGeo(
  complexId: string,
  oldGeo: { lat: unknown; lng: unknown },
  next: { lat: unknown; lng: unknown },
): Promise<number> {
  const lat = str(next.lat), lng = str(next.lng)
  if (!lat || !lng) return 0
  const oldLat = str(oldGeo.lat), oldLng = str(oldGeo.lng)
  const sb = adminSb()
  let changed = 0

  for (const { table, collection } of UNIT_TABLES) {
    const { data, error } = await sb
      .from(table)
      .select('airtable_id, data')
      .contains('data', { 'Комплекс': [complexId] })
    if (error) throw new Error(`${table}: ${error.message}`)
    let touched = false
    for (const row of (data ?? []) as { airtable_id: string; data: Record<string, unknown> }[]) {
      const uLat = str(row.data['Geo']), uLng = str(row.data['Geo 2'])
      const inherited = !uLat || !uLng || (uLat === oldLat && uLng === oldLng)
      if (!inherited || (uLat === lat && uLng === lng)) continue
      const { error: upErr } = await sb
        .from(table)
        .update({ data: { ...row.data, Geo: lat, 'Geo 2': lng }, synced_at: new Date().toISOString() })
        .eq('airtable_id', row.airtable_id)
      if (upErr) throw new Error(`${table} ${row.airtable_id}: ${upErr.message}`)
      changed++
      touched = true
    }
    const cfg = getCollection(collection)
    if (touched && cfg) await revalidateCollection(cfg)
  }
  return changed
}
