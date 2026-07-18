'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Home, Building, Building2, HardHat, Menu, X } from 'lucide-react'
import { LangSwitch } from './LangSwitch'
import { CurrencyToggle } from './CurrencyContext'
import { WishlistHeaderLink } from './WishlistHeaderLink'
import { t, detectLang, localizeSegment, pickCopy, type Lang } from '@/lib/i18n'

type NavKey = 'villy' | 'apartamenty' | 'zhilye-kompleksy' | 'zastrojshhiki' | 'arenda'

const NAV: { key: NavKey; ru: { href: string }; en: { href: string }; labelKey: 'nav.villas' | 'nav.apartments' | 'nav.complexes' | 'nav.developers' | 'nav.rental'; Icon: typeof Home }[] = [
  { key: 'villy',            ru: { href: '/ru/villy' },             en: { href: '/en/villas' },     labelKey: 'nav.villas',     Icon: Home },
  { key: 'apartamenty',      ru: { href: '/ru/apartamenty' },       en: { href: '/en/apartments' }, labelKey: 'nav.apartments', Icon: Building },
  { key: 'zhilye-kompleksy', ru: { href: '/ru/zhilye-kompleksy' },  en: { href: '/en/complexes' },  labelKey: 'nav.complexes',  Icon: Building2 },
  { key: 'zastrojshhiki',    ru: { href: '/ru/zastrojshhiki' },     en: { href: '/en/developers' }, labelKey: 'nav.developers', Icon: HardHat },
  // Аренда убрана из верхнего меню (страницы /ru/arenda и /en/rental
  // остаются доступны по прямым ссылкам и в sitemap).
]

export function Header({ active }: { active?: NavKey }) {
  const [open, setOpen] = useState(false)
  // Mobile: hide the bar on scroll-down, reveal on scroll-up. Desktop
  // ignores this (md:translate-y-0 below pins it). The dropdown being
  // open forces it visible so the close button never scrolls away.
  const [hidden, setHidden] = useState(false)
  const pathname = usePathname() ?? ''
  const lang: Lang = detectLang(pathname)

  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        // Ignore sub-pixel jitter / rubber-band bounce.
        if (Math.abs(y - lastY) > 6) {
          // Never hide while near the top — avoids a flicker on the
          // first few pixels of scroll.
          setHidden(y > lastY && y > 80)
          lastY = y
        }
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-20 w-full bg-[var(--color-header-bg)] border-b border-[var(--color-border)] transition-transform duration-300 will-change-transform md:translate-y-0 ${
        hidden && !open ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      {/* Mobile shows only burger + right cluster (logo lives inside
          the dropdown). Desktop is the original flex layout — logo
          first, nav, invest-pill, right cluster at the end. */}
      <div className="max-w-[1280px] mx-auto px-6 h-[72px]
        flex items-center justify-between gap-2 md:gap-6">

        {/* Burger — mobile only, sits at the leading edge of the bar. */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-[var(--color-text)]"
          aria-label={open
            ? pickCopy({ ru: 'Закрыть меню', en: 'Close menu', id: 'Tutup menu', fr: 'Fermer le menu', de: 'Menü schließen', zh: '关闭菜单', nl: 'Menu sluiten', ban: 'Nutup menu' }, lang)
            : pickCopy({ ru: 'Открыть меню', en: 'Open menu', id: 'Buka menu', fr: 'Ouvrir le menu', de: 'Menü öffnen', zh: '打开菜单', nl: 'Menu openen', ban: 'Ngampakang menu' }, lang)}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Logo — desktop only on the top bar. On mobile it lives at
            the top of the dropdown menu instead, so the bar reads as
            burger | controls without a competing brand mark. */}
        <Link href="/" className="hidden md:flex items-center shrink-0" aria-label="Balinsky">
          <Image src="/logo.svg" alt="Balinsky" width={40} height={40} className="h-10 w-10" priority />
        </Link>

        <nav className="hidden md:flex items-center gap-8 h-full">
          {NAV.map(({ key, labelKey, Icon }) => {
            const isActive = key === active
            const href = `/${lang}/${localizeSegment(key, lang)}`
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

        {/* Right cluster — sits at the trailing edge of the bar via
            justify-between on mobile, ml-auto on desktop. */}
        <div className="flex items-center gap-2 shrink-0 md:ml-auto lg:ml-2">
          <WishlistHeaderLink />
          <CurrencyToggle />
          <LangSwitch />
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-header-bg)]">
          <div className="max-w-[1280px] mx-auto px-6 py-4 flex flex-col gap-1">
            {/* Logo at the top of the dropdown — fills the role the
                top bar's centred logo used to play, keeps the brand
                visible once the menu is open. */}
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-3 mb-2 no-underline"
              aria-label="Balinsky"
            >
              <Image src="/logo.svg" alt="Balinsky" width={40} height={40} className="h-10 w-10" priority />
              <span className="text-[18px] font-semibold tracking-tight text-[#1A1A1A]">Balinsky</span>
            </Link>
            {NAV.map(({ key, labelKey, Icon }) => {
              const isActive = key === active
              const href = `/${lang}/${localizeSegment(key, lang)}`
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
