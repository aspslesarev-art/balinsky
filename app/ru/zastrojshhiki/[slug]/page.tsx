import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { HardHat, Building2, Award, Wrench, Users, Briefcase, TrendingUp, ChevronRight } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { ComplexCard, type ComplexCardData } from '@/components/ComplexCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ManagerCard } from '@/components/ManagerCard'
import { loadManagerByDeveloperSlug } from '@/lib/managers'
import { loadAllNews } from '@/lib/news'
import { loadAllPromo } from '@/lib/promo'
import { loadAllEvents } from '@/lib/events'
import { loadVideosByDeveloperWithComplexes } from '@/lib/videos'
import { VideoGrid } from '@/components/VideoGrid'

export const revalidate = 3600
// Empty list → all slugs are generated on-demand and cached as ISR.
// Pre-rendering at build would be slow; on-demand + 1h cache is the sweet spot.
export function generateStaticParams() { return [] }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const COMPLEX_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

type Params = Promise<{ slug: string }>

type DeveloperRow = { airtable_id: string; data: Record<string, unknown>; logo_url: string | null }

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) {
    return firstString((v as { value: unknown }).value)
  }
  return null
}

function logoFromJson(data: Record<string, unknown>): string | null {
  const arr = data['Logo']
  if (Array.isArray(arr) && arr[0] && typeof arr[0] === 'object' && 'url' in arr[0]) {
    const url = (arr[0] as { url: unknown }).url
    return typeof url === 'string' ? url : null
  }
  return null
}

function parseBullets(s: string | null): string[] {
  if (!s) return []
  const trimmed = s.trim()
  if (!trimmed || trimmed.toLowerCase() === 'не известно') return []
  return trimmed
    .split('\n')
    .map(line => line.replace(/^[\s•\-–—·]+/, '').trim())
    .filter(Boolean)
}

// Cached at the Vercel Data Cache layer so the developer detail page can
// be served as ISR HTML rather than re-queried on every request.
const _loadAllDevelopers = unstable_cache(
  async (): Promise<DeveloperRow[]> => {
    const { data } = await sb
      .from('raw_developers')
      .select('airtable_id, data, logo_url')
      .limit(200)
    return (data as DeveloperRow[] | null) ?? []
  },
  ['developers-all'],
  { revalidate: 3600 },
)

async function loadDeveloper(slug: string): Promise<DeveloperRow | null> {
  const all = await _loadAllDevelopers()
  return all.find(r => firstString(r.data['SEO:Slug']) === slug) ?? null
}

const _loadAllComplexes = unstable_cache(
  async () => {
    const { data } = await sb
      .from('raw_complexes')
      .select('airtable_id, data, slug, cover_url')
      .limit(500)
    return (data ?? []) as { airtable_id: string; data: Record<string, unknown>; slug: string | null; cover_url: string | null }[]
  },
  ['complexes-all-for-dev'],
  { revalidate: 3600 },
)

const _loadComplexManifest = unstable_cache(
  async (): Promise<Record<string, string[]>> => {
    try {
      const r = await fetch(COMPLEX_PHOTO_MANIFEST_URL)
      if (!r.ok) return {}
      return (await r.json()) as Record<string, string[]>
    } catch { return {} }
  },
  ['complex-manifest-for-dev'],
  { revalidate: 3600 },
)

async function loadProjectsByDeveloper(devName: string): Promise<{
  complexes: (ComplexCardData & { id: string })[]
  apartmentCount: number
}> {
  const [all, manifest] = await Promise.all([
    _loadAllComplexes(),
    _loadComplexManifest(),
  ])
  // Strip trailing "(...)" suffix so devs like "LB Group (LOYO&BONDAR)" match
  // catalog rows tagged just "LB Group". Lookup is symmetric: canonical form
  // of either side wins.
  const canonical = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()
  const queryLower = devName.toLowerCase()
  const queryCanonical = canonical(devName)
  const matched = all.filter(r => {
    const dev = firstString(r.data['Developer1']) ?? firstString(r.data['Варианты поиска застройщика'])
    if (!dev) return false
    const devLower = dev.toLowerCase()
    if (devLower.includes(queryLower) || queryLower.includes(devLower)) return true
    return canonical(dev) === queryCanonical
  })

  const CURRENT_YEAR = 2026
  function readiness(d: Record<string, unknown>): number {
    const raw = d['Готовность']
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      const pct = raw <= 1 ? raw * 100 : raw
      return Math.max(0, Math.min(100, Math.round(pct)))
    }
    const status = (firstString(d['Статус']) ?? '').toLowerCase()
    if (status.includes('построен')) return 100
    if (status.includes('заказ')) return 10
    const yr = Number(firstString(d['Year of completion ']) ?? firstString(d['Year of completion']))
    if (Number.isFinite(yr)) {
      const delta = yr - CURRENT_YEAR
      if (delta <= 0) return 95
      if (delta === 1) return 70
      if (delta === 2) return 45
      if (delta === 3) return 30
      return 20
    }
    return 50
  }

  const complexes = matched
    .filter(r => r.slug && firstString(r.data['Project']))
    .map(r => {
      const photos = manifest[r.airtable_id] ?? []
      const district = firstString(r.data['Location 2']) ?? firstString(r.data['Location'])
      const types = Array.isArray(r.data['Типы юнитов'])
        ? (r.data['Типы юнитов'] as unknown[]).map(x => String(x)).join(', ')
        : (firstString(r.data['Типы юнитов']) ?? null)
      return {
        id: r.airtable_id,
        slug: r.slug as string,
        name: firstString(r.data['Project']) as string,
        location: district,
        types,
        permit: firstString(r.data['Разрешительные документы']),
        readiness: readiness(r.data),
        coverUrl: r.cover_url,
        photos,
        photoCount: photos.length || 1,
        villaPriceFrom: null,
        villaPriceTo: null,
        aptPriceFrom: null,
        aptPriceTo: null,
      }
    })

  return { complexes, apartmentCount: 0 }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params
  const dev = await loadDeveloper(slug)
  if (!dev) return { robots: { index: false } }
  const name = firstString(dev.data['Developer']) ?? slug
  const aiDesc = firstString(dev.data['SEO Text']) ?? firstString(dev.data['Описание ИИ']) ?? firstString(dev.data['AI Описание'])
  const description = aiDesc
    ? aiDesc.slice(0, 160).trim() + (aiDesc.length > 160 ? '…' : '')
    : `Застройщик ${name} на Бали — рейтинг по 4 направлениям, проекты, комиссия, надёжность.`
  return {
    title: `Застройщик ${name} на Бали — проекты, рейтинг, отзывы | Balinsky`,
    description,
    alternates: { canonical: `/ru/zastrojshhiki/${slug}` },
    openGraph: {
      title: `${name} — застройщик на Бали`,
      description,
      type: 'website' as const,
      url: `${SITE_URL}/ru/zastrojshhiki/${slug}`,
      images: dev.logo_url ? [{ url: dev.logo_url }] : [],
    },
  }
}

const FAQ_FOR_DEVELOPER = (name: string) => ([
  {
    q: `Сколько проектов у застройщика ${name} на Бали?`,
    a: `Список действующих проектов компании ${name} приведён ниже на этой странице. Каждый проект — отдельная карточка с фото, районом и сроками сдачи.`,
  },
  {
    q: `Как проверить надёжность ${name}?`,
    a: 'Смотрим четыре сигнала: количество сданных проектов, действующее разрешение PBG/SLF на текущей стройке, формат собственности (лизхолд / freehold), наличие и опыт управляющей компании.',
  },
  {
    q: `Можно ли купить юнит у ${name} напрямую?`,
    a: 'Да, большинство застройщиков на Бали продают юниты напрямую без посредников. Сделка оформляется у нотариуса PPAT, оплата идёт по графику, привязанному к этапам строительства.',
  },
  {
    q: 'Что важно проверить перед покупкой?',
    a: 'Срок лизхолда и условия продления, разрешения PBG и SLF, назначение земли, подключение к коммуникациям, наличие управляющей компании. Это даёт уверенность в юридической чистоте и в том, что объект сможет легально сдаваться в аренду.',
  },
])

export default async function Page({ params }: { params: Params }) {
  const { slug } = await params
  const dev = await loadDeveloper(slug)
  if (!dev) notFound()
  if (dev.data['Публикация'] !== true) notFound()

  const name = firstString(dev.data['Developer']) ?? slug
  const logoUrl = dev.logo_url ?? logoFromJson(dev.data)
  const aiText = firstString(dev.data['SEO Text']) ?? firstString(dev.data['Описание ИИ']) ?? firstString(dev.data['AI Описание'])

  const dimensions: { title: string; bullets: string[]; Icon: typeof Building2 }[] = [
    { title: 'Строительство и недвижимость', bullets: parseBullets(firstString(dev.data['Строительство и недвижимость'])), Icon: Building2 },
    { title: 'Репутация и опыт', bullets: parseBullets(firstString(dev.data['Репутация и опыт'])), Icon: Award },
    { title: 'Техника и производство', bullets: parseBullets(firstString(dev.data['Техника и производство'])), Icon: Wrench },
    { title: 'Управляющая компания', bullets: parseBullets(firstString(dev.data['Управляющая компания'])), Icon: Users },
  ].filter(d => d.bullets.length > 0)

  const extras: { title: string; bullets: string[]; Icon: typeof Briefcase }[] = [
    { title: 'Команда', bullets: parseBullets(firstString(dev.data['Команда'])), Icon: Users },
    { title: 'Бизнес и сервисы', bullets: parseBullets(firstString(dev.data['Бизнес и сервисы'])), Icon: Briefcase },
    { title: 'Доходность для инвестора', bullets: parseBullets(firstString(dev.data['Доходность'])), Icon: TrendingUp },
  ].filter(d => d.bullets.length > 0)

  const [{ complexes, apartmentCount }, manager] = await Promise.all([
    loadProjectsByDeveloper(name),
    loadManagerByDeveloperSlug(slug),
  ])
  const districts = [...new Set(complexes.map(c => c.location).filter(Boolean) as string[])]
  const complexSlugs = complexes.map(c => c.slug).filter((s): s is string => !!s)

  // Cross-section: новости/акции/мероприятия/видео конкретного застройщика
  // Видео: прямые ссылки на застройщика + наследование от его комплексов.
  const [allNews, allPromo, allEvents, devVideos] = await Promise.all([
    loadAllNews().catch(() => []),
    loadAllPromo().catch(() => []),
    loadAllEvents().catch(() => []),
    loadVideosByDeveloperWithComplexes(slug, complexSlugs, 12).catch(() => []),
  ])
  const devNews = allNews.filter(n => n.developers.some(d => d.slug === slug)).slice(0, 4)
  const devPromo = allPromo.filter(p => p.developers.some(d => d.slug === slug)).slice(0, 4)
  const devEvents = allEvents.filter(e => e.developers.some(d => d.slug === slug)).slice(0, 4)

  const faqItems = FAQ_FOR_DEVELOPER(name)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const orgJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name,
    url: `${SITE_URL}/ru/zastrojshhiki/${slug}`,
    areaServed: { '@type': 'Place', name: 'Bali, Indonesia' },
  }
  if (logoUrl) orgJsonLd.logo = logoUrl
  if (aiText) orgJsonLd.description = aiText.slice(0, 500)

  // Editorial review schema — the "Общий рейтинг" field is our own
  // editorial scoring (4 dimensions averaged into 0-100). Output as a
  // single Review with Balinsky as the author so Google understands
  // it's editorial / first-party, not a fake user aggregate.
  const totalScore = typeof dev.data['Общий рейтинг'] === 'number'
    ? dev.data['Общий рейтинг'] as number
    : null
  if (totalScore != null && totalScore > 0) {
    const ratingValue = Math.round((totalScore / 20) * 10) / 10 // 0-100 → 0-5, one decimal
    orgJsonLd.review = {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue, bestRating: 5, worstRating: 1 },
      author: { '@type': 'Organization', name: 'Balinsky', url: `${SITE_URL}/ru` },
      itemReviewed: { '@type': 'RealEstateAgent', name },
    }
  }

  return (
    <>
      <Header active="zastrojshhiki" />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Главная', href: '/ru' },
          { label: 'Застройщики', href: '/ru/zastrojshhiki' },
          { label: name },
        ]} />

        {/* HERO */}
        <section className="bg-white rounded-3xl border border-[var(--color-border)] p-6 md:p-10 mb-10 mt-2">
          <div className="flex items-start gap-6 flex-wrap md:flex-nowrap">
            <div className="shrink-0 w-[120px] h-[120px] md:w-[160px] md:h-[160px] rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center p-4">
              {logoUrl ? (
                <img src={logoUrl} alt={name} className="max-w-full max-h-full object-contain" />
              ) : (
                <HardHat size={48} className="text-[var(--color-text-muted)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-[var(--color-text-muted)] mb-2">Застройщик на Бали</div>
              <h1 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.1] mb-4">
                {name}
              </h1>
              <div className="flex items-center flex-wrap gap-x-6 gap-y-2">
                {complexes.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-[var(--color-primary)]" />
                    <span className="text-[15px] font-medium text-[#111827]">{complexes.length}</span>
                    <span className="text-[13px] text-[var(--color-text-muted)]">проектов</span>
                  </div>
                )}
                {districts.length > 0 && (
                  <div className="text-[14px] text-[var(--color-text-muted)]">
                    Районы: <span className="text-[var(--color-text)]">{districts.slice(0, 4).join(', ')}{districts.length > 4 ? ` +${districts.length - 4}` : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {manager && <ManagerCard manager={manager} developerName={name} />}

        {/* RATINGS by 4 dimensions */}
        {dimensions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">
              Рейтинг по направлениям
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dimensions.map(({ title, bullets, Icon }) => (
                <div key={title} className="bg-white rounded-2xl border border-[var(--color-border)] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon size={18} className="text-[var(--color-primary)]" />
                    <h3 className="text-[16px] font-semibold text-[#111827]">{title}</h3>
                  </div>
                  <ul className="space-y-2 text-[14px] text-[var(--color-text)] leading-relaxed list-disc pl-5">
                    {bullets.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI Description (long-form unique content) */}
        {aiText && (
          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
              О застройщике
            </h2>
            <div className="prose-balinsky max-w-3xl text-[15px] leading-relaxed text-[var(--color-text)] whitespace-pre-line">
              {aiText}
            </div>
          </section>
        )}

        {/* Projects by this developer */}
        {complexes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-2">
              Проекты застройщика
            </h2>
            <div className="text-[14px] text-[var(--color-text-muted)] mb-5">
              {complexes.length} жилых комплексов{apartmentCount > 0 ? ` · ${apartmentCount} апартаментов в продаже` : ''}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {complexes.map(c => <ComplexCard key={c.id} c={c} />)}
            </div>
          </section>
        )}

        {/* Extras (team, business, yield) */}
        {extras.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">
              Дополнительно
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {extras.map(({ title, bullets, Icon }) => (
                <div key={title} className="bg-white rounded-2xl border border-[var(--color-border)] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon size={18} className="text-[var(--color-primary)]" />
                    <h3 className="text-[15px] font-semibold text-[#111827]">{title}</h3>
                  </div>
                  <ul className="space-y-2 text-[14px] text-[var(--color-text)] leading-relaxed list-disc pl-5">
                    {bullets.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Internal links */}
        <section className="mb-10">
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">
            По теме
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 max-w-3xl">
            {[
              { href: '/ru/zastrojshhiki', label: 'Все застройщики Бали' },
              { href: '/ru/zhilye-kompleksy', label: 'Жилые комплексы Бали' },
              { href: '/ru/apartamenty', label: 'Апартаменты на Бали' },
              { href: '/ru/villy', label: 'Виллы и дома' },
              ...districts.slice(0, 4).map(d => ({ href: '/ru/apartamenty', label: `Апартаменты в ${d}` })),
            ].map(l => (
              <li key={l.href + l.label}>
                <Link
                  href={l.href}
                  className="inline-flex items-center gap-1 text-[14px] text-[var(--color-text)] hover:text-[var(--color-primary-pressed)]"
                >
                  <ChevronRight size={14} className="text-[var(--color-primary)]" /> {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Videos */}
        {devVideos.length > 0 && (
          <VideoGrid videos={devVideos} title={`Видео о ${name}`} />
        )}

        {/* News from this developer */}
        {devNews.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">Новости {name}</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {devNews.map(n => (
                <li key={n.id}>
                  <Link href={`/ru/novosti/${n.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)]">
                    <div className="w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                      {n.photo ? (
                        <img src={n.photo} alt={n.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📰</div>
                      )}
                    </div>
                    <div className="p-3 text-[14px] font-medium leading-snug line-clamp-3">{n.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Promotions from this developer */}
        {devPromo.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">Акции {name}</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {devPromo.map(p => (
                <li key={p.id}>
                  <Link href={`/ru/akcii/${p.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)]">
                    <div className="w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                      {p.photo ? (
                        <img src={p.photo} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🎁</div>
                      )}
                    </div>
                    <div className="p-3 text-[14px] font-medium leading-snug line-clamp-3">{p.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Events from this developer */}
        {devEvents.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">Мероприятия {name}</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {devEvents.map(e => (
                <li key={e.id}>
                  <Link href={`/ru/meropriyatiya/${e.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)]">
                    <div className="w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                      {e.photo ? (
                        <img src={e.photo} alt={e.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🎟️</div>
                      )}
                    </div>
                    <div className="p-3 text-[14px] font-medium leading-snug line-clamp-3">{e.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
            Часто задаваемые вопросы
          </h2>
          <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
            {faqItems.map((item, i) => (
              <details key={i} className="group py-4">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-medium text-[#111827]">
                  {item.q}
                  <span className="text-[var(--color-text-muted)] text-[20px] leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
