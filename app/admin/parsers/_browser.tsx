'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { parserHealth, type ComplexListEntry, type ParserHealth } from '@/lib/complex-parsers'

function fmtRelative(iso: string | null): string {
  if (!iso) return 'никогда'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return iso
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.round(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.round(diff / 3600)} ч назад`
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function fmtInterval(mins: number | null): string {
  if (mins == null) return 'вручную'
  if (mins < 60) return `каждые ${mins} мин`
  const h = Math.round(mins / 60)
  return `каждые ${h} ч`
}

// Three buckets: настроены / реализованы но не настроены / парсер не написан
type Bucket = 'configured' | 'available' | 'unimplemented'
function bucketOf(it: ComplexListEntry): Bucket {
  if (it.parser) return 'configured'
  if (it.parser_label) return 'available'
  return 'unimplemented'
}

// Dot colour: green ok / yellow warnings / red error / grey never.
const HEALTH_DOT: Record<ParserHealth, { cls: string; title: string }> = {
  green:  { cls: 'bg-emerald-500',   title: 'OK' },
  yellow: { cls: 'bg-amber-400',     title: 'С предупреждениями' },
  red:    { cls: 'bg-rose-500',      title: 'Ошибка' },
  idle:   { cls: 'bg-[var(--ax-fg-faint)] opacity-50', title: 'Ещё не запускался' },
}

export function ParsersBrowser({ items }: { items: ComplexListEntry[] }) {
  const [query, setQuery] = useState('')
  const [developer, setDeveloper] = useState<string>('')

  // Unique developer names across the catalog (alphabetised). Drives the
  // chip row above the list — clicking a chip narrows both sections.
  const developers = useMemo(() => {
    const set = new Set<string>()
    for (const it of items) if (it.developer) set.add(it.developer)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(it => {
      if (developer && it.developer !== developer) return false
      if (!q) return true
      return (it.name + ' ' + (it.slug ?? '') + ' ' + (it.district ?? '') + ' ' + (it.developer ?? '')).toLowerCase().includes(q)
    })
  }, [items, query, developer])

  const configured = filtered.filter(c => bucketOf(c) === 'configured')
  const available = filtered.filter(c => bucketOf(c) === 'available')
  const unimplemented = filtered.filter(c => bucketOf(c) === 'unimplemented')

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-3 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-fg-muted)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по названию ЖК, slug, району, застройщику…"
            className="w-full pl-9 pr-9 py-2 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[13px] text-[var(--ax-fg)]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]">
              <X size={14} />
            </button>
          )}
        </div>

        {developers.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setDeveloper('')}
              className={`px-2.5 py-1 rounded-full text-[11.5px] border transition-colors ${
                developer === ''
                  ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                  : 'bg-[var(--ax-input-bg)] border-[var(--ax-input-border)] text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)]'
              }`}
            >
              Все застройщики ({items.length})
            </button>
            {developers.map(d => {
              const count = items.filter(it => it.developer === d).length
              const active = developer === d
              return (
                <button
                  key={d}
                  onClick={() => setDeveloper(active ? '' : d)}
                  className={`px-2.5 py-1 rounded-full text-[11.5px] border transition-colors ${
                    active
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                      : 'bg-[var(--ax-input-bg)] border-[var(--ax-input-border)] text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)]'
                  }`}
                >
                  {d} <span className="opacity-60 tabular-nums">{count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-8 text-center text-[13px] text-[var(--ax-fg-muted)]">
          Ничего не нашлось.
        </div>
      ) : (
        <div className="space-y-8">
          {configured.length > 0 && (
            <section>
              <h2 className="text-[15px] font-semibold mb-3 text-[var(--ax-fg)]">Подключены ({configured.length})</h2>
              <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] divide-y divide-[var(--ax-border-soft)] overflow-hidden">
                {configured.map(c => {
                  const p = c.parser!
                  const health = parserHealth(p)
                  const dot = HEALTH_DOT[health]
                  return (
                    <Link
                      key={c.airtable_id}
                      href={`/admin/parsers/${encodeURIComponent(c.airtable_id)}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--ax-hover)] no-underline text-[var(--ax-fg)]"
                    >
                      <span
                        className={`shrink-0 w-2.5 h-2.5 rounded-full ${dot.cls}`}
                        title={dot.title}
                        aria-label={dot.title}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium truncate flex items-center gap-2">
                          {c.name}
                          {c.developer && <span className="text-[11px] font-normal text-[var(--ax-fg-faint)] truncate">· {c.developer}</span>}
                        </div>
                        <div className="text-[11.5px] text-[var(--ax-fg-faint)] mt-0.5 flex items-center gap-2 flex-wrap">
                          {c.parser_label && <span className="font-mono">{c.parser_label}</span>}
                          {c.slug && <span>· <span className="font-mono">{c.slug}</span></span>}
                          <span>· {fmtInterval(p.interval_minutes)}</span>
                          {p.last_units_count != null && <span>· {p.last_units_count} юнитов</span>}
                          {(p.last_warning_count ?? 0) > 0 && <span className="text-amber-500">· {p.last_warning_count} ⚠</span>}
                        </div>
                      </div>
                      <div className="text-[12px] tabular-nums shrink-0 text-[var(--ax-fg-soft)]">
                        {fmtRelative(p.last_run_at)}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {available.length > 0 && (
            <section>
              <h2 className="text-[15px] font-semibold mb-3 text-[var(--ax-fg)]">Парсер написан, но не настроен ({available.length})</h2>
              <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] divide-y divide-[var(--ax-border-soft)] overflow-hidden">
                {available.map(c => (
                  <Link
                    key={c.airtable_id}
                    href={`/admin/parsers/${encodeURIComponent(c.airtable_id)}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--ax-hover)] no-underline text-[var(--ax-fg)]"
                  >
                    <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-[var(--ax-fg-faint)] opacity-50" title="Готов к настройке" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium truncate flex items-center gap-2">
                        {c.name}
                        {c.developer && <span className="text-[11px] font-normal text-[var(--ax-fg-faint)] truncate">· {c.developer}</span>}
                      </div>
                      <div className="text-[11.5px] text-[var(--ax-fg-faint)] mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-mono">{c.parser_label}</span>
                        {c.slug && <span>· <span className="font-mono">{c.slug}</span></span>}
                      </div>
                    </div>
                    <div className="text-[12px] text-[var(--color-primary)] shrink-0">настроить →</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {unimplemented.length > 0 && (
            <section>
              <h2 className="text-[15px] font-semibold mb-3 text-[var(--ax-fg)]">Парсер не написан ({unimplemented.length})</h2>
              <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] divide-y divide-[var(--ax-border-soft)] overflow-hidden">
                {unimplemented.map(c => (
                  <Link
                    key={c.airtable_id}
                    href={`/admin/parsers/${encodeURIComponent(c.airtable_id)}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--ax-hover)] no-underline text-[var(--ax-fg)] opacity-70"
                  >
                    <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-[var(--ax-fg-faint)] opacity-20" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium truncate flex items-center gap-2">
                        {c.name}
                        {c.developer && <span className="text-[11px] font-normal text-[var(--ax-fg-faint)] truncate">· {c.developer}</span>}
                      </div>
                      <div className="text-[11.5px] text-[var(--ax-fg-faint)] mt-0.5 flex items-center gap-2 flex-wrap">
                        {c.slug && <span className="font-mono truncate max-w-[260px]">{c.slug}</span>}
                        {c.district && <span>· {c.district}</span>}
                      </div>
                    </div>
                    <div className="text-[12px] text-[var(--ax-fg-faint)] tabular-nums shrink-0">нужен код</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
