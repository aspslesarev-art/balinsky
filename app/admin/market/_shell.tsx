'use client'

import { useAdminTheme, themeClass, ThemeToggle } from '../_theme'

// Обёртка страниц трекера в тему админки.
//
// Переменные --ax-* объявлены в globals.css только внутри .theme-admin,
// поэтому без этой обёртки все панели и выпадающие списки остаются без
// фона и границ — на прозрачном фоне не видно, что вообще выбрано.

export function MarketShell({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useAdminTheme()
  return (
    <div className={themeClass(theme)}>
      <div className="min-h-screen bg-[var(--ax-bg)] text-[var(--ax-fg)] p-6 sm:p-10">
        <div className="max-w-[1200px] mx-auto flex justify-end">
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
        <main className="max-w-[1200px] mx-auto space-y-8">{children}</main>
      </div>
    </div>
  )
}
