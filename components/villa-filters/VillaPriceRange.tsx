'use client'

import { useEffect, useState } from 'react'
import { FilterDropdown } from '../FilterDropdown'
import { useVillaFilterUrl, type FilterView } from './useVillaFilterUrl'
import type { VillaFilterState } from '@/app/ru/villy/_lib'

function fmt(v: number | null): string {
  if (v == null) return ''
  return v.toLocaleString('ru-RU').replace(/,/g, ' ')
}
function parse(v: string): number | null {
  const n = Number(v.replace(/\s/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function VillaPriceRange({
  label,
  min,
  max,
  current,
  view = 'list',
}: {
  label: string
  min: number | null
  max: number | null
  current: VillaFilterState
  view?: FilterView
}) {
  const { apply } = useVillaFilterUrl(current, view)
  const [draftMin, setDraftMin] = useState(fmt(min))
  const [draftMax, setDraftMax] = useState(fmt(max))

  useEffect(() => { setDraftMin(fmt(min)) }, [min])
  useEffect(() => { setDraftMax(fmt(max)) }, [max])

  const active = min != null || max != null
  const summary = active
    ? `${min != null ? `от ${fmt(min)}` : ''}${min != null && max != null ? ' ' : ''}${max != null ? `до ${fmt(max)}` : ''} $`
    : ''

  return (
    <FilterDropdown label={label} summary={summary} active={active}>
      {(close) => (
        <div className="flex flex-col gap-3 min-w-[260px]">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="text-[12px] text-[var(--color-text-muted)] mb-1">от, $</div>
              <input
                type="text"
                inputMode="numeric"
                value={draftMin}
                onChange={e => setDraftMin(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-[14px] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="flex-1">
              <div className="text-[12px] text-[var(--color-text-muted)] mb-1">до, $</div>
              <input
                type="text"
                inputMode="numeric"
                value={draftMax}
                onChange={e => setDraftMax(e.target.value)}
                placeholder="∞"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-[14px] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => { setDraftMin(''); setDraftMax(''); apply({ priceMin: null, priceMax: null }); close() }}
              className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-2 py-1"
            >
              Сбросить
            </button>
            <button
              type="button"
              onClick={() => { apply({ priceMin: parse(draftMin), priceMax: parse(draftMax) }); close() }}
              className="text-[13px] font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg px-4 py-2 transition-colors"
            >
              Применить
            </button>
          </div>
        </div>
      )}
    </FilterDropdown>
  )
}
