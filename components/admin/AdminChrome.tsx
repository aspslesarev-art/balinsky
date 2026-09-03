'use client'

// Минимальная обвязка админ-страницы, у которой уже есть собственная шапка:
// тема (переменные --ax-* живут только внутри .theme-admin), переключатель
// темы и плавающее меню разделов. AdminThemeShell делает то же самое, но
// рисует свою шапку — эта обёртка для страниц, которым шапка не нужна.

import { type ReactNode } from 'react'
import { useAdminTheme, themeClass, ThemeToggle } from '@/app/admin/_theme'
import { AdminAccountMenu } from '@/app/admin/_account-menu'

export function AdminChrome({
  children,
  width = 'max-w-[1200px]',
}: {
  children: ReactNode
  /** Ширина колонки — литерал Tailwind-класса из вызывающего файла. */
  width?: string
}) {
  const { theme, toggle } = useAdminTheme()
  return (
    <div className={themeClass(theme)}>
      <div className="min-h-screen bg-[var(--ax-bg)] text-[var(--ax-fg)] p-6 sm:p-10 pb-28">
        <div className={`${width} mx-auto flex justify-end`}>
          <ThemeToggle theme={theme} toggle={toggle} />
        </div>
        <main className={`${width} mx-auto space-y-8`}>{children}</main>
      </div>
      <AdminAccountMenu variant="floating" />
    </div>
  )
}
