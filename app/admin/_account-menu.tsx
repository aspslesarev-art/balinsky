'use client'

import { useEffect, useRef, useState } from 'react'
import {
  MessageCircle, Lock, Megaphone, Image as ImageIcon, FileText, Heart, Eye, Brain, Layers, Database,
  Sun, Moon, LogOut, ChevronUp, UserRound,
} from 'lucide-react'
import { useAdminTheme } from './_theme'

// Two render modes:
//  - 'sidebar' (default) — strip across the bottom of the chat-list
//    column; uses the admin theme vars set by themeClass()
//  - 'floating' — fixed bottom-left card on the light-themed admin
//    pages (ads / broadcast / reservations) where there's no sidebar
//    or theme wrapper
type Variant = 'sidebar' | 'floating'

// Bottom-left account block: avatar + label, opens a popup menu with all
// admin sections + theme + logout. Replaces the per-page header nav rows
// (Брони / Реклама / Рассылка / тема / выход) so navigation is in one
// consistent place across the admin UI.
//
// Active section is computed from window.location.pathname, so we don't
// need each page to pass it down.

type Item = { href: string; label: string; Icon: typeof MessageCircle }

const ITEMS: Item[] = [
  { href: '/admin/chats',         label: 'Чаты',         Icon: MessageCircle },
  { href: '/admin/reservations',  label: 'Брони',        Icon: Lock },
  { href: '/admin/broadcast',     label: 'Рассылка',     Icon: Megaphone },
  { href: '/admin/ads',           label: 'Реклама',      Icon: ImageIcon },
  { href: '/admin/presentations', label: 'Презентации',  Icon: FileText },
  { href: '/admin/wishlist',      label: 'Лайки',        Icon: Heart },
  { href: '/admin/views',         label: 'Просмотры',    Icon: Eye },
  { href: '/admin/balina',        label: 'Балина',       Icon: Brain },
  { href: '/admin/visualizations', label: 'Визуализации', Icon: Layers },
  { href: '/admin/parsers',       label: 'Парсеры',      Icon: Database },
]

export function AdminAccountMenu({ variant = 'sidebar' }: { variant?: Variant }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const { theme, toggle: toggleTheme } = useAdminTheme()
  const [pathname, setPathname] = useState<string>('')

  useEffect(() => { setPathname(window.location.pathname) }, [])

  useEffect(() => {
    if (!open) return
    function onDocDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/admin'
  }

  // Two skins: floating now lives inside the AdminThemeShell wrapper
  // and resolves through the same CSS vars as the chats sidebar — so
  // the menu follows whatever theme the user picked. On mobile the
  // bubble shrinks and hugs the bottom edge full-width with safe-
  // area padding so it never overlaps the device home indicator.
  const skin = variant === 'floating'
    ? {
        wrap: 'fixed bottom-4 left-4 right-4 sm:right-auto z-40 sm:w-[240px] rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] shadow-[0_12px_32px_rgba(0,0,0,0.16)]',
        button: 'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-[var(--ax-hover)] text-left',
        nameFg: 'text-[var(--ax-fg)]',
        subFg: 'text-[var(--ax-fg-faint)]',
        chev: 'text-[var(--ax-fg-faint)]',
        popup: 'absolute bottom-full left-0 right-0 mb-1.5 z-50 bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.16)] p-1.5',
        item: 'text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-fg)]',
        itemActive: 'bg-[var(--ax-hover)] text-[var(--ax-fg)] font-medium',
        sep: 'border-t border-[var(--ax-border-soft)]',
      }
    : {
        wrap: 'relative shrink-0 border-t border-[var(--ax-border)]',
        button: 'w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--ax-hover)] text-left',
        nameFg: 'text-[var(--ax-fg)]',
        subFg: 'text-[var(--ax-fg-faint)]',
        chev: 'text-[var(--ax-fg-faint)]',
        popup: 'absolute bottom-full left-2 right-2 mb-1 z-30 bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.32)] p-1.5',
        item: 'text-[var(--ax-fg-soft)] hover:bg-[var(--ax-hover)] hover:text-[var(--ax-fg)]',
        itemActive: 'bg-[var(--ax-hover)] text-[var(--ax-fg)] font-medium',
        sep: 'border-t border-[var(--ax-border-soft)]',
      }

  return (
    <div ref={wrapRef} className={skin.wrap}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={skin.button}
        aria-expanded={open}
      >
        <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white">
          <UserRound size={16} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-medium ${skin.nameFg} truncate`}>Admin</div>
          <div className={`text-[11px] ${skin.subFg} truncate`}>balinsky.info</div>
        </div>
        <ChevronUp size={14} className={`${skin.chev} transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>

      {open && (
        <div className={skin.popup} role="menu">
          {ITEMS.map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <a
                key={href}
                href={href}
                role="menuitem"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] no-underline ${active ? skin.itemActive : skin.item}`}
              >
                <Icon size={15} strokeWidth={1.7} />
                {label}
              </a>
            )
          })}

          <div className={`my-1 ${skin.sep}`} />

          <button
            type="button"
            onClick={() => { toggleTheme() }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] ${skin.item}`}
          >
            {theme === 'dark' ? <Sun size={15} strokeWidth={1.7} /> : <Moon size={15} strokeWidth={1.7} />}
            {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          </button>
          <button
            type="button"
            onClick={logout}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] ${skin.item}`}
          >
            <LogOut size={15} strokeWidth={1.7} />
            Выйти
          </button>
        </div>
      )}
    </div>
  )
}
