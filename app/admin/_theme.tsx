'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const LS_KEY = 'admin.theme'
export type AdminTheme = 'dark' | 'light'

export function useAdminTheme(): { theme: AdminTheme; toggle: () => void; ready: boolean } {
  const [theme, setTheme] = useState<AdminTheme>('dark')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY)
      if (v === 'light' || v === 'dark') setTheme(v)
    } catch {}
    setReady(true)
  }, [])
  const toggle = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(LS_KEY, next) } catch {}
      return next
    })
  }
  return { theme, toggle, ready }
}

// Class to apply on the wrapping div. Always includes 'theme-admin' so the
// CSS variables get set; adds 'theme-light' to flip them.
export function themeClass(theme: AdminTheme): string {
  return theme === 'light' ? 'theme-admin theme-light' : 'theme-admin'
}

export function ThemeToggle({ theme, toggle, className = '' }: { theme: AdminTheme; toggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] hover:bg-[var(--ax-hover)] ${className}`}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}
