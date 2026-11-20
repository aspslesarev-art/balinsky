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
import type { UnitDemandView } from '@/lib/unit-demand-view'

export type ApartmentCardData = {
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
  floor: string | null
  photos: string[]
  district?: string | null
  // 'resale' / 'secondary' = sold by an owner / agent rather than the
  // developer. Drives the "Перепродажа" badge and the contact routing
  // on the detail page (direct seller link instead of dev manager).
  dealType?: 'resale' | 'secondary' | null
  // Ссылка на карточку, если объект живёт не в основном каталоге: объекты
  // перепродажи, добавленные агентами, лежат в /ru/pereprodazha/o/<slug>.
  detailHref?: string
  // Optional fields piped into the wishlist snapshot at heart-tap so
  // saved apartments carry investor-relevant context.
  developerName?: string | null
  developerCompletedCount?: number | null
  developerInProgressCount?: number | null
  pricePerSqmUsd?: number | null
  pricePerSqmYearUsd?: number | null
  leaseYears?: number | null
  permit?: string | null
  completionYear?: string | null
  claimedYieldPct?: number | null
  status?: string | null
  // Airtable record ID — saved into the wishlist so the agent PDF
  // can print a lookup code searchable on the catalog.
  airtableId?: string | null
  // Доходность сайта до налогов при посуточной сдаче, % (как на странице
  // объекта). Нет — строку не показываем.
  yieldPct?: number | null
  /** Pro: доход «от и до», вероятность и её причины (CardYieldPro). */
  yieldRange?: YieldRange | null
}

const COPY = {
  ru: { sqm: 'м²', floor: 'Этаж', resale: 'Перепродажа', secondary: 'Вторичка' },
  en: { sqm: 'm²', floor: 'Floor', resale: 'Resale',     secondary: 'Secondary' },
  id: { sqm: 'm²', floor: 'Lantai', resale: 'Jual kembali', secondary: 'Sekunder' },
  fr: { sqm: 'm²', floor: 'Étage', resale: 'Revente',    secondary: 'Ancien' },
  de: { sqm: 'm²', floor: 'Etage', resale: 'Wiederverkauf', secondary: 'Bestand' },
  zh: { sqm: 'm²', floor: '楼层', resale: '转售',        secondary: '二手' },
  nl: { sqm: 'm²', floor: 'Verdieping', resale: 'Doorverkoop', secondary: 'Bestaand' },
  ban: { sqm: 'm²', floor: 'Lantai', resale: 'Adol malih', secondary: 'Sekunder' },
  pl: { sqm: 'm²', floor: 'Piętro', resale: 'Odsprzedaż', secondary: 'Rynek wtórny' },
  uk: { sqm: 'm²', floor: 'Поверх', resale: 'Перепродаж', secondary: 'Вторинний ринок' },
} as const

export function ApartmentCard({ a, lang = 'ru', priority = false }: { a: ApartmentCardData; lang?: Lang; priority?: boolean }) {
  const { currency } = useCurrency()
  const c = pickCopy(COPY, lang)
  const price = a.priceUsd != null && Number.isFinite(a.priceUsd)
    ? formatPriceExact(a.priceUsd, currency, lang)
    : null
  const dealLabel = a.dealType === 'resale' ? c.resale
    : a.dealType === 'secondary' ? c.secondary
    : null
  const detailHref = a.detailHref ?? switchLangPath(`/ru/apartamenty/o/${a.slug}`, lang)
  // Название без хвоста «- 74 м², 2 спальни»: цифры стоят строкой ниже.
  const shortTitle = a.title.split(/\s[-—–]\s(?=\d)/)[0]
  const meta = [
    a.bedrooms != null ? (lang === 'ru' ? `${a.bedrooms} ${pluralRu(a.bedrooms, ['спальня', 'спальни', 'спален'])}` : `${a.bedrooms} BR`) : null,
    a.area != null ? `${a.area} ${c.sqm}` : null,
    a.floor ? `${c.floor.toLowerCase()} ${a.floor}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <Link
      href={detailHref}
      className="group flex h-full flex-col gap-3 text-[#0F1A15] no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)]"
    >
      <div className="relative overflow-hidden rounded-md">
        <PhotoSlider heightClass="aspect-[4/3]" photos={a.photos} alt={a.title} trackingId={`apt:${a.slug}`} priority={priority} />
        {a.verifiedYield && <VerifiedYieldBadge lang={lang} onPhoto className="absolute bottom-3 left-3 z-10" />}
        {dealLabel && (
          <span className="absolute top-3 left-3 z-10 inline-flex items-center text-[11px] font-semibold uppercase tracking-wide bg-white text-[var(--color-text)] rounded-full px-2.5 py-1 shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
            {dealLabel}
          </span>
        )}
        <WishlistButton
          className="absolute top-3 right-3 z-10"
          item={{
            kind: 'apartment', slug: a.slug, title: a.title,
            photo: a.photos?.[0] ?? null,
            priceUsd: a.priceUsd ?? null,
            district: a.district ?? null,
            bedrooms: a.bedrooms ?? null,
            area: a.area ?? null,
            floor: a.floor ?? null,
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
            dealType: a.dealType === 'resale' ? 'resale' : a.dealType === 'secondary' ? 'secondary' : 'primary',
            airtableId: a.airtableId ?? null,
          }}
        />
      </div>

      {/* «Журнал» (владелец 20.11.2026, макет CatA): район капсом, короткое название,
          строка цифр, цена; карточки в ряду одной высоты — низ прижат. */}
      <div className="flex flex-1 flex-col gap-1.5">
        {a.district && <span className="text-[12px] uppercase tracking-[0.06em] text-[#6B7570]">{a.district}</span>}
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
