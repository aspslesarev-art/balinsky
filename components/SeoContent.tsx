import Link from 'next/link'
import type { FilterState } from '@/components/filters/FiltersBar'
import {
  DISTRICT_TO_SLUG,
  BEDROOM_TO_SLUG,
  STATUS_TO_SLUG,
  PRICE_SEGMENTS,
} from '@/lib/seo-routes'
import type { Lang } from '@/lib/i18n'

const POPULAR_DISTRICTS = ['Berawa', 'Sanur', 'Ubud', 'Uluwatu', 'Pererenan', 'Pandawa', 'Batu Bolong', 'Cemagi']

type Variant = 'list' | 'map'

const COPY = {
  ru: {
    introWhereDistrict: (d: string) => `района ${d}`,
    introWhereDistricts: (a: string[]) => `районов ${a.join(', ')}`,
    introWhereBali: 'Бали',
    introBeds1: (n: string) => ` с ${n} спальней`,
    introBedsN: (a: string[]) => ` с ${a.join('/')} спальнями`,
    introMap: (where: string, beds: string) => `На этой странице — апартаменты${beds} в пределах ${where} с отметками на карте.`,
    introList: (where: string, beds: string) => `На этой странице — каталог апартаментов${beds} в пределах ${where}.`,
    introTail: ' Можно сравнить расположение, цены и характеристики, посмотреть фото и выбрать подходящий вариант для жизни или инвестиций.',
    ctxUbud: 'Убуд — культурный центр острова, окружён рисовыми террасами и джунглями. Подходит тем, кто ищет спокойную жизнь вдали от пляжной суеты.',
    ctxCanggu: (d: string) => `${d} — часть Чангу, района сёрферов и диджитал-номадов: пляжные клубы, кафе, минут 10 до пляжа, активный рынок аренды.`,
    ctxBukit: (d: string) => `${d} — южная часть полуострова Букит, известная видовыми утёсами, премиальными виллами и точками для сёрфинга мирового уровня.`,
    ctxSanur: 'Санур — спокойный восточный берег с лагуной и набережной, популярен у семей и тех, кто переезжает на длительный срок.',
    ctxDefault: 'Бали — один из самых динамичных рынков апартаментов в Юго-Восточной Азии: новые комплексы вводятся ежемесячно, доходность от посуточной аренды в высокий сезон в среднем превышает 8–12% годовых. Основные локации: Чангу (Berawa, Batu Bolong, Pererenan) для сёрфинга и удалённой работы, Убуд для жизни в природе, Букит (Uluwatu, Pandawa) для премиальных видов на океан, Санур и Нуса-Дуа для семейного формата.',
    titleAdj: (n: string) => `${n}-комнатные`,
    titleNoun: 'апартаменты',
    titleNounCap: 'Апартаменты и квартиры',
    titleInDistrict: (d: string) => ` в районе ${d}`,
    titleInDistricts: (a: string[]) => ` в районах ${a.join(', ')}`,
    titleMapTail: ' на карте Бали',
    titleListTail: ' на Бали — каталог',
    popularHeading: 'Популярные районы',
    availableHeading: 'Что доступно',
    bedroomsLabel: (n: string) => `${n}-комнатные`,
    statusLabel: (k: string) => k === 'building' ? 'строящиеся' : 'готовые',
    faqHeading: 'Часто задаваемые вопросы',
    faq: [
      { q: 'Где лучше купить апартаменты на Бали?',
        a: 'Зависит от цели. Под аренду — Чангу (Berawa, Batu Bolong, Pererenan), там стабильный спрос круглый год. Для жизни — Убуд или Санур. Для премиальных видов на океан — Букит (Uluwatu, Pandawa).' },
      { q: 'Какие районы ближе к океану?',
        a: 'Прямой выход к пляжу есть у комплексов в Berawa, Batu Bolong, Pandawa, Melasti, Nusa Dua, Sanur. В Убуде до океана 30–40 минут на байке.' },
      { q: 'Сколько стоят апартаменты на Бали?',
        a: 'Студии стартуют от 80–100 тыс. $, 1-комнатные апартаменты в Чангу — от 150 тыс. $, видовые 2-комнатные на Буките — от 250 тыс. $. Премиальные пентхаусы доходят до 1 млн $ и выше.' },
      { q: 'Можно ли купить апартаменты иностранцу?',
        a: 'Да, по схеме лизхолд (долгосрочной аренды) — от 25 до 99 лет. Сделка оформляется у нотариуса (PPAT), большинство застройщиков работают с международными покупателями.' },
      { q: 'Какую доходность приносит сдача в аренду?',
        a: 'В популярных районах Чангу и Букит чистая годовая доходность от посуточной аренды через управляющую компанию обычно 8–12% при загрузке 70–80%.' },
    ],
  },
  en: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (a: string[]) => `${a.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` with ${n} bedroom`,
    introBedsN: (a: string[]) => ` with ${a.join('/')} bedrooms`,
    introMap: (where: string, beds: string) => `Apartments${beds} in ${where} marked on a map.`,
    introList: (where: string, beds: string) => `Apartment catalogue${beds} in ${where}.`,
    introTail: ' Compare location, prices and specs, browse photos and pick a property to live in or invest in.',
    ctxUbud: 'Ubud is the cultural heart of the island, surrounded by rice terraces and jungle. A good fit for buyers wanting a quiet life away from beach crowds.',
    ctxCanggu: (d: string) => `${d} is part of Canggu — the surfer / digital-nomad district: beach clubs, cafés, ~10 min to the beach, active rental market.`,
    ctxBukit: (d: string) => `${d} sits on the southern Bukit peninsula — clifftop views, premium villas, world-class surf breaks.`,
    ctxSanur: 'Sanur is the calm east coast — lagoon, boardwalk, popular with families and long-term relocators.',
    ctxDefault: 'Bali is one of the most dynamic apartment markets in South-East Asia: new complexes deliver monthly, short-term rental yields in high season typically average 8–12% per year. Key areas: Canggu (Berawa, Batu Bolong, Pererenan) for surf and remote work, Ubud for life in nature, Bukit (Uluwatu, Pandawa) for premium ocean views, Sanur and Nusa Dua for family-friendly stays.',
    titleAdj: (n: string) => `${n}-bedroom`,
    titleNoun: 'apartments',
    titleNounCap: 'Apartments and condos',
    titleInDistrict: (d: string) => ` in ${d}`,
    titleInDistricts: (a: string[]) => ` in ${a.join(', ')}`,
    titleMapTail: ' on the Bali map',
    titleListTail: ' in Bali — catalogue',
    popularHeading: 'Popular districts',
    availableHeading: 'What is available',
    bedroomsLabel: (n: string) => `${n}-bedroom`,
    statusLabel: (k: string) => k === 'building' ? 'under construction' : 'completed',
    faqHeading: 'Frequently asked questions',
    faq: [
      { q: 'Where is best to buy apartments in Bali?',
        a: 'Depends on the goal. For rental — Canggu (Berawa, Batu Bolong, Pererenan), with steady year-round demand. For living — Ubud or Sanur. For premium ocean views — Bukit (Uluwatu, Pandawa).' },
      { q: 'Which districts are closer to the ocean?',
        a: 'Direct beach access is available in Berawa, Batu Bolong, Pandawa, Melasti, Nusa Dua, Sanur. From Ubud the ocean is 30–40 min by scooter.' },
      { q: 'How much do Bali apartments cost?',
        a: 'Studios start at $80–100k, 1-bedroom in Canggu — from $150k, 2-bedroom view units on Bukit — from $250k. Premium penthouses reach $1M and above.' },
      { q: 'Can a foreigner buy apartments in Bali?',
        a: 'Yes, through leasehold (long-term lease) — 25 to 99 years. The deal is closed at a PPAT notary; most developers work with international buyers.' },
      { q: 'What rental yield can be expected?',
        a: 'In popular Canggu and Bukit areas, net annual yield from short-term rental via a management company is typically 8–12% at 70–80% occupancy.' },
    ],
  },
} as const

function intro(f: FilterState, variant: Variant, lang: Lang): string {
  const C = COPY[lang]
  const where =
    f.district.length === 1 ? C.introWhereDistrict(f.district[0]) :
    f.district.length > 1 ? C.introWhereDistricts(f.district) :
    C.introWhereBali
  const beds = f.bedrooms.length === 1 ? C.introBeds1(f.bedrooms[0])
    : f.bedrooms.length > 1 ? C.introBedsN(f.bedrooms) : ''
  const lead = variant === 'map' ? C.introMap(where, beds) : C.introList(where, beds)
  return lead + C.introTail
}

function context(f: FilterState, lang: Lang): string {
  const C = COPY[lang]
  const dist = f.district[0]
  if (dist === 'Ubud') return C.ctxUbud
  if (dist === 'Berawa' || dist === 'Batu Bolong' || dist === 'Pererenan') return C.ctxCanggu(dist)
  if (dist === 'Uluwatu' || dist === 'Pandawa' || dist === 'Melasti') return C.ctxBukit(dist)
  if (dist === 'Sanur') return C.ctxSanur
  return C.ctxDefault
}

function buildSeoTitle(f: FilterState, variant: Variant, lang: Lang): string {
  const C = COPY[lang]
  const adj: string[] = []
  if (f.bedrooms.length === 1) adj.push(C.titleAdj(f.bedrooms[0]))
  let s = adj.length ? `${adj.join(' ')} ${C.titleNoun}` : C.titleNounCap
  if (f.district.length === 1) s += C.titleInDistrict(f.district[0])
  else if (f.district.length > 1) s += C.titleInDistricts(f.district)
  s += variant === 'map' ? C.titleMapTail : C.titleListTail
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function SeoContent({
  filters,
  variant = 'list',
  lang = 'ru',
}: {
  filters: FilterState
  variant?: Variant
  lang?: Lang
}) {
  const C = COPY[lang]
  const h2 = buildSeoTitle(filters, variant, lang)
  const currentDistrict = filters.district[0]
  const districts = POPULAR_DISTRICTS.filter(d => d !== currentDistrict)
    .slice(0, 6)
    .map(d => ({ name: d, slug: DISTRICT_TO_SLUG[d] }))
    .filter(x => x.slug)
  const aptRoot = lang === 'en' ? '/en/apartments' : '/ru/apartamenty'

  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: C.faq.map(item => ({
      '@type': 'Question', name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <section className="mt-12 pt-10 border-t border-[var(--color-border)]">
      <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[var(--color-text)] mb-4">{h2}</h2>

      <div className="prose-balinsky max-w-3xl space-y-3 text-[15px] leading-relaxed text-[var(--color-text)]">
        <p>{intro(filters, variant, lang)}</p>
        <p className="text-[var(--color-text-muted)]">{context(filters, lang)}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{C.popularHeading}</h3>
          <ul className="flex flex-wrap gap-2">
            {districts.map(d => (
              <li key={d.slug}>
                <Link
                  href={`${aptRoot}/${d.slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{C.availableHeading}</h3>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(BEDROOM_TO_SLUG).map(([n, slug]) => (
              <li key={slug}>
                <Link
                  href={`${aptRoot}/${slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                >
                  {C.bedroomsLabel(n)}
                </Link>
              </li>
            ))}
            {Object.entries(STATUS_TO_SLUG).map(([key, slug]) => (
              <li key={slug}>
                <Link
                  href={`${aptRoot}/${slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                >
                  {C.statusLabel(key)}
                </Link>
              </li>
            ))}
            {PRICE_SEGMENTS.slice(0, 3).map(seg => (
              <li key={seg.slug}>
                <Link
                  href={`${aptRoot}/${seg.slug}`}
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
        <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-4">{C.faqHeading}</h3>
        <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
          {C.faq.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-medium text-[var(--color-text)]">
                {item.q}
                <span className="text-[var(--color-text-muted)] text-[20px] leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </section>
  )
}
