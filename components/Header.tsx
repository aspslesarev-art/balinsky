'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Home, Building, Building2, HardHat, KeyRound, Menu, X } from 'lucide-react'
import { ProModeToggle } from './ProModeToggle'
import { LangSwitch } from './LangSwitch'
import { CurrencyToggle } from './CurrencyContext'
import { t, type Lang } from '@/lib/i18n'

type NavKey = 'villy' | 'apartamenty' | 'zhilye-kompleksy' | 'zastrojshhiki' | 'arenda'

const NAV: { key: NavKey; ru: { href: string }; en: { href: string }; labelKey: 'nav.villas' | 'nav.apartments' | 'nav.complexes' | 'nav.developers' | 'nav.rental'; Icon: typeof Home }[] = [
  { key: 'villy',            ru: { href: '/ru/villy' },             en: { href: '/en/villas' },     labelKey: 'nav.villas',     Icon: Home },
  { key: 'apartamenty',      ru: { href: '/ru/apartamenty' },       en: { href: '/en/apartments' }, labelKey: 'nav.apartments', Icon: Building },
  { key: 'zhilye-kompleksy', ru: { href: '/ru/zhilye-kompleksy' },  en: { href: '/en/complexes' },  labelKey: 'nav.complexes',  Icon: Building2 },
  { key: 'zastrojshhiki',    ru: { href: '/ru/zastrojshhiki' },     en: { href: '/en/developers' }, labelKey: 'nav.developers', Icon: HardHat },
  { key: 'arenda',           ru: { href: '/ru/arenda' },            en: { href: '/en/rental' },     labelKey: 'nav.rental',     Icon: KeyRound },
]

export function Header({ active }: { active?: NavKey }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname() ?? ''
  const lang: Lang = pathname.startsWith('/en') ? 'en' : 'ru'

  return (
    <header className="sticky top-0 z-20 w-full bg-[var(--color-header-bg)] border-b border-[var(--color-border)]">
      <div className="max-w-[1280px] mx-auto px-6 h-[72px] flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center shrink-0" aria-label="Balinsky">
          <img src="/logo.svg" alt="Balinsky" className="h-10 w-10" />
        </Link>

        <nav className="hidden md:flex items-center gap-8 h-full">
          {NAV.map(({ key, ru, en, labelKey, Icon }) => {
            const isActive = key === active
            const href = lang === 'en' ? en.href : ru.href
            const label = t(labelKey, lang)
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

        {/* Pro mode switch — default ON. Hides analytics on detail pages
            when the visitor flips it off. Catalogs are unaffected.
            Currency selector lives here too so it works on every page. */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <ProModeToggle />
          <CurrencyToggle />
          <LangSwitch />
        </div>

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
            {NAV.map(({ key, ru, en, labelKey, Icon }) => {
              const isActive = key === active
              const href = lang === 'en' ? en.href : ru.href
              const label = t(labelKey, lang)
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
          </div>
        </div>
      )}
    </header>
  )
}
