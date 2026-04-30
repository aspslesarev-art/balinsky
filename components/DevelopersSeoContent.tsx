import Link from 'next/link'
import {
  DISTRICT_TO_SLUG,
  BEDROOM_TO_SLUG,
  STATUS_TO_SLUG,
} from '@/lib/seo-routes'

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

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Какие застройщики работают на Бали?',
    a: 'На острове активно более 80 застройщиков. Среди заметных — Alex Villas, Magnum Estate, BREIG, Bali Capital Group, Anta Group, Taryan Group, Oceaniq, Sunny Development. Большинство специализируется на 1–2 районах Бали.',
  },
  {
    q: 'Как проверить надёжность застройщика?',
    a: 'Стандартные сигналы: количество сданных проектов, наличие управляющей компании, действующее разрешение PBG/SLF на текущей стройке, прозрачная схема владения (лизхолд / freehold), отзывы прошлых покупателей. На карточке каждого застройщика мы агрегируем эти параметры.',
  },
  {
    q: 'Где больше новых проектов?',
    a: 'Самые активные локации по числу строящихся комплексов сейчас — Чангу (Berawa, Batu Bolong, Pererenan), Букит (Uluwatu, Pandawa, Melasti) и Убуд. На востоке набирает Санур, на севере полуострова — Cemagi и Seseh.',
  },
  {
    q: 'Можно ли купить объект напрямую у застройщика?',
    a: 'Да. Большинство застройщиков на Бали продают свои объекты напрямую без посредников. Сделка оформляется у нотариуса PPAT, оплата идёт по графику, привязанному к этапам строительства.',
  },
  {
    q: 'Какая комиссия агента?',
    a: 'Если выходить через агента, ставка обычно 3–5% от стоимости объекта. Многие застройщики дают эту скидку покупателю, если тот приходит напрямую.',
  },
]

export function DevelopersSeoContent() {
  const districtLinks = POPULAR_DISTRICTS.map(d => ({
    name: d,
    slug: DISTRICT_TO_SLUG[d],
  })).filter(x => x.slug)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <section className="mt-12 pt-10 border-t border-[var(--color-border)]">
      <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[var(--color-text)] mb-4">
        Как выбрать застройщика на Бали
      </h2>
      <div className="prose-balinsky max-w-3xl space-y-3 text-[15px] leading-relaxed text-[var(--color-text)]">
        <p>
          Главные критерии — сданные проекты, прозрачная юридическая схема и управляющая
          компания после ввода. Сданные проекты показывают, что застройщик умеет довести стройку
          до конца и соблюдает обещанное качество. Юридическая схема (лизхолд или freehold,
          действующее разрешение PBG / SLF) гарантирует, что вы получите оформленную собственность.
          Управляющая компания — критично, если апартамент покупается под аренду: без неё
          доходность 8–12% годовых превращается в полноценную самозанятость владельца.
        </p>
        <p className="text-[var(--color-text-muted)]">
          В каждой карточке мы агрегируем рейтинги по 4 направлениям: строительство и
          недвижимость, репутация и опыт, техника и производство, управляющая компания. Это
          помогает быстро сравнить десятки игроков и не зависеть от одного отзыва.
        </p>
      </div>

      <div className="mt-10">
        <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[var(--color-text)] mb-3">
          Застройщики по районам Бали
        </h2>
        <p className="max-w-3xl text-[14px] leading-relaxed text-[var(--color-text-muted)] mb-5">
          Большинство новых проектов сосредоточено в районах Чангу (Berawa, Batu Bolong,
          Pererenan), на Буките (Uluwatu, Pandawa) и в Убуде. Здесь работают самые активные
          застройщики с апартаментами, виллами и инвестиционными комплексами.
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {districtLinks.flatMap(d => [
            {
              key: `dev-${d.slug}`,
              href: `/ru/apartamenty/${d.slug}`,
              label: `Застройщики в ${d.name}`,
              accent: true,
            },
            {
              key: `new-${d.slug}`,
              href: `/ru/apartamenty/${d.slug}/${STATUS_TO_SLUG.building}`,
              label: `Новостройки в ${d.name}`,
              accent: false,
            },
          ]).map(c => (
            <li key={c.key}>
              <Link
                href={c.href}
                className={`inline-block px-3 py-1.5 rounded-full border text-[13px] transition-colors ${
                  c.accent
                    ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary-soft)] text-[var(--color-primary-pressed)] hover:border-[var(--color-primary)]'
                    : 'bg-[var(--color-card-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
                }`}
              >
                {c.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/ru/zhilye-kompleksy"
              className="inline-block px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
            >
              Жилые комплексы Бали
            </Link>
          </li>
        </ul>
      </div>

      <div className="mt-10">
        <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[var(--color-text)] mb-4">
          По теме
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 max-w-3xl">
          {[
            { href: '/ru/zhilye-kompleksy', label: 'Жилые комплексы на Бали' },
            { href: '/ru/apartamenty', label: 'Апартаменты от застройщиков' },
            { href: '/ru/villy', label: 'Виллы и дома' },
            { href: `/ru/apartamenty/${BEDROOM_TO_SLUG['1']}`, label: '1-комнатные апартаменты' },
            { href: `/ru/apartamenty/${BEDROOM_TO_SLUG['2']}`, label: '2-комнатные апартаменты' },
            { href: `/ru/apartamenty/${STATUS_TO_SLUG.building}`, label: 'Строящиеся апартаменты' },
            { href: `/ru/apartamenty/${STATUS_TO_SLUG.built}`, label: 'Готовые апартаменты' },
            { href: '/ru/apartamenty/100000-200000', label: 'Апартаменты 100–200 тыс. $' },
          ].map(l => (
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
          Часто задаваемые вопросы
        </h2>
        <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
          {FAQ_ITEMS.map((item, i) => (
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
