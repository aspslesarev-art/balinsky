import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Home as HomeIcon, Building, Building2, HardHat, ArrowRight, Calendar, Sparkles, Newspaper, BookOpen } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { VillaCard, type VillaCardData } from '@/components/VillaCard'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { loadAll as loadAllVillas, buildAllCards as buildAllVillaCards, type VillaFilterState } from './villy/_lib'
import { loadLatestYouTubeVideos } from '@/lib/youtube'
import { YouTubeBlock } from '@/components/YouTubeBlock'
import { loadAllVillaScores } from '@/lib/investment/batch-scores'
import { loadAllNews } from '@/lib/news'
import { loadAllPromo } from '@/lib/promo'
import { loadAllEvents } from '@/lib/events'

export const revalidate = 1800

export const metadata = {
  title: 'Balinsky — недвижимость на Бали: виллы, апартаменты, жилые комплексы',
  description:
    'Каталог недвижимости Бали с фото, ценами и фильтрами. Виллы, апартаменты, жилые комплексы и проверенные застройщики. Свежие новости, акции и мероприятия.',
  alternates: { canonical: '/ru' },
  openGraph: {
    title: 'Balinsky — недвижимость на Бали',
    description: 'Виллы, апартаменты и жилые комплексы Бали. Проверенные застройщики.',
    type: 'website',
    url: '/ru',
  },
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

const POPULAR_DISTRICTS = ['Berawa', 'Pererenan', 'Ubud', 'Uluwatu', 'Pandawa', 'Sanur', 'Batu Bolong', 'Cemagi']

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
      district: [], bedrooms: [], status: [], permit: [], year: [], developer: [], style: [],
    }
    const cards = buildAllVillaCards(enriched, manifest, emptyFilters, scores, 'investment-desc')
    return cards.slice(0, 6)
  } catch { return [] }
}

type ComplexCard = {
  slug: string
  title: string
  district: string | null
  cover: string | null
  units: number | null
  status: string | null
  yearOfCompletion: string | null
}

async function loadTopComplexes(): Promise<ComplexCard[]> {
  try {
    const { data } = await sb.from('raw_complexes').select('airtable_id, data, slug, cover_url').limit(500)
    const items: ComplexCard[] = []
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

const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: 'С чего начать выбор недвижимости на Бали?', a: 'С формата: для жизни — виллы и таунхаусы в Чангу, Сануре или Убуде; под аренду — апартаменты в строящихся комплексах с управляющей компанией; под перепродажу — премиальные виды на Буките.' },
  { q: 'Можно ли иностранцу купить недвижимость на Бали?', a: 'Да, через лизхолд (долгосрочная аренда земли, обычно 25–80 лет) или через индонезийское юр. лицо PT PMA. Сделка оформляется у нотариуса PPAT.' },
  { q: 'Какая доходность от сдачи в аренду?', a: 'В Чангу и на Буките — 8–12% годовых при загрузке 70–80% через управляющую компанию. Зависит от района, типа объекта и сезонности.' },
  { q: 'Что такое PBG и SLF?', a: 'PBG — разрешение на строительство (без него стройка нелегальна). SLF — сертификат пригодности к эксплуатации (без него юнит не может официально сдаваться в аренду).' },
]

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

// Organization schema — gives Google a stable identity to attach the
// Knowledge Panel + sitelinks; sameAs ties the site to its YouTube
// channel and Telegram bot, two real off-site signals we already control.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Balinsky',
  url: `${SITE_BASE}/ru`,
  logo: `${SITE_BASE}/logo.svg`,
  description: 'Каталог недвижимости на Бали: виллы, апартаменты, жилые комплексы и проверенные застройщики.',
  sameAs: [
    'https://www.youtube.com/@balinsky_info',
    'https://t.me/BalinskyBot',
  ],
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(item => ({
    '@type': 'Question', name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) } catch { return iso }
}
function fmtDateTime(iso: string | null): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}
function isPast(iso: string | null): boolean {
  if (!iso) return false
  try { return new Date(iso).getTime() < Date.now() } catch { return false }
}

export default async function RuHome() {
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
    { key: 'villy', href: '/ru/villy', title: 'Виллы и дома', tagline: 'Отдельные дома с участком, бассейном и приватной территорией', count: counts.villas, countLabel: 'объектов', cover: villaThumb, Icon: HomeIcon },
    { key: 'apartamenty', href: '/ru/apartamenty', title: 'Апартаменты', tagline: 'Юниты в современных комплексах с управляющей компанией', count: counts.apartments, countLabel: 'объектов', cover: apartmentThumb, Icon: Building },
    { key: 'zhilye-kompleksy', href: '/ru/zhilye-kompleksy', title: 'Жилые комплексы', tagline: 'Закрытые комплексы с инфраструктурой и сервисом', count: counts.complexes, countLabel: 'комплексов', cover: complexThumb, Icon: Building2 },
    { key: 'zastrojshhiki', href: '/ru/zastrojshhiki', title: 'Застройщики', tagline: 'Рейтинги, сданные проекты, юридическая чистота', count: counts.developers, countLabel: 'компаний', cover: null, Icon: HardHat },
  ]

  const districts = POPULAR_DISTRICTS.map(d => ({ name: d, slug: DISTRICT_TO_SLUG[d] })).filter(x => x.slug)

  return (
    <>
      <Header />

      <PageContainer>
        {/* Hero */}
        <section className="pt-12 md:pt-16 pb-8">
          <h1 className="text-[36px] md:text-[52px] font-semibold tracking-tight text-[#111827] leading-[1.05] max-w-3xl">
            Недвижимость на Бали — без посредников и красивых обещаний
          </h1>
          <p className="mt-5 text-[17px] md:text-[18px] text-[var(--color-text-muted)] leading-relaxed max-w-2xl">
            Каталог из {counts.villas + counts.apartments} объектов и {counts.complexes} жилых комплексов
            от {counts.developers} застройщиков. Прозрачные данные о разрешениях и управляющих компаниях,
            свежие акции, новости и мероприятия.
          </p>
        </section>

        {/* 4 categories */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {sections.map(({ key, href, title, tagline, count, countLabel, cover, Icon }, idx) => (
            <Link key={key} href={href} className="group block bg-white rounded-3xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors">
              <div className="relative h-[220px] md:h-[260px] bg-[var(--color-search-bg)] overflow-hidden">
                {cover ? (
                  // First two cover images are above the fold on most viewports
                  // and are the LCP candidate — eager load + high fetchpriority.
                  <img
                    src={cover}
                    alt={title}
                    loading={idx < 2 ? 'eager' : 'lazy'}
                    fetchPriority={idx < 2 ? 'high' : 'auto'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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

        {/* Top villas by investment score */}
        {topVillas.length > 0 && (
          <section className="mb-16">
            <SectionHeader title="Виллы с лучшим инвест-потенциалом" href="/ru/villy" linkText="Все виллы" Icon={Sparkles} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topVillas.map(v => <VillaCard key={v.slug} a={v} />)}
            </div>
          </section>
        )}

        {/* Latest YouTube videos — pulled from the channel RSS feed every 30 min */}
        <YouTubeBlock videos={ytVideos} />

        {/* Active promotions */}
        {activePromo.length > 0 && (
          <section className="mb-16">
            <SectionHeader title="Акции от застройщиков" href="/ru/akcii" linkText="Все акции" Icon={Sparkles} />
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activePromo.map(p => (
                <li key={p.id}>
                  <Link href={`/ru/akcii/${p.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                    <div className="w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                      {p.photo ? (
                        <img src={p.photo} alt={p.title} className="w-full h-full object-cover" />
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
                        <div className="text-[12px] text-[var(--color-text-muted)]">До {fmtDate(p.expiresAt)}</div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <section className="mb-16">
            <SectionHeader title="Ближайшие мероприятия" href="/ru/meropriyatiya" linkText="Все мероприятия" Icon={Calendar} />
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {upcomingEvents.map(e => (
                <li key={e.id}>
                  <Link href={`/ru/meropriyatiya/${e.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                    <div className="w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                      {e.photo ? (
                        <img src={e.photo} alt={e.title} className="w-full h-full object-cover" />
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
                          <span className="text-[10px] uppercase tracking-wide bg-[#F1F5F9] text-[#6B7280] px-1.5 py-0.5 rounded">{e.format}</span>
                        )}
                      </div>
                      <div className="text-[15px] font-semibold leading-snug line-clamp-2 mb-1.5">{e.title}</div>
                      {e.startsAt && (
                        <div className="text-[12px] text-[var(--color-text-muted)]">{fmtDateTime(e.startsAt)}</div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Top complexes */}
        {topComplexes.length > 0 && (
          <section className="mb-16">
            <SectionHeader title="Жилые комплексы" href="/ru/zhilye-kompleksy" linkText="Все комплексы" Icon={Building2} />
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {topComplexes.map(c => (
                <li key={c.slug}>
                  <Link href={`/ru/zhilye-kompleksy/o/${c.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                    <div className="w-full aspect-[4/3] bg-[var(--color-search-bg)]">
                      {c.cover ? (
                        <img src={c.cover} alt={c.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🏗️</div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="text-[15px] font-semibold leading-snug line-clamp-2 mb-1">{c.title}</div>
                      <div className="text-[12px] text-[var(--color-text-muted)]">
                        {c.district && <span>{c.district}</span>}
                        {c.units != null && <span> · {c.units} юнитов</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* News */}
        {latestNews.length > 0 && (
          <section className="mb-16">
            <SectionHeader title="Свежие новости" href="/ru/novosti" linkText="Все новости" Icon={Newspaper} />
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {latestNews.map(n => (
                <li key={n.id}>
                  <Link href={`/ru/novosti/${n.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                    <div className="w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                      {n.photo ? (
                        <img src={n.photo} alt={n.title} className="w-full h-full object-cover" />
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
                        <div className="text-[12px] text-[var(--color-text-muted)]">{fmtDate(n.date)}</div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Popular districts */}
        <section className="mb-16">
          <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-3">
            Популярные районы
          </h2>
          <p className="text-[14px] text-[var(--color-text-muted)] mb-5 max-w-3xl">
            Чангу (Berawa, Pererenan, Batu Bolong) — для сёрфинга и аренды; Букит (Uluwatu, Pandawa) —
            для премиальных видов; Убуд — для жизни в природе; Санур — для семейного формата.
          </p>
          <ul className="flex flex-wrap gap-2">
            {districts.map(d => (
              <li key={d.slug}>
                <Link href={`/ru/apartamenty/${d.slug}`} className="inline-block px-4 py-2 rounded-full bg-white border border-[var(--color-border)] text-[14px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors">
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Knowledge teaser */}
        <section className="mb-16 rounded-3xl border border-[var(--color-border)] bg-[var(--color-primary-soft)] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[13px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium mb-1">
              <BookOpen size={14} /> База знаний
            </div>
            <h3 className="text-[20px] md:text-[24px] font-semibold text-[#111827] leading-snug max-w-xl">
              Лизхолд, налоги, ВНЖ и жизнь на Бали — статьи из практики
            </h3>
          </div>
          <Link href="/ru/znaniya" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[14px] font-medium no-underline hover:bg-[var(--color-primary-hover)] shrink-0">
            Открыть базу знаний <ArrowRight size={16} />
          </Link>
        </section>

        {/* SEO content + FAQ */}
        <section className="border-t border-[var(--color-border)] pt-10 mb-12">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
            Недвижимость на Бали — что важно знать
          </h2>
          <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-[var(--color-text)]">
            <p>
              Бали — один из самых динамичных рынков недвижимости Юго-Восточной Азии. Ежемесячно вводятся
              новые жилые комплексы, активные застройщики работают сразу в нескольких районах. Доходность
              от посуточной аренды в высокий сезон в среднем 8–12% годовых через управляющую компанию.
            </p>
            <p className="text-[var(--color-text-muted)]">
              Большинство сделок оформляется по схеме лизхолд (25–80 лет с возможностью продления),
              реже — через индонезийское юрлицо PT PMA. Документы на стройку: PBG (разрешение) и SLF
              (сертификат пригодности). Без SLF юнит не может легально сдаваться в аренду — это важный
              чек перед покупкой готового объекта.
            </p>
          </div>

          <h3 className="text-[18px] font-semibold text-[#111827] mt-10 mb-4">Часто задаваемые вопросы</h3>
          <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
            {FAQ_ITEMS.map((item, i) => (
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
