import Link from 'next/link'
import { Send, Play } from 'lucide-react'

type Col = { title: string; links: { label: string; href: string }[] }

const COLS: Col[] = [
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
]

const BOTTOM = [
  { label: 'О нас', href: '#' },
  { label: 'Реклама', href: '#' },
  { label: 'Сотрудничество с застройщиками', href: '#' },
  { label: 'Сотрудничество с агентствами', href: '#' },
  { label: 'Политика конфиденциальности', href: '#' },
  { label: 'Связаться', href: '#' },
]

export function Footer() {
  return (
    <footer className="mt-auto bg-[var(--color-header-bg)] border-t border-[var(--color-border)]">
      <div className="max-w-[1280px] mx-auto px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 lg:col-span-4">
            <Link href="/" aria-label="Balinsky" className="inline-block mb-5">
              <img src="/logo.svg" alt="Balinsky" className="h-10 w-10" />
            </Link>
            <p className="text-[13px] leading-[1.6] text-[var(--color-text-muted)] max-w-[380px]">
              Все материалы сайта доступны по лицензии Creative Commons Attribution 4.0 International.
              Вы должны указать имя автора (создателя) произведения (материала) и стороны атрибуции,
              уведомление об авторских правах, название лицензии, уведомление об оговорке и ссылку
              на материал, если они предоставлены вместе с материалом.
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
            {COLS.map(col => (
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
            {BOTTOM.map(l => (
              <li key={l.label}>
                <Link href={l.href} className="hover:text-[var(--color-primary-pressed)] no-underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-5 text-center text-[13px] text-[var(--color-text-muted)]">
            Copyright © {new Date().getFullYear()} Balinsky.info. All rights reserved.
          </div>
          <div className="mt-3 text-center text-[12px] leading-[1.7] text-[var(--color-text-muted)]">
            <div>Individual Entrepreneur Andrei Slesarau (Georgia)</div>
            <div>Reg. No. 316362404 · Registered 06 Jan 2022</div>
            <div>19 Shartava St., Rustavi, Georgia</div>
            <div>
              Site: <a href="https://balinsky.info" className="hover:text-[var(--color-primary-pressed)] no-underline">balinsky.info</a>
              {' · '}Email: <a href="mailto:i@balinsky.info" className="hover:text-[var(--color-primary-pressed)] no-underline">i@balinsky.info</a>
              {' · '}WhatsApp: <a href="https://wa.me/628873173613" className="hover:text-[var(--color-primary-pressed)] no-underline">+62 887 3173 613</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
