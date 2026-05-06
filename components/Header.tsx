'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Home, Building, Building2, HardHat, KeyRound, Menu, X, Plane } from 'lucide-react'
import { LangSwitch } from './LangSwitch'
import { CurrencyToggle } from './CurrencyContext'
import { WishlistHeaderLink } from './WishlistHeaderLink'
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
      {/* Mobile: 3-col grid (burger | logo | right cluster) so the
          logo sits exactly in the centre regardless of how wide the
          right side gets. The 1fr_auto_1fr track keeps the side
          columns symmetrical, which keeps the centre lined up.
          Desktop: switches to flex with the original layout — logo
          left, nav, invest pill, right cluster. */}
      <div className="max-w-[1280px] mx-auto px-6 h-[72px]
        grid grid-cols-[1fr_auto_1fr] items-center gap-2
        md:flex md:items-center md:justify-between md:gap-6">

        {/* Burger — mobile only, sits at the start of the left column. */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-[var(--color-text)] justify-self-start"
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Logo — auto-width centre column on mobile, first item on
            desktop. shrink-0 keeps it from collapsing when the right
            side gets crowded on tablet widths. */}
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

        {/* Invest-tour CTA pill — premium service offering, deliberately
            distinct from the catalog nav so it reads as a paid concierge
            instead of yet another listing tab. Hidden on mobile because
            the burger menu surfaces it at the top instead. */}
        <Link
          href={lang === 'en' ? '/en/invest-tour' : '/ru/invest-tour'}
          className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[13px] font-medium no-underline shrink-0 transition-colors"
        >
          <Plane size={14} />
          {lang === 'en' ? 'Invest tour' : 'Инвест-тур'}
        </Link>

        {/* Right cluster — pinned to end of the right grid column on
            mobile, ml-auto on desktop pushes it to the right edge. */}
        <div className="flex items-center gap-2 shrink-0 justify-self-end md:ml-auto lg:ml-2">
          <WishlistHeaderLink />
          <CurrencyToggle />
          <LangSwitch />
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-header-bg)]">
          <div className="max-w-[1280px] mx-auto px-6 py-4 flex flex-col gap-1">
            {/* Invest-tour leads the mobile menu — premium CTA, full
                primary color so it reads as the headline action. */}
            <Link
              href={lang === 'en' ? '/en/invest-tour' : '/ru/invest-tour'}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[15px] font-medium no-underline"
            >
              <Plane size={18} />
              {lang === 'en' ? 'Invest tour' : 'Инвест-тур'}
            </Link>
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
