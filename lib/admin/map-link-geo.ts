// Координаты из вставленной ссылки на Google Maps.
//
// Блок «Локация» на странице ЖК (и вся карта в нём) выводится только при
// заполненных `Geo` / `Geo 2` — сама ссылка нужна лишь кнопке «Открыть на
// Google Maps». Редактор об этом знать не обязан: он вставляет ссылку из
// Google Maps, а координаты достаются отсюда при сохранении записи.
//
// Короткие ссылки (maps.app.goo.gl) координат не содержат — их разворачиваем
// одним запросом по редиректу; всё, что не разобралось, тихо пропускаем:
// ссылка остаётся сохранённой, просто карта ждёт координат.

import { isShortMapLink, mapLinkCoords, pickMapLink, type LatLng } from '../map-link'
import type { CollectionConfig } from './adapters/types'

const LAT_FIELD = 'Geo'
const LNG_FIELD = 'Geo 2'
const EXPAND_TIMEOUT_MS = 6000

const isEmpty = (v: unknown): boolean =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0)

/** Развернуть короткую ссылку и вытащить координаты из конечного URL, а если
 *  их там нет — из тела ответа (Google кладёт туда ту же пару). */
async function expandShortLink(url: string): Promise<LatLng | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      // Без «человеческого» UA Google отдаёт страницу-заглушку без координат.
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; balinsky-admin/1.0)' },
      signal: AbortSignal.timeout(EXPAND_TIMEOUT_MS),
    })
    const fromUrl = mapLinkCoords(res.url)
    if (fromUrl) return fromUrl
    const body = await res.text()
    return mapLinkCoords(body.slice(0, 200_000))
  } catch {
    return null
  }
}

/**
 * Патч с координатами для создаваемой/сохраняемой записи. Пустой объект, если
 * ссылки нет, координаты уже стоят или разобрать ссылку не удалось.
 */
export async function mapLinkGeoPatch(
  cfg: CollectionConfig, fields: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (cfg.store !== 'sql_jsonb') return {}
  // Координаты, проставленные руками, сильнее ссылки.
  if (!isEmpty(fields[LAT_FIELD]) && !isEmpty(fields[LNG_FIELD])) return {}
  const link = pickMapLink(fields)
  if (!link) return {}
  const coords = mapLinkCoords(link) ?? (isShortMapLink(link) ? await expandShortLink(link) : null)
  if (!coords) return {}
  return { [LAT_FIELD]: coords.lat, [LNG_FIELD]: coords.lng }
}
