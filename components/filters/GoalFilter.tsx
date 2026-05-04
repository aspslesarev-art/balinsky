'use client'

import { FilterDropdown } from '../FilterDropdown'
import { useFilterUrl, type FilterView } from './useFilterUrl'
import type { FilterState } from './FiltersBar'

const OPTS: { v: 'invest' | 'live'; label: string }[] = [
  { v: 'invest', label: 'Под инвестиции' },
  { v: 'live',   label: 'Для жизни' },
]

// Single-select dropdown for purpose-of-purchase, sitting in the same
// FilterDropdown shell as the other catalog filters. `null` means
// "no preference" — chosen by clicking the active row a second time
// or via the "Сбросить" link.
export function GoalFilter({ current, view = 'list' }: {
  current: FilterState
  view?: FilterView
}) {
  const { apply } = useFilterUrl(current, view)
  const active = OPTS.find(o => o.v === current.goal) ?? null
  const summary = active?.label ?? ''

  return (
    <FilterDropdown label="Цель покупки" summary={summary} active={active != null}>
      {(close) => (
        <div className="flex flex-col gap-1 min-w-[220px]">
          {OPTS.map(o => {
            const selected = current.goal === o.v
            return (
              <label
                key={o.v}
                className="flex items-center gap-2.5 py-2 px-2 rounded-md cursor-pointer hover:bg-[var(--color-bg)]"
              >
                <input
                  type="radio"
                  name="goal"
                  checked={selected}
                  onChange={() => { apply({ goal: o.v }); close() }}
                  className="w-4 h-4 accent-[var(--color-primary)]"
                />
                <span className="text-[14px] text-[var(--color-text)]">{o.label}</span>
              </label>
            )
          })}
          <button
            type="button"
            onClick={() => { apply({ goal: null }); close() }}
            className="mt-2 self-start text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-2 py-1"
          >
            Сбросить
          </button>
        </div>
      )}
    </FilterDropdown>
  )
}
