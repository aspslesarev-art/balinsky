'use client'

import { Suspense } from 'react'
import { VillaMultiSelect } from './VillaMultiSelect'
import { VillaPriceRange } from './VillaPriceRange'
import { VillaGoalFilter } from './VillaGoalFilter'
import { useVillaFilterUrl, type FilterView } from './useVillaFilterUrl'
import type { VillaFilterState, VillaFilterOptions } from '@/app/ru/villy/_lib'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    price: 'Цена', district: 'Район', bedrooms: 'Кол-во спален', status: 'Этап стройки',
    dealType: 'Тип сделки', style: 'Стиль', year: 'Год сдачи', developer: 'Застройщик',
    permit: 'Разрешение', features: 'Особенности', resetAll: 'Сбросить все',
  },
  en: {
    price: 'Price', district: 'District', bedrooms: 'Bedrooms', status: 'Construction stage',
    dealType: 'Deal type', style: 'Style', year: 'Completion year', developer: 'Developer',
    permit: 'Permit', features: 'Features', resetAll: 'Clear all',
  },
  id: {
    price: 'Harga', district: 'Wilayah', bedrooms: 'Kamar tidur', status: 'Tahap konstruksi',
    dealType: 'Jenis transaksi', style: 'Gaya', year: 'Tahun serah terima', developer: 'Pengembang',
    permit: 'Izin', features: 'Fitur', resetAll: 'Hapus semua',
  },
  fr: {
    price: 'Prix', district: 'Quartier', bedrooms: 'Chambres', status: 'Étape de construction',
    dealType: 'Type de transaction', style: 'Style', year: 'Année de livraison', developer: 'Promoteur',
    permit: 'Permis', features: 'Caractéristiques', resetAll: 'Tout effacer',
  },
} as const

function ResetAll({ activeCount, current, view, lang }: {
  activeCount: number
  current: VillaFilterState
  view: FilterView
  lang: Lang
}) {
  const { clearAll } = useVillaFilterUrl(current, view)
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

export function VillaFiltersBar({
  state,
  options,
  view = 'list',
  lang = 'ru',
}: {
  state: VillaFilterState
  options: VillaFilterOptions
  view?: FilterView
  lang?: Lang
}) {
  const c = pickCopy(COPY, lang)
  const activeCount =
    (state.q.trim() ? 1 : 0) +
    (state.priceMin != null || state.priceMax != null ? 1 : 0) +
    (state.district.length > 0 ? 1 : 0) +
    (state.bedrooms.length > 0 ? 1 : 0) +
    (state.status.length > 0 ? 1 : 0) +
    (state.permit.length > 0 ? 1 : 0) +
    (state.year.length > 0 ? 1 : 0) +
    (state.developer.length > 0 ? 1 : 0) +
    (state.style.length > 0 ? 1 : 0) +
    (state.features.length > 0 ? 1 : 0) +
    (state.goal != null ? 1 : 0) +
    (state.dealType.length > 0 ? 1 : 0)

  return (
    <Suspense fallback={null}>
      <div className="flex items-center gap-3 flex-wrap">
        <VillaGoalFilter current={state} view={view} lang={lang} />
        <VillaPriceRange label={c.price} min={state.priceMin} max={state.priceMax} current={state} view={view} lang={lang} />
        <VillaMultiSelect stateKey="district"  label={c.district}  options={options.district}  selected={state.district}  current={state} view={view} lang={lang} searchable />
        <VillaMultiSelect stateKey="bedrooms"  label={c.bedrooms}  options={options.bedrooms}  selected={state.bedrooms}  current={state} view={view} lang={lang} />
        <VillaMultiSelect stateKey="status"    label={c.status}    options={options.status}    selected={state.status}    current={state} view={view} lang={lang} />
        <VillaMultiSelect stateKey="dealType"  label={c.dealType}  options={options.dealType}  selected={state.dealType}  current={state} view={view} lang={lang} />
        <VillaMultiSelect stateKey="style"     label={c.style}     options={options.style}     selected={state.style}     current={state} view={view} lang={lang} />
        <VillaMultiSelect stateKey="features"  label={c.features}  options={options.features}  selected={state.features}  current={state} view={view} lang={lang} />
        <VillaMultiSelect stateKey="year"      label={c.year}      options={options.year}      selected={state.year}      current={state} view={view} lang={lang} />
        <VillaMultiSelect stateKey="developer" label={c.developer} options={options.developer} selected={state.developer} current={state} view={view} lang={lang} searchable />
        <VillaMultiSelect stateKey="permit"    label={c.permit}    options={options.permit}    selected={state.permit}    current={state} view={view} lang={lang} />
        <ResetAll activeCount={activeCount} current={state} view={view} lang={lang} />
      </div>
    </Suspense>
  )
}
