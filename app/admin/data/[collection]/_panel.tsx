'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { X, Save, Trash2, Loader2, AlertTriangle, Plus, Link2, Search, Sparkles } from 'lucide-react'
import type { CollectionConfig, FieldDef, RecordRow } from '@/lib/admin/adapters/types'
import { resolveRecordFields } from '@/lib/admin/fields'
import { hasAi } from '@/lib/admin/ai-fields'
import { PhotoManager } from './_photos'

// Slide-over record editor. Loads the full record (sql_jsonb stores only
// projected grid fields in the list), renders one editor per field by type,
// and POST/PATCH/DELETEs against /api/admin/data/[collection]/[id].
export function RecordPanel({
  cfg,
  id,
  title,
  onClose,
  onSaved,
  onDeleted,
}: {
  cfg: CollectionConfig
  id: string | 'new'
  title: string
  onClose: () => void
  onSaved: (row: RecordRow, isNew: boolean) => void
  onDeleted: (id: string) => void
}) {
  const isNew = id === 'new'
  const [fields, setFields] = useState<Record<string, unknown>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) return
    let alive = true
    setLoading(true)
    fetch(`/api/admin/data/${cfg.key}/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(j => { if (alive) { if (j.row) setFields(j.row.fields ?? {}); else setError(j.error ?? 'load_failed') } })
      .catch(() => { if (alive) setError('load_failed') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [cfg.key, id, isNew])

  const setField = useCallback((key: string, value: unknown) => {
    setFields(prev => ({ ...prev, [key]: value }))
    setDirty(prev => new Set(prev).add(key))
  }, [])

  const save = async () => {
    setSaving(true); setError(null)
    // PATCH sends only changed fields; create sends everything that's set.
    const payload: Record<string, unknown> = {}
    if (isNew) {
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined && v !== '') payload[k] = v
      }
    } else {
      for (const key of dirty) payload[key] = fields[key]
    }
    try {
      const url = isNew ? `/api/admin/data/${cfg.key}` : `/api/admin/data/${cfg.key}/${encodeURIComponent(id)}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fields: payload }),
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'save_failed'); setSaving(false); return }
      const rowId = isNew ? (j.row?.id ?? '') : id
      onSaved({ id: rowId, fields: { ...fields, ...payload } }, isNew)
    } catch {
      setError('network_error'); setSaving(false)
    }
  }

  const del = async () => {
    if (!confirm('Удалить запись безвозвратно?')) return
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/admin/data/${cfg.key}/${encodeURIComponent(id)}`, { method: 'DELETE' })
      const j = await res.json()
      if (!res.ok) { setError(j.error ?? 'delete_failed'); setSaving(false); return }
      onDeleted(id as string)
    } catch {
      setError('network_error'); setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:w-[480px] h-full bg-[var(--ax-bg)] border-l border-[var(--ax-border)] shadow-[0_0_40px_rgba(0,0,0,0.3)] flex flex-col">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-[var(--ax-border)] bg-[var(--ax-panel)]">
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-[var(--ax-fg)] truncate">{title}</div>
            <div className="text-[11px] text-[var(--ax-fg-faint)] font-mono truncate">{isNew ? 'new' : id}</div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--ax-hover)] text-[var(--ax-fg-soft)]"><X size={18} /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
          {loading ? (
            <div className="flex items-center gap-2 text-[13px] text-[var(--ax-fg-muted)]"><Loader2 size={15} className="animate-spin" /> Загрузка…</div>
          ) : (
            <>
              {resolveRecordFields(cfg, fields).map(f => (
                f.type === 'link' && f.link ? (
                  <LinkEditor
                    key={f.key}
                    f={f}
                    value={fields[f.key]}
                    nameHint={f.link.nameField ? fields[f.link.nameField] : undefined}
                    onPick={opt => {
                      const lk = f.link!
                      setField(f.key, opt ? (lk.store === 'name' ? opt.title : [opt.id]) : (lk.store === 'name' ? '' : []))
                      if (lk.nameField) setField(lk.nameField, opt ? opt.title : '')
                    }}
                  />
                ) : f.type === 'image' ? (
                  <ImageField key={f.key} f={f} collection={cfg.key} value={fields[f.key]} onChange={v => setField(f.key, v)} />
                ) : (
                  <FieldEditor key={f.key} f={f} value={fields[f.key]} onChange={v => setField(f.key, v)} collection={cfg.key} row={fields} />
                )
              ))}
              <AddField onAdd={(k, v) => setField(k, v)} existing={fields} />
              {cfg.photo && (
                isNew ? (
                  <div className="text-[12px] text-[var(--ax-fg-faint)] rounded-xl border border-dashed border-[var(--ax-border)] px-3 py-3">
                    Сохраните запись, затем добавьте фото.
                  </div>
                ) : (
                  <div className="pt-1.5 border-t border-[var(--ax-border-soft)]">
                    <PhotoManager cfg={cfg} id={id} />
                  </div>
                )
              )}
            </>
          )}
        </div>

        {error && (
          <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12.5px] text-[var(--ax-fg)]">
            <AlertTriangle size={14} className="text-red-500" /> {error}
          </div>
        )}

        <footer className="flex items-center gap-2 px-4 py-3 border-t border-[var(--ax-border)] bg-[var(--ax-panel)]">
          <button
            type="button"
            onClick={save}
            disabled={saving || loading || (!isNew && dirty.size === 0)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-40"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Сохранить
          </button>
          {!isNew && cfg.caps.delete && (
            <button type="button" onClick={del} disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] text-red-500 hover:bg-red-500/10 disabled:opacity-40 ml-auto">
              <Trash2 size={15} /> Удалить
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

function Label({ f }: { f: FieldDef }) {
  return (
    <label className="block text-[12px] font-medium text-[var(--ax-fg-soft)] mb-1">
      {f.label}
      {f.readOnly && <span className="ml-1.5 text-[10px] text-[var(--ax-fg-faint)]">read-only</span>}
    </label>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-xl text-[13px] bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[var(--ax-fg)] outline-none focus:border-[var(--color-primary)] disabled:opacity-60'

function FieldEditor({ f, value, onChange, collection, row }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; collection?: string; row?: Record<string, unknown> }) {
  if (f.type === 'bool') {
    return (
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={value === true} disabled={f.readOnly}
          onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
        <span className="text-[13px] text-[var(--ax-fg)]">{f.label}</span>
      </label>
    )
  }

  if (f.type === 'photos') {
    return (
      <div>
        <Label f={f} />
        <div className="text-[12px] text-[var(--ax-fg-faint)] rounded-xl border border-dashed border-[var(--ax-border)] px-3 py-3">
          Управление фото — в следующей фазе.
        </div>
      </div>
    )
  }

  if (f.type === 'json') {
    return (
      <div>
        <Label f={f} />
        <pre className="text-[11px] font-mono bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-xl p-2.5 overflow-x-auto max-h-40 text-[var(--ax-fg-soft)]">
          {value == null ? '—' : JSON.stringify(value, null, 2)}
        </pre>
      </div>
    )
  }

  const showAi = !f.readOnly && collection && (f.type === 'text' || f.type === 'longtext') && hasAi(f.key)
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <Label f={f} />
        {showAi && <AiCell field={f.key} collection={collection} row={row ?? {}} onResult={onChange} />}
      </div>
      {f.type === 'longtext' ? (
        <textarea rows={4} disabled={f.readOnly} value={asText(value)} onChange={e => onChange(e.target.value)} className={inputCls} />
      ) : f.type === 'enum' ? (
        <select disabled={f.readOnly} value={asText(value)} onChange={e => onChange(e.target.value)} className={inputCls}>
          <option value="">—</option>
          {(f.enumOptions ?? []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : f.type === 'number' ? (
        <input type="number" disabled={f.readOnly} value={value == null ? '' : String(value)}
          onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} className={inputCls} />
      ) : (
        <input type="text" disabled={f.readOnly} value={asText(value)} onChange={e => onChange(e.target.value)} className={inputCls} />
      )}
    </div>
  )
}

function asText(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

// "✨ AI" button: generates ideal content for this field via Azure using the
// rest of the record as context, then drops the result into the field.
function AiCell({ field, collection, row, onResult }: { field: string; collection: string; row: Record<string, unknown>; onResult: (v: unknown) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(false)
  const run = async () => {
    setBusy(true); setErr(false)
    try {
      const res = await fetch(`/api/admin/data/${collection}/ai`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ field, row }),
      })
      const j = await res.json()
      if (!res.ok || typeof j.text !== 'string') { setErr(true) } else onResult(j.text)
    } catch { setErr(true) } finally { setBusy(false) }
  }
  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      title="Сгенерировать через ИИ"
      className={`inline-flex items-center gap-1 px-2 py-1 mb-1 rounded-lg text-[11px] border transition-colors disabled:opacity-50 ${err ? 'border-red-500/50 text-red-500' : 'border-[var(--ax-border)] text-[var(--color-primary)] hover:bg-[var(--ax-hover)]'}`}
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
      {busy ? 'генерю…' : err ? 'ошибка' : 'ИИ'}
    </button>
  )
}

// Single-image field: thumbnail + upload (Supabase) + download + delete.
function ImageField({ f, collection, value, onChange }: { f: FieldDef; collection: string; value: unknown; onChange: (v: unknown) => void }) {
  const url = typeof value === 'string' && value ? value : ''
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setBusy(true); setErr(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch(`/api/admin/data/${collection}/upload`, { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok || !j.url) { setErr(j.error ?? 'upload_failed') } else onChange(j.url)
    } catch { setErr('upload_error') } finally { setBusy(false) }
  }

  return (
    <div>
      <Label f={f} />
      <div className="flex items-start gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover border border-[var(--ax-border)]" />
        ) : (
          <div className="h-20 w-20 rounded-lg border border-dashed border-[var(--ax-border)] flex items-center justify-center text-[11px] text-[var(--ax-fg-faint)]">нет фото</div>
        )}
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border border-[var(--ax-border)] hover:bg-[var(--ax-hover)] disabled:opacity-40">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} {url ? 'Заменить' : 'Загрузить'}
          </button>
          {url && (
            <>
              <a href={url} download target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border border-[var(--ax-border)] hover:bg-[var(--ax-hover)] no-underline text-[var(--ax-fg)]">Скачать</a>
              <button type="button" onClick={() => onChange('')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-red-500 hover:bg-red-500/10"><Trash2 size={13} /> Удалить</button>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const fl = e.target.files?.[0]; if (fl) upload(fl); e.target.value = '' }} />
        </div>
      </div>
      {err && <div className="mt-1 text-[12px] text-red-500">{err}</div>}
    </div>
  )
}

type LinkOption = { id: string; title: string }

// Airtable-style link picker: search records in another collection and pick one.
// Sets this field (id-array or name) + optional companion name field via onPick.
function LinkEditor({
  f, value, nameHint, onPick,
}: {
  f: FieldDef
  value: unknown
  nameHint: unknown
  onPick: (opt: LinkOption | null) => void
}) {
  const target = f.link!.collection
  const isName = f.link!.store === 'name'
  const currentId = isName ? '' : (Array.isArray(value) ? String(value[0] ?? '') : '')
  const hasValue = isName ? !!(value && String(value)) : !!currentId

  const [display, setDisplay] = useState<string>('')
  const [query, setQuery] = useState('')
  const [opts, setOpts] = useState<LinkOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Resolve current selection's name for display.
  useEffect(() => {
    if (isName) { setDisplay(value ? String(value) : ''); return }
    if (nameHint) { setDisplay(String(nameHint)); return }
    if (!currentId) { setDisplay(''); return }
    let alive = true
    fetch(`/api/admin/data/${target}/options?ids=${encodeURIComponent(currentId)}`)
      .then(r => r.json()).then(j => { if (alive) setDisplay(j.titles?.[currentId] ?? currentId) }).catch(() => {})
    return () => { alive = false }
  }, [target, currentId, nameHint, isName, value])

  // Debounced option search.
  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    const t = setTimeout(() => {
      fetch(`/api/admin/data/${target}/options?q=${encodeURIComponent(query)}`)
        .then(r => r.json()).then(j => { if (alive) setOpts(j.options ?? []) })
        .catch(() => {}).finally(() => { if (alive) setLoading(false) })
    }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [open, query, target])

  return (
    <div>
      <label className="block text-[12px] font-medium text-[var(--ax-fg-soft)] mb-1">
        <span className="inline-flex items-center gap-1"><Link2 size={12} /> {f.label}</span>
      </label>

      {hasValue && !open ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)]">
          <span className="flex-1 text-[13px] text-[var(--ax-fg)] truncate">{display || currentId || '—'}</span>
          <button type="button" onClick={() => setOpen(true)} className="text-[12px] text-[var(--color-primary)]">сменить</button>
          <button type="button" onClick={() => onPick(null)} className="text-[var(--ax-fg-faint)] hover:text-red-500"><X size={14} /></button>
        </div>
      ) : (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-fg-faint)]" />
          <input
            autoFocus={open}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Поиск записи…"
            className={`${inputCls} pl-9`}
          />
          {open && (
            <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-[var(--ax-border)] bg-[var(--ax-panel)] shadow-lg">
              {loading && <div className="px-3 py-2 text-[12px] text-[var(--ax-fg-faint)]">Загрузка…</div>}
              {!loading && opts.length === 0 && <div className="px-3 py-2 text-[12px] text-[var(--ax-fg-faint)]">Ничего не найдено</div>}
              {opts.map(o => (
                <button key={o.id} type="button"
                  onClick={() => { onPick(o); setOpen(false); setQuery('') }}
                  className="block w-full text-left px-3 py-2 text-[13px] text-[var(--ax-fg)] hover:bg-[var(--ax-hover)]">
                  {o.title}
                </button>
              ))}
              {hasValue && (
                <button type="button" onClick={() => setOpen(false)}
                  className="block w-full text-left px-3 py-2 text-[12px] text-[var(--ax-fg-faint)] border-t border-[var(--ax-border-soft)]">Отмена</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Add a brand-new field (Airtable "add column" parity, per record).
function AddField({ onAdd, existing }: { onAdd: (key: string, value: unknown) => void; existing: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState('')
  const [val, setVal] = useState('')
  const add = () => {
    const k = key.trim()
    if (!k || k in existing) { setKey(''); setVal(''); setOpen(false); return }
    onAdd(k, val)
    setKey(''); setVal(''); setOpen(false)
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] mt-1">
        <Plus size={13} /> Добавить поле
      </button>
    )
  }
  return (
    <div className="rounded-xl border border-[var(--ax-border)] p-2.5 space-y-2">
      <input autoFocus value={key} onChange={e => setKey(e.target.value)} placeholder="Имя поля (как в Airtable)"
        className={inputCls} />
      <input value={val} onChange={e => setVal(e.target.value)} placeholder="Значение"
        onKeyDown={e => { if (e.key === 'Enter') add() }} className={inputCls} />
      <div className="flex gap-2">
        <button type="button" onClick={add} className="px-3 py-1.5 rounded-lg text-[12px] bg-[var(--color-primary)] text-white">Добавить</button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-[12px] border border-[var(--ax-border)]">Отмена</button>
      </div>
    </div>
  )
}
