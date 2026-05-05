'use client'

import Link from 'next/link'
import { Heart, X, Trash2, Send } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { useWishlist } from './WishlistContext'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'
import type { WishlistItem } from '@/lib/wishlist'

const COPY = {
  ru: {
    home: 'Главная',
    crumb: 'Избранное',
    h1: 'Избранное',
    intro: 'Виллы и апартаменты сравниваются в одной таблице. Жилые комплексы — отдельным списком карточек.',
    sectionRealEstate: 'Виллы и апартаменты',
    sectionComplexes: 'Жилые комплексы',
    bedrooms: 'BR',
    empty: 'Пока ничего не добавлено. Откройте каталог и нажмите на сердце у любого объекта.',
    countOne: 'объект', countFew: 'объекта', countMany: 'объектов',
    clear: 'Очистить всё',
    sendToBot: 'Отправить в Telegram',
    remove: 'Убрать',
    villasLink: 'К виллам',
    apartmentsLink: 'К апартаментам',
    complexesLink: 'К жилым комплексам',
    rowKind: 'Тип', rowPrice: 'Цена', rowPriceM2: 'Цена за м²',
    rowBedrooms: 'Спальни', rowArea: 'Площадь',
    rowLand: 'Земля', rowDistrict: 'Район', rowFloor: 'Этаж',
    rowCompletion: 'Сдача', rowStatus: 'Статус стройки',
    rowDealType: 'Тип сделки', rowLease: 'Лизхолд', rowPermit: 'Разрешение',
    rowYield: 'Заявленная доходность', rowLandUse: 'Назначение земли',
    sqm: 'м²', years: 'лет',
    dealResale: 'Перепродажа', dealSecondary: 'Вторичка', dealPrimary: 'От застройщика',
  },
  en: {
    home: 'Home',
    crumb: 'Shortlist',
    h1: 'Shortlist',
    intro: 'Villas and apartments compare side-by-side in one table. Complexes show as a card list.',
    sectionRealEstate: 'Villas & apartments',
    sectionComplexes: 'Residential complexes',
    bedrooms: 'BR',
    empty: 'Nothing saved yet. Open a catalogue and tap the heart on any listing.',
    countOne: 'item', countFew: 'items', countMany: 'items',
    clear: 'Clear all',
    sendToBot: 'Send to Telegram',
    remove: 'Remove',
    villasLink: 'Browse villas',
    apartmentsLink: 'Browse apartments',
    complexesLink: 'Browse complexes',
    rowKind: 'Type', rowPrice: 'Price', rowPriceM2: 'Price / m²',
    rowBedrooms: 'Bedrooms', rowArea: 'Area',
    rowLand: 'Land', rowDistrict: 'District', rowFloor: 'Floor',
    rowCompletion: 'Completion', rowStatus: 'Build status',
    rowDealType: 'Deal', rowLease: 'Leasehold', rowPermit: 'Permit',
    rowYield: 'Claimed yield', rowLandUse: 'Land use',
    sqm: 'm²', years: 'yrs',
    dealResale: 'Resale', dealSecondary: 'Secondary', dealPrimary: 'Developer',
  },
} as const

type Copy = { countOne: string; countFew: string; countMany: string }
function plural(n: number, lang: Lang, copy: Copy): string {
  if (lang === 'en') return n === 1 ? copy.countOne : copy.countMany
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return copy.countOne
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return copy.countFew
  return copy.countMany
}

function detailHref(item: WishlistItem, lang: Lang): string {
  switch (item.kind) {
    case 'villa':     return lang === 'en' ? `/en/villas/o/${item.slug}` : `/ru/villy/o/${item.slug}`
    case 'apartment': return lang === 'en' ? `/en/apartments/o/${item.slug}` : `/ru/apartamenty/o/${item.slug}`
    case 'complex':   return lang === 'en' ? `/en/complexes/o/${item.slug}` : `/ru/zhilye-kompleksy/o/${item.slug}`
    case 'rental':    return lang === 'en' ? `/en/rental/o/${item.slug}` : `/ru/arenda/o/${item.slug}`
  }
}

export function ShortlistView({ lang }: { lang: Lang }) {
  const { items, ready, remove, clear } = useWishlist()
  const { currency } = useCurrency()
  const c = COPY[lang]
  const home = lang === 'en' ? '/en' : '/ru'

  const fmt = (v: number | null | undefined) =>
    v != null && Number.isFinite(v) ? formatPrice(v, currency) : null
  const dealTypeLabel = (t: WishlistItem['dealType']): string | null => {
    if (!t) return null
    if (t === 'resale')    return c.dealResale
    if (t === 'secondary') return c.dealSecondary
    return c.dealPrimary
  }

  // Comparison rows ordered roughly by what an investor weighs first —
  // price + price/m², then space, then legal (lease, permit, deal type
  // + claimed yield), then location and physical specs. Empty rows
  // collapse so the table never shows "Land · — · —" for an
  // apartments-only group.
  const rows: { key: string; label: string; cell: (it: WishlistItem) => string | null }[] = [
    { key: 'price',      label: c.rowPrice,      cell: it => fmt(it.priceUsd) },
    { key: 'priceM2',    label: c.rowPriceM2,    cell: it => fmt(it.pricePerSqmUsd) },
    { key: 'yield',      label: c.rowYield,      cell: it => it.claimedYieldPct != null ? `${it.claimedYieldPct}%` : null },
    { key: 'lease',      label: c.rowLease,      cell: it => it.leaseYears != null ? `${it.leaseYears} ${c.years}` : null },
    { key: 'permit',     label: c.rowPermit,     cell: it => it.permit ?? null },
    { key: 'dealType',   label: c.rowDealType,   cell: it => dealTypeLabel(it.dealType) },
    { key: 'status',     label: c.rowStatus,     cell: it => it.status ?? null },
    { key: 'completion', label: c.rowCompletion, cell: it => it.completionYear ?? null },
    { key: 'bedrooms',   label: c.rowBedrooms,   cell: it => it.bedrooms != null ? String(it.bedrooms) : null },
    { key: 'area',       label: c.rowArea,       cell: it => it.area != null ? `${it.area} ${c.sqm}` : null },
    { key: 'land',       label: c.rowLand,       cell: it => it.land != null ? `${it.land} ${c.sqm}` : null },
    { key: 'floor',      label: c.rowFloor,      cell: it => it.floor ?? null },
    { key: 'district',   label: c.rowDistrict,   cell: it => it.district ?? null },
    { key: 'landUse',    label: c.rowLandUse,    cell: it => it.landUse ?? null },
  ]

  // Two sections with different render shapes. Villas / apartments
  // share enough fields to compare side-by-side; complexes sell phases
  // and unit ranges so they render as plain cards instead.
  const realEstate = items.filter(i => i.kind === 'villa' || i.kind === 'apartment' || i.kind === 'rental')
  const complexes  = items.filter(i => i.kind === 'complex')

  // Build the shareable Telegram message — one URL per saved item so the
  // recipient can tap straight into each detail page.
  const shareText = items.map(it => `https://balinsky.info${detailHref(it, lang)}`).join('\n')
  const shareHref = `https://t.me/share/url?url=${encodeURIComponent(shareText)}&text=${encodeURIComponent(c.sendToBot)}`

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.crumb },
        ]} />

        <div className="flex items-end justify-between gap-3 mt-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-[var(--color-text)]">
              {c.h1}
            </h1>
            {ready && items.length > 0 && (
              <div className="text-[14px] text-[var(--color-text-muted)] mt-1">
                {items.length} {plural(items.length, lang, c)}
              </div>
            )}
          </div>
          {ready && items.length > 0 && (
            <div className="flex items-center gap-2">
              <a
                href={shareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[13px] font-medium no-underline"
              >
                <Send size={14} /> {c.sendToBot}
              </a>
              <button
                type="button"
                onClick={() => { if (confirm(lang === 'en' ? 'Clear the whole shortlist?' : 'Очистить весь шортлист?')) clear() }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-search-bg)]"
              >
                <Trash2 size={14} /> {c.clear}
              </button>
            </div>
          )}
        </div>

        {!ready ? null : items.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white px-6 py-12 text-center">
            <Heart size={36} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
            <div className="text-[15px] text-[var(--color-text)] max-w-md mx-auto mb-6">{c.empty}</div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Link href={lang === 'en' ? '/en/villas' : '/ru/villy'}                  className="px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-[13px] font-medium no-underline">{c.villasLink}</Link>
              <Link href={lang === 'en' ? '/en/apartments' : '/ru/apartamenty'}        className="px-4 py-2 rounded-full border border-[var(--color-border)] text-[13px] no-underline">{c.apartmentsLink}</Link>
              <Link href={lang === 'en' ? '/en/complexes' : '/ru/zhilye-kompleksy'}    className="px-4 py-2 rounded-full border border-[var(--color-border)] text-[13px] no-underline">{c.complexesLink}</Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[14px] text-[var(--color-text-muted)] mb-6 max-w-2xl">{c.intro}</p>

            {realEstate.length > 0 && (
              <section className="mb-10">
                <h2 className="text-[18px] md:text-[20px] font-semibold text-[var(--color-text)] mb-4">
                  {c.sectionRealEstate}
                  <span className="text-[var(--color-text-muted)] font-normal ml-2">· {realEstate.length}</span>
                </h2>
                {/* table-fixed + w-full distributes remaining width
                    evenly across the item columns, so 2 items stretch to
                    ~556px each instead of leaving a 590px empty strip.
                    The minWidth keeps cells legible when many items are
                    saved — overflows the container, scrolls horizontally. */}
                <div className="overflow-x-auto pb-4">
                  <table
                    className="table-fixed border-separate border-spacing-x-3 w-full"
                    style={{ minWidth: `${120 + realEstate.length * 220}px` }}
                  >
                    <colgroup>
                      <col style={{ width: '120px' }} />
                      {realEstate.map(it => <col key={`${it.kind}:${it.slug}`} />)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-[var(--color-bg)] z-10 align-bottom"></th>
                        {realEstate.map(it => (
                          <th key={`${it.kind}:${it.slug}`} className="text-left align-bottom">
                            <div className="relative">
                              <Link href={detailHref(it, lang)} className="block group no-underline text-[var(--color-text)]">
                                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[var(--color-search-bg)] mb-2">
                                  {it.photo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={it.photo} alt={it.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl">🏝️</div>
                                  )}
                                </div>
                                <div className="text-[15px] font-semibold leading-snug line-clamp-2 mb-3">{it.title}</div>
                              </Link>
                              <button
                                type="button"
                                aria-label={c.remove}
                                onClick={() => remove(it.kind, it.slug)}
                                className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm hover:bg-white text-[#1A1F1C] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.filter(r => realEstate.some(it => r.cell(it))).map(r => (
                        <tr key={r.key}>
                          <td className="sticky left-0 bg-[var(--color-bg)] z-10 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] py-3 align-top">
                            {r.label}
                          </td>
                          {realEstate.map(it => {
                            const v = r.cell(it)
                            return (
                              <td key={`${r.key}-${it.kind}:${it.slug}`} className="text-[14px] text-[var(--color-text)] py-3 align-top">
                                {v ?? <span className="text-[var(--color-text-muted)]">—</span>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {complexes.length > 0 && (
              <section className="mb-10">
                <h2 className="text-[18px] md:text-[20px] font-semibold text-[var(--color-text)] mb-4">
                  {c.sectionComplexes}
                  <span className="text-[var(--color-text-muted)] font-normal ml-2">· {complexes.length}</span>
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {complexes.map(item => {
                    const completion = item.completionYear
                    return (
                      <li key={`${item.kind}:${item.slug}`} className="relative">
                        <Link
                          href={detailHref(item, lang)}
                          className="block bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                        >
                          <div className="aspect-[4/3] bg-[var(--color-search-bg)]">
                            {item.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.photo} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl">🏝️</div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="text-[16px] font-semibold leading-snug mb-2 line-clamp-2">{item.title}</h3>
                            <div className="text-[13px] text-[var(--color-text-muted)] flex items-center gap-3 flex-wrap">
                              {item.district && <span>{item.district}</span>}
                              {completion && <span>{c.rowCompletion}: {completion}</span>}
                            </div>
                          </div>
                        </Link>
                        <button
                          type="button"
                          aria-label={c.remove}
                          onClick={() => remove(item.kind, item.slug)}
                          className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm hover:bg-white text-[#1A1F1C] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                        >
                          <X size={16} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </>
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
