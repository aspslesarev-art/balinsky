'use client'

import { Suspense } from 'react'
import { MultiSelectFilter, type Option } from './MultiSelectFilter'
import { PriceRangeFilter } from './PriceRangeFilter'
import { GoalFilter } from './GoalFilter'
import { useFilterUrl, type FilterView } from './useFilterUrl'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    price: 'Цена', district: 'Район', bedrooms: 'Кол-во спален', floor: 'Этаж',
    developer: 'Застройщик', status: 'Этап стройки', permit: 'Разрешение',
    dealType: 'Тип сделки', resetAll: 'Сбросить все',
  },
  en: {
    price: 'Price', district: 'District', bedrooms: 'Bedrooms', floor: 'Floor',
    developer: 'Developer', status: 'Construction stage', permit: 'Permit',
    dealType: 'Deal type', resetAll: 'Clear all',
  },
} as const

export type FilterState = {
  q: string
  priceMin: number | null
  priceMax: number | null
  district: string[]
  bedrooms: string[]
  floor: string[]
  developer: string[]
  status: string[]
  permit: string[]
  // 'primary' = sold by the developer, 'resale'/'secondary' = sold by
  // an owner/agent. Mirrors villas. Drives the resale badge on cards
  // and the seller-contact routing on the detail page.
  dealType: string[]
  // 'invest' = tourism / commercial land, short-term rental allowed.
  // 'live'   = residential (yellow) zone + livable area.
  goal: 'invest' | 'live' | null
}

export type FilterOptions = {
  district: Option[]
  bedrooms: Option[]
  floor: Option[]
  developer: Option[]
  status: Option[]
  permit: Option[]
  dealType: Option[]
}

function ResetAll({ activeCount, current, view, lang }: {
  activeCount: number
  current: FilterState
  view: FilterView
  lang: Lang
}) {
  const { clearAll } = useFilterUrl(current, view)
  if (activeCount === 0) return null
  return (
    <button
      type="button"
      onClick={clearAll}
      className="text-[13px] text-[var(--color-text-muted)] underline-offset-2 hover:underline ml-2"
    >
      {COPY[lang].resetAll}
    </button>
  )
}

export function FiltersBar({
  state,
  options,
  view = 'list',
  lang = 'ru',
}: {
  state: FilterState
  options: FilterOptions
  view?: FilterView
  lang?: Lang
}) {
  const c = COPY[lang]
  const activeCount =
    (state.q.trim() ? 1 : 0) +
    (state.priceMin != null || state.priceMax != null ? 1 : 0) +
    (state.district.length > 0 ? 1 : 0) +
    (state.bedrooms.length > 0 ? 1 : 0) +
    (state.floor.length > 0 ? 1 : 0) +
    (state.developer.length > 0 ? 1 : 0) +
    (state.status.length > 0 ? 1 : 0) +
    (state.permit.length > 0 ? 1 : 0) +
    (state.dealType.length > 0 ? 1 : 0) +
    (state.goal != null ? 1 : 0)

  return (
    <Suspense fallback={null}>
      <div className="flex items-center gap-3 flex-wrap">
        <GoalFilter current={state} view={view} lang={lang} />
        <PriceRangeFilter label={c.price} min={state.priceMin} max={state.priceMax} current={state} view={view} lang={lang} />
        <MultiSelectFilter stateKey="district"  label={c.district}  options={options.district}  selected={state.district}  current={state} view={view} lang={lang} searchable />
        <MultiSelectFilter stateKey="bedrooms"  label={c.bedrooms}  options={options.bedrooms}  selected={state.bedrooms}  current={state} view={view} lang={lang} />
        <MultiSelectFilter stateKey="floor"     label={c.floor}     options={options.floor}     selected={state.floor}     current={state} view={view} lang={lang} />
        <MultiSelectFilter stateKey="developer" label={c.developer} options={options.developer} selected={state.developer} current={state} view={view} lang={lang} searchable />
        <MultiSelectFilter stateKey="status"    label={c.status}    options={options.status}    selected={state.status}    current={state} view={view} lang={lang} />
        <MultiSelectFilter stateKey="permit"    label={c.permit}    options={options.permit}    selected={state.permit}    current={state} view={view} lang={lang} />
        <MultiSelectFilter stateKey="dealType"  label={c.dealType}  options={options.dealType}  selected={state.dealType}  current={state} view={view} lang={lang} />
        <ResetAll activeCount={activeCount} current={state} view={view} lang={lang} />
      </div>
    </Suspense>
  )
}
