'use client'

// Search + developer filter for the visualisations index. With 186
// complexes the unfiltered list is overwhelming — this client
// component lets the admin narrow by name (substring match across
// name + slug + district) and developer (single-pick chips).

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'

type Item = {
  airtableId: string
  slug: string
  name: string
  developer: string | null
  district: string | null
  layerCount: number
  hotspotCount: number
}

export function VisualizationsBrowser({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('')
  const [developer, setDeveloper] = useState<string | null>(null)

  // Developer list — sorted by frequency (most projects first), so
  // the chips that catch the most rows are at the front. Cap visible
  // chips to 12; rest live in the dropdown.
  const developers = useMemo(() => {
    const counts = new Map<string, number>()
    for (const it of items) {
      if (!it.developer) continue
      counts.set(it.developer, (counts.get(it.developer) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
      .map(([name, count]) => ({ name, count }))
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(it => {
      if (developer && it.developer !== developer) return false
      if (q) {
        const hay = [it.name, it.slug, it.district ?? '', it.developer ?? ''].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [items, query, developer])

  const visualised = filtered.filter(c => c.layerCount > 0)
  const empty = filtered.filter(c => c.layerCount === 0)

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-3 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-fg-muted)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по названию, slug, району, застройщику…"
            className="w-full pl-9 pr-9 py-2 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[13px] text-[var(--ax-fg)]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]">
              <X size={14} />
            </button>
          )}
        </div>

        {developers.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-1.5">Застройщик</div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDeveloper(null)}
                className={`px-2.5 py-1 rounded-full text-[12px] border transition-colors ${
                  developer == null
                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                    : 'bg-[var(--ax-input-bg)] border-[var(--ax-input-border)] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)]'
                }`}
              >
                Все ({items.length})
              </button>
              {developers.slice(0, 16).map(d => {
                const active = developer === d.name
                return (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => setDeveloper(active ? null : d.name)}
                    className={`px-2.5 py-1 rounded-full text-[12px] border transition-colors ${
                      active
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                        : 'bg-[var(--ax-input-bg)] border-[var(--ax-input-border)] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)]'
                    }`}
                  >
                    {d.name} <span className={`tabular-nums ${active ? 'text-white/70' : 'text-[var(--ax-fg-faint)]'}`}>· {d.count}</span>
                  </button>
                )
              })}
              {developers.length > 16 && (
                <span className="px-2 py-1 text-[11px] text-[var(--ax-fg-faint)]">+{developers.length - 16} других в поиске</span>
              )}
            </div>
          </div>
        )}

        {(query || developer) && (
          <div className="text-[12px] text-[var(--ax-fg-muted)] flex items-center gap-2">
            <span>Найдено: <b className="text-[var(--ax-fg)]">{filtered.length}</b> из {items.length}</span>
            <button
              type="button"
              onClick={() => { setQuery(''); setDeveloper(null) }}
              className="underline text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)]"
            >
              сбросить
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-8 text-center text-[13px] text-[var(--ax-fg-muted)]">
          Ничего не нашлось. Поправь запрос или сбрось фильтры.
        </div>
      ) : (
        <div className="space-y-8">
          {visualised.length > 0 && <Section title={`Размечено (${visualised.length})`} items={visualised} />}
          {empty.length > 0 && <Section title={`Без визуализации (${empty.length})`} items={empty} />}
        </div>
      )}
    </div>
  )
}

function Section({ title, items }: { title: string; items: Item[] }) {
  return (
    <section>
      <h2 className="text-[15px] font-semibold mb-3 text-[var(--ax-fg)]">{title}</h2>
      <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] divide-y divide-[var(--ax-border-soft)] overflow-hidden">
        {items.map(c => (
          <Link
            key={c.airtableId}
            href={`/admin/visualizations/${encodeURIComponent(c.airtableId)}`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--ax-hover)] no-underline text-[var(--ax-fg)]"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium truncate">{c.name}</div>
              <div className="text-[11.5px] text-[var(--ax-fg-faint)] mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="font-mono truncate max-w-[260px]">{c.slug}</span>
                {c.developer && <span>· {c.developer}</span>}
                {c.district && <span>· {c.district}</span>}
              </div>
            </div>
            <div className="text-[12px] text-[var(--ax-fg-muted)] tabular-nums shrink-0">
              {c.layerCount > 0
                ? `${c.layerCount} слоёв · ${c.hotspotCount} зон`
                : 'не создана'}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
