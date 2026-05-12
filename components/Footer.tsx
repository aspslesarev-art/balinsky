import Link from 'next/link'
import { Send, Play } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

type Col = { title: string; links: { label: string; href: string }[] }

const COLS_BY_LANG: Record<Lang, Col[]> = {
  ru: [
    {
      title: 'Застройщики',
      links: [
        { label: 'Рейтинг', href: '/ru/zastrojshhiki' },
        { label: 'Мероприятия', href: '/ru/meropriyatiya' },
        { label: 'Акции', href: '/ru/akcii' },
      ],
    },
    {
      title: 'Недвижимость',
      links: [
        { label: 'Жилые комплексы', href: '/ru/zhilye-kompleksy' },
        { label: 'Виллы', href: '/ru/villy' },
        { label: 'Апартаменты', href: '/ru/apartamenty' },
        { label: 'Аренда', href: '/ru/arenda' },
      ],
    },
    {
      title: 'Информация',
      links: [
        { label: 'Инвест-тур', href: '/ru/invest-tour' },
        { label: 'Как купить на Бали', href: '/ru/kak-kupit' },
        { label: 'Бронирование', href: '/ru/rezervirovanie' },
        { label: 'Новости', href: '/ru/novosti' },
        { label: 'Знания', href: '/ru/znaniya' },
      ],
    },
    {
      title: 'Услуги',
      links: [
        { label: 'Агенты', href: '#' },
      ],
    },
    {
      title: 'Работа',
      links: [
        { label: 'Вакансии агентств', href: '#' },
        { label: 'Вакансии застройщиков', href: '#' },
      ],
    },
  ],
  en: [
    {
      title: 'Developers',
      links: [
        { label: 'Directory', href: '/en/developers' },
        { label: 'Events', href: '/en/events' },
        { label: 'Promotions', href: '/en/promo' },
      ],
    },
    {
      title: 'Real estate',
      links: [
        { label: 'Residential complexes', href: '/en/complexes' },
        { label: 'Villas', href: '/en/villas' },
        { label: 'Apartments', href: '/en/apartments' },
        { label: 'Long-term rental', href: '/en/rental' },
      ],
    },
    {
      title: 'Information',
      links: [
        { label: 'Invest tour', href: '/en/invest-tour' },
        { label: 'How to buy in Bali', href: '/en/how-to-buy' },
        { label: 'Reservation', href: '/en/reservation' },
        { label: 'News', href: '/en/news' },
        { label: 'Knowledge', href: '/en/knowledge' },
      ],
    },
    {
      title: 'Services',
      links: [
        { label: 'Agents', href: '#' },
      ],
    },
    {
      title: 'Jobs',
      links: [
        { label: 'Agency vacancies', href: '#' },
        { label: 'Developer vacancies', href: '#' },
      ],
    },
  ],
}

const BOTTOM_BY_LANG: Record<Lang, { label: string; href: string }[]> = {
  ru: [
    { label: 'О нас', href: '/ru/o-balinsky' },
    { label: 'Реклама', href: '#' },
    { label: 'Сотрудничество с застройщиками', href: '#' },
    { label: 'Сотрудничество с агентствами', href: '#' },
    { label: 'Политика конфиденциальности', href: '#' },
    { label: 'Связаться', href: '#' },
  ],
  en: [
    { label: 'About', href: '/en/about' },
    { label: 'Advertising', href: '#' },
    { label: 'Developer partnerships', href: '#' },
    { label: 'Agency partnerships', href: '#' },
    { label: 'Privacy policy', href: '#' },
    { label: 'Contact', href: '#' },
  ],
}

const LICENSE_BY_LANG: Record<Lang, string> = {
  ru: 'Все материалы сайта доступны по лицензии Creative Commons Attribution 4.0 International. Вы должны указать имя автора (создателя) произведения (материала) и стороны атрибуции, уведомление об авторских правах, название лицензии, уведомление об оговорке и ссылку на материал, если они предоставлены вместе с материалом.',
  en: 'All site materials are available under the Creative Commons Attribution 4.0 International licence. You must give appropriate credit to the author of the work, indicate the licence with a notice and link to the material when it is provided alongside the original.',
}

export function Footer({ lang = 'ru' }: { lang?: Lang }) {
  const cols = COLS_BY_LANG[lang]
  const bottom = BOTTOM_BY_LANG[lang]
  const license = LICENSE_BY_LANG[lang]
  return (
    <footer className="mt-auto bg-[var(--color-header-bg)] border-t border-[var(--color-border)]">
      <div className="max-w-[1280px] mx-auto px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 lg:col-span-4">
            <Link href={lang === 'en' ? '/en' : '/'} aria-label="Balinsky" className="inline-block mb-5">
              <img src="/logo.svg" alt="Balinsky" className="h-10 w-10" />
            </Link>
            <p className="text-[13px] leading-[1.6] text-[var(--color-text-muted)] max-w-[380px]">
              {license}
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a
                href="https://t.me/itrealtor"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="text-[#229ED9] hover:opacity-80"
              >
                <Send size={22} />
              </a>
              <a
                href="https://www.youtube.com/@balinsky_info"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="inline-flex items-center justify-center w-9 h-6 rounded-md bg-[#FF0000] text-white hover:opacity-80"
              >
                <Play size={14} fill="currentColor" />
              </a>
            </div>
          </div>

          <div className="md:col-span-8 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-4">
            {cols.map(col => (
              <div key={col.title}>
                <div className="text-[12px] uppercase tracking-wide font-semibold text-[var(--color-text-muted)] mb-4">
                  {col.title}
                </div>
                <ul className="space-y-3">
                  {col.links.map(l => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-[14px] text-[#111827] hover:text-[var(--color-primary-pressed)] no-underline"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[var(--color-border)]">
          <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[13px] text-[var(--color-text)]">
            {bottom.map(l => (
              <li key={l.label}>
                <Link href={l.href} className="hover:text-[var(--color-primary-pressed)] no-underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-5 text-center text-[12px] text-[var(--color-text-muted)]">
            Copyright © 2022–2026 Balinsky.info. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
