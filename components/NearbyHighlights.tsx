// «Популярные места рядом» — what makes the location worth it: galleries,
// museums, well-known restaurants, cafés, spas and yoga. Picked from the
// listing's _nearby_places by review count (a proxy for «well-known»), a few
// per category so one type doesn't crowd out the rest. Each row links to the
// place on Google Maps.
import { Star } from 'lucide-react'
import type { NearbyPlace } from '@/lib/nearby-places'
import type { Landmark } from '@/lib/landmarks'
import { pickCopy, type Lang } from '@/lib/i18n'

// Galleries and museums get their own slots: otherwise island-wide landmarks
// with tens of thousands of reviews (Monkey Forest, Bali Zoo) crowd out what is
// actually around the corner.
const ART = new Set(['art_gallery', 'museum'])
const PLAN: { cat: string; n: number; maxKm: number; minReviews?: number; only?: (p: NearbyPlace) => boolean }[] = [
  // A gallery or museum next door is a landmark buyers use to find the place,
  // however few reviews it has (CITRINE sits right behind Mega Sari Art Studio).
  { cat: 'attraction', n: 1, maxKm: 0.3, minReviews: 0, only: p => ART.has(p.primaryType ?? '') },
  { cat: 'attraction', n: 3, maxKm: 3, only: p => p.primaryType === 'art_gallery' },
  { cat: 'attraction', n: 1, maxKm: 5, only: p => p.primaryType === 'museum' },
  { cat: 'attraction', n: 2, maxKm: 3, only: p => !ART.has(p.primaryType ?? '') },
  { cat: 'restaurant', n: 2, maxKm: 2.5 },
  { cat: 'cafe', n: 1, maxKm: 2.5 },
  { cat: 'wellness', n: 1, maxKm: 2.5 },
]
const MIN_REVIEWS = 100

const TYPE_LABEL: Record<string, { ru: string; en: string }> = {
  art_gallery: { ru: 'Галерея', en: 'Art gallery' },
  museum: { ru: 'Музей', en: 'Museum' },
  restaurant: { ru: 'Ресторан', en: 'Restaurant' },
  cafe: { ru: 'Кафе', en: 'Café' },
  coffee_shop: { ru: 'Кофейня', en: 'Coffee shop' },
  spa: { ru: 'Спа', en: 'Spa' },
  yoga_studio: { ru: 'Йога', en: 'Yoga' },
  tourist_attraction: { ru: 'Достопримечательность', en: 'Attraction' },
}
const CAT_LABEL: Record<string, { ru: string; en: string }> = {
  attraction: { ru: 'Достопримечательность', en: 'Attraction' },
  restaurant: { ru: 'Ресторан', en: 'Restaurant' },
  cafe: { ru: 'Кафе', en: 'Café' },
  wellness: { ru: 'Спа и йога', en: 'Spa and yoga' },
}

export function pickHighlights(byCategory: Record<string, NearbyPlace[]>, skipArt = false, skipNames: string[] = []): (NearbyPlace & { cat: string })[] {
  const seen = new Set<string>(skipNames)
  const out: (NearbyPlace & { cat: string })[] = []
  // Есть «Что посмотреть» — здесь из достопримечательностей оставляем только соседа (первое правило).
  const plan = skipArt ? PLAN.filter((r, i) => r.cat !== 'attraction' || i === 0) : PLAN
  for (const { cat, n, maxKm, minReviews = MIN_REVIEWS, only } of plan) {
    const list = (byCategory[cat] ?? [])
      .filter(p => p.name && (p.reviews ?? 0) >= minReviews && p.distanceKm <= maxKm && (!only || only(p)))
      .sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0))
    let k = 0
    for (const p of list) {
      if (k >= n) break
      const key = p.id || p.name!
      if (seen.has(key) || seen.has(p.name!)) continue
      seen.add(key)
      out.push({ ...p, cat })
      k++
    }
  }
  return out
}

export function NearbyHighlights({ byCategory, lang, skipArt = false, skipIds = [] }: { byCategory: Record<string, NearbyPlace[]>; lang: Lang; skipArt?: boolean; skipIds?: string[] }) {
  const items = pickHighlights(byCategory, skipArt, skipIds)
  if (items.length === 0) return null
  const ru = lang === 'ru' || lang === 'uk'
  const title = skipArt
    ? pickCopy({ ru: 'Где поесть и отдохнуть рядом', en: 'Food and wellness nearby' }, lang)
    : pickCopy({ ru: 'Популярные места рядом', en: 'Popular places nearby' }, lang)
  const km = (d: number) => d < 0.1 ? pickCopy({ ru: 'по соседству', en: 'next door' }, lang) : d < 1 ? `${Math.round(d * 1000 / 50) * 50} ${ru ? 'м' : 'm'}` : `${d.toFixed(1).replace('.', ru ? ',' : '.')} ${ru ? 'км' : 'km'}`
  const label = (p: NearbyPlace & { cat: string }) => {
    const t = (p.primaryType && TYPE_LABEL[p.primaryType]) || CAT_LABEL[p.cat]
    return t ? pickCopy(t, lang) : ''
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[17px] font-semibold text-[#18201C] m-0">{title}</h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 m-0 p-0 list-none">
        {items.map(p => (
          <li key={p.id || p.name} className="border-b border-[#EEF2EF]">
            <a
              href={p.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name ?? '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 py-3 no-underline text-[#18201C] hover:text-[var(--color-primary-pressed)] focus-visible:text-[var(--color-primary-pressed)]"
            >
              <span className="flex flex-col min-w-0">
                <span className="text-[15px] font-medium truncate">{p.name}</span>
                <span className="text-[13px] text-[#4C5751]">{label(p)} · {km(p.distanceKm)}</span>
              </span>
              {p.rating != null && (
                <span className="shrink-0 inline-flex items-center gap-1 text-[13px] text-[#4C5751] tabular-nums">
                  <Star size={13} className="text-[#E8A317] fill-[#E8A317]" aria-hidden />
                  {p.rating.toFixed(1).replace('.', ru ? ',' : '.')}
                  <span className="opacity-70">({(p.reviews ?? 0).toLocaleString(ru ? 'ru-RU' : 'en-US')})</span>
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

const BUCKET_LABEL: Record<string, { ru: string; en: string }> = {
  attraction: { ru: 'Достопримечательность', en: 'Attraction' },
  temple: { ru: 'Храм', en: 'Temple' },
  kids_fun: { ru: 'Парк и зоопарк', en: 'Park or zoo' },
}

// «Что посмотреть рядом» — главные места для отдыха (лес обезьян, водопады,
// зоопарки, храмы) из bali_places, см. lib/landmarks.ts.
// Подсказка к метке: что за номер и когда снят (lib/tripadvisor-top.ts).
const TA_TITLE = { ru: 'Место в рейтинге «Что посмотреть на Бали» на TripAdvisor, ноябрь 2026', en: 'Rank in TripAdvisor “Things to Do in Bali”, Nov 2026', id: 'Peringkat di TripAdvisor “Things to Do in Bali”, Nov 2026', fr: 'Classement TripAdvisor « À faire à Bali », nov. 2026', de: 'Platz im TripAdvisor-Ranking „Aktivitäten auf Bali“, Nov. 2026', zh: 'TripAdvisor“巴厘岛必做之事”排名，2026年11月', nl: 'Positie in TripAdvisor “Things to Do in Bali”, nov 2026', ban: 'Peringkat ring TripAdvisor “Things to Do in Bali”, Nov 2026', pl: 'Miejsce w rankingu TripAdvisor „Atrakcje na Bali”, lis 2026', uk: 'Місце в рейтингу TripAdvisor «Що подивитися на Балі», листопад 2026' }

export function LandmarksList({ items, lang }: { items: Landmark[]; lang: Lang }) {
  const ru = lang === 'ru' || lang === 'uk'
  const km = (d: number) => d < 1 ? `${Math.round(d * 1000 / 50) * 50} ${ru ? 'м' : 'm'}` : `${d.toFixed(1).replace('.', ru ? ',' : '.')} ${ru ? 'км' : 'km'}`
  const label = (p: Landmark) => (lang === 'ru' && p.typeRu) ? p.typeRu : pickCopy(BUCKET_LABEL[p.bucket] ?? BUCKET_LABEL.attraction, lang)
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[17px] font-semibold text-[#18201C] m-0">{pickCopy({ ru: 'Что посмотреть рядом', en: 'Things to see nearby', id: 'Tempat wisata terdekat', fr: 'À voir à proximité', de: 'Sehenswertes in der Nähe', zh: '附近景点', nl: 'Bezienswaardigheden in de buurt', ban: 'Genah wisata ring sampingé', pl: 'Atrakcje w pobliżu', uk: 'Що подивитися поруч' }, lang)}</h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 m-0 p-0 list-none">
        {items.map(p => (
          <li key={p.id} className="border-b border-[#EEF2EF]">
            <a
              href={p.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 py-3 no-underline text-[#18201C] hover:text-[var(--color-primary-pressed)] focus-visible:text-[var(--color-primary-pressed)]"
            >
              <span className="flex flex-col min-w-0">
                <span className="text-[15px] font-medium truncate">{p.name}</span>
                <span className="text-[13px] text-[#4C5751]">{label(p)} · {km(p.distanceKm)}</span>
                {p.taRank != null && (
                  <span className="text-[13px] font-medium text-[var(--color-primary-pressed)]" title={pickCopy(TA_TITLE, lang)}>
                    {ru ? '№' : '#'}{p.taRank} TripAdvisor
                  </span>
                )}
              </span>
              {p.rating != null && (
                <span className="shrink-0 inline-flex items-center gap-1 text-[13px] text-[#4C5751] tabular-nums">
                  <Star size={13} className="text-[#E8A317] fill-[#E8A317]" aria-hidden />
                  {p.rating.toFixed(1).replace('.', ru ? ',' : '.')}
                  <span className="opacity-70">({p.reviews.toLocaleString(ru ? 'ru-RU' : 'en-US')})</span>
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
