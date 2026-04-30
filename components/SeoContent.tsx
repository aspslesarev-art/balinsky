import Link from 'next/link'
import type { FilterState } from '@/components/filters/FiltersBar'
import {
  DISTRICT_TO_SLUG,
  BEDROOM_TO_SLUG,
  STATUS_TO_SLUG,
  PRICE_SEGMENTS,
} from '@/lib/seo-routes'

const POPULAR_DISTRICTS = ['Berawa', 'Sanur', 'Ubud', 'Uluwatu', 'Pererenan', 'Pandawa', 'Batu Bolong', 'Cemagi']

type Variant = 'list' | 'map'

function intro(f: FilterState, variant: Variant): string {
  const where =
    f.district.length === 1
      ? `района ${f.district[0]}`
      : f.district.length > 1
      ? `районов ${f.district.join(', ')}`
      : 'Бали'

  const beds =
    f.bedrooms.length === 1
      ? ` с ${f.bedrooms[0]} спальней`
      : f.bedrooms.length > 1
      ? ` с ${f.bedrooms.join('/')} спальнями`
      : ''

  const lead = variant === 'map'
    ? `На этой странице — апартаменты${beds} в пределах ${where} с отметками на карте.`
    : `На этой странице — каталог апартаментов${beds} в пределах ${where}.`

  return (
    lead +
    ' Можно сравнить расположение, цены и характеристики, посмотреть фото и выбрать подходящий вариант для жизни или инвестиций.'
  )
}

function context(f: FilterState): string {
  const dist = f.district[0]
  if (dist === 'Ubud') {
    return 'Убуд — культурный центр острова, окружён рисовыми террасами и джунглями. Подходит тем, кто ищет спокойную жизнь вдали от пляжной суеты.'
  }
  if (dist === 'Berawa' || dist === 'Batu Bolong' || dist === 'Pererenan') {
    return `${dist} — часть Чангу, района сёрферов и диджитал-номадов: пляжные клубы, кафе, минут 10 до пляжа, активный рынок аренды.`
  }
  if (dist === 'Uluwatu' || dist === 'Pandawa' || dist === 'Melasti') {
    return `${dist} — южная часть полуострова Букит, известная видовыми утёсами, премиальными виллами и точками для сёрфинга мирового уровня.`
  }
  if (dist === 'Sanur') {
    return 'Санур — спокойный восточный берег с лагуной и набережной, популярен у семей и тех, кто переезжает на длительный срок.'
  }
  return 'Бали — один из самых динамичных рынков апартаментов в Юго-Восточной Азии: новые комплексы вводятся ежемесячно, доходность от посуточной аренды в высокий сезон в среднем превышает 8–12% годовых. Основные локации: Чангу (Berawa, Batu Bolong, Pererenan) для сёрфинга и удалённой работы, Убуд для жизни в природе, Букит (Uluwatu, Pandawa) для премиальных видов на океан, Санур и Нуса-Дуа для семейного формата.'
}

function buildSeoTitle(f: FilterState, variant: Variant): string {
  const adj: string[] = []
  if (f.bedrooms.length === 1) adj.push(`${f.bedrooms[0]}-комнатные`)
  let s = adj.length ? adj.join(' ') + ' апартаменты' : 'Апартаменты и квартиры'
  if (f.district.length === 1) s += ` в районе ${f.district[0]}`
  else if (f.district.length > 1) s += ` в районах ${f.district.join(', ')}`
  s += variant === 'map' ? ' на карте Бали' : ' на Бали — каталог'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Где лучше купить апартаменты на Бали?',
    a: 'Зависит от цели. Под аренду — Чангу (Berawa, Batu Bolong, Pererenan), там стабильный спрос круглый год. Для жизни — Убуд или Санур. Для премиальных видов на океан — Букит (Uluwatu, Pandawa).',
  },
  {
    q: 'Какие районы ближе к океану?',
    a: 'Прямой выход к пляжу есть у комплексов в Berawa, Batu Bolong, Pandawa, Melasti, Nusa Dua, Sanur. В Убуде до океана 30–40 минут на байке.',
  },
  {
    q: 'Сколько стоят апартаменты на Бали?',
    a: 'Студии стартуют от 80–100 тыс. $, 1-комнатные апартаменты в Чангу — от 150 тыс. $, видовые 2-комнатные на Буките — от 250 тыс. $. Премиальные пентхаусы доходят до 1 млн $ и выше.',
  },
  {
    q: 'Можно ли купить апартаменты иностранцу?',
    a: 'Да, по схеме лизхолд (долгосрочной аренды) — от 25 до 99 лет. Сделка оформляется у нотариуса (PPAT), большинство застройщиков работают с международными покупателями.',
  },
  {
    q: 'Какую доходность приносит сдача в аренду?',
    a: 'В популярных районах Чангу и Букит чистая годовая доходность от посуточной аренды через управляющую компанию обычно 8–12% при загрузке 70–80%.',
  },
]

export function SeoContent({
  filters,
  variant = 'list',
}: {
  filters: FilterState
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
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">Популярные районы</h3>
          <ul className="flex flex-wrap gap-2">
            {districts.map(d => (
              <li key={d.slug}>
                <Link
                  href={`/ru/apartamenty/${d.slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">Что доступно</h3>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(BEDROOM_TO_SLUG).map(([n, slug]) => (
              <li key={slug}>
                <Link
                  href={`/ru/apartamenty/${slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                >
                  {n}-комнатные
                </Link>
              </li>
            ))}
            {Object.entries(STATUS_TO_SLUG).map(([key, slug]) => (
              <li key={slug}>
                <Link
                  href={`/ru/apartamenty/${slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                >
                  {key === 'building' ? 'строящиеся' : 'готовые'}
                </Link>
              </li>
            ))}
            {PRICE_SEGMENTS.slice(0, 3).map(seg => (
              <li key={seg.slug}>
                <Link
                  href={`/ru/apartamenty/${seg.slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                >
                  {seg.label}
                </Link>
              </li>
            ))}
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
