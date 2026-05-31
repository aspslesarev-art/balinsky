'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, Save, Trash2, Loader2, AlertTriangle, Plus } from 'lucide-react'
import type { CollectionConfig, FieldDef, RecordRow } from '@/lib/admin/adapters/types'
import { resolveRecordFields } from '@/lib/admin/fields'
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
                <FieldEditor key={f.key} f={f} value={fields[f.key]} onChange={v => setField(f.key, v)} />
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

function FieldEditor({ f, value, onChange }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
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

  return (
    <div>
      <Label f={f} />
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
