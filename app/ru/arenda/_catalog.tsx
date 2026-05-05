'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BedDouble, MapPin, X } from 'lucide-react'
import { FilterDropdown } from '@/components/FilterDropdown'
import { CurrencyToggle, useCurrency } from '@/components/CurrencyContext'
import { formatPrice, type Currency } from '@/lib/currency'
import type { RentalItem } from '@/lib/rental'
import { PhotoSlider } from '@/components/PhotoSlider'
import type { Lang } from '@/lib/i18n'

const PAGE_SIZE = 24

type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'br-asc' | 'br-desc'

const COPY = {
  ru: {
    sort: { newest: 'Сначала новые', 'price-asc': 'Цена ↑', 'price-desc': 'Цена ↓', 'br-asc': 'Спален ↑', 'br-desc': 'Спален ↓' } as Record<SortKey, string>,
    presets: ['До $1000', '$1000–2000', '$2000–3000', '$3000+'] as const,
    district: 'Район', bedrooms: 'Спальни', price: 'Цена', sortLabel: 'Сортировка',
    reset: 'Сбросить', clear: 'Очистить', search: 'Поиск…', noResults: 'Ничего не нашлось',
    priceMonthHeader: 'Цена в месяц, USD', priceFrom: 'От', priceTo: 'До',
    objects: (n: number) => `${n} ${pluralRu(n, ['объект', 'объекта', 'объектов'])}`,
    showingOfTotal: (shown: number, total: number) => `Показано ${shown} из ${total} — загрузить ещё`,
    emptyByFilters: 'По выбранным фильтрам ничего не нашлось. Сбросьте фильтры или попробуйте другие.',
    perMonth: '/ мес',
    bali: 'Бали',
  },
  en: {
    sort: { newest: 'Newest first', 'price-asc': 'Price ↑', 'price-desc': 'Price ↓', 'br-asc': 'Bedrooms ↑', 'br-desc': 'Bedrooms ↓' } as Record<SortKey, string>,
    presets: ['Up to $1000', '$1000–2000', '$2000–3000', '$3000+'] as const,
    district: 'District', bedrooms: 'Bedrooms', price: 'Price', sortLabel: 'Sort',
    reset: 'Clear', clear: 'Clear', search: 'Search…', noResults: 'Nothing found',
    priceMonthHeader: 'Monthly price, USD', priceFrom: 'From', priceTo: 'To',
    objects: (n: number) => `${n} ${n === 1 ? 'listing' : 'listings'}`,
    showingOfTotal: (shown: number, total: number) => `Showing ${shown} of ${total} — load more`,
    emptyByFilters: 'No listings match the selected filters. Clear filters or try different ones.',
    perMonth: '/ mo',
    bali: 'Bali',
  },
} as const

function pluralRu(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1]
  return forms[2]
}

type Initial = {
  districts: string[]
  bedrooms: string[]
  priceMin: number | null
  priceMax: number | null
}

function parseList(v: string | null): string[] {
  if (!v) return []
  return v.split(',').map(s => s.trim()).filter(Boolean)
}
function parseNum(v: string | null): number | null {
  if (!v) return null
  const n = Number(v.replace(/[^\d]/g, ''))
  return Number.isFinite(n) ? n : null
}
function isSortKey(v: string | null): v is SortKey {
  return v != null && (v === 'newest' || v === 'price-asc' || v === 'price-desc' || v === 'br-asc' || v === 'br-desc')
}

export function RentalCatalog({ items, initial, lang = 'ru' }: { items: RentalItem[]; initial?: Initial; lang?: Lang }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const COPY_L = COPY[lang]
  const SORT_LABELS = COPY_L.sort
  const PRICE_PRESETS: { label: string; min: number | null; max: number | null }[] = [
    { label: COPY_L.presets[0], min: null, max: 1000 },
    { label: COPY_L.presets[1], min: 1000, max: 2000 },
    { label: COPY_L.presets[2], min: 2000, max: 3000 },
    { label: COPY_L.presets[3], min: 3000, max: null },
  ]

  // Single source of truth = URL. State is derived from searchParams so the
  // browser back/forward buttons restore filters automatically.
  const districts = parseList(searchParams.get('location')).length > 0
    ? parseList(searchParams.get('location'))
    : (initial?.districts ?? [])
  const bedrooms = parseList(searchParams.get('bedrooms')).length > 0
    ? parseList(searchParams.get('bedrooms'))
    : (initial?.bedrooms ?? [])
  const priceMin = parseNum(searchParams.get('priceMin')) ?? initial?.priceMin ?? null
  const priceMax = parseNum(searchParams.get('priceMax')) ?? initial?.priceMax ?? null
  const sort: SortKey = isSortKey(searchParams.get('sort')) ? (searchParams.get('sort') as SortKey) : 'newest'

  const updateUrl = useCallback((patch: {
    districts?: string[]
    bedrooms?: string[]
    priceMin?: number | null
    priceMax?: number | null
    sort?: SortKey
  }) => {
    const next = new URLSearchParams(searchParams.toString())
    const setOrDel = (key: string, value: string) => {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if ('districts' in patch) setOrDel('location', (patch.districts ?? []).join(','))
    if ('bedrooms' in patch) setOrDel('bedrooms', (patch.bedrooms ?? []).join(','))
    if ('priceMin' in patch) setOrDel('priceMin', patch.priceMin == null ? '' : String(patch.priceMin))
    if ('priceMax' in patch) setOrDel('priceMax', patch.priceMax == null ? '' : String(patch.priceMax))
    if ('sort' in patch) setOrDel('sort', patch.sort && patch.sort !== 'newest' ? patch.sort : '')
    const qs = next.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
  }, [router, searchParams])

  const setDistricts = (v: string[]) => updateUrl({ districts: v })
  const setBedrooms = (v: string[]) => updateUrl({ bedrooms: v })
  const setPriceMin = (v: number | null) => updateUrl({ priceMin: v })
  const setPriceMax = (v: number | null) => updateUrl({ priceMax: v })
  const setSort = (v: SortKey) => updateUrl({ sort: v })

  // Shared global currency context. Default-on-rental is IDR (set inside the
  // provider via the pathname check), but the user's pick — whichever currency
  // out of USD/EUR/RUB/UAH/IDR they chose anywhere on the site — wins.
  const { currency } = useCurrency()

  // Cross-filter aware counts: each filter's options are counted against
  // items that pass ALL OTHER active filters, so the numbers reflect what
  // the user would actually see if they picked that value next.
  const passesDistrict = (r: RentalItem) =>
    districts.length === 0 || (r.location != null && districts.includes(r.location))
  const passesBedrooms = (r: RentalItem) =>
    bedrooms.length === 0 || (r.bedrooms != null && bedrooms.includes(String(r.bedrooms)))
  const passesPrice = (r: RentalItem) =>
    (priceMin == null || r.priceMonthUsd >= priceMin) &&
    (priceMax == null || r.priceMonthUsd <= priceMax)

  const districtOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of items) {
      if (!r.location) continue
      if (!passesBedrooms(r) || !passesPrice(r)) continue
      counts.set(r.location, (counts.get(r.location) ?? 0) + 1)
    }
    for (const v of districts) if (!counts.has(v)) counts.set(v, 0)
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, bedrooms, priceMin, priceMax, districts])

  const bedroomOptions = useMemo(() => {
    const counts = new Map<number, number>()
    for (const r of items) {
      if (r.bedrooms == null) continue
      if (!passesDistrict(r) || !passesPrice(r)) continue
      counts.set(r.bedrooms, (counts.get(r.bedrooms) ?? 0) + 1)
    }
    for (const v of bedrooms) {
      const n = Number(v)
      if (Number.isFinite(n) && !counts.has(n)) counts.set(n, 0)
    }
    return [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([value, count]) => ({ value: String(value), count }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, districts, priceMin, priceMax, bedrooms])

  const presetCount = (min: number | null, max: number | null) => {
    let n = 0
    for (const r of items) {
      if (!passesDistrict(r) || !passesBedrooms(r)) continue
      if (min != null && r.priceMonthUsd < min) continue
      if (max != null && r.priceMonthUsd > max) continue
      n++
    }
    return n
  }

  const filtered = useMemo(() => {
    const base = (districts.length === 0 && bedrooms.length === 0 && priceMin == null && priceMax == null)
      ? items
      : items.filter(r => {
          if (districts.length > 0 && (!r.location || !districts.includes(r.location))) return false
          if (bedrooms.length > 0 && (r.bedrooms == null || !bedrooms.includes(String(r.bedrooms)))) return false
          if (priceMin != null && r.priceMonthUsd < priceMin) return false
          if (priceMax != null && r.priceMonthUsd > priceMax) return false
          return true
        })
    if (sort === 'newest') return base // manifest is already newest-first
    const arr = [...base]
    switch (sort) {
      case 'price-asc':  arr.sort((a, b) => a.priceMonthUsd - b.priceMonthUsd); break
      case 'price-desc': arr.sort((a, b) => b.priceMonthUsd - a.priceMonthUsd); break
      case 'br-asc':     arr.sort((a, b) => (a.bedrooms ?? 99) - (b.bedrooms ?? 99)); break
      case 'br-desc':    arr.sort((a, b) => (b.bedrooms ?? 0) - (a.bedrooms ?? 0)); break
    }
    return arr
  }, [items, districts, bedrooms, priceMin, priceMax, sort])

  const priceActive = priceMin != null || priceMax != null
  const priceSummary = priceActive
    ? `${priceMin != null ? '$' + priceMin : ''}${priceMin != null && priceMax != null ? '–' : ''}${priceMax != null ? '$' + priceMax : (priceMin != null ? '+' : '')}`
    : COPY_L.price
  const activeCount = districts.length + bedrooms.length + (priceActive ? 1 : 0)

  // Lazy mount: render PAGE_SIZE items, expose more on scroll near bottom.
  const [visible, setVisible] = useState(PAGE_SIZE)
  useEffect(() => { setVisible(PAGE_SIZE) }, [districts.join(','), bedrooms.join(','), priceMin, priceMax, sort])

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        setVisible(v => Math.min(v + PAGE_SIZE, filtered.length))
      }
    }, { rootMargin: '600px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [filtered.length])

  const visibleItems = filtered.slice(0, visible)
  const hasMore = visible < filtered.length

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <FilterDropdown
          label={COPY_L.district}
          summary={districts.length === 0 ? COPY_L.district : `${COPY_L.district} · ${districts.length}`}
          active={districts.length > 0}
        >
          {() => (
            <CheckboxList
              options={districtOptions}
              selected={districts}
              onChange={setDistricts}
              searchable
              lang={lang}
            />
          )}
        </FilterDropdown>

        <FilterDropdown
          label={COPY_L.bedrooms}
          summary={bedrooms.length === 0 ? COPY_L.bedrooms : bedrooms.map(b => `${b} BR`).join(', ')}
          active={bedrooms.length > 0}
        >
          {() => (
            <CheckboxList
              options={bedroomOptions.map(o => ({ ...o, label: `${o.value} BR` }))}
              selected={bedrooms}
              onChange={setBedrooms}
              lang={lang}
            />
          )}
        </FilterDropdown>

        <FilterDropdown
          label={COPY_L.price}
          summary={priceSummary}
          active={priceActive}
        >
          {() => (
            <PriceRangePopover
              priceMin={priceMin}
              priceMax={priceMax}
              setPriceMin={setPriceMin}
              setPriceMax={setPriceMax}
              countFor={presetCount}
              presets={PRICE_PRESETS}
              lang={lang}
            />
          )}
        </FilterDropdown>

        <FilterDropdown
          label={COPY_L.sortLabel}
          summary={SORT_LABELS[sort]}
          active={sort !== 'newest'}
        >
          {(close) => (
            <SortMenu current={sort} onChange={(v) => { setSort(v); close() }} labels={SORT_LABELS} />
          )}
        </FilterDropdown>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => updateUrl({ districts: [], bedrooms: [], priceMin: null, priceMax: null })}
            className="inline-flex items-center gap-1 text-[13px] text-[var(--color-text-muted)] hover:text-[#111827] px-3 py-2"
          >
            <X size={14} /> {COPY_L.reset}
          </button>
        )}

        <div className="basis-full sm:basis-auto sm:ml-auto flex items-center justify-between sm:justify-end gap-3 mt-1 sm:mt-0">
          <CurrencyToggle />
          <div className="text-[13px] text-[var(--color-text-muted)]">
            {COPY_L.objects(filtered.length)}
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleItems.map(r => (
              <li key={r.id}>
                <RentalCard r={r} currency={currency} lang={lang} perMonth={COPY_L.perMonth} bali={COPY_L.bali} />
              </li>
            ))}
          </ul>
          {hasMore && (
            <div ref={sentinelRef} className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setVisible(v => Math.min(v + PAGE_SIZE, filtered.length))}
                className="text-[13px] text-[var(--color-text-muted)] hover:text-[#111827] px-4 py-2"
              >
                {COPY_L.showingOfTotal(visibleItems.length, filtered.length)}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center text-[var(--color-text-muted)]">
          {COPY_L.emptyByFilters}
        </div>
      )}
    </>
  )
}

function SortMenu({ current, onChange, labels }: { current: SortKey; onChange: (v: SortKey) => void; labels: Record<SortKey, string> }) {
  return (
    <div className="sm:w-[220px]">
      <ul>
        {(Object.keys(labels) as SortKey[]).map(key => (
          <li key={key}>
            <button
              type="button"
              onClick={() => onChange(key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-[13px] hover:bg-[var(--color-search-bg)] ${
                key === current ? 'text-[var(--color-primary-pressed)] font-medium bg-[var(--color-primary-soft)]' : 'text-[#111827]'
              }`}
            >
              {labels[key]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PriceRangePopover({
  priceMin, priceMax, setPriceMin, setPriceMax, countFor, presets, lang,
}: {
  priceMin: number | null
  priceMax: number | null
  setPriceMin: (n: number | null) => void
  setPriceMax: (n: number | null) => void
  countFor: (min: number | null, max: number | null) => number
  presets: { label: string; min: number | null; max: number | null }[]
  lang: Lang
}) {
  const C = COPY[lang]
  const [minDraft, setMinDraft] = useState(priceMin == null ? '' : String(priceMin))
  const [maxDraft, setMaxDraft] = useState(priceMax == null ? '' : String(priceMax))

  useEffect(() => { setMinDraft(priceMin == null ? '' : String(priceMin)) }, [priceMin])
  useEffect(() => { setMaxDraft(priceMax == null ? '' : String(priceMax)) }, [priceMax])

  const commit = () => {
    const min = minDraft.trim() === '' ? null : Number(minDraft.replace(/[^\d]/g, ''))
    const max = maxDraft.trim() === '' ? null : Number(maxDraft.replace(/[^\d]/g, ''))
    setPriceMin(Number.isFinite(min as number) ? (min as number) : null)
    setPriceMax(Number.isFinite(max as number) ? (max as number) : null)
  }

  const applyPreset = (min: number | null, max: number | null) => {
    setMinDraft(min == null ? '' : String(min))
    setMaxDraft(max == null ? '' : String(max))
    setPriceMin(min)
    setPriceMax(max)
  }

  return (
    <div className="sm:w-[300px]">
      <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">{C.priceMonthHeader}</div>
      <div className="flex items-center gap-2 mb-3">
        <label className="flex-1">
          <span className="block text-[11px] text-[var(--color-text-muted)] mb-1">{C.priceFrom}</span>
          <input
            type="text"
            inputMode="numeric"
            value={minDraft}
            onChange={e => setMinDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit() }}
            placeholder="0"
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        <span className="text-[var(--color-text-muted)] mt-4">—</span>
        <label className="flex-1">
          <span className="block text-[11px] text-[var(--color-text-muted)] mb-1">{C.priceTo}</span>
          <input
            type="text"
            inputMode="numeric"
            value={maxDraft}
            onChange={e => setMaxDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit() }}
            placeholder="∞"
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map(p => {
          const active = priceMin === p.min && priceMax === p.max
          const count = countFor(p.min, p.max)
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.min, p.max)}
              disabled={count === 0 && !active}
              className={`text-[12px] px-2.5 py-1 rounded-full border transition-colors ${
                active
                  ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                  : 'bg-white border-[var(--color-border)] text-[#111827] hover:border-[var(--color-primary)] disabled:opacity-40 disabled:hover:border-[var(--color-border)] disabled:cursor-not-allowed'
              }`}
            >
              {p.label}{!active && <span className="ml-1 opacity-60">{count}</span>}
            </button>
          )
        })}
      </div>
      {(priceMin != null || priceMax != null) && (
        <button
          type="button"
          onClick={() => applyPreset(null, null)}
          className="mt-3 w-full text-[12px] text-[var(--color-text-muted)] hover:text-[#111827] py-1.5"
        >
          {C.clear}
        </button>
      )}
    </div>
  )
}

function CheckboxList({
  options,
  selected,
  onChange,
  searchable,
  lang,
}: {
  options: { value: string; label?: string; count?: number }[]
  selected: string[]
  onChange: (next: string[]) => void
  searchable?: boolean
  lang: Lang
}) {
  const [query, setQuery] = useState('')
  const filteredOptions = !searchable || query.trim() === ''
    ? options
    : options.filter(o => (o.label ?? o.value).toLowerCase().includes(query.toLowerCase()))
  const C = COPY[lang]

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  return (
    <div className="sm:w-[280px]">
      {searchable && (
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={C.search}
          className="w-full mb-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-[13px] focus:outline-none focus:border-[var(--color-primary)]"
        />
      )}
      <ul className="max-h-[280px] overflow-y-auto">
        {filteredOptions.map(o => {
          const checked = selected.includes(o.value)
          return (
            <li key={o.value}>
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-search-bg)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(o.value)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                <span className="text-[13px] text-[#111827] flex-1 truncate">{o.label ?? o.value}</span>
                {o.count != null && <span className="text-[11px] text-[var(--color-text-muted)]">{o.count}</span>}
              </label>
            </li>
          )
        })}
        {filteredOptions.length === 0 && (
          <li className="px-2 py-2 text-[12px] text-[var(--color-text-muted)]">{C.noResults}</li>
        )}
      </ul>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="mt-2 w-full text-[12px] text-[var(--color-text-muted)] hover:text-[#111827] py-1.5"
        >
          {C.clear}
        </button>
      )}
    </div>
  )
}

function RentalCard({ r, currency, lang, perMonth, bali }: {
  r: RentalItem; currency: Currency; lang: Lang; perMonth: string; bali: string
}) {
  const price = formatPrice(r.priceMonthUsd, currency)
  const detailHref = lang === 'en' ? `/en/rental/o/${r.slug}` : `/ru/arenda/o/${r.slug}`
  return (
    <Link
      href={detailHref}
      className="group block bg-[var(--color-card-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden no-underline text-[#111827]"
    >
      <PhotoSlider photos={r.photos} alt={r.title} trackingId={`rental:${r.slug}`} />

      <div className="p-6">
        <h3
          className="text-[20px] font-semibold text-[var(--color-text)] leading-[1.3] mb-4 overflow-hidden"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
        >
          {r.title}
        </h3>

        <div className="text-[18px] font-semibold text-[var(--color-text)] mb-3">
          {price}<span className="text-[14px] font-normal text-[var(--color-text-muted)]"> {perMonth}</span>
        </div>

        <div className="flex items-center flex-wrap gap-x-5 gap-y-1 text-[14px] text-[var(--color-text-muted)]">
          {r.bedrooms != null && (
            <span className="inline-flex items-center gap-1"><BedDouble size={14} /> {r.bedrooms} BR</span>
          )}
          {r.location && (
            <span className="inline-flex items-center gap-1"><MapPin size={14} /> {r.location}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
