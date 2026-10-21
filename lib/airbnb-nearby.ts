import { createClient } from '@supabase/supabase-js'

// Соседи на Airbnb с тем же числом спален — для вкладки «Будет ли спрос? →
// Посуточно» рядом с карточками Booking (владелец 21.10.2026). SQL —
// airbnb_nearby (migrations/130). Ошибка не ломает страницу: без Airbnb
// вкладка остаётся как была.

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export type AirbnbComp = {
  /** Строка: id Airbnb длиннее 2^53 и в числе округляется. */
  id: string
  name: string
  url: string
  photo: string | null
  /** За ночь со сборами Airbnb, при брони на 5 ночей. */
  priceUsd: number
  bedrooms: number | null
  /** Из 5; null — новое объявление без отзывов. */
  rating: number | null
  reviews: number
  distanceKm: number
}

type Row = {
  id: string; name: string | null; title: string | null; bedrooms: number | null
  rating: number | null; reviews: number | null; distance_m: number | null; price: number | null; photo: string | null
}

export async function loadAirbnbNearby(
  lat: number | null,
  lng: number | null,
  bedrooms: number | null,
  radiusM = 2000,
): Promise<AirbnbComp[]> {
  if (lat == null || lng == null) return []
  try {
    const { data, error } = await sb.rpc('airbnb_nearby', {
      p_lat: lat, p_lng: lng, p_radius_m: radiusM, p_bedrooms: bedrooms, p_limit: 12,
    })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Row[])
      .filter(r => r.price != null && Number(r.price) > 0)
      .map(r => {
        const rating = r.rating == null || Number(r.rating) <= 0 ? null : Number(r.rating)
        return {
          id: r.id,
          name: r.name?.replace(/\s+/g, ' ').trim() || r.title || 'Airbnb',
          url: `https://www.airbnb.com/rooms/${encodeURIComponent(r.id)}`,
          photo: r.photo ? `${r.photo}?im_w=480` : null,
          priceUsd: Number(r.price),
          bedrooms: r.bedrooms,
          rating,
          reviews: rating == null ? 0 : Number(r.reviews ?? 0),
          distanceKm: Number(r.distance_m ?? 0) / 1000,
        }
      })
  } catch (e) {
    console.error('[airbnb-nearby]', e instanceof Error ? e.message : e)
    return []
  }
}
