import Link from 'next/link'
import type { ComplexFilterState } from '@/app/ru/zhilye-kompleksy/_lib'
import {
  TYPE_TO_SLUG,
  STATUS_TO_SLUG,
} from '@/lib/complex-seo-routes'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'

const POPULAR_DISTRICTS = ['Berawa', 'Sanur', 'Ubud', 'Uluwatu', 'Pererenan', 'Pandawa', 'Batu Bolong', 'Cemagi']

type Variant = 'list' | 'map'

function intro(f: ComplexFilterState, variant: Variant): string {
  const where =
    f.district.length === 1
      ? `района ${f.district[0]}`
      : f.district.length > 1
      ? `районов ${f.district.join(', ')}`
      : 'Бали'

  const lead =
    variant === 'map'
      ? `На этой странице — жилые комплексы в пределах ${where} с отметками на карте.`
      : `На этой странице — жилые комплексы в пределах ${where}.`

  return (
    lead +
    ' По каждому проекту видны фото, район, типы юнитов, статус и сроки сдачи. ' +
    'Это удобно, чтобы быстро сравнить десятки строек и выбрать тот, что подходит вам.'
  )
}

function context(f: ComplexFilterState): string {
  const dist = f.district[0]
  if (dist === 'Ubud') {
    return 'В Убуде — низкоэтажные проекты в окружении джунглей и рисовых террас. Подходит тем, кто ищет спокойную атмосферу подальше от пляжной туристы.'
  }
  if (dist === 'Berawa' || dist === 'Batu Bolong' || dist === 'Pererenan') {
    return `${dist} — часть Чангу, район сёрферов и диджитал-номадов. Здесь активнее всего идёт строительство, плотный рынок аренды и живая инфраструктура.`
  }
  if (dist === 'Uluwatu' || dist === 'Pandawa' || dist === 'Melasti') {
    return `${dist} — Букит. Видовые проекты на утёсах, премиальные комплексы для рынка инвестиций и сдачи в аренду.`
  }
  if (dist === 'Sanur') {
    return 'Санур — спокойный восточный берег с лагуной. Популярен у семей и долгосрочных переездов.'
  }
  return 'Жилых комплексов на Бали — несколько сотен. Самые активные локации: Чангу (Berawa, Batu Bolong, Pererenan), Букит (Uluwatu, Pandawa, Melasti), Убуд, Санур, Нуса-Дуа. Большая часть проектов — лизхолд 25–80 лет, сдача через 1–3 года, типы юнитов: апартаменты, виллы, таунхаусы.'
}

function buildSeoTitle(f: ComplexFilterState, variant: Variant): string {
  const adj: string[] = []
  if (f.types.length === 1) adj.push(f.types[0])
  let s = adj.length ? adj.join(' ') + ' жилые комплексы' : 'Жилые комплексы'
  if (f.district.length === 1) s += ` в районе ${f.district[0]}`
  s += variant === 'map' ? ' на карте Бали' : ' на Бали — каталог'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Что такое жилой комплекс на Бали?',
    a: 'Это огороженная территория с группой зданий — апартаментов, вилл, таунхаусов — общим управлением, охраной, обычно с бассейном, фитнесом и ресепшеном. На Бали комплексы делятся на инвестиционные (под аренду) и резидентские (для жизни).',
  },
  {
    q: 'Чем отличается строящийся комплекс от готового?',
    a: 'Строящийся продаётся дешевле (до 30%), но риски выше: сроки могут сдвигаться, качество финиша непонятно. Готовый можно посмотреть и сразу сдавать в аренду, но цена выше.',
  },
  {
    q: 'Какое разрешение должно быть у комплекса?',
    a: 'Главные документы — PBG (разрешение на строительство) и SLF (сертификат пригодности). Без PBG строить вообще нельзя; без SLF юнит не может официально сдаваться в аренду.',
  },
  {
    q: 'На сколько лет оформляется лизхолд?',
    a: 'Стандартно 25–30 лет с возможностью продления. Премиальные проекты предлагают 50–80 лет первого периода. Чем длиннее лизхолд — тем выше ликвидность.',
  },
  {
    q: 'Можно ли купить юнит до начала строительства?',
    a: 'Да, через предпродажи. Цены ниже на 15–25%, но нужно проверить надёжность застройщика и наличие PBG. Оплата по графику строительства.',
  },
]

export function ComplexesSeoContent({
  filters,
  variant = 'list',
}: {
  filters: ComplexFilterState
  variant?: Variant
}) {
  const h2 = buildSeoTitle(filters, variant)
  const currentDistrict = filters.district[0]
  const districts = POPULAR_DISTRICTS.filter(d => d !== currentDistrict)
    .slice(0, 6)
    .map(d => ({ name: d, slug: DISTRICT_TO_SLUG[d] }))
    .filter(x => x.slug)

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
        {h2}
      </h2>

      <div className="prose-balinsky max-w-3xl space-y-3 text-[15px] leading-relaxed text-[var(--color-text)]">
        <p>{intro(filters, variant)}</p>
        <p className="text-[var(--color-text-muted)]">{context(filters)}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">Комплексы по районам</h3>
          <ul className="flex flex-wrap gap-2">
            {districts.map(d => (
              <li key={d.slug}>
                <Link
                  href={`/ru/zhilye-kompleksy/${d.slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">По типу и статусу</h3>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(TYPE_TO_SLUG).slice(0, 5).map(([name, slug]) => (
              <li key={slug}>
                <Link
                  href={`/ru/zhilye-kompleksy/${slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`/ru/zhilye-kompleksy/${STATUS_TO_SLUG.building}`}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                Строящиеся
              </Link>
            </li>
            <li>
              <Link
                href={`/ru/zhilye-kompleksy/${STATUS_TO_SLUG.built}`}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                Готовые
              </Link>
            </li>
            <li>
              <Link
                href="/ru/zastrojshhiki"
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                Все застройщики
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12">
        <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-4">
          Часто задаваемые вопросы
        </h3>
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
