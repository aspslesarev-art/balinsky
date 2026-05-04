'use client'

import { Suspense } from 'react'
import { MultiSelectFilter, type Option } from './MultiSelectFilter'
import { PriceRangeFilter } from './PriceRangeFilter'
import { useFilterUrl, type FilterView } from './useFilterUrl'

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
  purpose: string[]
}

export type FilterOptions = {
  district: Option[]
  bedrooms: Option[]
  floor: Option[]
  developer: Option[]
  status: Option[]
  permit: Option[]
  purpose: Option[]
}

function ResetAll({
  activeCount,
  current,
  view,
}: {
  activeCount: number
  current: FilterState
  view: FilterView
}) {
  const { clearAll } = useFilterUrl(current, view)
  if (activeCount === 0) return null
  return (
    <button
      type="button"
      onClick={clearAll}
      className="text-[13px] text-[var(--color-text-muted)] underline-offset-2 hover:underline ml-2"
    >
      Сбросить все
    </button>
  )
}

export function FiltersBar({
  state,
  options,
  view = 'list',
}: {
  state: FilterState
  options: FilterOptions
  view?: FilterView
}) {
  const activeCount =
    (state.q.trim() ? 1 : 0) +
    (state.priceMin != null || state.priceMax != null ? 1 : 0) +
    (state.district.length > 0 ? 1 : 0) +
    (state.bedrooms.length > 0 ? 1 : 0) +
    (state.floor.length > 0 ? 1 : 0) +
    (state.developer.length > 0 ? 1 : 0) +
    (state.status.length > 0 ? 1 : 0) +
    (state.permit.length > 0 ? 1 : 0) +
    (state.purpose.length > 0 ? 1 : 0)

  return (
    <Suspense fallback={null}>
      <div className="flex items-center gap-3 flex-wrap">
        <PriceRangeFilter label="Цена" min={state.priceMin} max={state.priceMax} current={state} view={view} />
        <MultiSelectFilter
          stateKey="purpose"
          label="Цель"
          options={options.purpose}
          selected={state.purpose}
          current={state}
          view={view}
        />
        <MultiSelectFilter
          stateKey="district"
          label="Район"
          options={options.district}
          selected={state.district}
          current={state}
          view={view}
          searchable
        />
        <MultiSelectFilter
          stateKey="bedrooms"
          label="Кол-во спален"
          options={options.bedrooms}
          selected={state.bedrooms}
          current={state}
          view={view}
        />
        <MultiSelectFilter
          stateKey="floor"
          label="Этаж"
          options={options.floor}
          selected={state.floor}
          current={state}
          view={view}
        />
        <MultiSelectFilter
          stateKey="developer"
          label="Застройщик"
          options={options.developer}
          selected={state.developer}
          current={state}
          view={view}
          searchable
        />
        <MultiSelectFilter
          stateKey="status"
          label="Этап стройки"
          options={options.status}
          selected={state.status}
          current={state}
          view={view}
        />
        <MultiSelectFilter
          stateKey="permit"
          label="Разрешение"
          options={options.permit}
          selected={state.permit}
          current={state}
          view={view}
        />
        <ResetAll activeCount={activeCount} current={state} view={view} />
      </div>
    </Suspense>
  )
}
