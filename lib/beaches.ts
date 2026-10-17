// Описания пляжей Бали — какой песок, вода, можно ли купаться с детьми,
// сёрфинг, чем заняться, набережная, кому подходит. Собраны вручную по
// открытым источникам (путеводители, Wikipedia, surf-forecast; ссылки — в
// поле sources каждой записи), 16.10.2026. Ключ — Google place id пляжа,
// как его видит scripts/sync-nearby-places.mjs; у одного пляжа бывает
// несколько id. Нет данных по полю — null, а не догадка.
import data from './beaches.json'

export type BeachProfile = {
  ids: string[]
  name_ru: string | null
  name_en: string | null
  sand: 'white' | 'golden' | 'grey' | 'black' | 'mixed' | null
  sand_note?: string | null
  water: 'calm' | 'moderate' | 'waves' | 'strong_currents' | null
  water_note?: string | null
  swim: 'yes' | 'high_tide_only' | 'not_recommended' | null
  swim_note?: string | null
  kids: 'yes' | 'with_care' | 'no' | null
  kids_note?: string | null
  surf: 'none' | 'beginner' | 'intermediate' | 'advanced' | null
  surf_note?: string | null
  activities: string[] | null
  promenade: { exists: boolean | null; length_km: number | null; note?: string | null } | null
  access: string | null
  access_note?: string | null
  vibe: string | null
  why: string | null
  /** Заведения в radius_m от точки пляжа (scripts/build-beach-counts.ts, bali_places). */
  nearby?: { cafes: number; restaurants: number; bars: number; beach_clubs: number; radius_m: number } | null
  /** Фото пляжа и набережной со свободной лицензией (scripts/upload-beach-photos.mjs). */
  photos?: { src: string; kind: 'beach' | 'promenade'; author: string | null; license: string | null; page: string }[]
  /** Точка пляжа (Google), для запасного поиска по координатам. */
  lat?: number
  lng?: number
  sources: string[]
}

const byId = new Map<string, BeachProfile>()
for (const b of data as BeachProfile[]) for (const id of b.ids) byId.set(id, b)

export function beachProfile(placeId: string | null | undefined): BeachProfile | null {
  return placeId ? byId.get(placeId) ?? null : null
}

/** Ближайший пляж, у которого есть описание, в пределах maxKm. Ближайшей
 *  точкой «пляж» в Google часто бывает мелкий спуск или бич-клуб без
 *  описания (у Bingin Villas — «Хидден бич» в 300 м, а Бингин в 480 м). */
export function nearestBeachProfile<P extends { id: string; distanceKm: number; rating?: number | null; reviews?: number | null; mapsUrl?: string | null }>(
  places: P[] | null | undefined,
  maxKm = 3,
): { beach: BeachProfile; km: number; placeId: string; google: { rating: number | null; reviews: number | null; url: string | null } } | null {
  let best: { beach: BeachProfile; p: P } | null = null
  for (const p of places ?? []) {
    const b = byId.get(p.id)
    if (b && p.distanceKm <= maxKm && (!best || p.distanceKm < best.p.distanceKm)) best = { beach: b, p }
  }
  if (!best) return null
  const { beach, p } = best
  return { beach, km: p.distanceKm, placeId: p.id, google: { rating: p.rating ?? null, reviews: p.reviews ?? null, url: p.mapsUrl ?? null } }
}

/** Запасной путь, когда Google не вернул пляжей рядом с объектом (так бывает
 *  в Сануре и Сесехе): ближайший описанный пляж по прямой, в пределах maxKm. */
export function nearestBeachProfileByPoint(lat: number | null | undefined, lng: number | null | undefined, maxKm = 3): { beach: BeachProfile; km: number; placeId: string; google: null } | null {
  if (lat == null || lng == null) return null
  let best: { beach: BeachProfile; km: number; placeId: string; google: null } | null = null
  for (const b of data as BeachProfile[]) {
    if (b.lat == null || b.lng == null) continue
    const km = 111.32 * Math.hypot(b.lat - lat, (b.lng - lng) * Math.cos(lat * Math.PI / 180))
    if (km <= maxKm && (!best || km < best.km)) best = { beach: b, km, placeId: b.ids[0], google: null }
  }
  return best
}
