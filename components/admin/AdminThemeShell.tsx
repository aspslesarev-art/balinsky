'use client'

// Shared chrome for every admin page. Centralises three things that
// were previously copy-pasted (and therefore drifting):
//
//   - Theme: reads useAdminTheme() and applies themeClass on the root
//     div, so all `var(--ax-*)` tokens inside resolve to the same
//     dark/light palette already used by /admin/chats. The user
//     toggles theme from AdminAccountMenu and every page tracks it.
//
//   - Header: a sticky bar with the page title, an optional one-line
//     description, and a slot for filters (range tabs etc.).
//
//   - Account menu: mounted exactly once per page, in the same
//     "floating" position. The variant=`floating` skin already adapts
//     to the active theme via the same CSS vars.

import { type ReactNode } from 'react'
import { useAdminTheme, themeClass } from '@/app/admin/_theme'
import { AdminAccountMenu } from '@/app/admin/_account-menu'

export function AdminThemeShell({
  title,
  description,
  filters,
  children,
  fullWidth = false,
  back,
}: {
  title: string
  description?: string
  filters?: ReactNode
  children: ReactNode
  /** Span the full screen width (no 1200px cap) — for the data grid. */
  fullWidth?: boolean
  /** Optional back link rendered before the title (href + label). */
  back?: { href: string; label: string }
}) {
  const { theme } = useAdminTheme()
  return (
    <div className={`${themeClass(theme)} min-h-screen bg-[var(--ax-bg)] text-[var(--ax-fg)] ${fullWidth ? '' : 'pb-24'}`}>
      <header className="sticky top-0 z-20 px-4 md:px-6 pt-4 md:pt-5 pb-3 border-b border-[var(--ax-border)] bg-[var(--ax-bg)] backdrop-blur supports-[backdrop-filter]:bg-[var(--ax-bg)]/85">
        {back && (
          <a href={back.href} className="inline-flex items-center gap-1 text-[12px] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] no-underline mb-1.5">
            ← {back.label}
          </a>
        )}
        <h1 className="text-[18px] md:text-[22px] font-semibold tracking-tight text-[var(--ax-fg)]">{title}</h1>
        {description && (
          <div className="mt-1.5 text-[12.5px] md:text-[13px] text-[var(--ax-fg-muted)] leading-snug">
            {description}
          </div>
        )}
        {filters && <div className="mt-3 md:mt-4">{filters}</div>}
      </header>

      <main className={fullWidth ? 'px-3 md:px-4 py-3' : 'px-4 md:px-6 py-5 md:py-6 max-w-[1200px] mx-auto'}>
        {children}
      </main>

      <AdminAccountMenu variant="floating" />
    </div>
  )
}
