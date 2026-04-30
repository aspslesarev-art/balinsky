'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

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
        <div className="absolute z-30 mt-2 left-0 min-w-[260px] bg-white rounded-2xl shadow-[var(--shadow-popover)] border border-[var(--color-border)] p-4">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
