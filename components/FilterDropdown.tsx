'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, X } from 'lucide-react'

export function FilterDropdown({
  label,
  summary,
  active,
  children,
}: {
  label: string
  summary?: string
  active: boolean
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const display = summary && summary.trim() ? summary : label

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-1.5 py-2.5 px-4 rounded-full border text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors ${
          active
            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white font-medium'
            : 'bg-[var(--color-card-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
        }`}
        aria-expanded={open}
      >
        {display}
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`${active ? 'text-white' : 'text-[var(--color-text-muted)]'} transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={
            'fixed left-3 top-24 w-[calc(100vw-24px)] max-h-[70vh] overflow-y-auto ' +
            'sm:absolute sm:left-0 sm:top-full sm:w-auto sm:min-w-[260px] sm:max-h-none ' +
            'mt-0 sm:mt-2 z-30 bg-white rounded-2xl border border-[var(--color-border)] ' +
            'shadow-[0_12px_32px_rgba(0,0,0,0.16)] sm:shadow-[var(--shadow-popover)] ' +
            'p-4'
          }
        >
          <div className="sm:hidden flex justify-end mb-2 -mt-1 -mr-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 text-[#111827]"
            >
              <X size={18} />
            </button>
          </div>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
