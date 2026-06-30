import Link from 'next/link'
import Image from 'next/image'
import { Send, Play } from 'lucide-react'
import type { Lang } from '@/lib/i18n'

type Col = { title: string; links: { label: string; href: string }[] }

// "Built with" credibility row. Wording follows the official Microsoft for
// Startups PR toolkit (allowed: "part of Microsoft for Startups", "Microsoft
// Azure"; not allowed: "backed by"/"partner"/MS logo — the badge is the
// sanctioned visual). The ElevenLabs link satisfies the Grants requirement to
// link elevenlabs.io. Only render when the claims are actually true.
const TECH: Record<Lang, { label: string; note: string }> = {
  ru: {
    label: 'На технологиях',
    note: 'Balinsky — участник Microsoft for Startups, работает на Microsoft Azure. Голосовые технологии — ElevenLabs Grants.',
  },
  en: {
    label: 'Built with',
    note: 'Balinsky is part of Microsoft for Startups, built on Microsoft Azure. Voice by ElevenLabs Grants.',
  },
}

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
        { label: 'Инвестиции в недвижимость Бали', href: '/ru/investicii-v-nedvizhimost-bali' },
        { label: 'Жизнь на Бали — ВНЖ и налоги', href: '/ru/zhizn-na-bali' },
        { label: 'Как купить на Бали', href: '/ru/kak-kupit' },
        { label: 'Инвест-тур', href: '/ru/invest-tour' },
        { label: 'Бронирование', href: '/ru/rezervirovanie' },
        { label: 'Новости', href: '/ru/novosti' },
        { label: 'Знания', href: '/ru/znaniya' },
      ],
    },
    {
      title: 'Услуги',
      links: [
        { label: 'Агенты', href: '/ru/zastrojshhiki' },
      ],
    },
    {
      title: 'Работа',
      links: [
        // Vacancy boards aren't built yet — route to the contact page so
        // the link is at least a working «interested in working with us»
        // entry point instead of a dead `#`.
        { label: 'Вакансии агентств', href: '/ru/kontakty' },
        { label: 'Вакансии застройщиков', href: '/ru/kontakty' },
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
        { label: 'Bali property investment', href: '/en/bali-property-investment' },
        { label: 'Living in Bali — visas & taxes', href: '/en/living-in-bali' },
        { label: 'How to buy in Bali', href: '/en/how-to-buy' },
        { label: 'Invest tour', href: '/en/invest-tour' },
        { label: 'Reservation', href: '/en/reservation' },
        { label: 'News', href: '/en/news' },
        { label: 'Knowledge', href: '/en/knowledge' },
      ],
    },
    {
      title: 'Services',
      links: [
        { label: 'Agents', href: '/en/developers' },
      ],
    },
    {
      title: 'Jobs',
      links: [
        { label: 'Agency vacancies', href: '/en/contact' },
        { label: 'Developer vacancies', href: '/en/contact' },
      ],
    },
  ],
}

const BOTTOM_BY_LANG: Record<Lang, { label: string; href: string }[]> = {
  ru: [
    { label: 'О нас', href: '/ru/o-balinsky' },
    { label: 'Реклама', href: '/ru/kontakty' },
    { label: 'Сотрудничество с застройщиками', href: '/ru/kontakty' },
    { label: 'Сотрудничество с агентствами', href: '/ru/kontakty' },
    { label: 'Политика конфиденциальности', href: '/ru/politika-konfidencialnosti' },
    { label: 'Условия использования', href: '/ru/usloviya' },
    { label: 'Cookie', href: '/ru/cookie' },
    { label: 'Связаться', href: '/ru/kontakty' },
  ],
  en: [
    { label: 'About', href: '/en/about' },
    { label: 'Advertising', href: '/en/contact' },
    { label: 'Developer partnerships', href: '/en/contact' },
    { label: 'Agency partnerships', href: '/en/contact' },
    { label: 'Privacy policy', href: '/en/privacy' },
    { label: 'Terms of use', href: '/en/terms' },
    { label: 'Cookie', href: '/en/cookie' },
    { label: 'Contact', href: '/en/contact' },
  ],
}

const LICENSE_BY_LANG: Record<Lang, string> = {
  ru: 'Все материалы сайта доступны по лицензии Creative Commons Attribution 4.0 International. Вы должны указать имя автора (создателя) произведения (материала) и стороны атрибуции, уведомление об авторских правах, название лицензии, уведомление об оговорке и ссылку на материал, если они предоставлены вместе с материалом.',
  en: 'All site materials are available under the Creative Commons Attribution 4.0 International licence. You must give appropriate credit to the author of the work, indicate the licence with a notice and link to the material when it is provided alongside the original.',
}

export function Footer({ lang = 'ru' }: { lang?: Lang }) {
  const cols = COLS_BY_LANG[lang]
  const bottom = BOTTOM_BY_LANG[lang]
  const tech = TECH[lang]
  const license = LICENSE_BY_LANG[lang]
  return (
    <footer className="mt-auto bg-[var(--color-header-bg)] border-t border-[var(--color-border)]">
      <div className="max-w-[1280px] mx-auto px-6 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 lg:col-span-4">
            <Link href={lang === 'en' ? '/en' : '/'} aria-label="Balinsky" className="inline-block mb-5">
              <Image src="/logo.svg" alt="Balinsky" width={40} height={40} className="h-10 w-10" />
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
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">{tech.label}</div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://startups.microsoft.com"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-85 hover:opacity-100 transition-opacity"
                aria-label="Microsoft for Startups"
              >
                <Image src="/badges/microsoft-for-startups.jpg" alt="Microsoft for Startups" width={120} height={51} className="h-9 w-auto" />
              </a>
              <a
                href="https://elevenlabs.io"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ElevenLabs Grants"
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 h-9 text-[13px] text-[#111827] no-underline hover:border-[var(--color-primary)] transition-colors"
              >
                <span className="font-semibold">ElevenLabs</span>
                <span className="text-[var(--color-text-muted)]">Grants</span>
              </a>
            </div>
            <p className="text-[12px] text-[var(--color-text-muted)] text-center max-w-[520px] leading-[1.5]">{tech.note}</p>
          </div>

          <div className="mt-5 text-center text-[12px] text-[var(--color-text-muted)]">
            Copyright © 2022–2026 Balinsky.info. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
