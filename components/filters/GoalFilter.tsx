'use client'

import { useFilterUrl, type FilterView } from './useFilterUrl'
import type { FilterState } from './FiltersBar'

// Goal filter — three exclusive chips: Все / Инвестиции / Для жизни.
// Filtering rules live in the corresponding _lib.ts (passes()), this is
// just the UI + URL sync.
export function GoalFilter({ current, view = 'list' }: {
  current: FilterState
  view?: FilterView
}) {
  const { apply } = useFilterUrl(current, view)
  const opts: { v: 'invest' | 'live' | null; label: string }[] = [
    { v: null, label: 'Все' },
    { v: 'invest', label: 'Инвестиции' },
    { v: 'live', label: 'Для жизни' },
  ]
  return (
    <div className="inline-flex rounded-full border border-[var(--color-border)] p-0.5 bg-white">
      {opts.map(o => {
        const isActive = current.goal === o.v
        return (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => apply({ goal: o.v })}
            className={`text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[#111827]'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
