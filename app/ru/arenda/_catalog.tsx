'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BedDouble, MapPin, X } from 'lucide-react'
import { FilterDropdown } from '@/components/FilterDropdown'
import type { RentalItem } from '@/lib/rental'

function fmtUsd(n: number): string { return '$' + Math.round(n).toLocaleString('en-US') }
function pluralRu(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1]
  return forms[2]
}

const PRICE_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: 'До $1000', min: null, max: 1000 },
  { label: '$1000–2000', min: 1000, max: 2000 },
  { label: '$2000–3000', min: 2000, max: 3000 },
  { label: '$3000+', min: 3000, max: null },
]

type Initial = {
  districts: string[]
  bedrooms: string[]
  priceMin: number | null
  priceMax: number | null
}

export function RentalCatalog({ items, initial }: { items: RentalItem[]; initial?: Initial }) {
  const [districts, setDistricts] = useState<string[]>(initial?.districts ?? [])
  const [bedrooms, setBedrooms] = useState<string[]>(initial?.bedrooms ?? [])
  const [priceMin, setPriceMin] = useState<number | null>(initial?.priceMin ?? null)
  const [priceMax, setPriceMax] = useState<number | null>(initial?.priceMax ?? null)

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
    // Show currently-selected districts even when count would be 0 under other filters
    for (const v of districts) if (!counts.has(v)) counts.set(v, 0)
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }))
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
    if (districts.length === 0 && bedrooms.length === 0 && priceMin == null && priceMax == null) return items
    return items.filter(r => {
      if (districts.length > 0 && (!r.location || !districts.includes(r.location))) return false
      if (bedrooms.length > 0 && (r.bedrooms == null || !bedrooms.includes(String(r.bedrooms)))) return false
      if (priceMin != null && r.priceMonthUsd < priceMin) return false
      if (priceMax != null && r.priceMonthUsd > priceMax) return false
      return true
    })
  }, [items, districts, bedrooms, priceMin, priceMax])

  const priceActive = priceMin != null || priceMax != null
  const priceSummary = priceActive
    ? `${priceMin != null ? '$' + priceMin : ''}${priceMin != null && priceMax != null ? '–' : ''}${priceMax != null ? '$' + priceMax : (priceMin != null ? '+' : '')}`
    : 'Цена'
  const activeCount = districts.length + bedrooms.length + (priceActive ? 1 : 0)

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <FilterDropdown
          label="Район"
          summary={districts.length === 0 ? 'Район' : `Район · ${districts.length}`}
          active={districts.length > 0}
        >
          {() => (
            <CheckboxList
              options={districtOptions}
              selected={districts}
              onChange={setDistricts}
              searchable
            />
          )}
        </FilterDropdown>

        <FilterDropdown
          label="Спальни"
          summary={bedrooms.length === 0 ? 'Спальни' : bedrooms.map(b => `${b} BR`).join(', ')}
          active={bedrooms.length > 0}
        >
          {() => (
            <CheckboxList
              options={bedroomOptions.map(o => ({ ...o, label: `${o.value} BR` }))}
              selected={bedrooms}
              onChange={setBedrooms}
            />
          )}
        </FilterDropdown>

        <FilterDropdown
          label="Цена"
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
            />
          )}
        </FilterDropdown>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => { setDistricts([]); setBedrooms([]); setPriceMin(null); setPriceMax(null) }}
            className="inline-flex items-center gap-1 text-[13px] text-[var(--color-text-muted)] hover:text-[#111827] px-3 py-2"
          >
            <X size={14} /> Сбросить
          </button>
        )}

        <div className="ml-auto text-[13px] text-[var(--color-text-muted)]">
          {filtered.length} {pluralRu(filtered.length, ['объект', 'объекта', 'объектов'])}
        </div>
      </div>

      {filtered.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(r => (
            <li key={r.id}>
              <RentalCard r={r} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center text-[var(--color-text-muted)]">
          По выбранным фильтрам ничего не нашлось. Сбросьте фильтры или попробуйте другие.
        </div>
      )}
    </>
  )
}

function PriceRangePopover({
  priceMin, priceMax, setPriceMin, setPriceMax, countFor,
}: {
  priceMin: number | null
  priceMax: number | null
  setPriceMin: (n: number | null) => void
  setPriceMax: (n: number | null) => void
  countFor: (min: number | null, max: number | null) => number
}) {
  const [minDraft, setMinDraft] = useState(priceMin == null ? '' : String(priceMin))
  const [maxDraft, setMaxDraft] = useState(priceMax == null ? '' : String(priceMax))

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
    <div className="absolute left-0 top-full mt-2 z-30 w-[300px] rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-4">
      <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Цена в месяц, USD</div>
      <div className="flex items-center gap-2 mb-3">
        <label className="flex-1">
          <span className="block text-[11px] text-[var(--color-text-muted)] mb-1">От</span>
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
          <span className="block text-[11px] text-[var(--color-text-muted)] mb-1">До</span>
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
        {PRICE_PRESETS.map(p => {
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
          Очистить
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
}: {
  options: { value: string; label?: string; count?: number }[]
  selected: string[]
  onChange: (next: string[]) => void
  searchable?: boolean
}) {
  const [query, setQuery] = useState('')
  const filteredOptions = !searchable || query.trim() === ''
    ? options
    : options.filter(o => (o.label ?? o.value).toLowerCase().includes(query.toLowerCase()))

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value])
  }

  return (
    <div className="absolute left-0 top-full mt-2 z-30 w-[280px] rounded-2xl border border-[var(--color-border)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-3">
      {searchable && (
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск…"
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
          <li className="px-2 py-2 text-[12px] text-[var(--color-text-muted)]">Ничего не нашлось</li>
        )}
      </ul>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="mt-2 w-full text-[12px] text-[var(--color-text-muted)] hover:text-[#111827] py-1.5"
        >
          Очистить
        </button>
      )}
    </div>
  )
}

function RentalCard({ r }: { r: RentalItem }) {
  const cover = r.photos[0]
  return (
    <Link
      href={`/ru/arenda/o/${r.slug}`}
      className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors"
    >
      <div className="relative aspect-[4/3] bg-[var(--color-search-bg)]">
        {cover ? (
          <img src={cover} alt={r.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🏡</div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <div className="text-[18px] font-semibold text-[#111827]">{fmtUsd(r.priceMonthUsd)}<span className="text-[12px] font-normal text-[var(--color-text-muted)]"> / мес</span></div>
          {r.bedrooms != null && (
            <div className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
              <BedDouble size={13} /> {r.bedrooms} BR
            </div>
          )}
        </div>
        <div className="text-[14px] font-medium leading-snug line-clamp-2 mb-2">{r.title}</div>
        {r.location && (
          <div className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
            <MapPin size={12} /> {r.location}
          </div>
        )}
      </div>
    </Link>
  )
}
