'use client'

import { useEffect, useRef, useState } from 'react'
import { Star, MapPin, ExternalLink, ChevronDown } from 'lucide-react'
import type { NearbyCategory, NearbyPlace } from '@/lib/nearby-places'
import { pickCopy, type Lang } from '@/lib/i18n'
import { translit, hasCyrillic } from '@/lib/translit'

// Google-Places POI names/addresses are stored in Russian only. On non-RU
// pages, transliterate Cyrillic to Latin so an Indonesian/French visitor
// doesn't see Cyrillic (e.g. "Блу Пойнт Бич" → "Blu Poynt Bich",
// "Бадунг" → "Badung"). RU keeps the original.
function loc(s: string | null | undefined, lang: Lang): string {
  if (!s) return ''
  return lang !== 'ru' && lang !== 'uk' && hasCyrillic(s) ? translit(s) : s
}

const ICONS: Record<string, string> = {
  beach: '🏝️',
  restaurant: '🍽️',
  cafe: '☕️',
  nightlife: '🍸',
  attraction: '✨',
  wellness: '🧘',
  beachclub: '🏖️',
}

// EN titles per category key — manifest stores RU titles only.
const TITLE_EN: Record<string, string> = {
  beach: 'Beaches',
  restaurant: 'Restaurants',
  cafe: 'Cafés',
  nightlife: 'Bars & clubs',
  attraction: 'Attractions',
  school: 'Schools',
  preschool: 'Nurseries & preschools',
  supermarket: 'Supermarkets',
  pharmacy: 'Pharmacies',
  hospital: 'Hospitals & clinics',
  wellness: 'Yoga & fitness',
  beachclub: 'Beach clubs',
  international_school: 'International schools',
}

// ID titles per category key.
const TITLE_ID: Record<string, string> = {
  beach: 'Pantai',
  restaurant: 'Restoran',
  cafe: 'Kafe',
  nightlife: 'Bar & klub',
  attraction: 'Atraksi',
  school: 'Sekolah',
  preschool: 'Penitipan & prasekolah',
  supermarket: 'Supermarket',
  pharmacy: 'Apotek',
  hospital: 'Rumah sakit & klinik',
  wellness: 'Yoga & kebugaran',
  beachclub: 'Beach club',
  international_school: 'Sekolah internasional',
}

// FR titles per category key.
const TITLE_FR: Record<string, string> = {
  beach: 'Plages',
  restaurant: 'Restaurants',
  cafe: 'Cafés',
  nightlife: 'Bars & clubs',
  attraction: 'Attractions',
  school: 'Écoles',
  preschool: 'Crèches & maternelles',
  supermarket: 'Supermarchés',
  pharmacy: 'Pharmacies',
  hospital: 'Hôpitaux & cliniques',
  wellness: 'Yoga & fitness',
  beachclub: 'Beach clubs',
  international_school: 'Écoles internationales',
}

// PL titles per category key.
const TITLE_PL: Record<string, string> = {
  beach: 'Plaże',
  restaurant: 'Restauracje',
  cafe: 'Kawiarnie',
  nightlife: 'Bary i kluby',
  attraction: 'Atrakcje',
  school: 'Szkoły',
  preschool: 'Żłobki i przedszkola',
  supermarket: 'Supermarkety',
  pharmacy: 'Apteki',
  hospital: 'Szpitale i kliniki',
  wellness: 'Joga i fitness',
  beachclub: 'Kluby plażowe',
  international_school: 'Szkoły międzynarodowe',
}

// UK titles per category key.
const TITLE_UK: Record<string, string> = {
  beach: 'Пляжі',
  restaurant: 'Ресторани',
  cafe: 'Кафе',
  nightlife: 'Бари та клуби',
  attraction: 'Визначні місця',
  school: 'Школи',
  preschool: 'Ясла та дитячі садки',
  supermarket: 'Супермаркети',
  pharmacy: 'Аптеки',
  hospital: 'Лікарні та клініки',
  wellness: 'Йога та фітнес',
  beachclub: 'Пляжні клуби',
  international_school: 'Міжнародні школи',
}

const COPY = {
  ru: {
    h2: 'Что рядом',
    subtitle: 'Популярные места поблизости — данные Google Maps',
    onMap: 'На карте',
    free: 'бесплатно',
  },
  en: {
    h2: "What's nearby",
    subtitle: 'Popular spots nearby — sourced from Google Maps',
    onMap: 'View on map',
    free: 'free',
  },
  id: {
    h2: 'Apa yang ada di sekitar',
    subtitle: 'Tempat populer di sekitar — data dari Google Maps',
    onMap: 'Lihat di peta',
    free: 'gratis',
  },
  fr: {
    h2: 'À proximité',
    subtitle: 'Lieux populaires à proximité — données Google Maps',
    onMap: 'Voir sur la carte',
    free: 'gratuit',
  },
  de: {
    h2: 'Was ist in der Nähe',
    subtitle: 'Beliebte Orte in der Nähe — Daten von Google Maps',
    onMap: 'Auf Karte ansehen',
    free: 'kostenlos',
  },
  zh: {
    h2: '附近有什么',
    subtitle: '附近的热门地点 — 数据来自 Google Maps',
    onMap: '在地图上查看',
    free: '免费',
  },
  nl: {
    h2: 'Wat is er in de buurt',
    subtitle: 'Populaire plekken in de buurt — gegevens van Google Maps',
    onMap: 'Bekijk op kaart',
    free: 'gratis',
  },
  ban: {
    h2: 'Napi sané wénten ring samping',
    subtitle: 'Genah kasub ring samping — data saking Google Maps',
    onMap: 'Cingak ring peta',
    free: 'gratis',
  },
  pl: {
    h2: 'Co jest w pobliżu',
    subtitle: 'Popularne miejsca w pobliżu — dane z Google Maps',
    onMap: 'Zobacz na mapie',
    free: 'bezpłatnie',
  },
  uk: {
    h2: 'Що поруч',
    subtitle: 'Популярні місця поблизу — дані з Google Maps',
    onMap: 'Переглянути на карті',
    free: 'безкоштовно',
  },
} as const

function fmtDistance(km: number, lang: Lang): string {
  const mUnit = pickCopy({ ru: 'м', en: 'm', id: 'm', fr: 'm', de: 'm', zh: '米', nl: 'm', ban: 'm', pl: 'm', uk: 'м' }, lang)
  const kmUnit = pickCopy({ ru: 'км', en: 'km', id: 'km', fr: 'km', de: 'km', zh: '公里', nl: 'km', ban: 'km', pl: 'km', uk: 'км' }, lang)
  if (km < 1) return `${Math.round(km * 1000)} ${mUnit}`
  return `${km.toFixed(1)} ${kmUnit}`
}

export function NearbyPlaces({
  categories,
  byCategory,
  lang = 'ru',
}: {
  categories: NearbyCategory[]
  byCategory: Record<string, NearbyPlace[]>
  lang?: Lang
}) {
  const c = pickCopy(COPY, lang)
  const available = categories.filter(cat => (byCategory[cat.key] ?? []).length > 0)
  const [active, setActive] = useState<string | null>(available[0]?.key ?? null)
  // Desktop shows the first 3 place cards (one row); the rest hide behind a
  // "Показать остальные" toggle. Mobile keeps the horizontal swipe untouched.
  const [placesExpanded, setPlacesExpanded] = useState(false)

  // Desktop the chips wrap onto several rows; collapse to the first row with a
  // "Показать все" toggle (mobile is already a single horizontal-swipe row).
  const chipsRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [collapse, setCollapse] = useState<{ rowH: number; overflow: boolean }>({ rowH: 0, overflow: false })
  useEffect(() => {
    const el = chipsRef.current
    if (!el) return
    const measure = () => {
      const desktop = window.matchMedia('(min-width: 768px)').matches
      const first = el.firstElementChild as HTMLElement | null
      const rowH = first?.offsetHeight ?? 0
      // scrollHeight is the full content height even while clamped/hidden.
      setCollapse({ rowH, overflow: desktop && rowH > 0 && el.scrollHeight > rowH + 8 })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [available.length])

  if (available.length === 0) return null

  const places: NearbyPlace[] = active
    ? [...(byCategory[active] ?? [])].sort((a, b) => a.distanceKm - b.distanceKm)
    : []
  const numberLocale = ({ ru: 'ru-RU', en: 'en-GB', id: 'id-ID', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN', nl: 'nl-NL', ban: 'id-ID', pl: 'pl-PL', uk: 'uk-UA' } as const)[lang]

  return (
    <section className="mb-10">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-2">
        {c.h2}
      </h2>
      <div className="text-[14px] text-[var(--color-text-muted)] mb-4">
        {c.subtitle}
      </div>

      {/* Mobile: single-row horizontal swipe; desktop: wrap, collapsed to row 1. */}
      <div className="mb-5">
      <div
        ref={chipsRef}
        style={collapse.overflow && !expanded ? { maxHeight: collapse.rowH, overflowY: 'hidden' } : undefined}
        className="flex gap-2 overflow-x-auto -mx-6 px-6 max-w-none md:max-w-full md:mx-0 md:px-0 md:flex-wrap md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {available.map(cat => {
          const isActive = cat.key === active
          const count = byCategory[cat.key]?.length ?? 0
          const title = lang === 'ru'
            ? cat.title
            : lang === 'id'
              ? (TITLE_ID[cat.key] ?? loc(cat.title, lang))
              : lang === 'fr'
                ? (TITLE_FR[cat.key] ?? loc(cat.title, lang))
                : lang === 'pl'
                  ? (TITLE_PL[cat.key] ?? loc(cat.title, lang))
                  : lang === 'uk'
                    ? (TITLE_UK[cat.key] ?? cat.title)
                    : (TITLE_EN[cat.key] ?? loc(cat.title, lang))
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => { setActive(cat.key); setPlacesExpanded(false) }}
              className={
                'shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ' +
                (isActive
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]')
              }
            >
              <span>{ICONS[cat.key] ?? '📍'}</span>
              <span>{title}</span>
              <span className={isActive ? 'opacity-90' : 'text-[var(--color-text-muted)]'}>· {count}</span>
            </button>
          )
        })}
      </div>
      {collapse.overflow && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="hidden md:inline-flex items-center gap-1 mt-2.5 text-[13px] font-medium text-[var(--color-primary)] hover:gap-1.5 transition-all cursor-pointer"
        >
          {expanded
            ? pickCopy({ ru: 'Свернуть', en: 'Collapse', id: 'Ciutkan', fr: 'Réduire', de: 'Einklappen', zh: '收起', nl: 'Inklappen', ban: 'Ciutang', pl: 'Zwiń', uk: 'Згорнути' }, lang)
            : pickCopy({ ru: 'Показать все', en: 'Show all', id: 'Tampilkan semua', fr: 'Tout afficher', de: 'Alle anzeigen', zh: '显示全部', nl: 'Alles tonen', ban: 'Cingakin makejang', pl: 'Pokaż wszystkie', uk: 'Показати всі' }, lang)}
          <ChevronDown size={15} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
      </div>

      {/* Mobile: horizontal swipe with the next card peeking; desktop: grid.
          max-w-none releases the `main * { max-width: 100% }` guard so the
          -mx-6 track reaches the screen edges instead of leaving a gap. */}
      <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-6 px-6 max-w-none md:max-w-full md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {places.map((p, i) => (
          <li
            key={p.id}
            className={
              'snap-start shrink-0 w-[280px] md:w-auto rounded-2xl border border-[var(--color-border)] bg-white p-4 flex flex-col gap-2' +
              // Desktop only: hide the 4th+ card until expanded (mobile keeps
              // every card in the swipe).
              (!placesExpanded && i >= 3 ? ' md:hidden' : '')
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-[15px] font-semibold leading-snug text-[#111827] line-clamp-2">{loc(p.name, lang)}</div>
              <div className="text-[12px] text-[var(--color-text-muted)] shrink-0 mt-0.5">{fmtDistance(p.distanceKm, lang)}</div>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-muted)]">
              {p.rating != null && (
                <span className="inline-flex items-center gap-1">
                  <Star size={12} className="text-[#F59E0B] fill-[#F59E0B]" />
                  <span className="font-medium text-[#111827]">{p.rating.toFixed(1)}</span>
                  {p.reviews != null && <span>· {p.reviews.toLocaleString(numberLocale).replace(/,/g, ' ')}</span>}
                </span>
              )}
              {p.priceLevel && (
                <span>{priceLevelToSymbol(p.priceLevel, c.free)}</span>
              )}
            </div>
            {p.address && (
              <div className="flex items-start gap-1.5 text-[12px] text-[var(--color-text-muted)]">
                <MapPin size={12} className="shrink-0 mt-0.5" />
                <span className="line-clamp-1">{loc(p.address, lang)}</span>
              </div>
            )}
            {p.mapsUrl && (
              <a
                href={p.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[13px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] no-underline mt-auto"
              >
                <ExternalLink size={12} />
                {c.onMap}
              </a>
            )}
          </li>
        ))}
      </ul>
      {places.length > 3 && (
        <button
          type="button"
          onClick={() => setPlacesExpanded(v => !v)}
          className="hidden md:inline-flex items-center gap-1 mt-4 text-[13px] font-medium text-[var(--color-primary)] hover:gap-1.5 transition-all cursor-pointer"
        >
          {placesExpanded
            ? pickCopy({ ru: 'Свернуть', en: 'Collapse', id: 'Ciutkan', fr: 'Réduire', de: 'Einklappen', zh: '收起', nl: 'Inklappen', ban: 'Ciutang', pl: 'Zwiń', uk: 'Згорнути' }, lang)
            : `${pickCopy({ ru: 'Показать остальные', en: 'Show the rest', id: 'Tampilkan sisanya', fr: 'Afficher le reste', de: 'Rest anzeigen', zh: '显示其余', nl: 'Toon de rest', ban: 'Cingakin sané lianan', pl: 'Pokaż pozostałe', uk: 'Показати решту' }, lang)} · ${places.length - 3}`}
          <ChevronDown size={15} className={`transition-transform ${placesExpanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  )
}

function priceLevelToSymbol(level: string, freeLabel: string): string {
  const map: Record<string, string> = {
    PRICE_LEVEL_FREE: freeLabel,
    PRICE_LEVEL_INEXPENSIVE: '$',
    PRICE_LEVEL_MODERATE: '$$',
    PRICE_LEVEL_EXPENSIVE: '$$$',
    PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
  }
  return map[level] ?? ''
}
