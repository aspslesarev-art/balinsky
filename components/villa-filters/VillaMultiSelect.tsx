'use client'

import { useEffect, useState } from 'react'
import { FilterDropdown } from '../FilterDropdown'
import { useVillaFilterUrl, type FilterView } from './useVillaFilterUrl'
import type { Option } from '../filters/MultiSelectFilter'
import type { VillaFilterState } from '@/app/ru/villy/_lib'
import { pickCopy, type Lang } from '@/lib/i18n'
import { selectedGroup, type DistrictGroup } from '@/lib/district-groups'

const COPY = {
  ru: { search: 'Поиск…', noOptions: 'Нет вариантов', clear: 'Сбросить', apply: 'Применить' },
  en: { search: 'Search…', noOptions: 'No options', clear: 'Clear',     apply: 'Apply' },
  id: { search: 'Cari…', noOptions: 'Tidak ada pilihan', clear: 'Hapus', apply: 'Terapkan' },
  fr: { search: 'Rechercher…', noOptions: 'Aucune option', clear: 'Effacer', apply: 'Appliquer' },
  de: { search: 'Suchen…', noOptions: 'Keine Optionen', clear: 'Zurücksetzen', apply: 'Anwenden' },
  zh: { search: '搜索…', noOptions: '无选项', clear: '清除', apply: '应用' },
  nl: { search: 'Zoeken…', noOptions: 'Geen opties', clear: 'Wissen', apply: 'Toepassen' },
  ban: { search: 'Ngerereh…', noOptions: 'Nenten wenten pilihan', clear: 'Kosongin', apply: 'Terapang' },
  pl: { search: 'Szukaj…', noOptions: 'Brak opcji', clear: 'Wyczyść', apply: 'Zastosuj' },
  uk: { search: 'Пошук…', noOptions: 'Немає варіантів', clear: 'Очистити', apply: 'Застосувати' },
} as const

type StringArrayKey = {
  [K in keyof VillaFilterState]-?: VillaFilterState[K] extends string[] ? K : never
}[keyof VillaFilterState]

export function VillaMultiSelect({
  stateKey,
  label,
  options,
  selected,
  current,
  view = 'list',
  searchable = false,
  lang = 'ru',
  groups,
}: {
  stateKey: StringArrayKey
  label: string
  options: Option[]
  selected: string[]
  current: VillaFilterState
  view?: FilterView
  searchable?: boolean
  lang?: Lang
  // Группы районов («Весь Чангу») — ставятся одним тапом, без «Применить».
  groups?: DistrictGroup[]
}) {
  const { apply } = useVillaFilterUrl(current, view)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<string[]>(selected)
  const copy = pickCopy(COPY, lang)

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: deps deliberately scoped
  useEffect(() => { setDraft(selected) }, [selected.join(',')])

  const activeGroup = groups?.length ? selectedGroup(selected) : null
  const summary =
    selected.length === 0 ? '' :
    activeGroup ? groups?.find(g => g.id === activeGroup)?.label ?? '' :
    selected.length === 1 ? options.find(o => o.value === selected[0])?.label ?? selected[0] :
    `${label}: ${selected.length}`

  const filtered = searchable && query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const toggle = (v: string) => setDraft(d => d.includes(v) ? d.filter(x => x !== v) : [...d, v])

  return (
    <FilterDropdown label={label} summary={summary} active={selected.length > 0}>
      {(close) => (
        <div className="flex flex-col gap-3 min-w-[240px]">
          {groups && groups.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {groups.map(g => {
                const on = activeGroup === g.id
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const next = on ? [] : g.values
                      setDraft(next)
                      apply({ [stateKey]: next } as Partial<VillaFilterState>)
                      close()
                    }}
                    className={`inline-flex items-center gap-1.5 py-2 px-3 rounded-full border text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                      on
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white font-medium'
                        : 'bg-[var(--color-card-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
                    }`}
                  >
                    {g.label}
                    <span className={`text-[12px] ${on ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>{g.count}</span>
                  </button>
                )
              })}
            </div>
          )}
          {searchable && (
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={copy.search}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-[14px] focus:outline-none focus:border-[var(--color-primary)]"
            />
          )}
          <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1 pr-1">
            {filtered.length === 0 ? (
              <div className="text-[13px] text-[var(--color-text-muted)] py-2">{copy.noOptions}</div>
            ) : filtered.map(o => {
              const checked = draft.includes(o.value)
              const empty = o.count === 0 && !checked
              return (
                <label
                  key={o.value}
                  className={`flex items-center gap-2.5 py-1.5 px-2 rounded-md cursor-pointer hover:bg-[var(--color-bg)] ${empty ? 'opacity-40' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(o.value)}
                    className="w-4 h-4 accent-[var(--color-primary)]"
                  />
                  <span className="text-[14px] text-[var(--color-text)] flex-1">{o.label}</span>
                  {o.count != null && <span className="text-[12px] text-[var(--color-text-muted)]">{o.count}</span>}
                </label>
              )
            })}
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => { setDraft([]); apply({ [stateKey]: [] } as Partial<VillaFilterState>); close() }}
              className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-2 py-1"
            >
              {copy.clear}
            </button>
            <button
              type="button"
              onClick={() => { apply({ [stateKey]: draft } as Partial<VillaFilterState>); close() }}
              className="text-[13px] font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg px-4 py-2 transition-colors"
            >
              {copy.apply}
            </button>
          </div>
        </div>
      )}
    </FilterDropdown>
  )
}
