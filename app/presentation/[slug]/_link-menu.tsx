'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Copy, Check } from 'lucide-react'

// Wraps any clickable element with a centered popover offering
// "Open in new tab" / "Copy link" actions. The popover is rendered
// via createPortal so it isn't clipped by parent overflow-hidden
// (e.g. the card photo border-radius wrapper).
export function LinkMenu({
  url,
  children,
  className = '',
}: {
  url: string
  children: ReactNode
  className?: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onEsc)
    // Lock page scroll while the modal is up so taps behind it
    // don't accidentally fire on tile underneath.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prevOverflow
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

  const overlay = open && mounted ? createPortal(
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[1000] bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4"
    >
      <div
        role="menu"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] bg-white rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.25)] border border-[#E5E7EB] overflow-hidden"
      >
        <div className="px-4 pt-4 pb-2 border-b border-[#F3F4F6]">
          <div className="text-[11.5px] uppercase tracking-wide text-[#9CA3AF] mb-1">Ссылка</div>
          <div className="text-[12.5px] text-[#374151] break-all leading-snug">{url}</div>
        </div>
        <button
          type="button"
          onClick={openLink}
          className="w-full text-left px-4 py-3.5 hover:bg-[#F3F4F6] text-[14px] flex items-center gap-3 text-[#111827]"
        >
          <ExternalLink size={16} className="text-[#1F8B5F] shrink-0" /> Открыть в новой вкладке
        </button>
        <button
          type="button"
          onClick={copy}
          className="w-full text-left px-4 py-3.5 hover:bg-[#F3F4F6] text-[14px] flex items-center gap-3 text-[#111827] border-t border-[#F3F4F6]"
        >
          {copied
            ? <Check size={16} className="text-[#1F8B5F] shrink-0" />
            : <Copy size={16} className="text-[#6B7280] shrink-0" />}
          {copied ? 'Скопировано' : 'Скопировать ссылку'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="w-full text-center px-4 py-3 text-[13px] text-[#6B7280] hover:bg-[#FAFAF8] border-t border-[#F3F4F6]"
        >
          Отмена
        </button>
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(v => !v) }}
        className={className}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {children}
      </button>
      {overlay}
    </>
  )
}
