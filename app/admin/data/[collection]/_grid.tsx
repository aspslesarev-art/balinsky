'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, ArrowUp, ArrowDown, Search, Loader2, Maximize2, Link2, Filter, X, Sparkles } from 'lucide-react'
import type { CollectionConfig, FieldDef, RecordRow } from '@/lib/admin/adapters/types'
import { resolveFields, displayValue, editableText, coerceValue, isImageUrl } from '@/lib/admin/fields'
import { hasAi } from '@/lib/admin/ai-fields'
import { RecordPanel } from './_panel'

type SortState = { field: string; dir: 'asc' | 'desc' } | null
type EditCell = { rowId: string; key: string } | null
const PAGE_SIZE = 50

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
  const [filters, setFilters] = useState<{ key: string; value: string }[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)

  const [edit, setEdit] = useState<EditCell>(null)
  const [editText, setEditText] = useState('')

  // Photo thumbnails come from the Supabase Storage manifest (id → URL[]),
  // not the raw Airtable `photos` text field.
  const [photoMap, setPhotoMap] = useState<Record<string, string[]>>({})
  useEffect(() => {
    if (!cfg.photo) return
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = cfg.photo.manifestKey ?? '_manifest.json'
    fetch(`${base}/storage/v1/object/public/${cfg.photo.bucket}/${key}?t=${Date.now()}`)
      .then(r => (r.ok ? r.json() : {}))
      .then((m: unknown) => setPhotoMap(m && typeof m === 'object' ? (m as Record<string, string[]>) : {}))
      .catch(() => {})
  }, [cfg.photo])

  const seenKeys = useRef<Set<string>>(new Set())
  const [cols, setCols] = useState<FieldDef[]>(() => resolveFields(cfg, initialRows))
  const learnColumns = useCallback((rs: RecordRow[]) => {
    for (const r of rs) for (const k of Object.keys(r.fields)) seenKeys.current.add(k)
    const synthetic: RecordRow = { id: '_schema', fields: Object.fromEntries([...seenKeys.current].map(k => [k, ''])) }
    setCols(resolveFields(cfg, [...rs, synthetic]))
  }, [cfg])
  useEffect(() => { learnColumns(initialRows) }, [initialRows, learnColumns])

  const titleKey = cfg.titleField

  const fetchPage = useCallback(async (opts: { page: number; sort: SortState; q: string; filters: { key: string; value: string }[] }) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(opts.page), pageSize: String(PAGE_SIZE) })
    if (opts.sort) { params.set('sort', opts.sort.field); params.set('dir', opts.sort.dir) }
    if (opts.q.trim()) params.set('q', opts.q.trim())
    for (const f of opts.filters) if (f.key && f.value) params.set(`filter.${f.key}`, f.value)
    try {
      const res = await fetch(`/api/admin/data/${cfg.key}?${params}`)
      const j = await res.json()
      if (res.ok) { setRows(j.rows ?? []); setTotal(j.total ?? 0); learnColumns(j.rows ?? []) }
    } finally { setLoading(false) }
  }, [cfg.key, learnColumns])

  // Debounced reload when search or filters change.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    const t = setTimeout(() => { setPage(0); fetchPage({ page: 0, sort, q, filters }) }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filters])

  const go = (nextPage: number, nextSort: SortState) => { setPage(nextPage); setSort(nextSort); fetchPage({ page: nextPage, sort: nextSort, q, filters }) }
  const toggleSort = (field: string) => {
    let next: SortState
    if (!sort || sort.field !== field) next = { field, dir: 'asc' }
    else if (sort.dir === 'asc') next = { field, dir: 'desc' }
    else next = null
    go(0, next)
  }
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const refresh = useCallback(() => fetchPage({ page, sort, q, filters }), [fetchPage, page, sort, q, filters])

  // Persist a single field (or several, for links) on one row. Optimistic.
  const patchRow = useCallback(async (rowId: string, fieldsPatch: Record<string, unknown>) => {
    setRows(prev => prev.map(r => (r.id === rowId ? { ...r, fields: { ...r.fields, ...fieldsPatch } } : r)))
    try {
      const res = await fetch(`/api/admin/data/${cfg.key}/${encodeURIComponent(rowId)}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fields: fieldsPatch }),
      })
      if (!res.ok) refresh()
    } catch { refresh() }
  }, [cfg.key, refresh])

  // ── AI: fill the collection's title/SEO field via Azure ───────────
  const aiField = titleKey
  const aiOn = hasAi(aiField)
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null)

  const genRow = useCallback(async (rowId: string, fields: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/data/${cfg.key}/ai`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ field: aiField, row: fields }),
    })
    const j = await res.json().catch(() => null)
    if (res.ok && j && typeof j.text === 'string' && j.text) await patchRow(rowId, { [aiField]: j.text })
  }, [cfg.key, aiField, patchRow])

  // Bulk-fill only the empty cells on the current page. Sequential to keep
  // Azure spend controlled; capped to what's loaded (PAGE_SIZE).
  const genEmpty = useCallback(async () => {
    const targets = rows.filter(r => !editableText(r.fields[aiField]).trim())
    if (targets.length === 0) { alert('Пустых ячеек на этой странице нет.'); return }
    if (!confirm(`Сгенерировать «${aiField}» для ${targets.length} записей на этой странице? Это потратит Azure.`)) return
    setBulk({ done: 0, total: targets.length })
    for (let i = 0; i < targets.length; i++) {
      await genRow(targets[i].id, targets[i].fields)
      setBulk({ done: i + 1, total: targets.length })
    }
    setBulk(null)
  }, [rows, aiField, genRow])

  const startEdit = (r: RecordRow, c: FieldDef) => {
    if (c.readOnly || c.type === 'bool' || c.type === 'link' || c.type === 'image') return
    setEdit({ rowId: r.id, key: c.key }); setEditText(editableText(r.fields[c.key]))
  }
  const commitEdit = () => {
    if (!edit) return
    const c = cols.find(x => x.key === edit.key)
    const r = rows.find(x => x.id === edit.rowId)
    if (c && r) {
      const orig = r.fields[edit.key]
      const next = coerceValue(c, orig, editText)
      if (JSON.stringify(next) !== JSON.stringify(orig)) patchRow(edit.rowId, { [edit.key]: next })
    }
    setEdit(null)
  }

  const onSaved = useCallback(() => { setSelectedId(null); refresh() }, [refresh])
  const onDeleted = useCallback(() => { setSelectedId(null); refresh() }, [refresh])

  return (
    <div>
      {/* toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1 max-w-[360px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-fg-faint)]" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder={`Поиск по «${cfg.fields.find(f => f.key === titleKey)?.label ?? titleKey}»…`}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] outline-none focus:border-[var(--color-primary)]" />
        </div>
        <button type="button" onClick={() => setShowFilters(v => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] border ${filters.length ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-[var(--ax-border)] text-[var(--ax-fg-soft)]'} hover:bg-[var(--ax-hover)]`}>
          <Filter size={14} /> Фильтры{filters.length ? ` (${filters.length})` : ''}
        </button>
        {loading && <Loader2 size={15} className="animate-spin text-[var(--ax-fg-faint)]" />}
        <div className="text-[12px] text-[var(--ax-fg-faint)]">{total} записей · {cols.length} полей</div>
        <div className="flex-1" />
        {aiOn && (
          <button type="button" onClick={genEmpty} disabled={!!bulk}
            title={`Сгенерировать «${aiField}» для пустых записей на этой странице через ИИ`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--ax-hover)] disabled:opacity-50">
            {bulk ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {bulk ? `Генерю ${bulk.done}/${bulk.total}…` : 'Заполнить SEO'}
          </button>
        )}
        {cfg.caps.create && (
          <button type="button" onClick={() => setSelectedId('new')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium bg-[var(--color-primary)] text-white hover:opacity-90">
            <Plus size={15} /> Создать
          </button>
        )}
      </div>

      {showFilters && (
        <FilterPanel cols={cols} filters={filters} setFilters={setFilters} />
      )}

      <div className="overflow-auto rounded-2xl border border-[var(--ax-border)] h-[calc(100vh-200px)]">
        <table className="border-collapse text-[13px] w-max min-w-full">
          <thead>
            <tr className="bg-[var(--ax-panel)]">
              <th className="sticky top-0 left-0 z-30 w-9 bg-[var(--ax-panel)] border-b border-r border-[var(--ax-border)]" />
              {cfg.photo && (
                <th className="sticky top-0 z-10 text-left font-semibold text-[var(--ax-fg-soft)] px-3 py-2.5 border-b border-r border-[var(--ax-border)] bg-[var(--ax-panel)] whitespace-nowrap" style={{ minWidth: 130 }}>Фото</th>
              )}
              {cols.map(c => {
                const active = sort?.field === c.key
                const sticky = c.key === titleKey
                return (
                  <th key={c.key} onClick={() => toggleSort(c.key)}
                    style={{ minWidth: c.width ?? 130, ...(sticky ? { left: 36 } : {}) }}
                    className={`text-left font-semibold text-[var(--ax-fg-soft)] px-3 py-2.5 border-b border-[var(--ax-border)] cursor-pointer select-none whitespace-nowrap bg-[var(--ax-panel)] hover:text-[var(--ax-fg)] sticky top-0 z-10 ${sticky ? 'z-20 border-r border-[var(--ax-border)]' : ''}`}>
                    <span className="inline-flex items-center gap-1">
                      {c.type === 'link' && <Link2 size={11} className="text-[var(--ax-fg-faint)]" />}
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
              <tr key={r.id} className="border-b border-[var(--ax-border-soft)] group">
                {/* expand → full card (photos / everything) */}
                <td className="sticky left-0 z-10 w-9 bg-[var(--ax-bg)] group-hover:bg-[var(--ax-hover)] border-r border-[var(--ax-border-soft)] text-center align-middle">
                  <button type="button" onClick={() => setSelectedId(r.id)} title="Открыть карточку"
                    className="p-1 text-[var(--ax-fg-faint)] hover:text-[var(--color-primary)]"><Maximize2 size={13} /></button>
                </td>
                {cfg.photo && (
                  <td className="px-2 py-1.5 border-r border-[var(--ax-border-soft)]/50 align-middle" onClick={() => setSelectedId(r.id)}>
                    <PhotoThumbs urls={photoMap[r.id] ?? []} />
                  </td>
                )}
                {cols.map(c => {
                  const sticky = c.key === titleKey
                  const isEditing = edit?.rowId === r.id && edit?.key === c.key
                  const base = `px-2 py-1.5 align-top text-[var(--ax-fg)] border-r border-[var(--ax-border-soft)]/50 ${sticky ? 'sticky left-9 z-10 bg-[var(--ax-bg)] group-hover:bg-[var(--ax-hover)] border-r border-[var(--ax-border-soft)] font-medium' : ''}`
                  // bool — toggle in place
                  if (c.type === 'bool') {
                    return (
                      <td key={c.key} style={sticky ? { left: 36 } : undefined} className={base}>
                        <input type="checkbox" disabled={c.readOnly} checked={r.fields[c.key] === true}
                          onChange={e => patchRow(r.id, { [c.key]: e.target.checked })}
                          className="w-4 h-4 accent-[var(--color-primary)] cursor-pointer" />
                      </td>
                    )
                  }
                  // link — inline picker
                  if (c.type === 'link' && c.link) {
                    return (
                      <td key={c.key} style={sticky ? { left: 36 } : undefined} className={`${base} min-w-[160px]`}>
                        <InlineLink cfg={cfg} field={c} row={r}
                          onPick={opt => {
                            const lk = c.link!
                            const p: Record<string, unknown> = { [c.key]: opt ? (lk.store === 'name' ? opt.title : [opt.id]) : (lk.store === 'name' ? '' : []) }
                            if (lk.nameField) p[lk.nameField] = opt ? opt.title : ''
                            patchRow(r.id, p)
                          }} />
                      </td>
                    )
                  }
                  // editing this cell
                  if (isEditing) {
                    return (
                      <td key={c.key} style={sticky ? { left: 36 } : undefined} className={`${base} p-0`}>
                        {c.type === 'enum' ? (
                          <select autoFocus value={editText} onChange={e => setEditText(e.target.value)} onBlur={commitEdit}
                            className="w-full px-2 py-1.5 text-[13px] bg-[var(--ax-input-bg)] border-2 border-[var(--color-primary)] outline-none">
                            <option value="">—</option>
                            {(c.enumOptions ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input autoFocus type={c.type === 'number' ? 'number' : 'text'} value={editText}
                            onChange={e => setEditText(e.target.value)} onBlur={commitEdit}
                            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEdit(null) }}
                            className="w-full px-2 py-1.5 text-[13px] bg-[var(--ax-input-bg)] border-2 border-[var(--color-primary)] outline-none" />
                        )}
                      </td>
                    )
                  }
                  // image-URL value → thumbnail (click opens the card to manage the file)
                  if (c.type === 'image' || isImageUrl(r.fields[c.key])) {
                    return (
                      <td key={c.key} style={sticky ? { left: 36 } : undefined} className={`${base} cursor-pointer`} onClick={() => setSelectedId(r.id)}>
                        {isImageUrl(r.fields[c.key])
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={String(r.fields[c.key])} alt="" className="h-9 w-9 rounded object-cover border border-[var(--ax-border)]" />
                          : <span className="text-[var(--ax-fg-faint)] text-[11px]">—</span>}
                      </td>
                    )
                  }
                  // display
                  const display = (c.type === 'link' && c.link?.store === 'id-array' && c.link.nameField)
                    ? displayValue(r.fields[c.link.nameField] ?? r.fields[c.key])
                    : displayValue(r.fields[c.key])
                  return (
                    <td key={c.key} style={sticky ? { left: 36 } : undefined}
                      onClick={() => startEdit(r, c)}
                      className={`${base} max-w-[340px] truncate ${c.readOnly ? '' : 'cursor-text hover:bg-[var(--ax-hover)]/60'}`}
                      title={display}>
                      {display}
                    </td>
                  )
                })}
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={cols.length + 1 + (cfg.photo ? 1 : 0)} className="px-3 py-8 text-center text-[var(--ax-fg-faint)]">Ничего не найдено</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-2 mt-3 text-[13px]">
        <button type="button" disabled={page === 0 || loading} onClick={() => go(page - 1, sort)}
          className="px-3 py-1.5 rounded-lg border border-[var(--ax-border)] disabled:opacity-40 hover:bg-[var(--ax-hover)]">←</button>
        <span className="text-[var(--ax-fg-muted)]">{page + 1} / {pageCount}</span>
        <button type="button" disabled={page >= pageCount - 1 || loading} onClick={() => go(page + 1, sort)}
          className="px-3 py-1.5 rounded-lg border border-[var(--ax-border)] disabled:opacity-40 hover:bg-[var(--ax-hover)]">→</button>
      </div>

      {selectedId && (
        <RecordPanel cfg={cfg} id={selectedId}
          title={selectedId === 'new' ? 'Новая запись' : displayValue(rows.find(r => r.id === selectedId)?.fields[titleKey]) || String(selectedId)}
          onClose={() => setSelectedId(null)} onSaved={onSaved} onDeleted={onDeleted} />
      )}
    </div>
  )
}

// Row photo preview — up to 3 Supabase thumbnails + count.
function PhotoThumbs({ urls }: { urls: string[] }) {
  if (!urls.length) return <span className="text-[var(--ax-fg-faint)] text-[11px]">—</span>
  return (
    <div className="flex items-center gap-1 cursor-pointer">
      {urls.slice(0, 3).map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={u} alt="" className="h-9 w-9 rounded object-cover border border-[var(--ax-border)]" />
      ))}
      {urls.length > 3 && <span className="text-[11px] text-[var(--ax-fg-faint)]">+{urls.length - 3}</span>}
    </div>
  )
}

// Airtable-style filter bar: add column filters (AND-ed, contains-match).
function FilterPanel({ cols, filters, setFilters }: {
  cols: FieldDef[]
  filters: { key: string; value: string }[]
  setFilters: (f: { key: string; value: string }[]) => void
}) {
  const update = (i: number, patch: Partial<{ key: string; value: string }>) =>
    setFilters(filters.map((f, k) => (k === i ? { ...f, ...patch } : f)))
  const remove = (i: number) => setFilters(filters.filter((_, k) => k !== i))
  const add = () => setFilters([...filters, { key: cols.find(c => c.showInGrid)?.key ?? cols[0]?.key ?? '', value: '' }])

  return (
    <div className="mb-3 rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] p-3 space-y-2">
      {filters.length === 0 && <div className="text-[12px] text-[var(--ax-fg-faint)]">Фильтров нет. Добавьте условие по любому столбцу.</div>}
      {filters.map((f, i) => {
        const col = cols.find(c => c.key === f.key)
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--ax-fg-faint)] w-10">{i === 0 ? 'где' : 'и'}</span>
            <select value={f.key} onChange={e => update(i, { key: e.target.value })}
              className="px-2 py-1.5 rounded-lg text-[12.5px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] outline-none max-w-[200px]">
              {cols.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            {col?.type === 'enum' ? (
              <select value={f.value} onChange={e => update(i, { value: e.target.value })}
                className="flex-1 px-2 py-1.5 rounded-lg text-[12.5px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] outline-none">
                <option value="">— любое —</option>
                {(col.enumOptions ?? []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : col?.type === 'bool' ? (
              <select value={f.value} onChange={e => update(i, { value: e.target.value })}
                className="flex-1 px-2 py-1.5 rounded-lg text-[12.5px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] outline-none">
                <option value="">— любое —</option>
                <option value="true">Да</option>
                <option value="false">Нет</option>
              </select>
            ) : (
              <input value={f.value} onChange={e => update(i, { value: e.target.value })} placeholder="содержит…"
                className="flex-1 px-2 py-1.5 rounded-lg text-[12.5px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] outline-none" />
            )}
            <button type="button" onClick={() => remove(i)} className="p-1 text-[var(--ax-fg-faint)] hover:text-red-500"><X size={15} /></button>
          </div>
        )
      })}
      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={add} className="inline-flex items-center gap-1 text-[12.5px] text-[var(--color-primary)]"><Plus size={13} /> Добавить фильтр</button>
        {filters.length > 0 && <button type="button" onClick={() => setFilters([])} className="text-[12px] text-[var(--ax-fg-faint)] hover:text-red-500">очистить все</button>}
      </div>
    </div>
  )
}

// Compact inline link picker used directly inside a grid cell.
type LinkOption = { id: string; title: string }
function InlineLink({ field, row, onPick }: { cfg: CollectionConfig; field: FieldDef; row: RecordRow; onPick: (o: LinkOption | null) => void }) {
  const lk = field.link!
  const isName = lk.store === 'name'
  const cur = isName ? (row.fields[field.key] ? String(row.fields[field.key]) : '') : (lk.nameField ? displayValue(row.fields[lk.nameField]) : '')
  const curId = !isName && Array.isArray(row.fields[field.key]) ? String((row.fields[field.key] as unknown[])[0] ?? '') : ''
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [opts, setOpts] = useState<LinkOption[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(cur)

  useEffect(() => { setName(cur) }, [cur])
  // Resolve name from id when no companion name is present.
  useEffect(() => {
    if (isName || cur || !curId) return
    let alive = true
    fetch(`/api/admin/data/${lk.collection}/options?ids=${encodeURIComponent(curId)}`)
      .then(r => r.json()).then(j => { if (alive) setName(j.titles?.[curId] ?? curId) }).catch(() => {})
    return () => { alive = false }
  }, [isName, cur, curId, lk.collection])

  useEffect(() => {
    if (!open) return
    let alive = true; setLoading(true)
    const t = setTimeout(() => {
      fetch(`/api/admin/data/${lk.collection}/options?q=${encodeURIComponent(query)}`)
        .then(r => r.json()).then(j => { if (alive) setOpts(j.options ?? []) }).catch(() => {}).finally(() => { if (alive) setLoading(false) })
    }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [open, query, lk.collection])

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full text-left text-[13px] text-[var(--ax-fg)] hover:bg-[var(--ax-hover)]/60 rounded px-1 py-0.5 truncate">
        {name || <span className="text-[var(--ax-fg-faint)]">— выбрать —</span>}
      </button>
    )
  }
  return (
    <div className="relative">
      <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="поиск…"
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full px-2 py-1.5 text-[13px] bg-[var(--ax-input-bg)] border-2 border-[var(--color-primary)] outline-none rounded" />
      <div className="absolute z-30 mt-1 w-[240px] max-h-56 overflow-y-auto rounded-xl border border-[var(--ax-border)] bg-[var(--ax-panel)] shadow-lg">
        {loading && <div className="px-3 py-2 text-[12px] text-[var(--ax-fg-faint)]">Загрузка…</div>}
        {!loading && opts.length === 0 && <div className="px-3 py-2 text-[12px] text-[var(--ax-fg-faint)]">Ничего не найдено</div>}
        {(name || curId) && (
          <button type="button" onMouseDown={e => { e.preventDefault(); onPick(null); setOpen(false) }}
            className="block w-full text-left px-3 py-1.5 text-[12px] text-red-500 hover:bg-[var(--ax-hover)] border-b border-[var(--ax-border-soft)]">× очистить</button>
        )}
        {opts.map(o => (
          <button key={o.id} type="button" onMouseDown={e => { e.preventDefault(); onPick(o); setOpen(false); setQuery('') }}
            className="block w-full text-left px-3 py-1.5 text-[13px] text-[var(--ax-fg)] hover:bg-[var(--ax-hover)]">{o.title}</button>
        ))}
      </div>
    </div>
  )
}
