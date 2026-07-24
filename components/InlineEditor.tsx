'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Check, Loader2 } from 'lucide-react'

// On-page editing for admins. When the visitor is a logged-in admin (checked
// via /api/admin/whoami — the admin_session cookie is httpOnly, so we can't read
// it client-side), any element tagged with data-edit-* attributes becomes
// hover-highlightable and click-to-edit. Saving PATCHes the same admin data API
// the /admin/data grid uses, which writes Supabase AND runs the full cache
// invalidation, so the change shows on the live site after a refresh.
//
// A tagged element carries:
//   data-edit-collection  — admin collection key (e.g. "complexes")
//   data-edit-id          — record id (airtable_id)
//   data-edit-field       — JSONB field key to write
//   data-edit-kind        — "text" (single line) | "longtext" (textarea)
//   data-edit-label       — human label shown in the editor
// The current value is fetched from the admin API on open, so what you edit is
// always the real stored value (not the possibly-translated on-page text).

type Target = { collection: string; id: string; field: string; kind: string; label: string }

const OUTLINE = 'bx-editable-outline'

const CSS = `
.${OUTLINE} { outline: 2px dashed #f59e0b !important; outline-offset: 3px; cursor: pointer; border-radius: 4px; }
[data-edit-field] { transition: outline-color .1s; }
`

function firstString(v: unknown): string {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
  return v == null ? '' : String(v)
}

export function InlineEditor() {
  const router = useRouter()
  const [admin, setAdmin] = useState(false)
  const [target, setTarget] = useState<Target | null>(null)
  const [value, setValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)
  const hovered = useRef<Element | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/admin/whoami', { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : { admin: false })
      .then(j => { if (alive) setAdmin(!!j.admin) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const open = useCallback(async (el: HTMLElement) => {
    const t: Target = {
      collection: el.dataset.editCollection || '',
      id: el.dataset.editId || '',
      field: el.dataset.editField || '',
      kind: el.dataset.editKind || 'longtext',
      label: el.dataset.editLabel || el.dataset.editField || '',
    }
    if (!t.collection || !t.id || !t.field) return
    setTarget(t)
    setErr(null)
    setStatus('loading')
    setValue('')
    try {
      const r = await fetch(`/api/admin/data/${encodeURIComponent(t.collection)}/${encodeURIComponent(t.id)}`, { credentials: 'same-origin' })
      const j = await r.json()
      // The admin data API returns the record as { id, fields }; older/other
      // adapters may surface values under data or at the top level, so try all.
      const row = j.row ?? {}
      const raw = row?.fields?.[t.field] ?? row?.data?.[t.field] ?? row?.[t.field]
      setValue(firstString(raw))
      setStatus('idle')
    } catch {
      setStatus('error'); setErr('Не удалось загрузить значение')
    }
  }, [])

  // Admin-only DOM wiring: hover outline + click-to-edit via event delegation.
  useEffect(() => {
    if (!admin) return
    const onOver = (e: Event) => {
      const el = (e.target as HTMLElement)?.closest?.('[data-edit-field]')
      if (el === hovered.current) return
      hovered.current?.classList.remove(OUTLINE)
      hovered.current = el
      el?.classList.add(OUTLINE)
    }
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.('[data-edit-field]') as HTMLElement | null
      if (!el) return
      e.preventDefault()
      e.stopPropagation()
      void open(el)
    }
    document.addEventListener('mouseover', onOver, true)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('mouseover', onOver, true)
      document.removeEventListener('click', onClick, true)
      hovered.current?.classList.remove(OUTLINE)
    }
  }, [admin, open])

  const save = useCallback(async () => {
    if (!target) return
    setStatus('saving'); setErr(null)
    try {
      const r = await fetch(`/api/admin/data/${encodeURIComponent(target.collection)}/${encodeURIComponent(target.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ fields: { [target.field]: value } }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) { setStatus('error'); setErr(j.error || 'Ошибка сохранения'); return }
      setTarget(null); setStatus('idle')
      router.refresh()
    } catch {
      setStatus('error'); setErr('Сеть недоступна')
    }
  }, [target, value, router])

  if (!admin) return null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="fixed bottom-4 left-4 z-[9998] flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-lg pointer-events-none">
        <Pencil size={13} /> Правка вкл
      </div>

      {target && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setTarget(null)}>
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[15px] font-semibold text-[#111827]">{target.label}</div>
              <button type="button" onClick={() => setTarget(null)} className="text-[var(--color-text-soft)] hover:text-[#111827] cursor-pointer"><X size={18} /></button>
            </div>
            {status === 'loading' ? (
              <div className="flex items-center gap-2 py-8 text-[var(--color-text-soft)]"><Loader2 size={16} className="animate-spin" /> Загрузка…</div>
            ) : target.kind === 'text' ? (
              <input
                value={value}
                onChange={e => setValue(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-[var(--color-border)] px-3.5 py-2.5 text-[14px] text-[#111827] outline-none focus:border-[var(--color-primary)]"
              />
            ) : (
              <textarea
                value={value}
                onChange={e => setValue(e.target.value)}
                autoFocus
                rows={12}
                className="w-full rounded-xl border border-[var(--color-border)] px-3.5 py-2.5 text-[14px] leading-relaxed text-[#111827] outline-none focus:border-[var(--color-primary)] resize-y font-[inherit]"
              />
            )}
            {target.kind !== 'text' && (
              <p className="mt-1.5 text-[12px] text-[var(--color-text-soft)]">Один пункт на строку. На других языках обновится после перегенерации перевода.</p>
            )}
            {err && <p className="mt-2 text-[12.5px] text-red-600">{err}</p>}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setTarget(null)} className="rounded-xl px-4 py-2 text-[14px] font-medium text-[var(--color-text)] hover:bg-[var(--color-search-bg)] cursor-pointer">Отмена</button>
              <button
                type="button"
                onClick={save}
                disabled={status === 'saving' || status === 'loading'}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {status === 'saving' ? <><Loader2 size={15} className="animate-spin" /> Сохраняю…</> : <><Check size={15} /> Сохранить</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
