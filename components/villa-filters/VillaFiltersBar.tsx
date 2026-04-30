'use client'

import { Suspense } from 'react'
import { VillaMultiSelect } from './VillaMultiSelect'
import { VillaPriceRange } from './VillaPriceRange'
import { useVillaFilterUrl, type FilterView } from './useVillaFilterUrl'
import type { VillaFilterState, VillaFilterOptions } from '@/app/ru/villy/_lib'

function ResetAll({ activeCount, current, view }: { activeCount: number; current: VillaFilterState; view: FilterView }) {
  const { clearAll } = useVillaFilterUrl(current, view)
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

export function VillaFiltersBar({
  state,
  options,
  view = 'list',
}: {
  state: VillaFilterState
  options: VillaFilterOptions
  view?: FilterView
}) {
  const activeCount =
    (state.q.trim() ? 1 : 0) +
    (state.priceMin != null || state.priceMax != null ? 1 : 0) +
    (state.district.length > 0 ? 1 : 0) +
    (state.bedrooms.length > 0 ? 1 : 0) +
    (state.status.length > 0 ? 1 : 0) +
    (state.permit.length > 0 ? 1 : 0) +
    (state.year.length > 0 ? 1 : 0) +
    (state.developer.length > 0 ? 1 : 0)

  return (
    <Suspense fallback={null}>
      <div className="flex items-center gap-3 flex-wrap">
        <VillaPriceRange label="Цена" min={state.priceMin} max={state.priceMax} current={state} view={view} />
        <VillaMultiSelect stateKey="district" label="Район" options={options.district} selected={state.district} current={state} view={view} searchable />
        <VillaMultiSelect stateKey="bedrooms" label="Кол-во спален" options={options.bedrooms} selected={state.bedrooms} current={state} view={view} />
        <VillaMultiSelect stateKey="status" label="Этап стройки" options={options.status} selected={state.status} current={state} view={view} />
        <VillaMultiSelect stateKey="year" label="Год сдачи" options={options.year} selected={state.year} current={state} view={view} />
        <VillaMultiSelect stateKey="developer" label="Застройщик" options={options.developer} selected={state.developer} current={state} view={view} searchable />
        <VillaMultiSelect stateKey="permit" label="Разрешение" options={options.permit} selected={state.permit} current={state} view={view} />
        <ResetAll activeCount={activeCount} current={state} view={view} />
      </div>
    </Suspense>
  )
}
