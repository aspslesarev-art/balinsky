'use client'

import Link from 'next/link'
import { Heart, X, Trash2, Send, Sparkle } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ShortlistSeoContent } from './ShortlistSeoContent'
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
    intro: 'Виллы и апартаменты в продаже сравниваются в таблице. Жилые комплексы и долгосрочная аренда — отдельными блоками карточек. ✦ — лучший показатель в строке (минимальная цена, длиннее лизхолд, выше доходность и так далее).',
    sectionRental: 'Долгосрочная аренда',
    perMonth: '/ мес',
    bestLabel: 'Лучший показатель в строке',
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
    rowKind: 'Тип', rowPrice: 'Цена', rowPriceM2: 'Цена за м²', rowPriceM2Year: 'Цена м² / год',
    rowBedrooms: 'Спальни', rowArea: 'Площадь',
    rowLand: 'Земля', rowDistrict: 'Район', rowFloor: 'Этаж',
    rowCompletion: 'Сдача', rowStatus: 'Статус стройки',
    rowDealType: 'Тип сделки', rowLease: 'Лизхолд', rowPermit: 'Разрешение',
    rowYield: 'Заявленная доходность', rowLandUse: 'Назначение земли',
    rowDeveloper: 'Застройщик',
    sqm: 'м²', years: 'лет',
    devReady: (n: number) => `${n} сдано`,
    devInProgress: (n: number) => `${n} строится`,
    readinessLabel: 'Готовность',
    dealResale: 'Перепродажа', dealSecondary: 'Вторичка', dealPrimary: 'От застройщика',
  },
  en: {
    home: 'Home',
    crumb: 'Shortlist',
    h1: 'Shortlist',
    intro: 'Villas and apartments for sale compare in one table. Residential complexes and long-term rentals get their own card blocks. ✦ marks the best value in each row (lowest price, longest lease, highest yield and so on).',
    sectionRental: 'Long-term rental',
    perMonth: '/ mo',
    bestLabel: 'Best in row',
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
    rowKind: 'Type', rowPrice: 'Price', rowPriceM2: 'Price / m²', rowPriceM2Year: 'Price m² / year',
    rowBedrooms: 'Bedrooms', rowArea: 'Area',
    rowLand: 'Land', rowDistrict: 'District', rowFloor: 'Floor',
    rowCompletion: 'Completion', rowStatus: 'Build status',
    rowDealType: 'Deal', rowLease: 'Leasehold', rowPermit: 'Permit',
    rowYield: 'Claimed yield', rowLandUse: 'Land use',
    rowDeveloper: 'Developer',
    sqm: 'm²', years: 'yrs',
    devReady: (n: number) => `${n} delivered`,
    devInProgress: (n: number) => `${n} in progress`,
    readinessLabel: 'Readiness',
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
  //
  // `best` rows have an objective winner direction: 'min' for price-ish
  // (cheapest wins) and 'max' for yield / lease / area. Bedrooms,
  // completion, district, status, permit and deal type are subjective
  // or categorical, so we leave them un-highlighted.
  type Row = {
    key: string; label: string;
    cell: (it: WishlistItem) => string | null;
    best?: 'min' | 'max';
    num?: (it: WishlistItem) => number | null;
    // Minimum relative deviation from the "best" value before a cell
    // can be classified as "worst". Default 0.10 (=10%) so a 1900 vs
    // 2000 m² price spread doesn't get the more expensive one painted
    // red just for being 5% above. Year-like metrics override to 0
    // because absolute years matter more than relative %.
    worstMinRelDev?: number
  }
  const rows: Row[] = [
    // Total price isn't a fair "best/worst" metric — a $360k villa
    // and a $120k apartment are different products, not better/worse
    // versions of the same thing. Leave the row neutral; price-per-m²
    // and price-per-m²-per-year below normalise by size and are
    // genuinely comparable, so they keep the highlight.
    { key: 'price',      label: c.rowPrice,      cell: it => fmt(it.priceUsd) },
    { key: 'priceM2',    label: c.rowPriceM2,    cell: it => fmt(it.pricePerSqmUsd),
      best: 'min', num: it => it.pricePerSqmUsd ?? null },
    // "Цена м² в год" = price per m² divided by remaining leasehold
    // years — your effective annual cost per square metre of holding
    // the lease. Min wins: you pay less per m² per year. (Not rental
    // revenue — that one would be max-better.)
    { key: 'priceM2Year', label: c.rowPriceM2Year, cell: it => fmt(it.pricePerSqmYearUsd),
      best: 'min', num: it => it.pricePerSqmYearUsd ?? null },
    { key: 'yield',      label: c.rowYield,      cell: it => it.claimedYieldPct != null ? `${it.claimedYieldPct}%` : null,
      best: 'max', num: it => it.claimedYieldPct ?? null },
    { key: 'lease',      label: c.rowLease,      cell: it => it.leaseYears != null ? `${it.leaseYears} ${c.years}` : null,
      best: 'max', num: it => it.leaseYears ?? null },
    { key: 'permit',     label: c.rowPermit,     cell: it => it.permit ?? null },
    { key: 'dealType',   label: c.rowDealType,   cell: it => dealTypeLabel(it.dealType) },
    // Build status — completed beats under-construction. A delivered
    // asset is real and tour-able; a project still on site carries
    // construction risk (delays, quality, developer solvency).
    // Mapping: Построен → 2 best (green), Под заказ / planned → 1
    // middle, Строится → 0 worst (red).
    { key: 'status',     label: c.rowStatus,     cell: it => it.status ?? null,
      best: 'max',
      num: it => {
        if (!it.status) return null
        const s = it.status.toLowerCase()
        if (/постр|сдан|готов|built|complet|delivered/.test(s)) return 2
        if (/заказ|план|plan|under/.test(s)) return 1
        if (/строит|construc/.test(s)) return 0
        return null
      } },
    // Completion year — earlier = better, but past years are
    // equivalent (anything already delivered is just "delivered").
    // Clamp past values to current year so 2024 and 2025 read the
    // same as 2026 and don't accidentally rank against each other;
    // future years rank later = worse. worstMinRelDev: 0 because a
    // 1-year delta is meaningful but is only 0.05% relative to year
    // numbers — the percentage gate would always fail.
    { key: 'completion', label: c.rowCompletion,
      cell: it => it.completionYear ?? null,
      best: 'min',
      num: it => {
        if (!it.completionYear) return null
        const y = Number(it.completionYear)
        if (!Number.isFinite(y)) return null
        const now = new Date().getFullYear()
        return Math.max(y, now)
      },
      worstMinRelDev: 0 },
    { key: 'bedrooms',   label: c.rowBedrooms,   cell: it => it.bedrooms != null ? String(it.bedrooms) : null,
      best: 'max', num: it => it.bedrooms ?? null },
    { key: 'area',       label: c.rowArea,       cell: it => it.area != null ? `${it.area} ${c.sqm}` : null,
      best: 'max', num: it => it.area ?? null },
    { key: 'land',       label: c.rowLand,       cell: it => it.land != null ? `${it.land} ${c.sqm}` : null,
      best: 'max', num: it => it.land ?? null },
    { key: 'floor',      label: c.rowFloor,      cell: it => it.floor ?? null },
    { key: 'district',   label: c.rowDistrict,   cell: it => it.district ?? null },
    { key: 'landUse',    label: c.rowLandUse,    cell: it => it.landUse ?? null },
    // Developer row: name on its own line, then a small "✓ N · ▲ M"
    // badge of completed / in-progress projects underneath. We pack
    // both into the cell text via a separator the renderer recognises
    // and formats with two lines.
    //
    // Verdict score = built − in-progress. The investor's risk read:
    // delivered projects are evidence the developer can finish; an
    // inflated in-progress pipeline (especially if this listing is
    // itself one of them) raises completion risk. So 2 built / 0
    // in-progress > 2 built / 2 in-progress > 0 built / Y in-progress,
    // and the more in-progress, the lower the rank.
    { key: 'developer',  label: c.rowDeveloper,
      cell: it => {
        if (!it.developerName) return null
        const ready    = it.developerCompletedCount ?? null
        const inProg   = it.developerInProgressCount ?? null
        const tail = [
          ready    != null && ready    > 0 ? c.devReady(ready)    : null,
          inProg   != null && inProg   > 0 ? c.devInProgress(inProg) : null,
        ].filter(Boolean).join(' · ')
        return tail ? `${it.developerName}\n${tail}` : it.developerName
      },
      best: 'max',
      num: it => {
        const ready  = it.developerCompletedCount  ?? null
        const inProg = it.developerInProgressCount ?? null
        if (ready == null && inProg == null) return null
        return (ready ?? 0) - (inProg ?? 0)
      },
      // Counts are small integers (typically -3..+5). The default 10%
      // relative-deviation gate would suppress meaningful 1-unit gaps
      // (one delivered project is signal). Drop the gate.
      worstMinRelDev: 0,
    },
  ]
  // Classify each cell on a 3-step traffic-light scale based on its
  // position within the row's spread. Tightly-grouped values (e.g.
  // 1900 vs 2000 — 5% apart) shouldn't paint the higher one red just
  // because it ranks last; a meaningful relative gap from the best
  // value is required (default 10%, overridable per row).
  type Verdict = 'best' | 'middle' | 'worst' | 'neutral'
  const verdictFor = (r: Row, item: WishlistItem, section: WishlistItem[]): Verdict => {
    if (!r.best || !r.num) return 'neutral'
    const num = r.num(item)
    if (num == null || !Number.isFinite(num)) return 'neutral'
    const nums = section.map(r.num).filter((v): v is number => v != null && Number.isFinite(v))
    if (nums.length < 2) return 'neutral'
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    if (min === max) return 'neutral'
    const bestVal  = r.best === 'min' ? min : max
    const gap = max - min
    // Position 0 = at best; 1 = at worst.
    const pos = Math.abs(num - bestVal) / gap
    // "Best" — at the best value, or close to it (within 20% of the
    // spread). This covers cases like 1900/1950 where both are
    // effectively cheapest.
    if (pos <= 0.20) return 'best'
    // "Worst" — high in the spread AND meaningfully far from best.
    // The relative gate stops a 5% spread from painting anything red;
    // override `worstMinRelDev` per row when % isn't the right unit.
    const minRel = r.worstMinRelDev ?? 0.10
    const relDev = bestVal !== 0 ? Math.abs(num - bestVal) / Math.abs(bestVal) : Infinity
    if (pos >= 0.80 && relDev >= minRel) return 'worst'
    return 'middle'
  }
  const verdictTextClass = (v: Verdict): string => {
    switch (v) {
      case 'best':   return 'font-semibold text-[var(--color-primary)]'
      case 'middle': return 'font-medium text-[#92400E]'
      case 'worst':  return 'font-medium text-[#B91C1C]'
      case 'neutral': return 'text-[var(--color-text)]'
    }
  }

  // Three render shapes. Villas / apartments share enough fields to
  // compare side-by-side. Complexes sell phases and unit ranges, so
  // they render as plain cards. Rentals have a different price unit
  // (per month) and shorter spec set, so they render as their own
  // card list too.
  const realEstateUnsorted = items.filter(i => i.kind === 'villa' || i.kind === 'apartment')
  const complexes  = items.filter(i => i.kind === 'complex')
  const rentals    = items.filter(i => i.kind === 'rental')

  // Order the comparison columns by overall quality: each `best`
  // verdict counts +1, each `worst` counts −1, neutral / middle
  // contribute 0. Ties keep insertion order (Array.sort is stable).
  // This way the leftmost column is the strongest pick across the
  // measured rows, the rightmost is the weakest.
  const realEstate = [...realEstateUnsorted]
    .map(it => {
      let score = 0
      for (const r of rows) {
        if (!r.best) continue
        const v = verdictFor(r, it, realEstateUnsorted)
        if (v === 'best')  score += 1
        else if (v === 'worst') score -= 1
      }
      return { it, score }
    })
    .sort((a, b) => b.score - a.score)
    .map(x => x.it)

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
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <a
                href={shareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[12px] sm:text-[13px] font-medium no-underline"
              >
                <Send size={14} /> {c.sendToBot}
              </a>
              <button
                type="button"
                onClick={() => { if (confirm(lang === 'en' ? 'Clear the whole shortlist?' : 'Очистить весь шортлист?')) clear() }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-[12px] sm:text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-search-bg)]"
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

                {/* Mobile layout: vertical stack of per-item cards with
                    inline label / value rows. Side-by-side comparison
                    on a 400px viewport just doesn't fit, so we drop it
                    on small screens — the visitor scans items one by
                    one. Each card has the same comparison rows as the
                    desktop table, just rotated 90 degrees. */}
                <ul className="md:hidden space-y-4 mb-2">
                  {realEstate.map(it => {
                    const filledRows = rows.filter(r => r.cell(it) != null)
                    return (
                      <li key={`m-${it.kind}:${it.slug}`} className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden relative">
                        <Link href={detailHref(it, lang)} className="block no-underline text-[var(--color-text)]">
                          <div className="aspect-[16/9] bg-[var(--color-search-bg)]">
                            {it.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={it.photo} alt={it.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl">🏝️</div>
                            )}
                          </div>
                          <div className="px-4 pt-4">
                            <h3 className="text-[15px] font-semibold leading-snug line-clamp-2 mb-3">{it.title}</h3>
                          </div>
                        </Link>
                        <button
                          type="button"
                          aria-label={c.remove}
                          onClick={() => remove(it.kind, it.slug)}
                          className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm hover:bg-white text-[#1A1F1C] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                        >
                          <X size={14} />
                        </button>
                        <dl className="px-4 pb-4 divide-y divide-[var(--color-border-soft)]">
                          {filledRows.map(r => {
                            const v = r.cell(it)
                            const lines = v != null ? v.split('\n') : []
                            const verdict = verdictFor(r, it, realEstate)
                            return (
                              <div key={r.key} className="flex items-start justify-between gap-3 py-2">
                                <dt className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] shrink-0 pt-0.5">
                                  {r.label}
                                </dt>
                                <dd className={`text-[13px] text-right ${verdictTextClass(verdict)}`}>
                                  <span className="inline-flex items-center gap-1.5 justify-end">
                                    {lines[0]}
                                    {verdict === 'best' && (
                                      <Sparkle size={12} fill="currentColor" strokeWidth={0} aria-label={c.bestLabel} />
                                    )}
                                  </span>
                                  {lines[1] && (
                                    <span className="block text-[11px] font-normal text-[var(--color-text-muted)] mt-0.5">{lines[1]}</span>
                                  )}
                                </dd>
                              </div>
                            )
                          })}
                        </dl>
                      </li>
                    )
                  })}
                </ul>

                {/* Desktop layout: horizontal comparison table. */}
                <div className="hidden md:block overflow-x-auto pb-4">
                  <table
                    className="table-fixed border-separate border-spacing-x-2 md:border-spacing-x-3 w-full"
                    style={{ minWidth: `${realEstate.length === 1 ? 280 : 80 + realEstate.length * 160}px` }}
                  >
                    <colgroup>
                      <col className="w-[88px] md:w-[120px]" />
                      {realEstate.map(it => <col key={`${it.kind}:${it.slug}`} />)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-[var(--color-bg)] z-10 align-top"></th>
                        {realEstate.map(it => (
                          <th key={`${it.kind}:${it.slug}`} className="text-left align-top snap-start">
                            <div className="relative">
                              <Link href={detailHref(it, lang)} className="block group no-underline text-[var(--color-text)]">
                                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[var(--color-search-bg)] mb-2">
                                  {it.photo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={it.photo} alt={it.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl md:text-3xl">🏝️</div>
                                  )}
                                </div>
                                {/* min-h reserves the height of two
                                    title lines so single-line titles
                                    leave the same gap before the data
                                    rows as multi-line ones — keeps
                                    the comparison rows visually
                                    aligned across columns. */}
                                <div className="text-[13px] md:text-[15px] font-semibold leading-snug line-clamp-2 mb-2 md:mb-3 min-h-[2.6em] md:min-h-[2.6em]">{it.title}</div>
                              </Link>
                              <button
                                type="button"
                                aria-label={c.remove}
                                onClick={() => remove(it.kind, it.slug)}
                                className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-white/85 backdrop-blur-sm hover:bg-white text-[#1A1F1C] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.filter(r => realEstate.some(it => r.cell(it))).map(r => {
                        return (
                          <tr key={r.key}>
                            <td className="sticky left-0 bg-[var(--color-bg)] z-10 text-[10px] md:text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] py-2 md:py-3 align-top pr-2">
                              {r.label}
                            </td>
                            {realEstate.map(it => {
                              const v = r.cell(it)
                              const verdict = verdictFor(r, it, realEstate)
                              // Cells with a "\n" want a stacked
                              // primary line + muted secondary line —
                              // the developer row uses this to put
                              // "Builder name" above "✓ N · ▲ M".
                              const lines = v != null ? v.split('\n') : []
                              return (
                                <td key={`${r.key}-${it.kind}:${it.slug}`} className="text-[13px] md:text-[14px] py-2 md:py-3 align-top">
                                  {v != null ? (
                                    <span className={`inline-flex flex-col items-start gap-0.5 ${verdictTextClass(verdict)}`}>
                                      <span className="inline-flex items-center gap-1.5">
                                        {lines[0]}
                                        {verdict === 'best' && (
                                          <Sparkle size={12} fill="currentColor" strokeWidth={0} aria-label={c.bestLabel} />
                                        )}
                                      </span>
                                      {lines[1] && (
                                        <span className="text-[11px] md:text-[12px] font-normal text-[var(--color-text-muted)]">{lines[1]}</span>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-[var(--color-text-muted)]">—</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
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
                    const readiness = item.readinessPct ?? null
                    const devReady    = item.developerCompletedCount  ?? null
                    const devInProg   = item.developerInProgressCount ?? null
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
                            {readiness != null && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between text-[12px] mb-1">
                                  <span className="text-[var(--color-text-muted)]">{c.readinessLabel}</span>
                                  <span className="font-medium text-[var(--color-text)] tabular-nums">{readiness}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[var(--color-search-bg)] overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--color-primary)]"
                                    style={{ width: `${Math.min(100, Math.max(0, readiness))}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {item.developerName && (
                              <div className="mb-2 text-[12px]">
                                <div className="text-[var(--color-text)] truncate">{item.developerName}</div>
                                {(devReady != null && devReady > 0) || (devInProg != null && devInProg > 0) ? (
                                  <div className="text-[var(--color-text-muted)] mt-0.5">
                                    {[
                                      devReady   != null && devReady   > 0 ? c.devReady(devReady)     : null,
                                      devInProg  != null && devInProg  > 0 ? c.devInProgress(devInProg) : null,
                                    ].filter(Boolean).join(' · ')}
                                  </div>
                                ) : null}
                              </div>
                            )}
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

            {rentals.length > 0 && (
              <section className="mb-10">
                <h2 className="text-[18px] md:text-[20px] font-semibold text-[var(--color-text)] mb-4">
                  {c.sectionRental}
                  <span className="text-[var(--color-text-muted)] font-normal ml-2">· {rentals.length}</span>
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rentals.map(item => {
                    const price = item.priceUsd != null && Number.isFinite(item.priceUsd)
                      ? formatPrice(item.priceUsd, currency)
                      : null
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
                            {price && (
                              <div className="text-[15px] font-semibold mb-1">
                                {price}
                                <span className="text-[12px] font-normal text-[var(--color-text-muted)]"> {c.perMonth}</span>
                              </div>
                            )}
                            <div className="text-[13px] text-[var(--color-text-muted)] flex items-center gap-3 flex-wrap">
                              {item.bedrooms != null && <span>{item.bedrooms} {c.bedrooms}</span>}
                              {item.district && <span>{item.district}</span>}
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

        <ShortlistSeoContent lang={lang} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
