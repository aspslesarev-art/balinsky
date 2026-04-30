'use client'

import { useMemo, useState } from 'react'
import { SearchBar } from './SearchBar'
import { DeveloperRow, type DeveloperRowData } from './DeveloperRow'

export function DevelopersList({ items }: { items: DeveloperRowData[] }) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return items
    return items.filter(d => d.name.toLowerCase().includes(t))
  }, [q, items])

  return (
    <>
      <div className="mb-6">
        <SearchBar value={q} onChange={setQ} />
      </div>
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-[var(--color-text-muted)]">Ничего не найдено</div>
      ) : (
        <div className="w-full flex flex-col items-stretch gap-3">
          {filtered.map((d, i) => (
            <DeveloperRow key={d.slug ?? `${d.name}-${i}`} d={d} />
          ))}
        </div>
      )}
    </>
  )
}
