import Link from 'next/link'
import {
  DISTRICT_TO_SLUG,
  BEDROOM_TO_SLUG,
  STATUS_TO_SLUG,
} from '@/lib/seo-routes'
import type { Lang } from '@/lib/i18n'

const POPULAR_DISTRICTS = [
  'Berawa',
  'Sanur',
  'Ubud',
  'Uluwatu',
  'Pererenan',
  'Pandawa',
  'Batu Bolong',
  'Cemagi',
]

type FaqItem = { q: string; a: string }
const FAQ_ITEMS: Record<Lang, FaqItem[]> = {
  ru: [
    { q: 'Какие застройщики работают на Бали?',
      a: 'На острове активно более 80 застройщиков. Среди заметных — Alex Villas, Magnum Estate, BREIG, Bali Capital Group, Anta Group, Taryan Group, Oceaniq, Sunny Development. Большинство специализируется на 1–2 районах Бали.' },
    { q: 'Как проверить надёжность застройщика?',
      a: 'Стандартные сигналы: количество сданных проектов, наличие управляющей компании, действующее разрешение PBG/SLF на текущей стройке, прозрачная схема владения (лизхолд / freehold), отзывы прошлых покупателей. На карточке каждого застройщика мы агрегируем эти параметры.' },
    { q: 'Где больше новых проектов?',
      a: 'Самые активные локации по числу строящихся комплексов сейчас — Чангу (Berawa, Batu Bolong, Pererenan), Букит (Uluwatu, Pandawa, Melasti) и Убуд. На востоке набирает Санур, на севере полуострова — Cemagi и Seseh.' },
    { q: 'Можно ли купить объект напрямую у застройщика?',
      a: 'Да. Большинство застройщиков на Бали продают свои объекты напрямую без посредников. Сделка оформляется у нотариуса PPAT, оплата идёт по графику, привязанному к этапам строительства.' },
    { q: 'Какая комиссия агента?',
      a: 'Если выходить через агента, ставка обычно 3–5% от стоимости объекта. Многие застройщики дают эту скидку покупателю, если тот приходит напрямую.' },
  ],
  en: [
    { q: 'Which developers are active in Bali?',
      a: 'There are 80+ active developers on the island. Notable names: Alex Villas, Magnum Estate, BREIG, Bali Capital Group, Anta Group, Taryan Group, Oceaniq, Sunny Development. Most specialise in 1–2 districts.' },
    { q: 'How do I verify a developer is reliable?',
      a: 'Standard signals: number of completed projects, presence of a real management company, an active PBG/SLF permit on the current build, transparent ownership (leasehold / freehold), and reviews from past buyers. We aggregate these on each developer card.' },
    { q: 'Where are most new projects being built?',
      a: 'The most active areas right now are Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa, Melasti) and Ubud. Sanur is growing on the east coast, and Cemagi / Seseh on the north of the peninsula.' },
    { q: 'Can I buy a property directly from the developer?',
      a: 'Yes. Most Bali developers sell directly without intermediaries. The deal is closed at a PPAT notary, payment runs on a schedule tied to construction milestones.' },
    { q: 'What is the agent commission?',
      a: 'When buying through an agent, expect 3–5% of the property price. Many developers will pass this saving to a buyer who comes directly.' },
  ],
}

const COPY = {
  ru: {
    chooseHeading: 'Как выбрать застройщика на Бали',
    chooseP1: 'Главные критерии — сданные проекты, прозрачная юридическая схема и управляющая компания после ввода. Сданные проекты показывают, что застройщик умеет довести стройку до конца и соблюдает обещанное качество. Юридическая схема (лизхолд или freehold, действующее разрешение PBG / SLF) гарантирует, что вы получите оформленную собственность. Управляющая компания — критично, если апартамент покупается под аренду: без неё доходность 8–12% годовых превращается в полноценную самозанятость владельца.',
    chooseP2: 'В каждой карточке мы агрегируем рейтинги по 4 направлениям: строительство и недвижимость, репутация и опыт, техника и производство, управляющая компания. Это помогает быстро сравнить десятки игроков и не зависеть от одного отзыва.',
    districtsHeading: 'Застройщики по районам Бали',
    districtsLead: 'Большинство новых проектов сосредоточено в районах Чангу (Berawa, Batu Bolong, Pererenan), на Буките (Uluwatu, Pandawa) и в Убуде. Здесь работают самые активные застройщики с апартаментами, виллами и инвестиционными комплексами.',
    devsIn: (n: string) => `Застройщики в ${n}`,
    newIn: (n: string) => `Новостройки в ${n}`,
    allComplexes: 'Жилые комплексы Бали',
    relatedHeading: 'По теме',
    related: [
      { href: '/ru/zhilye-kompleksy', label: 'Жилые комплексы на Бали' },
      { href: '/ru/apartamenty', label: 'Апартаменты от застройщиков' },
      { href: '/ru/villy', label: 'Виллы и дома' },
      { href: `/ru/apartamenty/${BEDROOM_TO_SLUG['1']}`, label: '1-комнатные апартаменты' },
      { href: `/ru/apartamenty/${BEDROOM_TO_SLUG['2']}`, label: '2-комнатные апартаменты' },
      { href: `/ru/apartamenty/${STATUS_TO_SLUG.building}`, label: 'Строящиеся апартаменты' },
      { href: `/ru/apartamenty/${STATUS_TO_SLUG.built}`, label: 'Готовые апартаменты' },
      { href: '/ru/apartamenty/100000-200000', label: 'Апартаменты 100–200 тыс. $' },
    ],
    faqHeading: 'Часто задаваемые вопросы',
  },
  en: {
    chooseHeading: 'How to choose a Bali developer',
    chooseP1: 'The main criteria are completed projects, a transparent legal structure, and a management company after handover. Completed projects show the developer can finish a build and meet the promised quality. The legal structure (leasehold or freehold, an active PBG / SLF permit) guarantees you receive properly registered ownership. The management company is critical if you buy an apartment to rent — without one, the 8–12% annual yield turns into a full-time self-employment job for the owner.',
    chooseP2: 'On every card we aggregate scores across four dimensions: construction & real estate, reputation & experience, equipment & production, and management company. This lets you quickly compare dozens of players without relying on a single review.',
    districtsHeading: 'Developers by Bali district',
    districtsLead: 'Most new projects are clustered in Canggu (Berawa, Batu Bolong, Pererenan), on Bukit (Uluwatu, Pandawa) and in Ubud. These districts host the most active developers with apartments, villas and investment complexes.',
    devsIn: (n: string) => `Developers in ${n}`,
    newIn: (n: string) => `New builds in ${n}`,
    allComplexes: 'Bali residential complexes',
    relatedHeading: 'Related',
    related: [
      { href: '/en/complexes', label: 'Bali residential complexes' },
      { href: '/en/apartments', label: 'Apartments from developers' },
      { href: '/en/villas', label: 'Villas and houses' },
      { href: `/en/apartments/${BEDROOM_TO_SLUG['1']}`, label: '1-bedroom apartments' },
      { href: `/en/apartments/${BEDROOM_TO_SLUG['2']}`, label: '2-bedroom apartments' },
      { href: `/en/apartments/${STATUS_TO_SLUG.building}`, label: 'Apartments under construction' },
      { href: `/en/apartments/${STATUS_TO_SLUG.built}`, label: 'Completed apartments' },
      { href: '/en/apartments/100000-200000', label: 'Apartments $100k–200k' },
    ],
    faqHeading: 'Frequently asked questions',
  },
} as const

export function DevelopersSeoContent({ lang = 'ru' }: { lang?: Lang }) {
  const c = COPY[lang]
  const items = FAQ_ITEMS[lang]
  const districtRoot = lang === 'en' ? '/en/apartments' : '/ru/apartamenty'

  const districtLinks = POPULAR_DISTRICTS.map(d => ({
    name: d,
    slug: DISTRICT_TO_SLUG[d],
  })).filter(x => x.slug)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <section className="mt-12 pt-10 border-t border-[var(--color-border)]">
      <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[var(--color-text)] mb-4">
        {c.chooseHeading}
      </h2>
      <div className="prose-balinsky max-w-3xl space-y-3 text-[15px] leading-relaxed text-[var(--color-text)]">
        <p>{c.chooseP1}</p>
        <p className="text-[var(--color-text-muted)]">{c.chooseP2}</p>
      </div>

      <div className="mt-10">
        <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[var(--color-text)] mb-3">
          {c.districtsHeading}
        </h2>
        <p className="max-w-3xl text-[14px] leading-relaxed text-[var(--color-text-muted)] mb-5">
          {c.districtsLead}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {districtLinks.flatMap(d => [
            {
              key: `dev-${d.slug}`,
              href: `${districtRoot}/${d.slug}`,
              label: c.devsIn(d.name),
              accent: true,
            },
            {
              key: `new-${d.slug}`,
              href: `${districtRoot}/${d.slug}/${STATUS_TO_SLUG.building}`,
              label: c.newIn(d.name),
              accent: false,
            },
          ]).map(chip => (
            <li key={chip.key}>
              <Link
                href={chip.href}
                className={`inline-block px-3 py-1.5 rounded-full border text-[13px] transition-colors ${
                  chip.accent
                    ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary-soft)] text-[var(--color-primary-pressed)] hover:border-[var(--color-primary)]'
                    : 'bg-[var(--color-card-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
                }`}
              >
                {chip.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={lang === 'en' ? '/en/complexes' : '/ru/zhilye-kompleksy'}
              className="inline-block px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
            >
              {c.allComplexes}
            </Link>
          </li>
        </ul>
      </div>

      <div className="mt-10">
        <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[var(--color-text)] mb-4">
          {c.relatedHeading}
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 max-w-3xl">
          {c.related.map(l => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex items-center gap-2 text-[14px] text-[var(--color-text)] hover:text-[var(--color-primary-pressed)] transition-colors"
              >
                <span className="text-[var(--color-primary)]">→</span> {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12">
        <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[var(--color-text)] mb-4">
          {c.faqHeading}
        </h2>
        <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
          {items.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-medium text-[var(--color-text)]">
                {item.q}
                <span className="text-[var(--color-text-muted)] text-[20px] leading-none transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </section>
  )
}
