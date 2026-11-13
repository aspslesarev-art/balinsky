import { createClient } from '@supabase/supabase-js'

// «Что посмотреть рядом» — то, ради чего едут туристы: лес обезьян, водопады,
// зоопарки, храмы, рынки (владелец 13.11.2026: у CITRINE показывали галереи,
// а рядом Bali Zoo, парк птиц, Тегенунган). Берём из bali_places (уже собрано,
// запрос бесплатный): корзины attraction/temple/kids_fun, по числу отзывов.

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export type Landmark = {
  id: string
  name: string
  typeRu: string | null
  bucket: string
  reviews: number
  rating: number | null
  distanceKm: number
  mapsUrl: string
}

const NEAR_KM = 5
const FAR_KM = 10
const MIN_REVIEWS = 800
// Не места для поездки: статуи на перекрёстках, лавки-галереи, туры без адреса.
const SKIP_TYPES = new Set(['Памятник', 'Художественная галерея'])

function distKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371, rad = Math.PI / 180
  const dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export async function loadLandmarks(lat: number, lng: number, limit = 8): Promise<Landmark[]> {
  const dLat = FAR_KM / 111
  const dLng = FAR_KM / (111 * Math.cos(lat * Math.PI / 180))
  const { data, error } = await sb.from('bali_places')
    .select('id, name, primary_type, bucket, user_rating_count, rating, lat, lng')
    .in('bucket', ['attraction', 'temple', 'kids_fun'])
    .gte('user_rating_count', MIN_REVIEWS)
    .gte('lat', lat - dLat).lte('lat', lat + dLat)
    .gte('lng', lng - dLng).lte('lng', lng + dLng)
    .order('user_rating_count', { ascending: false })
    .limit(80)
  if (error) throw new Error(`landmarks: ${error.message}`)
  const all = (data ?? [])
    .filter(r => r.name && r.primary_type && !SKIP_TYPES.has(r.primary_type))
    .map(r => ({
      id: r.id as string,
      name: r.name as string,
      typeRu: r.primary_type as string | null,
      bucket: r.bucket as string,
      reviews: Number(r.user_rating_count) || 0,
      rating: r.rating != null ? Number(r.rating) : null,
      distanceKm: distKm(lat, lng, Number(r.lat), Number(r.lng)),
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${r.id}`,
    }))
    .filter(r => r.distanceKm <= FAR_KM)
  // Сначала всё в 5 км по популярности; если мало — добираем дальними (до 10 км).
  const near = all.filter(r => r.distanceKm <= NEAR_KM)
  const far = all.filter(r => r.distanceKm > NEAR_KM)
  return (near.length >= 4 ? near : [...near, ...far]).slice(0, limit)
}
