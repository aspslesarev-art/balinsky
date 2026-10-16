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
  sources: string[]
}

const byId = new Map<string, BeachProfile>()
for (const b of data as BeachProfile[]) for (const id of b.ids) byId.set(id, b)

export function beachProfile(placeId: string | null | undefined): BeachProfile | null {
  return placeId ? byId.get(placeId) ?? null : null
}
