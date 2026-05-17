import Link from 'next/link'
import type { ComplexFilterState } from '@/app/ru/zhilye-kompleksy/_lib'
import {
  TYPE_TO_SLUG,
  STATUS_TO_SLUG,
} from '@/lib/complex-seo-routes'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import type { Lang } from '@/lib/i18n'

const POPULAR_DISTRICTS = ['Berawa', 'Sanur', 'Ubud', 'Uluwatu', 'Pererenan', 'Pandawa', 'Batu Bolong', 'Cemagi']

type Variant = 'list' | 'map'

const T = {
  ru: {
    where: (one?: string, many?: string[]) =>
      one ? `района ${one}` : many && many.length ? `районов ${many.join(', ')}` : 'Бали',
    leadList: (where: string) => `На этой странице — жилые комплексы в пределах ${where}.`,
    leadMap: (where: string) => `На этой странице — жилые комплексы в пределах ${where} с отметками на карте.`,
    tail: ' По каждому проекту видны фото, район, типы юнитов, статус и сроки сдачи. Это удобно, чтобы быстро сравнить десятки строек и выбрать тот, что подходит вам.',
    titleBase: 'Жилые комплексы',
    titleInDistrict: (d: string) => ` в районе ${d}`,
    titleMapSuffix: ' на карте Бали',
    titleListSuffix: ' на Бали — каталог',
    h3Districts: 'Комплексы по районам',
    h3Type: 'По типу и статусу',
    chipBuilding: 'Строящиеся',
    chipBuilt: 'Готовые',
    chipDevelopers: 'Все застройщики',
    faqTitle: 'Часто задаваемые вопросы',
    contextUbud: 'В Убуде — низкоэтажные проекты в окружении джунглей и рисовых террас. Подходит тем, кто ищет спокойную атмосферу подальше от пляжной туристы.',
    contextCanggu: (d: string) => `${d} — часть Чангу, район сёрферов и диджитал-номадов. Здесь активнее всего идёт строительство, плотный рынок аренды и живая инфраструктура.`,
    contextBukit: (d: string) => `${d} — Букит. Видовые проекты на утёсах, премиальные комплексы для рынка инвестиций и сдачи в аренду.`,
    contextSanur: 'Санур — спокойный восточный берег с лагуной. Популярен у семей и долгосрочных переездов.',
    contextDefault: 'Жилых комплексов на Бали — несколько сотен. Самые активные локации: Чангу (Berawa, Batu Bolong, Pererenan), Букит (Uluwatu, Pandawa, Melasti), Убуд, Санур, Нуса-Дуа. Большая часть проектов — лизхолд 25–80 лет, сдача через 1–3 года, типы юнитов: апартаменты, виллы, таунхаусы.',
    faq: [
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
    ],
  },
  en: {
    where: (one?: string, many?: string[]) =>
      one ? `${one} district` : many && many.length ? `${many.join(', ')} districts` : 'Bali',
    leadList: (where: string) => `This page lists residential complexes within ${where}.`,
    leadMap: (where: string) => `This page lists residential complexes within ${where} pinned on the map.`,
    tail: ' Each project shows photos, district, unit types, build status and handover timeline — so you can compare dozens of developments side by side and pick the one that fits.',
    titleBase: 'Residential complexes',
    titleInDistrict: (d: string) => ` in ${d}`,
    titleMapSuffix: ' on the Bali map',
    titleListSuffix: ' in Bali — catalog',
    h3Districts: 'Complexes by district',
    h3Type: 'By type and status',
    chipBuilding: 'Under construction',
    chipBuilt: 'Completed',
    chipDevelopers: 'All developers',
    faqTitle: 'Frequently asked questions',
    contextUbud: 'Ubud is low-rise projects surrounded by jungle and rice terraces — for buyers chasing a calmer atmosphere away from the beach crowds.',
    contextCanggu: (d: string) => `${d} is part of Canggu, the surfer and digital-nomad belt — the most active construction pipeline on Bali, a dense rental market and lively day-to-day infrastructure.`,
    contextBukit: (d: string) => `${d} is the Bukit peninsula — cliffside view projects and premium complexes built for the investment and short-term rental market.`,
    contextSanur: 'Sanur is the calmer east coast with its lagoon — popular with families and long-term relocations.',
    contextDefault: 'There are several hundred residential complexes on Bali. The most active areas are Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa, Melasti), Ubud, Sanur and Nusa Dua. Most projects are 25–80 year leasehold with handover in 1–3 years; unit types include apartments, villas and townhouses.',
    faq: [
      {
        q: 'What is a residential complex in Bali?',
        a: 'A gated property with a group of buildings — apartments, villas or townhouses — under a single management, with security and usually a pool, gym and reception. Complexes here fall into two camps: investment (built for rental) and residential (built for living).',
      },
      {
        q: 'How does a complex under construction differ from a completed one?',
        a: 'Under-construction units sell at up to 30% lower prices, but the risk is higher: handover can slip and finish quality is unknown. A completed complex you can walk through and rent out immediately, but the price is higher.',
      },
      {
        q: 'What permits should a complex hold?',
        a: 'The two key documents are PBG (building permit) and SLF (occupancy certificate). Without PBG construction is not legal; without SLF a unit cannot officially be rented out.',
      },
      {
        q: 'How long is a typical leasehold?',
        a: 'Standard leases run 25–30 years with the option to extend. Premium projects offer 50–80 years in the first period. The longer the lease, the higher the resale liquidity.',
      },
      {
        q: 'Can I buy a unit before construction starts?',
        a: 'Yes — through pre-sales. Prices sit 15–25% below post-handover levels, but you need to verify the developer and confirm PBG is in place. Payment follows the construction schedule.',
      },
    ],
  },
} as const

function intro(f: ComplexFilterState, variant: Variant, lang: Lang): string {
  const t = T[lang]
  const where = t.where(f.district.length === 1 ? f.district[0] : undefined, f.district.length > 1 ? f.district : undefined)
  const lead = variant === 'map' ? t.leadMap(where) : t.leadList(where)
  return lead + t.tail
}

function context(f: ComplexFilterState, lang: Lang): string {
  const t = T[lang]
  const dist = f.district[0]
  if (dist === 'Ubud') return t.contextUbud
  if (dist === 'Berawa' || dist === 'Batu Bolong' || dist === 'Pererenan') return t.contextCanggu(dist)
  if (dist === 'Uluwatu' || dist === 'Pandawa' || dist === 'Melasti') return t.contextBukit(dist)
  if (dist === 'Sanur') return t.contextSanur
  return t.contextDefault
}

function buildSeoTitle(f: ComplexFilterState, variant: Variant, lang: Lang): string {
  const t = T[lang]
  const adj: string[] = []
  if (f.types.length === 1) adj.push(f.types[0])
  let s = adj.length ? adj.join(' ') + ' ' + t.titleBase.toLowerCase() : t.titleBase
  if (f.district.length === 1) s += t.titleInDistrict(f.district[0])
  s += variant === 'map' ? t.titleMapSuffix : t.titleListSuffix
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function ComplexesSeoContent({
  filters,
  variant = 'list',
  lang = 'ru',
}: {
  filters: ComplexFilterState
  variant?: Variant
  lang?: Lang
}) {
  const t = T[lang]
  const h2 = buildSeoTitle(filters, variant, lang)
  const currentDistrict = filters.district[0]
  const districts = POPULAR_DISTRICTS.filter(d => d !== currentDistrict)
    .slice(0, 6)
    .map(d => ({ name: d, slug: DISTRICT_TO_SLUG[d] }))
    .filter(x => x.slug)

  const sectionRoot = lang === 'en' ? '/en/complexes' : '/ru/zhilye-kompleksy'
  const developersRoot = lang === 'en' ? '/en/developers' : '/ru/zastrojshhiki'

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faq.map(item => ({
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
        <p>{intro(filters, variant, lang)}</p>
        <p className="text-[var(--color-text-muted)]">{context(filters, lang)}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{t.h3Districts}</h3>
          <ul className="flex flex-wrap gap-2">
            {districts.map(d => (
              <li key={d.slug}>
                <Link
                  href={`${sectionRoot}/${d.slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{t.h3Type}</h3>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(TYPE_TO_SLUG).slice(0, 5).map(([name, slug]) => (
              <li key={slug}>
                <Link
                  href={`${sectionRoot}/${slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`${sectionRoot}/${STATUS_TO_SLUG.building}`}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {t.chipBuilding}
              </Link>
            </li>
            <li>
              <Link
                href={`${sectionRoot}/${STATUS_TO_SLUG.built}`}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {t.chipBuilt}
              </Link>
            </li>
            <li>
              <Link
                href={developersRoot}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {t.chipDevelopers}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12">
        <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-4">
          {t.faqTitle}
        </h3>
        <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
          {t.faq.map((item, i) => (
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
