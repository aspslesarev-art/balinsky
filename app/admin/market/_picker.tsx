'use client'

import { useState } from 'react'

// Выпадающий список с галочками. На <details> — чтобы закрытие по клику
// вне и по Esc работали сами, без обработчиков на document.

export function Picker({
  label,
  options,
  selected,
  onChange,
  width = 280,
}: {
  label: string
  options: string[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  width?: number
}) {
  const [query, setQuery] = useState('')
  const shown = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options

  return (
    <details className="relative">
      <summary className="list-none cursor-pointer text-[12px] px-2.5 py-1.5 rounded-lg border border-[var(--ax-border)] hover:text-[var(--ax-fg)] text-[var(--ax-fg-muted)]">
        {label}
        {selected.size > 0 && <span className="ml-1.5 text-[var(--ax-fg)]">· {selected.size}</span>}
      </summary>

      <div
        style={{ width }}
        className="absolute z-20 mt-1 max-h-[320px] overflow-auto rounded-xl border border-[var(--ax-border)] bg-[var(--ax-panel)] p-2 shadow-lg"
      >
        {options.length > 8 && (
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск…"
            className="w-full mb-2 px-2 py-1 text-[12px] rounded-lg bg-[var(--ax-bg)] border border-[var(--ax-border)] outline-none"
          />
        )}
        {shown.map(o => (
          <label key={o} className="flex items-center gap-2 px-1 py-1 text-[12px] cursor-pointer hover:text-[var(--ax-fg)]">
            <input
              type="checkbox"
              checked={selected.has(o)}
              onChange={() => {
                const next = new Set(selected)
                if (next.has(o)) next.delete(o)
                else next.add(o)
                onChange(next)
              }}
            />
            <span className="truncate">{o}</span>
          </label>
        ))}
        {!shown.length && <div className="text-[12px] text-[var(--ax-fg-muted)] px-1 py-2">Ничего не найдено</div>}
      </div>
    </details>
  )
}
