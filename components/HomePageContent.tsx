// Shared home-page body, rendered by both /ru/page.tsx and
// /en/page.tsx. All copy lives in COPY[lang]; data loads happen
// inside this server component so the wrappers stay tiny and only
// pass the lang prop. Internal links are built off route-prefix
// tables that mirror app/ru/* ↔ app/en/* directory naming.

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { Home as HomeIcon, Building, Building2, HardHat, ArrowRight, Calendar, Sparkles, Newspaper, BookOpen } from 'lucide-react'
import { Header } from '@/components/Header'
import { BalinaHero } from '@/components/BalinaHero'
import { PageContainer } from '@/components/PageContainer'
import { VillaCard, type VillaCardData } from '@/components/VillaCard'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { HomeSeoBlocks } from './HomeSeoBlocks'
import { loadAll as loadAllVillas, buildAllCards as buildAllVillaCards, type VillaFilterState } from '@/app/ru/villy/_lib'
import { loadLatestYouTubeVideos } from '@/lib/youtube'
import { YouTubeBlock } from '@/components/YouTubeBlock'
import { loadAllVillaScores } from '@/lib/investment/batch-scores'
import { loadAllNews } from '@/lib/news'
import { loadAllPromo } from '@/lib/promo'
import { loadAllEvents } from '@/lib/events'
import type { Lang } from '@/lib/i18n'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

const POPULAR_DISTRICTS = ['Berawa', 'Pererenan', 'Ubud', 'Uluwatu', 'Pandawa', 'Sanur', 'Batu Bolong', 'Cemagi']

// Per-section route prefix per language. Keep in lockstep with the
// directory layout under app/ru/* and app/en/*.
const ROUTES = {
  ru: {
    home:        '/ru',
    villas:      '/ru/villy',
    apartments:  '/ru/apartamenty',
    complexes:   '/ru/zhilye-kompleksy',
    developers:  '/ru/zastrojshhiki',
    news:        '/ru/novosti',
    promo:       '/ru/akcii',
    events:      '/ru/meropriyatiya',
    knowledge:   '/ru/znaniya',
  },
  en: {
    home:        '/en',
    villas:      '/en/villas',
    apartments:  '/en/apartments',
    complexes:   '/en/complexes',
    developers:  '/en/developers',
    news:        '/en/news',
    promo:       '/en/promo',
    events:      '/en/events',
    knowledge:   '/en/knowledge',
  },
} as const

const COPY = {
  ru: {
    locale: 'ru-RU',
    h2: 'Недвижимость на Бали — без посредников и красивых обещаний',
    intro: (totalUnits: number, complexes: number, developers: number) =>
      `Каталог из ${totalUnits} объектов и ${complexes} жилых комплексов от ${developers} застройщиков. Прозрачные данные о разрешениях и управляющих компаниях, свежие акции, новости и мероприятия.`,
    sectionVillas:     { title: 'Виллы и дома',    tagline: 'Отдельные дома с участком, бассейном и приватной территорией', countLabel: 'объектов' },
    sectionApartments: { title: 'Апартаменты',     tagline: 'Юниты в современных комплексах с управляющей компанией',        countLabel: 'объектов' },
    sectionComplexes:  { title: 'Жилые комплексы', tagline: 'Закрытые комплексы с инфраструктурой и сервисом',               countLabel: 'комплексов' },
    sectionDevelopers: { title: 'Застройщики',     tagline: 'Рейтинги, сданные проекты, юридическая чистота',                 countLabel: 'компаний' },
    topVillasTitle:   'Виллы с лучшим инвест-потенциалом',
    topVillasLink:    'Все виллы',
    activePromoTitle: 'Акции от застройщиков',
    activePromoLink:  'Все акции',
    eventsTitle:      'Ближайшие мероприятия',
    eventsLink:       'Все мероприятия',
    complexesTitle:   'Жилые комплексы',
    complexesLink:    'Все комплексы',
    newsTitle:        'Свежие новости',
    newsLink:         'Все новости',
    districtsTitle:   'Популярные районы',
    districtsIntro:   'Чангу (Berawa, Pererenan, Batu Bolong) — для сёрфинга и аренды; Букит (Uluwatu, Pandawa) — для премиальных видов; Убуд — для жизни в природе; Санур — для семейного формата.',
    knowledgeBadge:   'База знаний',
    knowledgeTitle:   'Лизхолд, налоги, ВНЖ и жизнь на Бали — статьи из практики',
    knowledgeCta:     'Открыть базу знаний',
    seoH2:            'Недвижимость на Бали — что важно знать',
    seoP1:            'Бали — один из самых динамичных рынков недвижимости Юго-Восточной Азии. Ежемесячно вводятся новые жилые комплексы, активные застройщики работают сразу в нескольких районах. Доходность от посуточной аренды в высокий сезон в среднем 8–12% годовых через управляющую компанию.',
    seoP2:            'Большинство сделок оформляется по схеме лизхолд (25–80 лет с возможностью продления), реже — через индонезийское юрлицо PT PMA. Документы на стройку: PBG (разрешение) и SLF (сертификат пригодности). Без SLF юнит не может легально сдаваться в аренду — это важный чек перед покупкой готового объекта.',
    faqTitle:         'Часто задаваемые вопросы',
    faq: [
      { q: 'С чего начать выбор недвижимости на Бали?', a: 'С формата: для жизни — виллы и таунхаусы в Чангу, Сануре или Убуде; под аренду — апартаменты в строящихся комплексах с управляющей компанией; под перепродажу — премиальные виды на Буките.' },
      { q: 'Можно ли иностранцу купить недвижимость на Бали?', a: 'Да, через лизхолд (долгосрочная аренда земли, обычно 25–80 лет) или через индонезийское юр. лицо PT PMA. Сделка оформляется у нотариуса PPAT.' },
      { q: 'Какая доходность от сдачи в аренду?', a: 'В Чангу и на Буките — 8–12% годовых при загрузке 70–80% через управляющую компанию. Зависит от района, типа объекта и сезонности.' },
      { q: 'Что такое PBG и SLF?', a: 'PBG — разрешение на строительство (без него стройка нелегальна). SLF — сертификат пригодности к эксплуатации (без него юнит не может официально сдаваться в аренду).' },
    ],
    until:            (d: string) => `До ${d}`,
    unitsSuffix:      'юнитов',
    orgDescription:   'Каталог недвижимости на Бали: виллы, апартаменты, жилые комплексы и проверенные застройщики.',
  },
  en: {
    locale: 'en-GB',
    h2: 'Bali real estate — no middlemen, no fluff',
    intro: (totalUnits: number, complexes: number, developers: number) =>
      `${totalUnits} listings and ${complexes} residential complexes from ${developers} developers. Transparent data on permits and management companies, fresh promotions, news and events.`,
    sectionVillas:     { title: 'Villas & houses',           tagline: 'Standalone houses with land, pool, and private grounds',  countLabel: 'listings' },
    sectionApartments: { title: 'Apartments',                tagline: 'Units in modern complexes with a management company',     countLabel: 'listings' },
    sectionComplexes:  { title: 'Residential complexes',     tagline: 'Gated complexes with infrastructure and service',          countLabel: 'complexes' },
    sectionDevelopers: { title: 'Developers',                tagline: 'Ratings, delivered projects, legal track record',          countLabel: 'companies' },
    topVillasTitle:   'Villas with top investment potential',
    topVillasLink:    'All villas',
    activePromoTitle: 'Developer promotions',
    activePromoLink:  'All promotions',
    eventsTitle:      'Upcoming events',
    eventsLink:       'All events',
    complexesTitle:   'Residential complexes',
    complexesLink:    'All complexes',
    newsTitle:        'Latest news',
    newsLink:         'All news',
    districtsTitle:   'Popular districts',
    districtsIntro:   'Canggu (Berawa, Pererenan, Batu Bolong) — surf and rentals; Bukit (Uluwatu, Pandawa) — premium views; Ubud — nature living; Sanur — family format.',
    knowledgeBadge:   'Knowledge base',
    knowledgeTitle:   'Leasehold, taxes, residency and Bali living — practical guides',
    knowledgeCta:     'Open knowledge base',
    seoH2:            'Bali real estate — what to know',
    seoP1:            'Bali is one of the most dynamic real-estate markets in South-East Asia. New residential complexes break ground every month, active developers run multiple sites at once. Daily-rental yields through a management company average 8–12% per year in the high season.',
    seoP2:            'Most deals close as leasehold (25–80 years with extensions), occasionally through an Indonesian PT PMA legal entity. Construction paperwork: PBG (build permit) and SLF (certificate of fitness). Without SLF a unit cannot legally be rented out — a key check before buying a delivered property.',
    faqTitle:         'Frequently asked questions',
    faq: [
      { q: 'How do I start picking Bali real estate?', a: 'Pick the format first: villas and townhouses in Canggu, Sanur or Ubud for living; apartments in under-construction complexes with a management company for rental income; premium-view Bukit units for resale.' },
      { q: 'Can a foreigner buy property in Bali?', a: 'Yes — via leasehold (long-term land lease, typically 25–80 years) or through an Indonesian PT PMA company. The deal is closed at a PPAT notary.' },
      { q: 'What rental yield can I expect?', a: 'Canggu and Bukit see 8–12% annual yield at 70–80% occupancy through a management company. Depends on district, property type and seasonality.' },
      { q: 'What are PBG and SLF?', a: 'PBG is the build permit — without it construction is illegal. SLF is the certificate of fitness — without it the unit cannot officially be rented out.' },
    ],
    until:            (d: string) => `Until ${d}`,
    unitsSuffix:      'units',
    orgDescription:   'Bali real-estate catalog: villas, apartments, residential complexes and verified developers.',
  },
} as const

async function loadCounts() {
  const [v, a, c, d] = await Promise.all([
    sb.from('raw_villas').select('*', { count: 'exact', head: true }).eq('data->>Опубликовать', 'true' as unknown as string),
    sb.from('raw_apartments').select('*', { count: 'exact', head: true }).eq('data->>Опубликовать', 'true' as unknown as string),
    sb.from('raw_complexes').select('*', { count: 'exact', head: true }),
    sb.from('raw_developers').select('*', { count: 'exact', head: true }).eq('data->>Публикация', 'true' as unknown as string),
  ])
  return { villas: v.count ?? 0, apartments: a.count ?? 0, complexes: c.count ?? 0, developers: d.count ?? 0 }
}

async function loadFirstThumb(manifestUrl: string): Promise<string | null> {
  try {
    const r = await fetch(manifestUrl, { next: { revalidate: 600 } })
    if (!r.ok) return null
    const j = (await r.json()) as Record<string, string[]>
    const firstKey = Object.keys(j).find(k => Array.isArray(j[k]) && j[k].length > 0)
    return firstKey ? j[firstKey][0] : null
  } catch { return null }
}

async function loadTopVillas(): Promise<VillaCardData[]> {
  try {
    const [{ enriched, manifest }, scores] = await Promise.all([
      loadAllVillas(),
      loadAllVillaScores().catch(() => undefined),
    ])
    const emptyFilters: VillaFilterState = {
      q: '', priceMin: null, priceMax: null,
      district: [], bedrooms: [], status: [], permit: [], year: [], developer: [], style: [], goal: null, dealType: [],
    }
    const cards = buildAllVillaCards(enriched, manifest, emptyFilters, scores, 'investment-desc')
    return cards.slice(0, 6)
  } catch { return [] }
}

type ComplexHomeCard = {
  slug: string
  title: string
  district: string | null
  cover: string | null
  units: number | null
  status: string | null
  yearOfCompletion: string | null
}

async function loadTopComplexes(): Promise<ComplexHomeCard[]> {
  try {
    const { data } = await sb.from('raw_complexes').select('airtable_id, data, slug, cover_url').limit(500)
    const items: ComplexHomeCard[] = []
    const COVER_BUCKET = `${SUPABASE_URL}/storage/v1/object/public/complex-covers`
    for (const r of (data ?? []) as { airtable_id: string; data: Record<string, unknown>; slug: string | null; cover_url: string | null }[]) {
      const slug = r.slug
      const name = typeof r.data['Project'] === 'string' ? (r.data['Project'] as string) : null
      if (!slug || !name) continue
      const status = (typeof r.data['Статус'] === 'string' ? r.data['Статус'] as string : null) ?? null
      const district = (typeof r.data['Location 2'] === 'string' ? r.data['Location 2'] as string : null) ?? (typeof r.data['Location'] === 'string' ? r.data['Location'] as string : null)
      const units = typeof r.data['Total quantity of units'] === 'number' ? (r.data['Total quantity of units'] as number) : null
      const yearOfCompletion = (typeof r.data['Year of completion '] === 'string' ? r.data['Year of completion '] as string : null) ?? (typeof r.data['Year of completion'] === 'string' ? r.data['Year of completion'] as string : null)
      items.push({
        slug, title: name, district, status, units, yearOfCompletion,
        cover: r.cover_url ?? `${COVER_BUCKET}/${r.airtable_id}.jpg`,
      })
    }
    items.sort((a, b) => {
      const aBuilt = (a.status ?? '').toLowerCase().includes('строит')
      const bBuilt = (b.status ?? '').toLowerCase().includes('строит')
      if (aBuilt !== bBuilt) return aBuilt ? -1 : 1
      return (b.units ?? 0) - (a.units ?? 0)
    })
    return items.slice(0, 4)
  } catch { return [] }
}

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

function fmtDate(iso: string | null, locale: string): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) } catch { return iso }
}
function fmtDateTime(iso: string | null, locale: string): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}
function isPast(iso: string | null): boolean {
  if (!iso) return false
  try { return new Date(iso).getTime() < Date.now() } catch { return false }
}

export async function HomePageContent({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const r = ROUTES[lang]

  const [counts, villaThumb, apartmentThumb, complexThumb, topVillas, topComplexes, allNews, allPromo, allEvents, ytVideos] = await Promise.all([
    loadCounts(),
    loadFirstThumb(`${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`),
    loadFirstThumb(`${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_manifest.json`),
    loadFirstThumb(`${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`),
    loadTopVillas(),
    loadTopComplexes(),
    loadAllNews().catch(() => []),
    loadAllPromo().catch(() => []),
    loadAllEvents().catch(() => []),
    loadLatestYouTubeVideos(6).catch(() => []),
  ])

  const latestNews = allNews.slice(0, 3)
  const activePromo = allPromo.filter(p => !isPast(p.expiresAt)).slice(0, 3)
  const upcomingEvents = allEvents.filter(e => !isPast(e.startsAt)).slice(0, 3)

  const sections = [
    { key: 'villas',     href: r.villas,     ...c.sectionVillas,     count: counts.villas,     cover: villaThumb,     Icon: HomeIcon },
    { key: 'apartments', href: r.apartments, ...c.sectionApartments, count: counts.apartments, cover: apartmentThumb, Icon: Building },
    { key: 'complexes',  href: r.complexes,  ...c.sectionComplexes,  count: counts.complexes,  cover: complexThumb,   Icon: Building2 },
    { key: 'developers', href: r.developers, ...c.sectionDevelopers, count: counts.developers, cover: null,           Icon: HardHat },
  ]

  // Popular districts: same Bali names in both languages, but the
  // route prefix differs (/ru/apartamenty vs /en/apartments) so we
  // resolve from r.apartments. Slug map is shared.
  const districts = POPULAR_DISTRICTS.map(d => ({ name: d, slug: DISTRICT_TO_SLUG[d] })).filter(x => x.slug)

  // Organization JSON-LD: stable identity for Google's Knowledge Panel.
  // Per-locale URL because each locale page is its own canonical.
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Balinsky',
    url: `${SITE_BASE}${r.home}`,
    logo: `${SITE_BASE}/logo.svg`,
    description: c.orgDescription,
    sameAs: ['https://www.youtube.com/@balinsky_info', 'https://t.me/BalinskyBot'],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.map(item => ({
      '@type': 'Question', name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <>
      <Header />

      <PageContainer>
        <BalinaHero />

        <section className="pb-6">
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] leading-snug max-w-3xl">
            {c.h2}
          </h2>
          <p className="mt-3 text-[15px] md:text-[16px] text-[var(--color-text-muted)] leading-relaxed max-w-2xl">
            {c.intro(counts.villas + counts.apartments, counts.complexes, counts.developers)}
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {sections.map(({ key, href, title, tagline, count, countLabel, cover, Icon }, idx) => (
            <Link key={key} href={href} className="group block bg-white rounded-3xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors">
              <div className="relative h-[220px] md:h-[260px] bg-[var(--color-search-bg)] overflow-hidden">
                {cover ? (
                  <Image
                    src={cover}
                    alt={title}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    priority={idx < 2}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--color-primary-soft)]">
                    <Icon size={56} strokeWidth={1.5} className="text-[var(--color-primary-pressed)]" />
                  </div>
                )}
                <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 text-[13px] font-medium text-[var(--color-text)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
                  <Icon size={15} strokeWidth={2} />
                  {title}
                </div>
              </div>
              <div className="p-6 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[22px] md:text-[24px] font-semibold text-[#111827] mb-1.5">{title}</div>
                  <div className="text-[14px] text-[var(--color-text-muted)] leading-snug max-w-md">{tagline}</div>
                  <div className="mt-3 text-[13px] text-[var(--color-primary-pressed)] font-medium">{count} {countLabel}</div>
                </div>
                <ArrowRight size={22} strokeWidth={2} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </section>

        {topVillas.length > 0 && (
          <section className="mb-16">
            <SectionHeader title={c.topVillasTitle} href={r.villas} linkText={c.topVillasLink} Icon={Sparkles} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topVillas.map(v => <VillaCard key={v.slug} a={v} lang={lang} />)}
            </div>
          </section>
        )}

        <YouTubeBlock videos={ytVideos} />

        {activePromo.length > 0 && (
          <section className="mb-16">
            <SectionHeader title={c.activePromoTitle} href={r.promo} linkText={c.activePromoLink} Icon={Sparkles} />
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activePromo.map(p => (
                <li key={p.id}>
                  <Link href={`${r.promo}/${p.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                    <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)] overflow-hidden">
                      {p.photo ? (
                        <Image src={p.photo} alt={p.title} fill sizes="(min-width: 768px) 33vw, 100vw" loading="lazy" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🎁</div>
                      )}
                    </div>
                    <div className="p-4">
                      {p.developers[0]?.name && (
                        <div className="text-[11px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium mb-1">{p.developers[0].name}</div>
                      )}
                      <div className="text-[15px] font-semibold leading-snug line-clamp-2 mb-1.5">{p.title}</div>
                      {p.expiresAt && (
                        <div className="text-[12px] text-[var(--color-text-muted)]">{c.until(fmtDate(p.expiresAt, c.locale) ?? '')}</div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {upcomingEvents.length > 0 && (
          <section className="mb-16">
            <SectionHeader title={c.eventsTitle} href={r.events} linkText={c.eventsLink} Icon={Calendar} />
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {upcomingEvents.map(e => (
                <li key={e.id}>
                  <Link href={`${r.events}/${e.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                    <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)] overflow-hidden">
                      {e.photo ? (
                        <Image src={e.photo} alt={e.title} fill sizes="(min-width: 768px) 33vw, 100vw" loading="lazy" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🎟️</div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        {e.developers[0]?.name && (
                          <span className="text-[11px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium">{e.developers[0].name}</span>
                        )}
                        {e.format && (
                          <span className="text-[10px] uppercase tracking-wide bg-[#E5E7EB] text-[#374151] px-1.5 py-0.5 rounded">{e.format}</span>
                        )}
                      </div>
                      <div className="text-[15px] font-semibold leading-snug line-clamp-2 mb-1.5">{e.title}</div>
                      {e.startsAt && (
                        <div className="text-[12px] text-[var(--color-text-muted)]">{fmtDateTime(e.startsAt, c.locale)}</div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {topComplexes.length > 0 && (
          <section className="mb-16">
            <SectionHeader title={c.complexesTitle} href={r.complexes} linkText={c.complexesLink} Icon={Building2} />
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {topComplexes.map(item => (
                <li key={item.slug}>
                  <Link href={`${r.complexes}/o/${item.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                    <div className="relative w-full aspect-[4/3] bg-[var(--color-search-bg)] overflow-hidden">
                      {item.cover ? (
                        <Image src={item.cover} alt={item.title} fill sizes="(min-width: 768px) 33vw, 100vw" loading="lazy" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🏗️</div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="text-[15px] font-semibold leading-snug line-clamp-2 mb-1">{item.title}</div>
                      <div className="text-[12px] text-[var(--color-text-muted)]">
                        {item.district && <span>{item.district}</span>}
                        {item.units != null && <span> · {item.units} {c.unitsSuffix}</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {latestNews.length > 0 && (
          <section className="mb-16">
            <SectionHeader title={c.newsTitle} href={r.news} linkText={c.newsLink} Icon={Newspaper} />
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {latestNews.map(n => (
                <li key={n.id}>
                  <Link href={`${r.news}/${n.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                    <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)] overflow-hidden">
                      {n.photo ? (
                        <Image src={n.photo} alt={n.title} fill sizes="(min-width: 768px) 33vw, 100vw" loading="lazy" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">📰</div>
                      )}
                    </div>
                    <div className="p-4">
                      {n.developers[0]?.name && (
                        <div className="text-[11px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium mb-1">{n.developers[0].name}</div>
                      )}
                      <div className="text-[15px] font-semibold leading-snug line-clamp-3 mb-1.5">{n.title}</div>
                      {n.date && (
                        <div className="text-[12px] text-[var(--color-text-muted)]">{fmtDate(n.date, c.locale)}</div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mb-16">
          <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-3">
            {c.districtsTitle}
          </h2>
          <p className="text-[14px] text-[var(--color-text-muted)] mb-5 max-w-3xl">
            {c.districtsIntro}
          </p>
          <ul className="flex flex-wrap gap-2">
            {districts.map(d => (
              <li key={d.slug}>
                <Link
                  href={lang === 'en' ? `${r.apartments}?district=${encodeURIComponent(d.name)}` : `${r.apartments}/${d.slug}`}
                  className="inline-block px-4 py-2 rounded-full bg-white border border-[var(--color-border)] text-[14px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-16 rounded-3xl border border-[var(--color-border)] bg-[var(--color-primary-soft)] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[13px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium mb-1">
              <BookOpen size={14} /> {c.knowledgeBadge}
            </div>
            <h3 className="text-[20px] md:text-[24px] font-semibold text-[#111827] leading-snug max-w-xl">
              {c.knowledgeTitle}
            </h3>
          </div>
          <Link href={r.knowledge} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[14px] font-medium no-underline hover:bg-[var(--color-primary-hover)] shrink-0">
            {c.knowledgeCta} <ArrowRight size={16} />
          </Link>
        </section>

        <section className="border-t border-[var(--color-border)] pt-10 mb-12">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
            {c.seoH2}
          </h2>
          <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-[var(--color-text)]">
            <p>{c.seoP1}</p>
            <p className="text-[var(--color-text-muted)]">{c.seoP2}</p>
          </div>

          <HomeSeoBlocks lang={lang} />

          <h3 className="text-[18px] font-semibold text-[#111827] mt-10 mb-4">{c.faqTitle}</h3>
          <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
            {c.faq.map((item, i) => (
              <details key={i} className="group py-4">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-medium text-[#111827]">
                  {item.q}
                  <span className="text-[var(--color-text-muted)] text-[20px] leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}

function SectionHeader({ title, href, linkText, Icon }: { title: string; href: string; linkText: string; Icon: typeof Sparkles }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] inline-flex items-center gap-2">
        <Icon size={22} className="text-[var(--color-primary)]" />
        {title}
      </h2>
      <Link href={href} className="inline-flex items-center gap-1 text-[13px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] no-underline shrink-0">
        {linkText} <ArrowRight size={14} />
      </Link>
    </div>
  )
}
