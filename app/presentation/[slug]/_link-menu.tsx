'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ExternalLink, Copy, Check } from 'lucide-react'

// Wraps any clickable element with a small floating menu offering
// "Open in new tab" / "Copy link" actions. Used by:
//  - resource chips (Презентация / Рендеры / Booking / …)
//  - unit tiles in chessboard and "Все юниты" filter view
export function LinkMenu({
  url,
  children,
  className = '',
  align = 'left',
}: {
  url: string
  children: ReactNode
  className?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  function openLink(e: React.MouseEvent) {
    e.stopPropagation()
    window.open(url, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }
  async function copy(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => { setCopied(false); setOpen(false) }, 900)
    } catch {
      window.prompt('Скопируйте ссылку:', url)
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        className={className}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {children}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-50 top-full mt-1 min-w-[180px] bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[#E5E7EB] py-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <button
            type="button"
            onClick={openLink}
            className="w-full text-left px-3 py-2 hover:bg-[#F3F4F6] text-[13px] flex items-center gap-2 text-[#111827]"
          >
            <ExternalLink size={13} className="text-[#1F8B5F]" /> Открыть
          </button>
          <button
            type="button"
            onClick={copy}
            className="w-full text-left px-3 py-2 hover:bg-[#F3F4F6] text-[13px] flex items-center gap-2 text-[#111827]"
          >
            {copied ? <Check size={13} className="text-[#1F8B5F]" /> : <Copy size={13} className="text-[#6B7280]" />}
            {copied ? 'Скопировано' : 'Скопировать ссылку'}
          </button>
        </div>
      )}
    </div>
  )
}
