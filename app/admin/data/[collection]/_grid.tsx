'use client'

import { useMemo, useState, useCallback } from 'react'
import Fuse from 'fuse.js'
import { Plus, ArrowUp, ArrowDown, Search, Check, X } from 'lucide-react'
import type { CollectionConfig, FieldDef, RecordRow } from '@/lib/admin/adapters/types'
import { RecordPanel } from './_panel'

type SortState = { field: string; dir: 'asc' | 'desc' } | null
const PAGE_SIZE = 50

function gridCols(cfg: CollectionConfig): FieldDef[] {
  return cfg.fields.filter(f => f.showInGrid && f.type !== 'photos')
}

function cellText(f: FieldDef, v: unknown): string {
  if (v == null || v === '') return ''
  if (f.type === 'bool') return v === true ? '✓' : ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function DataGridScreen({
  cfg,
  initialRows,
  total,
}: {
  cfg: CollectionConfig
  initialRows: RecordRow[]
  total: number
}) {
  const cols = useMemo(() => gridCols(cfg), [cfg])
  const [rows, setRows] = useState<RecordRow[]>(initialRows)
  const [sort, setSort] = useState<SortState>(cfg.defaultSort ?? null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)

  // Fuzzy search over the loaded rows (instant, client-side).
  const fuse = useMemo(() => {
    const docs = rows.map(r => ({ id: r.id, text: cols.map(c => cellText(c, r.fields[c.key])).join(' ') }))
    return new Fuse(docs, { keys: ['text'], threshold: 0.35, ignoreLocation: true })
  }, [rows, cols])

  const filtered = useMemo(() => {
    if (!q.trim()) return rows
    const ids = new Set(fuse.search(q.trim()).map(r => r.item.id))
    return rows.filter(r => ids.has(r.id))
  }, [q, rows, fuse])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const def = cols.find(c => c.key === sort.field) ?? cfg.fields.find(c => c.key === sort.field)
    const numeric = def?.type === 'number'
    const mul = sort.dir === 'desc' ? -1 : 1
    const empty = (v: unknown) => v == null || v === ''
    return [...filtered].sort((a, b) => {
      const av = a.fields[sort.field], bv = b.fields[sort.field]
      const ae = empty(av), be = empty(bv)
      if (ae && be) return 0
      if (ae) return 1 // empties always last
      if (be) return -1
      if (numeric) return (Number(av) - Number(bv)) * mul
      return String(av).localeCompare(String(bv), 'ru') * mul
    })
  }, [filtered, sort, cols, cfg.fields])

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const toggleSort = useCallback((field: string) => {
    setSort(prev => {
      if (!prev || prev.field !== field) return { field, dir: 'asc' }
      if (prev.dir === 'asc') return { field, dir: 'desc' }
      return null
    })
  }, [])

  // --- mutation callbacks (optimistic) ---
  const onSaved = useCallback((row: RecordRow, isNew: boolean) => {
    setRows(prev => isNew ? [row, ...prev] : prev.map(r => (r.id === row.id ? { ...r, fields: { ...r.fields, ...row.fields } } : r)))
    setSelectedId(null)
  }, [])

  const onDeleted = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
    setSelectedId(null)
  }, [])

  const titleOf = (r: RecordRow) => cellText(cfg.fields.find(f => f.key === cfg.titleField) ?? cols[0], r.fields[cfg.titleField]) || r.id

  return (
    <div>
      {/* toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-[360px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-fg-faint)]" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(0) }}
            placeholder="Поиск…"
            className="w-full pl-9 pr-3 py-2 rounded-xl text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <div className="text-[12px] text-[var(--ax-fg-faint)] ml-1">{sorted.length} из {rows.length}</div>
        <div className="flex-1" />
        {cfg.caps.create && (
          <button
            type="button"
            onClick={() => setSelectedId('new')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium bg-[var(--color-primary)] text-white hover:opacity-90"
          >
            <Plus size={15} /> Создать
          </button>
        )}
      </div>

      {/* grid */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--ax-border)]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-[var(--ax-panel)]">
              {cols.map(c => {
                const active = sort?.field === c.key
                return (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    style={{ minWidth: c.width ?? 120 }}
                    className="sticky top-0 z-10 text-left font-semibold text-[var(--ax-fg-soft)] px-3 py-2.5 border-b border-[var(--ax-border)] cursor-pointer select-none whitespace-nowrap bg-[var(--ax-panel)] hover:text-[var(--ax-fg)]"
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
            {pageRows.map(r => (
              <tr
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className="cursor-pointer hover:bg-[var(--ax-hover)] border-b border-[var(--ax-border-soft)]"
              >
                {cols.map(c => (
                  <td key={c.key} className="px-3 py-2 align-top text-[var(--ax-fg)] max-w-[320px] truncate">
                    {c.type === 'bool'
                      ? (r.fields[c.key] === true ? <Check size={15} className="text-emerald-500" /> : <X size={14} className="text-[var(--ax-fg-faint)]" />)
                      : cellText(c, r.fields[c.key])}
                  </td>
                ))}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-[var(--ax-fg-faint)]">Ничего не найдено</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3 text-[13px]">
          <button type="button" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
            className="px-3 py-1.5 rounded-lg border border-[var(--ax-border)] disabled:opacity-40 hover:bg-[var(--ax-hover)]">←</button>
          <span className="text-[var(--ax-fg-muted)]">{page + 1} / {pageCount}</span>
          <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
            className="px-3 py-1.5 rounded-lg border border-[var(--ax-border)] disabled:opacity-40 hover:bg-[var(--ax-hover)]">→</button>
        </div>
      )}

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
