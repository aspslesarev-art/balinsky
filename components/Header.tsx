'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Heart, UserRound } from 'lucide-react'
import { LangSwitch } from './LangSwitch'
import { CurrencyToggle, CurrencySegments } from './CurrencyContext'
import { WishlistHeaderLink, WISHLIST_LABEL } from './WishlistHeaderLink'
import { useWishlist } from './WishlistContext'
import { t, detectLang, localizeSegment, langToSegment, switchLangPath, pickCopy, type Lang } from '@/lib/i18n'

// Шапка «Журнал» — вариант A из макета (владелец 21.11.2026,
// https://claude.ai/artifact/2PonCGZduofYcuwwn6zQMe): слова без иконок,
// активный раздел подчёркнут чёрной линией, рядом ссылка на гид
// «Как купить в лизхолд». На телефоне и планшете — «Меню» с крупным списком,
// валюта и язык внутри меню.

type NavKey = 'villy' | 'apartamenty' | 'zhilye-kompleksy' | 'zastrojshhiki' | 'arenda' | 'pereprodazha'

const NAV: { key: NavKey; labelKey: 'nav.villas' | 'nav.apartments' | 'nav.complexes' }[] = [
  { key: 'villy',            labelKey: 'nav.villas' },
  { key: 'apartamenty',      labelKey: 'nav.apartments' },
  { key: 'zhilye-kompleksy', labelKey: 'nav.complexes' },
  // Застройщики, аренда и перепродажа убраны из верхнего меню (17.10.2026):
  // все три — в подвале и во второй части мобильного меню.
]

// Гид по покупке — /ru/kak-kupit и его зеркала во всех десяти языках.
const GUIDE_SEG = 'kak-kupit'

const COPY = {
  guide: { ru: 'Как купить в лизхолд', en: 'How to buy leasehold', id: 'Cara membeli leasehold', fr: 'Acheter en leasehold', de: 'Leasehold kaufen', zh: '如何购买租赁产权', nl: 'Leasehold kopen', ban: 'Carane numbas leasehold', pl: 'Jak kupić w leasehold', uk: 'Як купити в лізхолд' },
  sections: { ru: 'Разделы', en: 'Sections', id: 'Bagian', fr: 'Rubriques', de: 'Bereiche', zh: '栏目', nl: 'Rubrieken', ban: 'Bagian', pl: 'Działy', uk: 'Розділи' },
  menu: { ru: 'Меню', en: 'Menu', id: 'Menu', fr: 'Menu', de: 'Menü', zh: '菜单', nl: 'Menu', ban: 'Menu', pl: 'Menu', uk: 'Меню' },
  close: { ru: 'Закрыть', en: 'Close', id: 'Tutup', fr: 'Fermer', de: 'Schließen', zh: '关闭', nl: 'Sluiten', ban: 'Tutup', pl: 'Zamknij', uk: 'Закрити' },
  openMenu: { ru: 'Открыть меню', en: 'Open menu', id: 'Buka menu', fr: 'Ouvrir le menu', de: 'Menü öffnen', zh: '打开菜单', nl: 'Menu openen', ban: 'Ngampakang menu', pl: 'Otwórz menu', uk: 'Відкрити меню' },
  closeMenu: { ru: 'Закрыть меню', en: 'Close menu', id: 'Tutup menu', fr: 'Fermer le menu', de: 'Menü schließen', zh: '关闭菜单', nl: 'Menu sluiten', ban: 'Nutup menu', pl: 'Zamknij menu', uk: 'Закрити меню' },
  currency: { ru: 'Валюта', en: 'Currency', id: 'Mata uang', fr: 'Devise', de: 'Währung', zh: '货币', nl: 'Valuta', ban: 'Mata uang', pl: 'Waluta', uk: 'Валюта' },
  language: { ru: 'Язык', en: 'Language', id: 'Bahasa', fr: 'Langue', de: 'Sprache', zh: '语言', nl: 'Taal', ban: 'Basa', pl: 'Język', uk: 'Мова' },
  account: { ru: 'Личный кабинет', en: 'Account', id: 'Akun', fr: 'Mon compte', de: 'Mein Konto', zh: '我的账户', nl: 'Mijn account', ban: 'Akun', pl: 'Moje konto', uk: 'Особистий кабінет' },
  home: { ru: 'Balinsky — на главную', en: 'Balinsky — home', id: 'Balinsky — beranda', fr: 'Balinsky — accueil', de: 'Balinsky — Startseite', zh: 'Balinsky — 首页', nl: 'Balinsky — home', ban: 'Balinsky — beranda', pl: 'Balinsky — strona główna', uk: 'Balinsky — на головну' },
}

// Вторая часть мобильного меню: короткие подписи, две колонки.
const MENU_MORE: { seg: string; label: Record<Lang, string>; ruOnly?: boolean }[] = [
  { seg: 'kak-kupit', label: { ru: 'Как купить', en: 'How to buy', id: 'Cara membeli', fr: 'Comment acheter', de: 'Kaufen', zh: '如何购房', nl: 'Kopen', ban: 'Carane numbas', pl: 'Jak kupić', uk: 'Як купити' } },
  { seg: 'arenda', label: { ru: 'Аренда', en: 'Rental', id: 'Sewa', fr: 'Location', de: 'Miete', zh: '租赁', nl: 'Huur', ban: 'Sewa', pl: 'Wynajem', uk: 'Оренда' } },
  { seg: 'zastrojshhiki', label: { ru: 'Застройщики', en: 'Developers', id: 'Pengembang', fr: 'Promoteurs', de: 'Bauträger', zh: '开发商', nl: 'Ontwikkelaars', ban: 'Pangwangun', pl: 'Deweloperzy', uk: 'Забудовники' } },
  // Перепродажа есть только в русской версии.
  { seg: 'pereprodazha', ruOnly: true, label: { ru: 'Перепродажа', en: 'Resale', id: 'Jual kembali', fr: 'Revente', de: 'Wiederverkauf', zh: '转售', nl: 'Doorverkoop', ban: 'Adol malih', pl: 'Odsprzedaż', uk: 'Перепродаж' } },
  { seg: 'tseny-na-nedvizhimost-bali', label: { ru: 'Цены по районам', en: 'Prices by area', id: 'Harga per kawasan', fr: 'Prix par quartier', de: 'Preise nach Gegend', zh: '各区价格', nl: 'Prijzen per gebied', ban: 'Harga per kawasan', pl: 'Ceny według rejonów', uk: 'Ціни за районами' } },
  { seg: 'novosti', label: { ru: 'Новости', en: 'News', id: 'Berita', fr: 'Actualités', de: 'Neuigkeiten', zh: '新闻', nl: 'Nieuws', ban: 'Berita', pl: 'Aktualności', uk: 'Новини' } },
  { seg: 'izbrannoe', label: WISHLIST_LABEL },
  { seg: 'znaniya', label: { ru: 'Знания', en: 'Knowledge', id: 'Pengetahuan', fr: 'Savoir', de: 'Wissen', zh: '知识库', nl: 'Kennisbank', ban: 'Kaweruh', pl: 'Wiedza', uk: 'Знання' } },
]

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
const CAP = 'text-[12px] uppercase tracking-[0.08em] text-[#6B7570]'

function Wordmark({ size }: { size: 'lg' | 'sm' }) {
  return (
    <>
      <Image src="/logo.svg" alt="" width={36} height={36} className={size === 'lg' ? 'h-9 w-9' : 'h-8 w-8'} priority />
      <span className={`${size === 'lg' ? 'text-[20px]' : 'text-[18px]'} font-semibold tracking-[-0.02em] text-[#0F1A15]`}>Balinsky</span>
    </>
  )
}

export function Header({ active }: { active?: NavKey }) {
  const [open, setOpen] = useState(false)
  // Mobile: hide the bar on scroll-down, reveal on scroll-up. From md up
  // it stays pinned (md:translate-y-0 below). The menu being open forces
  // it visible so the close button never scrolls away.
  const [hidden, setHidden] = useState(false)
  const pathname = usePathname() ?? ''
  const lang: Lang = detectLang(pathname)
  const seg = langToSegment(lang)
  const guideHref = `/${seg}/${localizeSegment(GUIDE_SEG, lang)}`
  const onGuide = pathname.split('/')[2] === localizeSegment(GUIDE_SEG, lang)
  const { items, ready } = useWishlist()
  const wishCount = ready ? items.length : 0

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

  // Метка для прилипающих полос под шапкой (строка глав виллы): когда шапка
  // на телефоне уехала вверх, они поднимаются на её место.
  useEffect(() => {
    const h = document.documentElement
    if (hidden && !open) h.setAttribute('data-header-hidden', '1')
    else h.removeAttribute('data-header-hidden')
  }, [hidden, open])

  // Открытое меню закрывает страницу целиком: прокрутка под ним замирает,
  // Esc закрывает, на широком экране (меню там нет) оно само сворачивается.
  useEffect(() => {
    if (!open) return
    const h = document.documentElement
    const prev = h.style.overflow
    h.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const mq = window.matchMedia('(min-width: 1024px)')
    const onWide = () => { if (mq.matches) setOpen(false) }
    document.addEventListener('keydown', onKey)
    mq.addEventListener('change', onWide)
    return () => {
      h.style.overflow = prev
      document.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onWide)
    }
  }, [open])

  const close = () => setOpen(false)
  const navHref = (key: NavKey) => `/${seg}/${localizeSegment(key, lang)}`

  return (
    <header
      className={`sticky top-0 ${open ? 'z-[45]' : 'z-20'} w-full bg-white border-b border-[#ECEFED] transition-transform duration-300 will-change-transform md:translate-y-0 ${
        hidden && !open ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-[72px] flex items-center gap-3 lg:gap-8 xl:gap-12">
        <Link href={`/${seg}`} onClick={close} aria-label={pickCopy(COPY.home, lang)} className={`flex shrink-0 items-center gap-2 lg:gap-3 rounded-sm no-underline ${FOCUS}`}>
          <span className="contents lg:hidden"><Wordmark size="sm" /></span>
          <span className="hidden lg:contents"><Wordmark size="lg" /></span>
        </Link>

        {/* Компьютер: разделы словами, активный подчёркнут чёрной линией. */}
        <nav aria-label={pickCopy(COPY.sections, lang)} className="hidden lg:flex items-stretch self-stretch gap-6 xl:gap-8">
          {NAV.map(({ key, labelKey }) => {
            const isActive = key === active
            return (
              <Link
                key={key}
                href={navHref(key)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center whitespace-nowrap text-[15px] font-medium text-[#0F1A15] no-underline transition-colors duration-[120ms] hover:text-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                  isActive ? 'shadow-[inset_0_-2px_0_#0F1A15]' : ''
                }`}
              >
                {t(labelKey, lang)}
              </Link>
            )
          })}
          <span aria-hidden className="hidden xl:block self-center h-5 w-px bg-[#DDE2DF]" />
          <Link
            href={guideHref}
            aria-current={onGuide ? 'page' : undefined}
            className={`hidden xl:flex items-center whitespace-nowrap text-[15px] no-underline transition-colors duration-[120ms] hover:text-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
              onGuide ? 'text-[#0F1A15] shadow-[inset_0_-2px_0_#0F1A15]' : 'text-[#4A5550]'
            }`}
          >
            {pickCopy(COPY.guide, lang)}
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 lg:gap-6">
          {/* Обёртки решают, что видно на какой ширине: у самих контролов свой display. */}
          <span className="hidden lg:contents">
            <WishlistHeaderLink />
            <span aria-hidden className="h-5 w-px bg-[#DDE2DF]" />
            <CurrencyToggle variant="plain" />
            <LangSwitch variant="plain" />
          </span>
          <span className="contents lg:hidden">
            <WishlistHeaderLink variant="icon" />
          </span>
          {/* Вошедшему — кружок кабинета (22.10.2026); показ переключает метка
              data-auth из куки bx_auth, как и гейт аналитики, поэтому без мигания.
              Кнопку «Pro» для не вошедших убрали (владелец 20.11.2026). */}
          <Link
            href="/kabinet"
            aria-label={pickCopy(COPY.account, lang)}
            className="bx-auth-only h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white no-underline ring-2 ring-[var(--color-primary)] ring-offset-2 transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)]"
          >
            <UserRound size={16} strokeWidth={2} aria-hidden />
          </Link>
          <button
            type="button"
            className={`lg:hidden ml-1 inline-flex h-11 items-center gap-2 rounded-lg px-1 text-[15px] font-medium text-[#0F1A15] ${FOCUS}`}
            aria-label={pickCopy(open ? COPY.closeMenu : COPY.openMenu, lang)}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen(v => !v)}
          >
            <span aria-hidden>{pickCopy(open ? COPY.close : COPY.menu, lang)}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div
          id="site-menu"
          className="lg:hidden absolute inset-x-0 top-full h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain bg-white animate-[bx-menu-in_200ms_cubic-bezier(.2,.8,.2,1)] motion-reduce:animate-none"
        >
          <div className="flex min-h-full flex-col">
            <nav aria-label={pickCopy(COPY.sections, lang)} className="flex flex-col px-4 pt-2 sm:px-6">
              {NAV.map(({ key, labelKey }, i) => {
                const isActive = key === active
                return (
                  <Link
                    key={key}
                    href={navHref(key)}
                    onClick={close}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-baseline gap-3 py-4 no-underline text-[#0F1A15] transition-colors duration-[120ms] hover:text-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                      i === 0 ? 'border-t-2 border-[#0F1A15]' : 'border-t border-[#ECEFED]'
                    } ${i === NAV.length - 1 ? 'border-b border-b-[#ECEFED]' : ''}`}
                  >
                    <span className="w-6 shrink-0 text-[13px] tabular-nums text-[#6B7570]">{String(i + 1).padStart(2, '0')}</span>
                    <span className={`text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] ${isActive ? 'underline decoration-2 underline-offset-[6px]' : ''}`}>{t(labelKey, lang)}</span>
                  </Link>
                )
              })}
            </nav>

            <ul className="grid grid-cols-2 gap-x-4 px-4 pt-4 pb-8 sm:px-6">
              {MENU_MORE.filter(m => !m.ruOnly || lang === 'ru').map(m => (
                <li key={m.seg}>
                  <Link
                    href={switchLangPath(`/ru/${m.seg}`, lang)}
                    onClick={close}
                    className={`flex min-h-11 items-center py-2 text-[16px] text-[#0F1A15] no-underline transition-colors duration-[120ms] hover:text-[var(--color-primary-pressed)] ${FOCUS}`}
                  >
                    {m.seg === 'izbrannoe' && <Heart size={16} strokeWidth={2} aria-hidden className="mr-2 shrink-0" />}
                    {pickCopy(m.label, lang)}
                    {m.seg === 'izbrannoe' && wishCount > 0 && <span className="tabular-nums text-[#6B7570]">&nbsp;·&nbsp;{wishCount}</span>}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-auto flex flex-col gap-4 bg-[#F6F8F7] px-4 pt-6 pb-8 sm:px-6">
              <div className="flex flex-col gap-2">
                <span className={CAP} aria-hidden>{pickCopy(COPY.currency, lang)}</span>
                <CurrencySegments />
              </div>
              <div className="flex flex-col gap-2">
                <span className={CAP} aria-hidden>{pickCopy(COPY.language, lang)}</span>
                <LangSwitch variant="field" />
              </div>
              <div className="flex gap-6 pt-2 text-[15px] font-medium">
                <a href="https://t.me/itrealtor" target="_blank" rel="noopener noreferrer" className={`rounded-sm text-[#0F1A15] underline underline-offset-4 hover:text-[var(--color-primary-pressed)] ${FOCUS}`}>Telegram&nbsp;↗</a>
                <a href="https://www.youtube.com/@balinsky_info" target="_blank" rel="noopener noreferrer" className={`rounded-sm text-[#0F1A15] underline underline-offset-4 hover:text-[var(--color-primary-pressed)] ${FOCUS}`}>YouTube&nbsp;↗</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
