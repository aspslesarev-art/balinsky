'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { useWishlist } from './WishlistContext'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import type { Lang } from '@/lib/i18n'
import type { WishlistItem, WishlistKind } from '@/lib/wishlist'

const COPY = {
  ru: {
    home: 'Главная',
    crumb: 'Сравнение',
    h1: 'Сравнение объектов',
    empty: 'Чтобы сравнить — отметьте 2–4 объекта в избранном и нажмите «Сравнить».',
    backToShortlist: 'Перейти в избранное',
    rowKind: 'Тип', rowPrice: 'Цена', rowBedrooms: 'Спальни', rowArea: 'Площадь',
    rowLand: 'Земля', rowDistrict: 'Район', rowFloor: 'Этаж',
    rowCompletion: 'Сдача', rowDealType: 'Тип сделки',
    sqm: 'м²', open: 'Открыть',
    dealResale: 'Перепродажа', dealSecondary: 'Вторичка', dealPrimary: 'От застройщика',
  },
  en: {
    home: 'Home',
    crumb: 'Compare',
    h1: 'Side-by-side comparison',
    empty: 'Pick 2–4 saved listings on the shortlist page and tap “Compare”.',
    backToShortlist: 'Open shortlist',
    rowKind: 'Type', rowPrice: 'Price', rowBedrooms: 'Bedrooms', rowArea: 'Area',
    rowLand: 'Land', rowDistrict: 'District', rowFloor: 'Floor',
    rowCompletion: 'Completion', rowDealType: 'Deal',
    sqm: 'm²', open: 'Open',
    dealResale: 'Resale', dealSecondary: 'Secondary', dealPrimary: 'Developer',
  },
} as const

function detailHref(item: WishlistItem, lang: Lang): string {
  switch (item.kind) {
    case 'villa':     return lang === 'en' ? `/en/villas/o/${item.slug}` : `/ru/villy/o/${item.slug}`
    case 'apartment': return lang === 'en' ? `/en/apartments/o/${item.slug}` : `/ru/apartamenty/o/${item.slug}`
    case 'complex':   return lang === 'en' ? `/en/complexes/o/${item.slug}` : `/ru/zhilye-kompleksy/o/${item.slug}`
    case 'rental':    return lang === 'en' ? `/en/rental/o/${item.slug}` : `/ru/arenda/o/${item.slug}`
  }
}

function kindLabel(kind: WishlistKind, lang: Lang): string {
  if (lang === 'en') return ({ villa: 'Villa', apartment: 'Apartment', complex: 'Complex', rental: 'Rental' } as const)[kind]
  return ({ villa: 'Вилла', apartment: 'Апартаменты', complex: 'Комплекс', rental: 'Аренда' } as const)[kind]
}

export function CompareView({ lang }: { lang: Lang }) {
  const { items, ready } = useWishlist()
  const { currency } = useCurrency()
  const c = COPY[lang]
  const sp = useSearchParams()
  const home = lang === 'en' ? '/en' : '/ru'
  const shortlistHref = lang === 'en' ? '/en/favourites' : '/ru/izbrannoe'

  // URL ?items=v.slug1,a.slug2,c.slug3 — picks specific items from
  // wishlist. Without `items` we fall back to the whole shortlist (capped
  // at 4) so a one-tap entry from a compact wishlist still works.
  const selected: WishlistItem[] = useMemo(() => {
    if (!ready) return []
    const param = sp?.get('items') ?? ''
    if (!param) return items.slice(0, 4)
    const ids = param.split(',').map(s => s.trim()).filter(Boolean)
    const byId = new Map<string, WishlistItem>()
    for (const it of items) byId.set(`${it.kind[0]}.${it.slug}`, it)
    return ids.map(id => byId.get(id)).filter((x): x is WishlistItem => !!x).slice(0, 4)
  }, [items, ready, sp])

  const fmt = (v: number | null | undefined) =>
    v != null && Number.isFinite(v) ? formatPrice(v, currency) : null

  const dealTypeLabel = (t: WishlistItem['dealType']) => {
    if (!t) return null
    if (t === 'resale')    return c.dealResale
    if (t === 'secondary') return c.dealSecondary
    return c.dealPrimary
  }

  // Each row reads one field across all selected items. The label
  // column is sticky on horizontal scroll so the header stays visible
  // when comparing 4 items on a phone.
  const rows: { key: string; label: string; cell: (it: WishlistItem) => string | null }[] = [
    { key: 'kind',       label: c.rowKind,       cell: it => kindLabel(it.kind, lang) },
    { key: 'price',      label: c.rowPrice,      cell: it => fmt(it.priceUsd) },
    { key: 'bedrooms',   label: c.rowBedrooms,   cell: it => it.bedrooms != null ? String(it.bedrooms) : null },
    { key: 'area',       label: c.rowArea,       cell: it => it.area != null ? `${it.area} ${c.sqm}` : null },
    { key: 'land',       label: c.rowLand,       cell: it => it.land != null ? `${it.land} ${c.sqm}` : null },
    { key: 'floor',      label: c.rowFloor,      cell: it => it.floor ?? null },
    { key: 'district',   label: c.rowDistrict,   cell: it => it.district ?? null },
    { key: 'completion', label: c.rowCompletion, cell: it => it.completionYear ?? null },
    { key: 'dealType',   label: c.rowDealType,   cell: it => dealTypeLabel(it.dealType) },
  ]

  // Drop rows where every cell is empty so the table doesn't show
  // "Land · — · — · —" when nothing in the selection has land area.
  const filledRows = rows.filter(r => selected.some(it => r.cell(it)))

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.crumb },
        ]} />

        <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight text-[var(--color-text)] mt-4 mb-6">
          {c.h1}
        </h1>

        {!ready ? null : selected.length < 2 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white px-6 py-12 text-center">
            <div className="text-[15px] text-[var(--color-text)] max-w-md mx-auto mb-6">{c.empty}</div>
            <Link href={shortlistHref} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-[13px] font-medium no-underline">
              {c.backToShortlist}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 pb-4">
            <table className="border-separate border-spacing-x-3 min-w-full">
              <thead>
                <tr>
                  {/* Spacer cell for the sticky label column */}
                  <th className="sticky left-0 bg-[var(--color-bg)] z-10 align-bottom min-w-[120px] w-[120px]"></th>
                  {selected.map(it => (
                    <th key={`${it.kind}:${it.slug}`} className="text-left align-bottom min-w-[220px] w-[260px]">
                      <Link href={detailHref(it, lang)} className="block group no-underline text-[var(--color-text)]">
                        <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[var(--color-search-bg)] mb-2">
                          {it.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.photo} alt={it.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">🏝️</div>
                          )}
                        </div>
                        <div className="text-[15px] font-semibold leading-snug line-clamp-2">{it.title}</div>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filledRows.map(r => (
                  <tr key={r.key}>
                    <td className="sticky left-0 bg-[var(--color-bg)] z-10 text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] py-3 align-top w-[120px]">
                      {r.label}
                    </td>
                    {selected.map(it => {
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
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
