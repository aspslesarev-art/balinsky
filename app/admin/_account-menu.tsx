'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MessageCircle, Lock, Megaphone, Image as ImageIcon, FileText, Heart, Eye, Brain, Layers, BarChart3, Table, Link2,
  Users, Wallet, ListTree, Tags, KeyRound, LayoutTemplate, QrCode,
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
type Group = { title: string; items: Item[] }

// Все разделы админки, сгруппированные по смыслу. Если появилась новая
// страница под /admin — её место здесь, иначе попасть в неё можно только
// по прямой ссылке.
const GROUPS: Group[] = [
  {
    title: 'Общение',
    items: [
      { href: '/admin/chats',         label: 'Чаты',              Icon: MessageCircle },
      { href: '/admin/dev-chats',     label: 'Чаты застройщиков', Icon: Link2 },
      { href: '/admin/broadcast',     label: 'Рассылка',          Icon: Megaphone },
    ],
  },
  {
    title: 'Клиенты',
    items: [
      { href: '/admin/reservations',  label: 'Брони',        Icon: Lock },
      { href: '/admin/users',         label: 'Пользователи', Icon: Users },
      { href: '/admin/wishlist',      label: 'Лайки',        Icon: Heart },
      { href: '/admin/views',         label: 'Просмотры',    Icon: Eye },
      { href: '/admin/hotels',        label: 'Отели (QR)',   Icon: QrCode },
    ],
  },
  {
    title: 'Рынок',
    items: [
      { href: '/admin/market',        label: 'Трекер рынка',      Icon: BarChart3 },
      { href: '/admin/market/units',  label: 'Юниты рынка',       Icon: ListTree },
      { href: '/admin/market/site',   label: 'Цены на сайте',     Icon: Tags },
      { href: '/admin/market/access', label: 'Доступ к отчёту',   Icon: KeyRound },
    ],
  },
  {
    title: 'Контент',
    items: [
      { href: '/admin/data',           label: 'Базы',         Icon: Table },
      { href: '/admin/visualizations', label: 'Визуализации', Icon: Layers },
      { href: '/admin/ads',            label: 'Реклама',      Icon: ImageIcon },
      { href: '/admin/presentations',  label: 'Презентации',  Icon: FileText },
    ],
  },
  {
    title: 'Система',
    items: [
      { href: '/admin/balina',                label: 'Андрей',              Icon: Brain },
      { href: '/admin/usage',                 label: 'Расходы на ИИ',       Icon: Wallet },
      { href: '/admin/preview/zastrojshhik',  label: 'Прототип застройщика', Icon: LayoutTemplate },
    ],
  },
]

const ALL_ITEMS: Item[] = GROUPS.flatMap(g => g.items)

// Подсветка активного раздела: берём самое длинное совпадение по префиксу,
// иначе на /admin/market/units загорались бы сразу два пункта.
function activeHrefFor(pathname: string): string {
  return ALL_ITEMS
    .filter(i => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .reduce((best, i) => (i.href.length > best.length ? i.href : best), '')
}

export function AdminAccountMenu({ variant = 'sidebar' }: { variant?: Variant }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const { theme, toggle: toggleTheme } = useAdminTheme()
  const [pathname, setPathname] = useState<string>('')

  useEffect(() => { setPathname(window.location.pathname) }, [])

  const activeHref = useMemo(() => activeHrefFor(pathname), [pathname])

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
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto overscroll-contain">
            {GROUPS.map((group, gi) => (
              <div key={group.title}>
                {gi > 0 && <div className={`my-1 ${skin.sep}`} />}
                <div className="px-3 pt-2 pb-0.5 text-[10.5px] uppercase tracking-wide text-[var(--ax-fg-faint)]">
                  {group.title}
                </div>
                {group.items.map(({ href, label, Icon }) => (
                  <a
                    key={href}
                    href={href}
                    role="menuitem"
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] no-underline ${href === activeHref ? skin.itemActive : skin.item}`}
                  >
                    <Icon size={15} strokeWidth={1.7} />
                    {label}
                  </a>
                ))}
              </div>
            ))}
          </div>

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
