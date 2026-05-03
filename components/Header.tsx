'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Home, Building, Building2, HardHat, KeyRound, Menu, X } from 'lucide-react'
import { IntentToggle } from './IntentToggle'

type NavKey = 'villy' | 'apartamenty' | 'zhilye-kompleksy' | 'zastrojshhiki' | 'arenda'

const NAV = [
  { key: 'villy' as const, href: '/ru/villy', label: 'Виллы и дома', Icon: Home },
  { key: 'apartamenty' as const, href: '/ru/apartamenty', label: 'Апартаменты', Icon: Building },
  { key: 'zhilye-kompleksy' as const, href: '/ru/zhilye-kompleksy', label: 'Жилые комплексы', Icon: Building2 },
  { key: 'zastrojshhiki' as const, href: '/ru/zastrojshhiki', label: 'Застройщики', Icon: HardHat },
  { key: 'arenda' as const, href: '/ru/arenda', label: 'Аренда', Icon: KeyRound },
]

export function Header({ active }: { active?: NavKey }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 w-full bg-[var(--color-header-bg)] border-b border-[var(--color-border)]">
      <div className="max-w-[1280px] mx-auto px-6 h-[72px] flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center shrink-0" aria-label="Balinsky">
          <img src="/logo.svg" alt="Balinsky" className="h-10 w-10" />
        </Link>

        <nav className="hidden md:flex items-center gap-8 h-full">
          {NAV.map(({ key, href, label, Icon }) => {
            const isActive = key === active
            return (
              <Link
                key={key}
                href={href}
                className="relative flex items-center gap-2 h-full text-[15px] font-medium text-[#1F3B2F] cursor-pointer hover:text-[var(--color-primary-pressed)] transition-colors"
              >
                <Icon size={18} strokeWidth={2} />
                <span>{label}</span>
                {isActive && (
                  <span
                    className="absolute left-0 right-0 -bottom-px h-[3px] bg-[var(--color-primary)]"
                    aria-hidden="true"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Intent toggle: All / Investment / For living. Desktop only —
            on mobile it sits inside the burger menu (below). */}
        <IntentToggle className="hidden lg:inline-flex shrink-0" />

        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-[var(--color-text)]"
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-header-bg)]">
          <div className="max-w-[1280px] mx-auto px-6 py-4 flex flex-col gap-1">
            {NAV.map(({ key, href, label, Icon }) => {
              const isActive = key === active
              return (
                <Link
                  key={key}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-[15px] font-medium ${
                    isActive ? 'text-[var(--color-primary)] bg-white/70' : 'text-[#1A1A1A] hover:bg-white/50'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              )
            })}
            <div className="mt-2 pt-3 border-t border-[var(--color-border)]">
              <IntentToggle className="w-full justify-center" />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
