'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Copy, Check } from 'lucide-react'

const POPOVER_W = 260

// Wraps any clickable element with a popover anchored to the centre
// of the trigger card / chip. Rendered via createPortal so it isn't
// clipped by a parent `overflow-hidden`. Anchored to the trigger
// rect, then clamped to the viewport so it never bleeds off-edge.
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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  function place() {
    const t = triggerRef.current
    if (!t) return
    const r = t.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    setAnchor({ left: cx, top: cy })
  }

  useEffect(() => {
    if (anchor == null) return
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAnchor(null)
    }
    function onResize() { setAnchor(null) }
    document.addEventListener('keydown', onEsc)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      document.removeEventListener('keydown', onEsc)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [anchor])

  // After mount, measure popover and clamp position so it never
  // bleeds off the viewport edge.
  useEffect(() => {
    if (anchor == null) return
    const el = popoverRef.current
    if (!el) return
    const w = el.offsetWidth || POPOVER_W
    const h = el.offsetHeight || 200
    const vw = window.innerWidth
    const vh = window.innerHeight
    const m = 12
    let left = anchor.left - w / 2
    let top = anchor.top - h / 2
    left = Math.max(m, Math.min(vw - w - m, left))
    top = Math.max(m, Math.min(vh - h - m, top))
    if (left !== anchor.left - w / 2 || top !== anchor.top - h / 2) {
      // We mutate via dataset rather than another setState to avoid
      // a measurement→clamp render loop.
      el.style.left = `${left}px`
      el.style.top = `${top}px`
    }
  }, [anchor])

  function openLink(e: React.MouseEvent) {
    e.stopPropagation()
    window.open(url, '_blank', 'noopener,noreferrer')
    setAnchor(null)
  }
  async function copy(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => { setCopied(false); setAnchor(null) }, 900)
    } catch {
      window.prompt('Скопируйте ссылку:', url)
      setAnchor(null)
    }
  }

  const open = anchor != null
  const overlay = open && mounted ? createPortal(
    <>
      {/* transparent click-outside layer */}
      <div onClick={() => setAnchor(null)} className="fixed inset-0 z-[999]" />
      <div
        ref={popoverRef}
        role="menu"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: anchor!.left - POPOVER_W / 2,
          top: anchor!.top - 80,
          width: POPOVER_W,
          zIndex: 1000,
        }}
        className="bg-white rounded-2xl shadow-[0_18px_48px_rgba(0,0,0,0.22)] border border-[#E5E7EB] overflow-hidden"
      >
        <button
          type="button"
          onClick={openLink}
          className="w-full text-left px-4 py-3 hover:bg-[#F3F4F6] text-[14px] flex items-center gap-3 text-[#111827]"
        >
          <ExternalLink size={16} className="text-[#1F8B5F] shrink-0" /> Открыть
        </button>
        <button
          type="button"
          onClick={copy}
          className="w-full text-left px-4 py-3 hover:bg-[#F3F4F6] text-[14px] flex items-center gap-3 text-[#111827] border-t border-[#F3F4F6]"
        >
          {copied
            ? <Check size={16} className="text-[#1F8B5F] shrink-0" />
            : <Copy size={16} className="text-[#6B7280] shrink-0" />}
          {copied ? 'Скопировано' : 'Скопировать ссылку'}
        </button>
      </div>
    </>,
    document.body,
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); open ? setAnchor(null) : place() }}
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
