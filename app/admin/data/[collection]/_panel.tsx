'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { X, Save, Trash2, Loader2, AlertTriangle, Plus, Link2, Search } from 'lucide-react'
import type { CollectionConfig, FieldDef, FieldType, RecordRow } from '@/lib/admin/adapters/types'
import { resolveRecordFields, percentToInput, inputToPercent, linkPatch, linkSelection, type LinkOption } from '@/lib/admin/fields'
import { toBaliInput, fromBaliInput } from '@/lib/datetime'
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
  typeHints,
}: {
  cfg: CollectionConfig
  id: string | 'new'
  title: string
  onClose: () => void
  onSaved: (row: RecordRow, isNew: boolean) => void
  onDeleted: (id: string) => void
  /** Types the grid worked out from a whole page of records — a single
   *  record can't reveal that a column repeats only a few values. */
  typeHints?: Record<string, FieldType>
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
              {resolveRecordFields(cfg, fields, typeHints).map(f => (
                f.type === 'link' && f.link ? (
                  <LinkEditor
                    key={f.key}
                    f={f}
                    selection={linkSelection(f, fields)}
                    nameHint={f.link.nameField ? fields[f.link.nameField] : undefined}
                    onChange={next => {
                      for (const [k, v] of Object.entries(linkPatch(f, next))) setField(k, v)
                    }}
                  />
                ) : f.type === 'image' ? (
                  <ImageField key={f.key} f={f} collection={cfg.key} value={fields[f.key]} onChange={v => setField(f.key, v)} />
                ) : (
                  <FieldEditor key={f.key} f={f} value={fields[f.key]} onChange={v => setField(f.key, v)} collection={cfg.key} />
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

function FieldEditor({ f, value, onChange, collection }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; collection?: string; row?: Record<string, unknown> }) {
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
    if (f.readOnly) {
      return (
        <div>
          <Label f={f} />
          <pre className="text-[11px] font-mono bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-xl p-2.5 overflow-x-auto max-h-40 text-[var(--ax-fg-soft)]">
            {value == null ? '—' : JSON.stringify(value, null, 2)}
          </pre>
        </div>
      )
    }
    return <JsonField f={f} value={value} onChange={onChange} />
  }

  if ((f.type === 'enum' || f.type === 'multienum') && !f.readOnly && collection) {
    return <ChoiceField f={f} collection={collection} value={value} onChange={onChange} />
  }

  if (f.type === 'percent' && !f.readOnly) {
    return (
      <div>
        <Label f={f} />
        <div className="relative">
          <input
            type="number" min={0} max={100} step={1}
            value={percentToInput(value)}
            onChange={e => onChange(e.target.value === '' ? null : inputToPercent(e.target.value))}
            className={inputCls}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--ax-fg-faint)]">%</span>
        </div>
      </div>
    )
  }

  if (f.type === 'date' && !f.readOnly) {
    return <DateField f={f} value={value} onChange={onChange} />
  }

  // The per-field "✨ AI" button is gone: every AI-backed field is now filled
  // automatically on save (lib/admin/ai-autofill.ts), so the click was busywork.
  // Autofill only ever writes into EMPTY fields, so to regenerate one, clear it
  // and save — the next save fills it again.
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <Label f={f} />
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

// Editable structured value (arrays of tags or {name, slug} pairs — videos
// attach to developers and complexes that way). Typing JSON goes through an
// invalid intermediate state on nearly every keystroke, so the textarea keeps
// its own text and only pushes up once it parses.
function JsonField({ f, value, onChange }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const [text, setText] = useState(() => (value == null ? '' : JSON.stringify(value, null, 2)))
  const [invalid, setInvalid] = useState(false)

  function edit(next: string) {
    setText(next)
    if (next.trim() === '') {
      setInvalid(false)
      onChange(null)
      return
    }
    try {
      onChange(JSON.parse(next))
      setInvalid(false)
    } catch {
      setInvalid(true)
    }
  }

  return (
    <div>
      <Label f={f} />
      <textarea
        rows={4}
        value={text}
        onChange={e => edit(e.target.value)}
        spellCheck={false}
        className={`w-full rounded-xl border px-3 py-2 text-[12px] font-mono bg-[var(--ax-panel)] text-[var(--ax-fg)] ${invalid ? 'border-red-500' : 'border-[var(--ax-border)]'}`}
      />
      {invalid && <div className="mt-1 text-[11px] text-red-500">Невалидный JSON — правка не сохранится, пока не исправите</div>}
    </div>
  )
}


// Choices come from the column itself unless the config pins them, so a new
// status an editor invents shows up for everyone next time. Typing a value
// that isn't on the list is still allowed — the list is a shortcut, not a
// constraint.
function useFieldValues(collection: string, f: FieldDef): { values: string[]; loading: boolean } {
  const [values, setValues] = useState<string[]>(f.enumOptions ?? [])
  const [loading, setLoading] = useState(!f.enumOptions)

  useEffect(() => {
    if (f.enumOptions) return
    let alive = true
    setLoading(true)
    fetch(`/api/admin/data/${collection}/values?field=${encodeURIComponent(f.key)}`)
      .then(r => r.ok ? r.json() : { values: [] })
      .then((j: { values?: string[] }) => { if (alive) setValues(j.values ?? []) })
      .catch(() => { if (alive) setValues([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [collection, f.key, f.enumOptions])

  return { values, loading }
}

function asStringList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean)
  if (typeof v === 'string') return v.split(',').map(x => x.trim()).filter(Boolean)
  if (v == null) return []
  return [String(v)]
}

function ChoiceField({ f, collection, value, onChange }: { f: FieldDef; collection: string; value: unknown; onChange: (v: unknown) => void }) {
  const { values, loading } = useFieldValues(collection, f)
  const [custom, setCustom] = useState('')
  const multi = f.type === 'multienum'
  const selected = multi ? asStringList(value) : []
  const single = multi ? '' : asText(value)

  // Whatever this record already holds belongs in the list even if no other
  // record uses it — otherwise opening the panel would silently drop it.
  const options = [...new Set([...(multi ? selected : single ? [single] : []), ...values])]

  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
  }

  function addCustom() {
    const v = custom.trim()
    if (!v) return
    if (multi) { if (!selected.includes(v)) onChange([...selected, v]) }
    else onChange(v)
    setCustom('')
  }

  return (
    <div>
      <Label f={f} />
      {multi ? (
        <div className="rounded-xl border border-[var(--ax-border)] bg-[var(--ax-panel)] px-3 py-2">
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selected.map(v => (
                <button key={v} type="button" onClick={() => toggle(v)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--ax-accent-soft,rgba(59,130,246,0.14))] text-[var(--ax-fg)] px-2 py-0.5 text-[12px]">
                  {v}<span className="opacity-60">×</span>
                </button>
              ))}
            </div>
          )}
          <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
            {loading && <div className="text-[12px] text-[var(--ax-fg-faint)]">Загружаю варианты…</div>}
            {options.filter(v => !selected.includes(v)).map(v => (
              <button key={v} type="button" onClick={() => toggle(v)}
                className="text-left text-[13px] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)] px-1 py-0.5 rounded">
                + {v}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <select
          value={single}
          onChange={e => onChange(e.target.value || null)}
          className="w-full rounded-xl border border-[var(--ax-border)] bg-[var(--ax-panel)] text-[var(--ax-fg)] px-3 py-2 text-[13px]"
        >
          <option value="">—</option>
          {options.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      )}
      <div className="mt-1.5 flex gap-1.5">
        <input
          type="text"
          value={custom}
          placeholder={loading ? 'Загружаю варианты…' : 'Свой вариант'}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          className="flex-1 rounded-xl border border-[var(--ax-border)] bg-[var(--ax-panel)] text-[var(--ax-fg)] px-3 py-1.5 text-[12px]"
        />
        <button type="button" onClick={addCustom}
          className="rounded-xl border border-[var(--ax-border)] px-3 py-1.5 text-[12px] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)]">
          Добавить
        </button>
      </div>
    </div>
  )
}

// Dates arrive in several shapes across the tables (ISO timestamps from the
// manifests, plain YYYY-MM-DD elsewhere). The picker edits the date part and
// keeps the original time when there was one, so saving a date doesn't
// silently reset a timestamp to midnight.
function DateField({ f, value, onChange }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const raw = asText(value)
  const hasTime = /\d{2}:\d{2}/.test(raw)
  const datePart = raw.slice(0, 10)

  function edit(next: string) {
    if (!next) { onChange(null); return }
    onChange(hasTime ? next + raw.slice(10) : next)
  }

  // Fields flagged withTime (event start/end) take a time too, and it is Bali
  // wall-clock: an event starts at 18:00 on Bali regardless of where the editor
  // sits. Stored with the +08:00 offset so the site's LocalDateTime can show
  // Bali time to everyone and the visitor's own time to those elsewhere.
  if (f.withTime) {
    return (
      <div>
        <Label f={f} />
        <input
          type="datetime-local"
          value={toBaliInput(raw)}
          onChange={e => onChange(fromBaliInput(e.target.value))}
          className="w-full rounded-xl border border-[var(--ax-border)] bg-[var(--ax-panel)] text-[var(--ax-fg)] px-3 py-2 text-[13px]"
        />
        <div className="mt-1 text-[11px] text-[var(--ax-fg-faint)]">
          Время балийское (WITA, UTC+8){raw ? ` · сохранено: ${raw}` : ''}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Label f={f} />
      <input
        type="date"
        value={/^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : ''}
        onChange={e => edit(e.target.value)}
        className="w-full rounded-xl border border-[var(--ax-border)] bg-[var(--ax-panel)] text-[var(--ax-fg)] px-3 py-2 text-[13px]"
      />
      {raw && !/^\d{4}-\d{2}-\d{2}/.test(raw) && (
        <div className="mt-1 text-[11px] text-[var(--ax-fg-faint)]">Текущее значение: {raw}</div>
      )}
    </div>
  )
}

function asText(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
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

// Airtable-style link picker: search records in another collection and pick
// one — or several, when the link is `multi`. Reports the whole new selection,
// which the caller turns into a patch via linkPatch().
function LinkEditor({
  f, selection, nameHint, onChange,
}: {
  f: FieldDef
  selection: LinkOption[]
  nameHint: unknown
  onChange: (opts: LinkOption[]) => void
}) {
  const link = f.link!
  const target = link.collection
  const multi = !!link.multi
  // 'name', 'name-slug' and 'name-array' carry the name inline — only
  // 'id-array' needs a lookup round-trip to show what is currently selected.
  const byId = link.store === 'id-array'
  const selectedIds = selection.map(o => o.id).join(',')

  const [titles, setTitles] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [opts, setOpts] = useState<LinkOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Resolve ids → names for 'id-array' picks (one request for the whole set).
  useEffect(() => {
    if (!byId) return
    const missing = selectedIds.split(',').filter(id => id && !titles[id])
    if (missing.length === 0) return
    if (!multi && nameHint) { setTitles(prev => ({ ...prev, [missing[0]]: String(nameHint) })); return }
    let alive = true
    fetch(`/api/admin/data/${target}/options?ids=${encodeURIComponent(missing.join(','))}`)
      .then(r => r.json())
      .then(j => { if (alive) setTitles(prev => ({ ...prev, ...(j.titles ?? {}) })) })
      .catch(() => {})
    return () => { alive = false }
  }, [byId, multi, nameHint, target, selectedIds, titles])

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

  const nameOf = (o: LinkOption) => o.title || titles[o.id] || o.id
  const picked = new Set(selection.map(o => o.id))
  const choices = multi ? opts.filter(o => !picked.has(o.id)) : opts
  const add = (o: LinkOption) => {
    onChange(multi ? [...selection, o] : [o])
    // Multi stays open so several records can be added in a row; the picked
    // one drops out of `choices` on the next render.
    setOpen(multi); setQuery('')
  }
  // A multi link always shows its search box; a single one hides it behind the
  // current value until "сменить" is pressed.
  const showSearch = multi || open || selection.length === 0

  return (
    <div>
      <label className="block text-[12px] font-medium text-[var(--ax-fg-soft)] mb-1">
        <span className="inline-flex items-center gap-1"><Link2 size={12} /> {f.label}</span>
      </label>

      {multi && selection.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {selection.map(o => (
            <span key={o.id}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] text-[12px] text-[var(--ax-fg)]">
              {nameOf(o)}
              <button type="button" title="Убрать"
                onClick={() => onChange(selection.filter(s => s.id !== o.id))}
                className="text-[var(--ax-fg-faint)] hover:text-red-500"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      {!multi && selection.length > 0 && !open && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)]">
          <span className="flex-1 text-[13px] text-[var(--ax-fg)] truncate">{nameOf(selection[0]) || '—'}</span>
          <button type="button" onClick={() => setOpen(true)} className="text-[12px] text-[var(--color-primary)]">сменить</button>
          <button type="button" onClick={() => onChange([])} className="text-[var(--ax-fg-faint)] hover:text-red-500"><X size={14} /></button>
        </div>
      )}

      {showSearch && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ax-fg-faint)]" />
          <input
            autoFocus={open && !multi}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={multi ? 'Добавить запись…' : 'Поиск записи…'}
            className={`${inputCls} pl-9`}
          />
          {open && (
            <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-[var(--ax-border)] bg-[var(--ax-panel)] shadow-lg">
              {loading && <div className="px-3 py-2 text-[12px] text-[var(--ax-fg-faint)]">Загрузка…</div>}
              {!loading && choices.length === 0 && <div className="px-3 py-2 text-[12px] text-[var(--ax-fg-faint)]">Ничего не найдено</div>}
              {choices.map(o => (
                <button key={o.id} type="button"
                  onClick={() => add(o)}
                  className="block w-full text-left px-3 py-2 text-[13px] text-[var(--ax-fg)] hover:bg-[var(--ax-hover)]">
                  {o.title}
                </button>
              ))}
              <button type="button" onClick={() => { setOpen(false); setQuery('') }}
                className="block w-full text-left px-3 py-2 text-[12px] text-[var(--ax-fg-faint)] border-t border-[var(--ax-border-soft)]">Отмена</button>
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
