'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search, X, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import type { ComplexListEntry } from '@/lib/complex-parsers'

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

export function ParsersBrowser({ items }: { items: ComplexListEntry[] }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(it => (it.name + ' ' + (it.slug ?? '') + ' ' + (it.district ?? '')).toLowerCase().includes(q))
  }, [items, query])
  const withParser = filtered.filter(c => c.parser)
  const empty = filtered.filter(c => !c.parser)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-fg-muted)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по названию ЖК, slug, району…"
            className="w-full pl-9 pr-9 py-2 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[13px] text-[var(--ax-fg)]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-8 text-center text-[13px] text-[var(--ax-fg-muted)]">
          Ничего не нашлось.
        </div>
      ) : (
        <div className="space-y-8">
          {withParser.length > 0 && (
            <section>
              <h2 className="text-[15px] font-semibold mb-3 text-[var(--ax-fg)]">Подключены ({withParser.length})</h2>
              <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] divide-y divide-[var(--ax-border-soft)] overflow-hidden">
                {withParser.map(c => {
                  const p = c.parser!
                  const StatusIcon = p.last_status === 'ok' ? CheckCircle2 : p.last_status === 'error' ? AlertCircle : Clock
                  const statusColor = p.last_status === 'ok' ? 'text-emerald-500' : p.last_status === 'error' ? 'text-rose-500' : 'text-[var(--ax-fg-faint)]'
                  return (
                    <Link
                      key={c.airtable_id}
                      href={`/admin/parsers/${encodeURIComponent(c.airtable_id)}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--ax-hover)] no-underline text-[var(--ax-fg)]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium truncate">{c.name}</div>
                        <div className="text-[11.5px] text-[var(--ax-fg-faint)] mt-0.5 flex items-center gap-2 flex-wrap">
                          {c.slug && <span className="font-mono truncate max-w-[260px]">{c.slug}</span>}
                          {c.district && <span>· {c.district}</span>}
                          <span>· тип: <span className="font-mono">{p.parser_type}</span></span>
                          {p.last_units_count != null && <span>· {p.last_units_count} юнитов</span>}
                        </div>
                      </div>
                      <div className={`text-[12px] tabular-nums shrink-0 inline-flex items-center gap-1 ${statusColor}`}>
                        <StatusIcon size={14} />
                        {fmtRelative(p.last_run_at)}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {empty.length > 0 && (
            <section>
              <h2 className="text-[15px] font-semibold mb-3 text-[var(--ax-fg)]">Без парсера ({empty.length})</h2>
              <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] divide-y divide-[var(--ax-border-soft)] overflow-hidden">
                {empty.map(c => (
                  <Link
                    key={c.airtable_id}
                    href={`/admin/parsers/${encodeURIComponent(c.airtable_id)}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--ax-hover)] no-underline text-[var(--ax-fg)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium truncate">{c.name}</div>
                      <div className="text-[11.5px] text-[var(--ax-fg-faint)] mt-0.5 flex items-center gap-2 flex-wrap">
                        {c.slug && <span className="font-mono truncate max-w-[260px]">{c.slug}</span>}
                        {c.district && <span>· {c.district}</span>}
                      </div>
                    </div>
                    <div className="text-[12px] text-[var(--ax-fg-faint)] tabular-nums shrink-0">не настроен</div>
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
