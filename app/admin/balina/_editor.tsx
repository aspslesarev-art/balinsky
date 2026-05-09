'use client'

// Per-section editor for /admin/balina. Each section gets a
// collapsible card with: title, "default / edited" pill, last-edit
// timestamp, textarea, Save + Reset buttons. Save writes to
// /api/admin/balina; Reset reverts to the seed body from code.

import { useState, useTransition } from 'react'
import { Save, RotateCcw, ChevronDown, ChevronUp, AlertTriangle, Check } from 'lucide-react'

type Section = {
  key: string
  title: string
  body: string
  sortOrder: number
  isDefault: boolean
  updatedAt: string | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function fmtUpdated(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

export function BalinaEditor({ initialSections, readOnly = false }: { initialSections: Section[]; readOnly?: boolean }) {
  const [sections, setSections] = useState<Section[]>(initialSections)
  const [openKey, setOpenKey] = useState<string | null>(null)

  return (
    <div className="space-y-3 md:space-y-4 max-w-[1100px]">
      {sections.map(sec => (
        <SectionCard
          key={sec.key}
          section={sec}
          isOpen={openKey === sec.key}
          readOnly={readOnly}
          onToggle={() => setOpenKey(k => (k === sec.key ? null : sec.key))}
          onUpdate={updated => setSections(prev => prev.map(s => s.key === updated.key ? updated : s))}
        />
      ))}
    </div>
  )
}

function SectionCard({
  section, isOpen, onToggle, onUpdate, readOnly,
}: {
  section: Section
  isOpen: boolean
  onToggle: () => void
  onUpdate: (s: Section) => void
  readOnly: boolean
}) {
  const [body, setBody] = useState(section.body)
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const dirty = body !== section.body

  async function save() {
    setState('saving'); setError(null)
    try {
      const r = await fetch(`/api/admin/balina/${encodeURIComponent(section.key)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? `http_${r.status}`)
      }
      const j = await r.json() as { section: Section }
      startTransition(() => {
        onUpdate(j.section)
        setBody(j.section.body)
        setState('saved')
        setTimeout(() => setState('idle'), 1800)
      })
    } catch (e) {
      setState('error'); setError(e instanceof Error ? e.message : 'unknown')
    }
  }

  async function reset() {
    if (!confirm('Сбросить эту секцию к умолчанию из кода? Текущие правки будут потеряны.')) return
    setState('saving'); setError(null)
    try {
      const r = await fetch(`/api/admin/balina/${encodeURIComponent(section.key)}/reset`, { method: 'POST' })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? `http_${r.status}`)
      }
      const j = await r.json() as { section: Section }
      startTransition(() => {
        onUpdate(j.section)
        setBody(j.section.body)
        setState('saved')
        setTimeout(() => setState('idle'), 1800)
      })
    } catch (e) {
      setState('error'); setError(e instanceof Error ? e.message : 'unknown')
    }
  }

  return (
    <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] overflow-hidden">
      {/* Header bar — click to expand */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 md:px-5 py-3.5 text-left hover:bg-[var(--ax-hover)]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] md:text-[15px] font-semibold text-[var(--ax-fg)]">{section.title}</span>
            {section.isDefault ? (
              <span className="text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-[var(--ax-hover)] text-[var(--ax-fg-muted)]">
                по умолчанию
              </span>
            ) : (
              <span className="text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-[#1F8B5F]/15 text-[#1F8B5F]">
                отредактирована
              </span>
            )}
            {dirty && (
              <span className="text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500">
                несохранено
              </span>
            )}
          </div>
          <div className="text-[11.5px] text-[var(--ax-fg-faint)] font-mono mt-0.5">
            {section.key} · {body.length.toLocaleString('ru-RU')} симв · обновлено {fmtUpdated(section.updatedAt)}
          </div>
        </div>
        {isOpen ? <ChevronUp size={18} className="text-[var(--ax-fg-muted)]" /> : <ChevronDown size={18} className="text-[var(--ax-fg-muted)]" />}
      </button>

      {/* Editor body */}
      {isOpen && (
        <div className="border-t border-[var(--ax-border-soft)] p-4 md:p-5 space-y-3">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            spellCheck={false}
            className="w-full min-h-[280px] md:min-h-[420px] rounded-xl bg-[var(--ax-input-bg)] border border-[var(--ax-input-border)] p-3 md:p-4 text-[13px] leading-relaxed font-mono text-[var(--ax-fg)] resize-y focus:outline-none focus:border-[#1F8B5F]"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={save}
              disabled={readOnly || !dirty || state === 'saving'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1F8B5F] text-white text-[13px] font-medium hover:bg-[#197551] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              {state === 'saving' ? 'Сохраняю…' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={readOnly || section.isDefault || state === 'saving'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--ax-hover)] text-[var(--ax-fg-soft)] text-[13px] font-medium hover:text-[var(--ax-fg)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw size={14} />
              К умолчанию
            </button>

            {state === 'saved' && (
              <span className="inline-flex items-center gap-1 text-[12px] text-[#1F8B5F]">
                <Check size={14} /> Сохранено
              </span>
            )}
            {state === 'error' && (
              <span className="inline-flex items-center gap-1 text-[12px] text-[var(--ax-error-fg)]">
                <AlertTriangle size={14} /> {error}
              </span>
            )}
            {pending && <span className="text-[11px] text-[var(--ax-fg-muted)]">обновляю…</span>}
          </div>
        </div>
      )}
    </div>
  )
}
