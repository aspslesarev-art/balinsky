'use client'

import { useVillaFilterUrl, type FilterView } from './useVillaFilterUrl'
import type { VillaFilterState } from '@/app/ru/villy/_lib'

export function VillaGoalFilter({ current, view = 'list' }: {
  current: VillaFilterState
  view?: FilterView
}) {
  const { apply } = useVillaFilterUrl(current, view)
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
