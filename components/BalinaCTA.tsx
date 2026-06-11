'use client'

// Server-section-friendly button that opens Балину via the `balina:open`
// bridge (same one HeroBalinaSearch and the old BalinaHero use). Lets the
// landing's server components drop "Спросить AI-брокера" / "Оставить заявку"
// CTAs that open the chat — optionally pre-filled and auto-sent (a lead
// signal a manager can pick up from /admin/chats), or straight into voice.

import type { ReactNode } from 'react'

export function BalinaCTA({
  children,
  text,
  listen,
  className,
}: {
  children: ReactNode
  /** Pre-fill + auto-send this message when the chat opens. */
  text?: string
  /** Open straight into voice capture. */
  listen?: boolean
  className?: string
}) {
  const onClick = () => {
    if (typeof window === 'undefined') return
    const detail = listen ? { listen: true } : text ? { text, autoSend: true } : {}
    window.dispatchEvent(new CustomEvent('balina:open', { detail }))
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  )
}
