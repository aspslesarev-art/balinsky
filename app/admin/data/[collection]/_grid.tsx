'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, ArrowUp, ArrowDown, Search, Check, X, Loader2 } from 'lucide-react'
import type { CollectionConfig, FieldDef, RecordRow } from '@/lib/admin/adapters/types'
import { resolveFields } from '@/lib/admin/fields'
import { RecordPanel } from './_panel'

type SortState = { field: string; dir: 'asc' | 'desc' } | null
const PAGE_SIZE = 50

function cellText(f: FieldDef, v: unknown): string {
  if (v == null || v === '') return ''
  if (f.type === 'bool') return v === true ? '✓' : ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function DataGridScreen({
  cfg,
  initialRows,
  total: initialTotal,
}: {
  cfg: CollectionConfig
  initialRows: RecordRow[]
  total: number
}) {
  const [rows, setRows] = useState<RecordRow[]>(initialRows)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<SortState>(cfg.defaultSort ?? null)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)

  // Columns accumulate every key ever seen (config fields first, then the rest),
  // so the header is stable as you page through sparse Airtable data.
  const seenKeys = useRef<Set<string>>(new Set())
  const [cols, setCols] = useState<FieldDef[]>(() => resolveFields(cfg, initialRows))
  const learnColumns = useCallback((rs: RecordRow[]) => {
    for (const r of rs) for (const k of Object.keys(r.fields)) seenKeys.current.add(k)
    const synthetic: RecordRow = { id: '_schema', fields: Object.fromEntries([...seenKeys.current].map(k => [k, ''])) }
    // Merge actual sample values so types infer correctly.
    setCols(resolveFields(cfg, [...rs, synthetic]))
  }, [cfg])
  useEffect(() => { learnColumns(initialRows) }, [initialRows, learnColumns])

  const titleKey = cfg.titleField

  const fetchPage = useCallback(async (opts: { page: number; sort: SortState; q: string }) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(opts.page), pageSize: String(PAGE_SIZE) })
    if (opts.sort) { params.set('sort', opts.sort.field); params.set('dir', opts.sort.dir) }
    if (opts.q.trim()) params.set('q', opts.q.trim())
    try {
      const res = await fetch(`/api/admin/data/${cfg.key}?${params}`)
      const j = await res.json()
      if (res.ok) {
        setRows(j.rows ?? [])
        setTotal(j.total ?? 0)
        learnColumns(j.rows ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [cfg.key, learnColumns])

  // Debounced search → reset to page 0.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    const t = setTimeout(() => { setPage(0); fetchPage({ page: 0, sort, q }) }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const go = (nextPage: number, nextSort: SortState) => {
    setPage(nextPage); setSort(nextSort); fetchPage({ page: nextPage, sort: nextSort, q })
  }

  const toggleSort = (field: string) => {
    let next: SortState
    if (!sort || sort.field !== field) next = { field, dir: 'asc' }
    else if (sort.dir === 'asc') next = { field, dir: 'desc' }
    else next = null
    go(0, next)
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const refresh = useCallback(() => fetchPage({ page, sort, q }), [fetchPage, page, sort, q])

  const onSaved = useCallback((_row: RecordRow, _isNew: boolean) => { setSelectedId(null); refresh() }, [refresh])
  const onDeleted = useCallback(() => { setSelectedId(null); refresh() }, [refresh])

  const titleOf = (r: RecordRow) => cellText({ key: titleKey, label: '', type: 'text' }, r.fields[titleKey]) || r.id

  return (
    <div>
      {/* toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-[360px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-fg-faint)]" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={`Поиск по «${cfg.fields.find(f => f.key === titleKey)?.label ?? titleKey}»…`}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        {loading && <Loader2 size={15} className="animate-spin text-[var(--ax-fg-faint)]" />}
        <div className="text-[12px] text-[var(--ax-fg-faint)]">{total} записей · {cols.length} полей</div>
        <div className="flex-1" />
        {cfg.caps.create && (
          <button type="button" onClick={() => setSelectedId('new')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium bg-[var(--color-primary)] text-white hover:opacity-90">
            <Plus size={15} /> Создать
          </button>
        )}
      </div>

      {/* grid — ALL columns, horizontal scroll, title column sticky-left */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--ax-border)] max-h-[70vh]">
        <table className="border-collapse text-[13px] w-max min-w-full">
          <thead>
            <tr className="bg-[var(--ax-panel)]">
              {cols.map((c, ci) => {
                const active = sort?.field === c.key
                const sticky = c.key === titleKey
                return (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    style={{ minWidth: c.width ?? 130, ...(sticky ? { left: 0 } : {}) }}
                    className={`text-left font-semibold text-[var(--ax-fg-soft)] px-3 py-2.5 border-b border-[var(--ax-border)] cursor-pointer select-none whitespace-nowrap bg-[var(--ax-panel)] hover:text-[var(--ax-fg)] sticky top-0 z-10 ${sticky ? 'z-20 border-r border-[var(--ax-border)]' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {active && (sort!.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} onClick={() => setSelectedId(r.id)}
                className="cursor-pointer hover:bg-[var(--ax-hover)] border-b border-[var(--ax-border-soft)] group">
                {cols.map(c => {
                  const sticky = c.key === titleKey
                  return (
                    <td key={c.key}
                      style={sticky ? { left: 0 } : undefined}
                      className={`px-3 py-2 align-top text-[var(--ax-fg)] max-w-[320px] truncate ${sticky ? 'sticky left-0 z-10 bg-[var(--ax-bg)] group-hover:bg-[var(--ax-hover)] border-r border-[var(--ax-border-soft)] font-medium' : ''}`}>
                      {c.type === 'bool'
                        ? (r.fields[c.key] === true ? <Check size={15} className="text-emerald-500" /> : (r.fields[c.key] === false ? <X size={14} className="text-[var(--ax-fg-faint)]" /> : ''))
                        : cellText(c, r.fields[c.key])}
                    </td>
                  )
                })}
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-[var(--ax-fg-faint)]">Ничего не найдено</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-center gap-2 mt-3 text-[13px]">
        <button type="button" disabled={page === 0 || loading} onClick={() => go(page - 1, sort)}
          className="px-3 py-1.5 rounded-lg border border-[var(--ax-border)] disabled:opacity-40 hover:bg-[var(--ax-hover)]">←</button>
        <span className="text-[var(--ax-fg-muted)]">{page + 1} / {pageCount}</span>
        <button type="button" disabled={page >= pageCount - 1 || loading} onClick={() => go(page + 1, sort)}
          className="px-3 py-1.5 rounded-lg border border-[var(--ax-border)] disabled:opacity-40 hover:bg-[var(--ax-hover)]">→</button>
      </div>

      {selectedId && (
        <RecordPanel
          cfg={cfg}
          id={selectedId}
          title={selectedId === 'new' ? 'Новая запись' : titleOf(rows.find(r => r.id === selectedId) ?? { id: selectedId, fields: {} })}
          onClose={() => setSelectedId(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </div>
  )
}
