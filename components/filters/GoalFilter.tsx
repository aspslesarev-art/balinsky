'use client'

import { FilterDropdown } from '../FilterDropdown'
import { useFilterUrl, type FilterView } from './useFilterUrl'
import type { FilterState } from './FiltersBar'
import { pickCopy, type Lang } from '@/lib/i18n'

const OPTS_BY_LANG: Record<Lang, { v: 'invest' | 'live'; label: string }[]> = {
  ru: [{ v: 'invest', label: 'Под инвестиции' }, { v: 'live', label: 'Для жизни' }],
  en: [{ v: 'invest', label: 'For investment' }, { v: 'live', label: 'To live in' }],
  id: [{ v: 'invest', label: 'Untuk investasi' }, { v: 'live', label: 'Untuk tinggal' }],
  fr: [{ v: 'invest', label: 'Pour investir' }, { v: 'live', label: 'Pour y vivre' }],
  de: [{ v: 'invest', label: 'Als Kapitalanlage' }, { v: 'live', label: 'Zum Wohnen' }],
  zh: [{ v: 'invest', label: '用于投资' }, { v: 'live', label: '用于居住' }],
  nl: [{ v: 'invest', label: 'Voor belegging' }, { v: 'live', label: 'Om in te wonen' }],
  ban: [{ v: 'invest', label: 'Anggen investasi' }, { v: 'live', label: 'Anggen magenah' }],
}

const COPY = {
  ru: { dropdown: 'Цель покупки', clear: 'Сбросить' },
  en: { dropdown: 'Buying goal',  clear: 'Clear' },
  id: { dropdown: 'Tujuan pembelian', clear: 'Hapus' },
  fr: { dropdown: "Objectif d'achat", clear: 'Effacer' },
  de: { dropdown: 'Kaufzweck', clear: 'Zurücksetzen' },
  zh: { dropdown: '购买目的', clear: '清除' },
  nl: { dropdown: 'Koopdoel', clear: 'Wissen' },
  ban: { dropdown: 'Tetujon numbas', clear: 'Kosongin' },
} as const

export function GoalFilter({ current, view = 'list', lang = 'ru' }: {
  current: FilterState
  view?: FilterView
  lang?: Lang
}) {
  const { apply } = useFilterUrl(current, view)
  const opts = pickCopy(OPTS_BY_LANG, lang)
  const c = pickCopy(COPY, lang)
  const active = opts.find(o => o.v === current.goal) ?? null
  const summary = active?.label ?? ''

  return (
    <FilterDropdown label={c.dropdown} summary={summary} active={active != null}>
      {(close) => (
        <div className="flex flex-col gap-1 min-w-[220px]">
          {opts.map(o => {
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
            {c.clear}
          </button>
        </div>
      )}
    </FilterDropdown>
  )
}
