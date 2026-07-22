'use client'

import Link from 'next/link'
import { ProgressBar } from './ProgressBar'
import { PhotoSlider } from './PhotoSlider'
import { useCurrency } from './CurrencyContext'
import { WishlistButton } from './WishlistButton'
import { formatPrice } from '@/lib/currency'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import { facetLabel } from '@/lib/filter-i18n'
import { hasCyrillic, translitPreserveCase } from '@/lib/translit'

export type ComplexCardData = {
  slug: string
  name: string
  location: string | null
  types: string | null
  permit: string | null
  readiness: number
  coverUrl: string | null
  photos: string[]
  photoCount: number
  villaPriceFrom: number | null
  villaPriceTo: number | null
  aptPriceFrom: number | null
  aptPriceTo: number | null
  // Editor-flagged: every unit in the complex is sold. Renders a red
  // "Продано" / "Sold" pill on the cover photo.
  isSold?: boolean
}

const COPY = {
  ru: { villas: 'Виллы', apartments: 'Апартаменты', permit: 'Разрешение на строительство', noPermit: 'нет', readiness: 'Готовность строительства', from: 'от', to: 'до', sold: 'Продано' },
  en: { villas: 'Villas', apartments: 'Apartments', permit: 'Building permit',                noPermit: 'none', readiness: 'Construction progress', from: 'from', to: 'to', sold: 'Sold' },
  id: { villas: 'Vila', apartments: 'Apartemen', permit: 'Izin mendirikan bangunan',   noPermit: 'tidak ada', readiness: 'Kemajuan konstruksi', from: 'dari', to: 'sampai', sold: 'Terjual' },
  fr: { villas: 'Villas', apartments: 'Appartements', permit: 'Permis de construire',      noPermit: 'aucun', readiness: 'Avancement des travaux', from: 'de', to: 'à', sold: 'Vendu' },
  de: { villas: 'Villen', apartments: 'Apartments', permit: 'Baugenehmigung',              noPermit: 'keine', readiness: 'Baufortschritt', from: 'ab', to: 'bis', sold: 'Verkauft' },
  zh: { villas: '别墅', apartments: '公寓', permit: '建筑许可',                             noPermit: '无', readiness: '施工进度', from: '从', to: '至', sold: '已售' },
  nl: { villas: "Villa's", apartments: 'Appartementen', permit: 'Bouwvergunning',          noPermit: 'geen', readiness: 'Bouwvoortgang', from: 'vanaf', to: 'tot', sold: 'Verkocht' },
  ban: { villas: 'Vila', apartments: 'Apartemen', permit: 'Izin ngwangun bangunan',        noPermit: 'nenten wenten', readiness: 'Kamajuan konstruksi', from: 'saking', to: 'kantos', sold: 'Sampun kaadol' },
  pl: { villas: 'Wille', apartments: 'Apartamenty', permit: 'Pozwolenie na budowę',        noPermit: 'brak', readiness: 'Postęp budowy', from: 'od', to: 'do', sold: 'Sprzedane' },
  uk: { villas: 'Вілли', apartments: 'Апартаменти', permit: 'Дозвіл на будівництво',       noPermit: 'немає', readiness: 'Хід будівництва', from: 'від', to: 'до', sold: 'Продано' },
} as const

function fmtRange(
  from: number | null, to: number | null,
  currency: 'USD' | 'EUR' | 'RUB' | 'UAH' | 'IDR',
  lang: Lang,
): string | null {
  if (from == null && to == null) return null
  const f = from != null ? formatPrice(from, currency, lang) : null
  const tt = to != null ? formatPrice(to, currency, lang) : null
  const c = pickCopy(COPY, lang)
  if (f && tt && from === to) return f
  if (f && tt) return `${c.from} ${f} ${c.to} ${tt}`
  if (f) return `${c.from} ${f}`
  if (tt) return `${c.to} ${tt}`
  return null
}

export function ComplexCard({ c, lang = 'ru' }: { c: ComplexCardData; lang?: Lang }) {
  const { currency } = useCurrency()
  const copy = pickCopy(COPY, lang)
  const detailHref = switchLangPath(`/ru/zhilye-kompleksy/o/${c.slug}`, lang)
  // Prefer the synced storage photos (multi-image slider). Fallback to the
  // single cover image if the manifest doesn't have entries yet.
  const slides = c.photos.length > 0 ? c.photos : c.coverUrl ? [c.coverUrl] : []
  const villaRange = fmtRange(c.villaPriceFrom, c.villaPriceTo, currency, lang)
  const aptRange   = fmtRange(c.aptPriceFrom,   c.aptPriceTo,   currency, lang)
  // District is usually a Latin place name, but de-Cyrillic it as a safety net
  // so a Russian value never leaks onto a non-RU card.
  const location = c.location && lang !== 'ru' && lang !== 'uk' && hasCyrillic(c.location)
    ? translitPreserveCase(c.location)
    : c.location

  return (
    <Link
      href={detailHref}
      className="group flex h-full flex-col bg-[var(--color-card-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden hover:shadow-sm transition-shadow"
    >
      <div className="relative">
        <PhotoSlider photos={slides} alt={c.name} heightClass="h-[240px] md:h-[360px]" trackingId={`complex:${c.slug}`} />
        {c.isSold && (
          <div className="absolute top-3 left-3 z-10 inline-flex items-center px-2.5 py-1 rounded-full bg-[#DC2626] text-white text-[12px] font-semibold tracking-wide shadow-md">
            {copy.sold}
          </div>
        )}
        <WishlistButton
          className="absolute top-3 right-3 z-10"
          item={{
            kind: 'complex', slug: c.slug, title: c.name,
            photo: c.photos?.[0] ?? c.coverUrl ?? null,
            priceUsd: c.villaPriceFrom ?? c.aptPriceFrom ?? null,
            district: c.location ?? null,
            bedrooms: null,
          }}
        />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-[24px] font-semibold text-[var(--color-text)] mb-3 truncate">{c.name}</h3>
        {location && (
          <div className="text-[15px] text-[var(--color-text)] mb-3">{location}</div>
        )}
        {(villaRange || aptRange) && (
          <div className="space-y-1 mb-4 text-[14px]">
            {villaRange && (
              <div className="text-[var(--color-text)]">
                <span className="text-[var(--color-text-muted)]">{copy.villas} </span>
                <span className="font-medium">{villaRange}</span>
              </div>
            )}
            {aptRange && (
              <div className="text-[var(--color-text)]">
                <span className="text-[var(--color-text-muted)]">{copy.apartments} </span>
                <span className="font-medium">{aptRange}</span>
              </div>
            )}
          </div>
        )}
        <div className="text-[14px] text-[var(--color-text-muted)]">
          {copy.permit}: {c.permit ? (facetLabel('permit', c.permit, lang)) : copy.noPermit}
        </div>

        {/* mt-auto pins the readiness block to the bottom of the card so
            cards in the same row line up by their progress bar regardless
            of how much content sits above. */}
        <div className="mt-auto pt-5">
          <div className="text-[14px] font-medium text-[var(--color-text)] mb-2">
            {copy.readiness}
          </div>
          <ProgressBar value={c.readiness} />
        </div>
      </div>
    </Link>
  )
}
