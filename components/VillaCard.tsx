'use client'

import { pluralRu } from '@/lib/plural-ru'
import { VerifiedYieldBadge } from './VerifiedYieldBadge'
import Link from 'next/link'
import { PhotoSlider } from './PhotoSlider'
import { ApproxPrice } from './InlinePrice'
import { useCurrency } from './CurrencyContext'
import { WishlistButton } from './WishlistButton'
import { formatPriceExact } from '@/lib/currency'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import type { YieldRange } from '@/lib/investment/chance'
import type { CardLivingData } from './CardLiving'
import { districtRu, districtLatin } from '@/lib/district-ru'
import type { UnitDemandView } from '@/lib/unit-demand-view'

export type VillaCardData = {
  /** Режим «Для жизни»: расстояния до школы и пляжа вместо доходности (CardLiving). */
  living?: CardLivingData | null
  /** Комплекс сам на Booking — доходность по его реальным цифрам. */
  verifiedYield?: boolean
  // Балл востребованности в районе. Необязателен: в общих каталогах карточка
  // рендерится без него, чтобы не тянуть лишний запрос на каждый листинг.
  demand?: UnitDemandView
  slug: string
  title: string
  priceUsd: number | null
  bedrooms: number | null
  area: number | null
  land: number | null
  district: string | null
  status: string | null
  photos: string[]
  investmentScore?: number | null
  // 'resale' / 'secondary' = sold by an owner / agent rather than the
  // developer. Drives the "Перепродажа" badge and the contact routing
  // on the detail page (direct seller contact instead of dev manager).
  dealType?: 'resale' | 'secondary' | null
  // Ссылка на карточку, если объект живёт не в основном каталоге: объекты
  // перепродажи, добавленные агентами, лежат в /ru/pereprodazha/o/<slug>.
  detailHref?: string
  // Optional fields piped into the wishlist snapshot at heart-tap so
  // saved listings carry investor-relevant context out of the catalog
  // without needing to open the detail page first.
  developerName?: string | null
  developerCompletedCount?: number | null
  developerInProgressCount?: number | null
  pricePerSqmUsd?: number | null
  pricePerSqmYearUsd?: number | null
  leaseYears?: number | null
  permit?: string | null
  completionYear?: string | null
  claimedYieldPct?: number | null
  bestCapRate?: number | null
  interiorStyle?: string | null
  // Airtable record ID, piped into the wishlist snapshot so the
  // agent PDF can print a lookup code and the catalog search can
  // resolve a paste-back. Optional for safety against legacy callers.
  airtableId?: string | null
  // Доходность сайта до налогов при посуточной сдаче, % (как на странице
  // объекта). Нет или жёлтая земля — строку не показываем.
  yieldPct?: number | null
  /** Pro: доход «от и до», вероятность и её причины (CardYieldPro). */
  yieldRange?: YieldRange | null
}

const COPY = {
  ru: { resale: 'Перепродажа', secondary: 'Вторичка', house: 'Дом', land: 'Земля', sqm: 'м²' },
  en: { resale: 'Resale',      secondary: 'Secondary', house: 'House', land: 'Land', sqm: 'm²' },
  id: { resale: 'Jual kembali', secondary: 'Sekunder',  house: 'Rumah', land: 'Luas tanah', sqm: 'm²' },
  fr: { resale: 'Revente',      secondary: 'Secondaire', house: 'Maison', land: 'Terrain', sqm: 'm²' },
  de: { resale: 'Weiterverkauf', secondary: 'Zweitmarkt', house: 'Haus', land: 'Grundstück', sqm: 'm²' },
  zh: { resale: '转售',          secondary: '二手',        house: '房屋',  land: '土地',       sqm: 'm²' },
  nl: { resale: 'Doorverkoop',   secondary: 'Bestaand',   house: 'Huis', land: 'Grond',      sqm: 'm²' },
  ban: { resale: 'Adol malih',   secondary: 'Sekunder',   house: 'Umah', land: 'Tanah',      sqm: 'm²' },
  pl: { resale: 'Odsprzedaż',    secondary: 'Rynek wtórny', house: 'Dom', land: 'Działka',   sqm: 'm²' },
  uk: { resale: 'Перепродаж',    secondary: 'Вторинний ринок', house: 'Будинок', land: 'Ділянка', sqm: 'm²' },
} as const

export function VillaCard({ a, lang = 'ru', priority = false }: { a: VillaCardData; lang?: Lang; priority?: boolean }) {
  const { currency } = useCurrency()
  const copy = pickCopy(COPY, lang)
  const price = a.priceUsd != null && Number.isFinite(a.priceUsd)
    ? formatPriceExact(a.priceUsd, currency, lang)
    : null
  const dealLabel = a.dealType === 'resale' ? copy.resale
    : a.dealType === 'secondary' ? copy.secondary
    : null
  const detailHref = a.detailHref ?? switchLangPath(`/ru/villy/o/${a.slug}`, lang)
  // Название без хвоста «- 74 м², 2 спальни»: цифры стоят строкой ниже.
  const shortTitle = a.title.split(/\s[-—–]\s(?=\d)/)[0]
  const meta = [
    a.bedrooms != null ? (lang === 'ru' ? `${a.bedrooms} ${pluralRu(a.bedrooms, ['спальня', 'спальни', 'спален'])}` : `${a.bedrooms} BR`) : null,
    a.area != null ? `${a.area} ${copy.sqm}` : null,
    a.land != null ? `${copy.land.toLowerCase()} ${a.land} ${copy.sqm}` : null,
  ].filter(Boolean).join(' · ')
  return (
    <Link
      href={detailHref}
      // Подсветка точки на карте каталога (components/CatalogMap.tsx).
      onMouseEnter={() => window.dispatchEvent(new CustomEvent('bx-cat-hover', { detail: a.slug }))}
      onMouseLeave={() => window.dispatchEvent(new CustomEvent('bx-cat-hover', { detail: null }))}
      className="group flex h-full flex-col gap-3 text-[#0F1A15] no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)]"
    >
      <div className="relative overflow-hidden rounded-md">
        <PhotoSlider heightClass="aspect-[4/3]" photos={a.photos} alt={a.title} trackingId={`villa:${a.slug}`} priority={priority} />
        {a.verifiedYield && <VerifiedYieldBadge lang={lang} onPhoto className="absolute bottom-3 left-3 z-10" />}
        {dealLabel && (
          <span className="absolute top-3 left-3 z-10 inline-flex items-center text-[11px] font-semibold uppercase tracking-wide bg-white text-[var(--color-text)] rounded-full px-2.5 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
            {dealLabel}
          </span>
        )}
        <WishlistButton
          className="absolute top-3 right-3 z-10"
          item={{
            kind: 'villa', slug: a.slug, title: a.title,
            photo: a.photos?.[0] ?? null,
            priceUsd: a.priceUsd ?? null,
            district: a.district ?? null,
            bedrooms: a.bedrooms ?? null,
            area: a.area ?? null,
            land: a.land ?? null,
            dealType: a.dealType === 'resale' ? 'resale' : a.dealType === 'secondary' ? 'secondary' : 'primary',
            developerName: a.developerName ?? null,
            developerCompletedCount: a.developerCompletedCount ?? null,
            developerInProgressCount: a.developerInProgressCount ?? null,
            pricePerSqmUsd: a.pricePerSqmUsd ?? null,
            pricePerSqmYearUsd: a.pricePerSqmYearUsd ?? null,
            leaseYears: a.leaseYears ?? null,
            permit: a.permit ?? null,
            completionYear: a.completionYear ?? null,
            claimedYieldPct: a.claimedYieldPct ?? null,
            status: a.status ?? null,
            bestCapRate: a.bestCapRate ?? null,
            interiorStyle: a.interiorStyle ?? null,
            airtableId: a.airtableId ?? null,
          }}
        />
      </div>

      {/* «Журнал» (владелец 20.11.2026, макет CatA): район капсом, короткое название,
          строка цифр, цена; карточки в ряду одной высоты — низ прижат. */}
      <div className="flex flex-1 flex-col gap-1.5">
        {a.district && <span className="text-[12px] uppercase tracking-[0.06em] text-[#6B7570]">{lang === 'ru' ? districtRu(a.district) : districtLatin(a.district)}</span>}
        <h3 title={a.title}
          className="m-0 overflow-hidden text-[18px] font-semibold leading-[1.3] text-[#0F1A15] transition-colors duration-[120ms] group-hover:text-[var(--color-primary)]"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {shortTitle}
        </h3>
        {meta && <span className="text-[14px] text-[#4A5550]">{meta}</span>}
        {price && (
          <div className="mt-1 text-[20px] font-semibold leading-[1.2] tracking-[-0.02em] tabular-nums">
            {price}
            {a.priceUsd != null && <ApproxPrice usd={a.priceUsd} lang={lang} className="block text-[13px] font-normal tracking-normal text-[#6B7570]" />}
          </div>
        )}
        {/* Доходность на карточке каталога не показываем (владелец 20.11.2026): только район, название, цифры, цена. */}
      </div>
    </Link>
  )
}
