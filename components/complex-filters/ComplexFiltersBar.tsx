'use client'

import { Suspense } from 'react'
import { ComplexMultiSelect } from './ComplexMultiSelect'
import { useComplexFilterUrl, type FilterView } from './useComplexFilterUrl'
import type { ComplexFilterState, ComplexFilterOptions } from '@/app/ru/zhilye-kompleksy/_lib'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    district:  'Район',
    types:     'Тип',
    status:    'Этап стройки',
    year:      'Год сдачи',
    developer: 'Застройщик',
    permit:    'Разрешение',
    resetAll:  'Сбросить все',
  },
  en: {
    district:  'District',
    types:     'Type',
    status:    'Construction stage',
    year:      'Completion year',
    developer: 'Developer',
    permit:    'Permit',
    resetAll:  'Clear all',
  },
  id: {
    district:  'Kawasan',
    types:     'Tipe',
    status:    'Tahap pembangunan',
    year:      'Tahun serah terima',
    developer: 'Pengembang',
    permit:    'Izin',
    resetAll:  'Hapus semua',
  },
  fr: {
    district:  'Quartier',
    types:     'Type',
    status:    'Étape de construction',
    year:      'Année de livraison',
    developer: 'Promoteur',
    permit:    'Permis',
    resetAll:  'Tout effacer',
  },
} as const

function ResetAll({ activeCount, current, view, lang }: {
  activeCount: number
  current: ComplexFilterState
  view: FilterView
  lang: Lang
}) {
  const { clearAll } = useComplexFilterUrl(current, view)
  if (activeCount === 0) return null
  return (
    <button
      type="button"
      onClick={clearAll}
      className="text-[13px] text-[var(--color-text-muted)] underline-offset-2 hover:underline ml-2"
    >
      {pickCopy(COPY, lang).resetAll}
    </button>
  )
}

export function ComplexFiltersBar({
  state,
  options,
  view = 'list',
  lang = 'ru',
}: {
  state: ComplexFilterState
  options: ComplexFilterOptions
  view?: FilterView
  lang?: Lang
}) {
  const c = pickCopy(COPY, lang)
  const activeCount =
    (state.q.trim() ? 1 : 0) +
    (state.district.length > 0 ? 1 : 0) +
    (state.types.length > 0 ? 1 : 0) +
    (state.status.length > 0 ? 1 : 0) +
    (state.permit.length > 0 ? 1 : 0) +
    (state.year.length > 0 ? 1 : 0) +
    (state.developer.length > 0 ? 1 : 0)

  return (
    <Suspense fallback={null}>
      <div className="flex items-center gap-3 flex-wrap">
        <ComplexMultiSelect stateKey="district"  label={c.district}  options={options.district}  selected={state.district}  current={state} view={view} lang={lang} searchable />
        <ComplexMultiSelect stateKey="types"     label={c.types}     options={options.types}     selected={state.types}     current={state} view={view} lang={lang} />
        <ComplexMultiSelect stateKey="status"    label={c.status}    options={options.status}    selected={state.status}    current={state} view={view} lang={lang} />
        <ComplexMultiSelect stateKey="year"      label={c.year}      options={options.year}      selected={state.year}      current={state} view={view} lang={lang} />
        <ComplexMultiSelect stateKey="developer" label={c.developer} options={options.developer} selected={state.developer} current={state} view={view} lang={lang} searchable />
        <ComplexMultiSelect stateKey="permit"    label={c.permit}    options={options.permit}    selected={state.permit}    current={state} view={view} lang={lang} />
        <ResetAll activeCount={activeCount} current={state} view={view} lang={lang} />
      </div>
    </Suspense>
  )
}
