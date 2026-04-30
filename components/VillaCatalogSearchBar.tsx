'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useVillaFilterUrl, type FilterView } from './villa-filters/useVillaFilterUrl'
import type { VillaFilterState } from '@/app/ru/villy/_lib'

const DEBOUNCE_MS = 350

export function VillaCatalogSearchBar({
  initial,
  current,
  view = 'list',
  placeholder = 'Поиск по виллам, районам, застройщикам…',
}: {
  initial: string
  current: VillaFilterState
  view?: FilterView
  placeholder?: string
}) {
  const { apply } = useVillaFilterUrl(current, view)
  const [value, setValue] = useState(initial)
  const pushedRef = useRef(initial)

  useEffect(() => {
    setValue(initial)
    pushedRef.current = initial
  }, [initial])

  useEffect(() => {
    const next = value.trim()
    if (next === pushedRef.current.trim()) return
    const t = setTimeout(() => {
      pushedRef.current = next
      apply({ q: next })
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const onClear = () => {
    setValue('')
    pushedRef.current = ''
    apply({ q: '' })
  }

  return (
    <div className="relative">
      <Search size={20} strokeWidth={2} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            const next = value.trim()
            pushedRef.current = next
            apply({ q: next })
          }
        }}
        placeholder={placeholder}
        className="w-full h-14 pl-[52px] pr-12 rounded-xl bg-[var(--color-search-bg)] text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Очистить"
          className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-white/60 hover:text-[var(--color-text)]"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}
