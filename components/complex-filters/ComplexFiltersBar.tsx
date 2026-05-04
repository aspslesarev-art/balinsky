'use client'

import { Suspense } from 'react'
import { ComplexMultiSelect } from './ComplexMultiSelect'
import { useComplexFilterUrl, type FilterView } from './useComplexFilterUrl'
import type {
  ComplexFilterState,
  ComplexFilterOptions,
} from '@/app/ru/zhilye-kompleksy/_lib'

function ResetAll({
  activeCount,
  current,
  view,
}: {
  activeCount: number
  current: ComplexFilterState
  view: FilterView
}) {
  const { clearAll } = useComplexFilterUrl(current, view)
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

export function ComplexFiltersBar({
  state,
  options,
  view = 'list',
}: {
  state: ComplexFilterState
  options: ComplexFilterOptions
  view?: FilterView
}) {
  const activeCount =
    (state.q.trim() ? 1 : 0) +
    (state.district.length > 0 ? 1 : 0) +
    (state.types.length > 0 ? 1 : 0) +
    (state.status.length > 0 ? 1 : 0) +
    (state.permit.length > 0 ? 1 : 0) +
    (state.year.length > 0 ? 1 : 0) +
    (state.developer.length > 0 ? 1 : 0) +
    (state.purpose.length > 0 ? 1 : 0)

  return (
    <Suspense fallback={null}>
      <div className="flex items-center gap-3 flex-wrap">
        <ComplexMultiSelect
          stateKey="purpose"
          label="Цель"
          options={options.purpose}
          selected={state.purpose}
          current={state}
          view={view}
        />
        <ComplexMultiSelect
          stateKey="district"
          label="Район"
          options={options.district}
          selected={state.district}
          current={state}
          view={view}
          searchable
        />
        <ComplexMultiSelect
          stateKey="types"
          label="Тип"
          options={options.types}
          selected={state.types}
          current={state}
          view={view}
        />
        <ComplexMultiSelect
          stateKey="status"
          label="Этап стройки"
          options={options.status}
          selected={state.status}
          current={state}
          view={view}
        />
        <ComplexMultiSelect
          stateKey="year"
          label="Год сдачи"
          options={options.year}
          selected={state.year}
          current={state}
          view={view}
        />
        <ComplexMultiSelect
          stateKey="developer"
          label="Застройщик"
          options={options.developer}
          selected={state.developer}
          current={state}
          view={view}
          searchable
        />
        <ComplexMultiSelect
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
