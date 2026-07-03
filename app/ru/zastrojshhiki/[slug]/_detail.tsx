// Shared developer-detail renderer used by both /ru/zastrojshhiki/[slug]
// and /en/developers/[slug]. RU and EN versions render the same DOM
// from the same data — they only differ in copy and the locale segment
// in the breadcrumbs / internal links / external schema URL.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { HardHat, Building2, Award, Wrench, Users, Briefcase, ChevronRight } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { reliabilityForDeveloper } from '@/lib/developer-reliability'
import { ExpandableText } from '@/components/ExpandableText'
import { ComplexCard, type ComplexCardData } from '@/components/ComplexCard'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ManagerCard } from '@/components/ManagerCard'
import { loadManagersByDeveloperSlug } from '@/lib/managers'
import { loadAllNews } from '@/lib/news'
import { loadAllPromo } from '@/lib/promo'
import { loadAllEvents } from '@/lib/events'
import { loadVideosByDeveloperWithComplexes } from '@/lib/videos'
import { VideoGrid } from '@/components/VideoGrid'
import { PageViewTracker } from '@/components/PageViewTracker'
import { tField, type Lang } from '@/lib/i18n'
import { isHiddenDeveloper } from '@/lib/hidden-developers'
import { loadKbPageContent } from '@/lib/kb-page-content'
import { loadEnTranslations, mergeEnTranslations } from '@/lib/en-translations'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'
const COMPLEX_PHOTO_MANIFEST_URL = `${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

type DeveloperRow = { airtable_id: string; data: Record<string, unknown>; logo_url: string | null }

function firstString(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length > 0) return firstString(v[0])
  if (v && typeof v === 'object' && 'value' in v) return firstString((v as { value: unknown }).value)
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
  if (!trimmed || /^(не известно|no data)$/i.test(trimmed)) return []
  return trimmed.split('\n').map(line => line.replace(/^[\s•\-–—·]+/, '').trim()).filter(Boolean)
}

// Note: don't cache empty results — if Supabase momentarily flaked
// during the last regeneration, the cache would poison and every
// dev detail page returns 404 for the next hour. Throwing forces
// Next to drop the cache slot and retry on the next request.
// Slim projection — selecting the full `data` column (~3.9MB for 200 devs) blew
// past the 2MB cache ceiling, so unstable_cache silently re-ran on every request
// (~700/day). These are the only developer fields this page, /otzyvy and the OG
// image read; `->` returns the raw JSON value so the reassembled `data` is
// identical. EN twins are projected too so tField's `<field> EN` lookups survive
// (mergeEnTranslations still fills any empty EN slot from the cache).
const DEV_FIELDS = [
  ['Developer', 'f0'], ['AI Описание', 'f1'], ['SEO Text', 'f2'], ['Описание ИИ', 'f3'],
  ['Строительство и недвижимость', 'f4'], ['Репутация и опыт', 'f5'], ['Техника и производство', 'f6'],
  ['Управляющая компания', 'f7'], ['Команда', 'f8'], ['Бизнес и сервисы', 'f9'],
  ['Общий рейтинг', 'f10'], ['Публикация', 'f11'], ['SEO:Slug', 'f12'], ['Logo', 'f13'],
  ['SEO Text EN', 'f14'], ['Описание ИИ EN', 'f15'], ['Строительство и недвижимость EN', 'f16'],
  ['Репутация и опыт EN', 'f17'], ['Техника и производство EN', 'f18'], ['Управляющая компания EN', 'f19'],
  ['Команда EN', 'f20'], ['Бизнес и сервисы EN', 'f21'],
] as const
const DEV_SELECT = ['airtable_id, logo_url', ...DEV_FIELDS.map(([k, a]) => `${a}:data->"${k}"`)].join(', ')

export const _loadAllDevelopers = unstable_cache(
  async (): Promise<DeveloperRow[]> => {
    const [{ data, error }, enCache] = await Promise.all([
      sb.from('raw_developers').select(DEV_SELECT).limit(200),
      loadEnTranslations('developers'),
    ])
    if (error) throw new Error(`raw_developers: ${error.message}`)
    const raw = (data ?? []) as unknown as Record<string, unknown>[]
    if (raw.length === 0) throw new Error('raw_developers returned 0 rows — refusing to cache empty')
    return raw.map(rr => {
      const d: Record<string, unknown> = {}
      for (const [k, a] of DEV_FIELDS) d[k] = rr[a]
      return {
        airtable_id: rr.airtable_id as string,
        logo_url: (rr.logo_url ?? null) as string | null,
        data: mergeEnTranslations(d, rr.airtable_id as string, enCache),
      }
    })
  },
  ['developers-all-v4'],
  // Tagged so the Airtable webhook / sync revalidation (revalidateTag
  // 'content:developers') actually busts this cache — otherwise edits sat
  // stale until the 1h TTL.
  { revalidate: 3600, tags: ['content:developers'] },
)

export async function loadDeveloper(slug: string): Promise<DeveloperRow | null> {
  const all = await _loadAllDevelopers()
  // Slug-collision tolerance: Airtable sometimes keeps a draft row
  // alongside the live record with the same SEO:Slug. Prefer the
  // published row so the page doesn't 404 just because an editor
  // forgot to delete the placeholder.
  const found = all.find(r => firstString(r.data['SEO:Slug']) === slug && r.data['Публикация'] === true)
      ?? all.find(r => firstString(r.data['SEO:Slug']) === slug)
      ?? null
  // Hidden developers (lib/hidden-developers) must 404 even on a direct URL.
  if (found && isHiddenDeveloper(firstString(found.data['Developer']))) return null
  return found
}

// Slim projection — full `data` was ~8.4MB (over the 2MB cache ceiling, so it
// re-ran on every request, ~600/day). loadProjectsByDeveloper reads only these
// fields. `Варианты поиска застройщика` (a 2MB+ search-alias string) is dropped
// on purpose: it was only a fallback when Developer1 is empty — rare for a
// published complex — and keeping it kept the whole result uncacheable.
const CPX_DEV_FIELDS = [
  ['Developer1', 'c0'], ['Project', 'c1'], ['Location 2', 'c2'], ['Location', 'c3'],
  ['Типы юнитов', 'c4'], ['Разрешительные документы', 'c5'], ['Готовность', 'c6'],
  ['Статус', 'c7'], ['Year of completion ', 'c8'], ['Year of completion', 'c9'],
] as const
const CPX_DEV_SELECT = ['airtable_id, slug, cover_url', ...CPX_DEV_FIELDS.map(([k, a]) => `${a}:data->"${k}"`)].join(', ')

const _loadAllComplexes = unstable_cache(
  async () => {
    const { data } = await sb.from('raw_complexes').select(CPX_DEV_SELECT).limit(500)
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(rr => {
      const d: Record<string, unknown> = {}
      for (const [k, a] of CPX_DEV_FIELDS) d[k] = rr[a]
      return {
        airtable_id: rr.airtable_id as string,
        slug: (rr.slug ?? null) as string | null,
        cover_url: (rr.cover_url ?? null) as string | null,
        data: d,
      }
    })
  },
  ['complexes-all-for-dev-v2'],
  { revalidate: 3600, tags: ['content:complexes'] },
)

const _loadComplexManifest = unstable_cache(
  async (): Promise<Record<string, string[]>> => {
    try {
      const r = await fetch(COMPLEX_PHOTO_MANIFEST_URL)
      if (!r.ok) return {}
      return (await r.json()) as Record<string, string[]>
    } catch { return {} }
  },
  // Tagged 'content:complexes' so the photo sync's revalidation busts the
  // manifest cache here — without it, freshly-synced photos for a developer's
  // complexes didn't appear on the developer page until the 1h TTL elapsed.
  ['complex-manifest-for-dev'],
  { revalidate: 3600, tags: ['content:complexes'] },
)

async function loadProjectsByDeveloper(devName: string): Promise<{
  complexes: (ComplexCardData & { id: string })[]
  apartmentCount: number
}> {
  const [all, manifest] = await Promise.all([_loadAllComplexes(), _loadComplexManifest()])
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

const COPY = {
  ru: {
    home: 'Главная',
    devsCrumb: 'Застройщики',
    devSubtitle: 'Застройщик на Бали',
    projects: 'проектов',
    districts: 'Районы',
    ratingHeading: 'Рейтинг по направлениям',
    aboutHeading: 'О застройщике',
    projectsHeading: 'Проекты застройщика',
    projectsSubLine: (n: number, apts: number) => `${n} жилых комплексов${apts > 0 ? ` · ${apts} апартаментов в продаже` : ''}`,
    extrasHeading: 'Дополнительно',
    relatedHeading: 'По теме',
    videosTitle: (name: string) => `Видео о ${name}`,
    newsHeading: (name: string) => `Новости ${name}`,
    promoHeading: (name: string) => `Акции ${name}`,
    eventsHeading: (name: string) => `Мероприятия ${name}`,
    faqHeading: 'Часто задаваемые вопросы',
    dim: { construction: 'Строительство и недвижимость', reputation: 'Репутация и опыт', equipment: 'Техника и производство', management: 'Управляющая компания' },
    extras: { team: 'Команда', business: 'Бизнес и сервисы' },
    related: { allDevs: 'Все застройщики Бали', complexes: 'Жилые комплексы Бали', apartments: 'Апартаменты на Бали', villas: 'Виллы и дома', aptsIn: (d: string) => `Апартаменты в ${d}` },
    faq: (name: string) => [
      { q: `Сколько проектов у застройщика ${name} на Бали?`,
        a: `Список действующих проектов компании ${name} приведён выше на этой странице. Каждый проект — отдельная карточка с фото, районом и сроками сдачи.` },
      { q: `Как проверить надёжность ${name}?`,
        a: 'Смотрим четыре сигнала: количество сданных проектов, действующее разрешение PBG/SLF на текущей стройке, формат собственности (лизхолд / freehold), наличие и опыт управляющей компании.' },
      { q: `Можно ли купить юнит у ${name} напрямую?`,
        a: 'Да, большинство застройщиков на Бали продают юниты напрямую без посредников. Сделка оформляется у нотариуса PPAT, оплата идёт по графику, привязанному к этапам строительства.' },
      { q: 'Что важно проверить перед покупкой?',
        a: 'Срок лизхолда и условия продления, разрешения PBG и SLF, назначение земли, подключение к коммуникациям, наличие управляющей компании. Это даёт уверенность в юридической чистоте и в том, что объект сможет легально сдаваться в аренду.' },
    ],
  },
  en: {
    home: 'Home',
    devsCrumb: 'Developers',
    devSubtitle: 'Bali property developer',
    projects: 'projects',
    districts: 'Districts',
    ratingHeading: 'Score by dimension',
    aboutHeading: 'About the developer',
    projectsHeading: 'Projects by this developer',
    projectsSubLine: (n: number, apts: number) => `${n} residential complexes${apts > 0 ? ` · ${apts} apartments on sale` : ''}`,
    extrasHeading: 'Extras',
    relatedHeading: 'Related',
    videosTitle: (name: string) => `Videos about ${name}`,
    newsHeading: (name: string) => `News from ${name}`,
    promoHeading: (name: string) => `Promotions from ${name}`,
    eventsHeading: (name: string) => `Events with ${name}`,
    faqHeading: 'Frequently asked questions',
    dim: { construction: 'Construction & real estate', reputation: 'Reputation & experience', equipment: 'Equipment & production', management: 'Management company' },
    extras: { team: 'Team', business: 'Business & services' },
    related: { allDevs: 'All Bali developers', complexes: 'Bali residential complexes', apartments: 'Apartments in Bali', villas: 'Villas and houses', aptsIn: (d: string) => `Apartments in ${d}` },
    faq: (name: string) => [
      { q: `How many projects does ${name} have in Bali?`,
        a: `${name}'s active projects are listed above on this page. Each project is a separate card with photos, district and completion date.` },
      { q: `How do I verify ${name} is reliable?`,
        a: 'Check four signals: number of completed projects, an active PBG/SLF permit on the current build, ownership format (leasehold / freehold), and whether a real management company is in place.' },
      { q: `Can I buy a unit from ${name} directly?`,
        a: 'Yes — most Bali developers sell directly without intermediaries. The deal is closed at a PPAT notary, payment runs on a schedule tied to construction milestones.' },
      { q: 'What should I verify before buying?',
        a: 'Leasehold term and extension conditions, PBG and SLF permits, land designation, utilities connection and management company presence. This gives you confidence in the legal cleanliness of the deal and the ability to legally rent the property out.' },
    ],
  },
} as const

export async function generateDeveloperMetadata(slug: string, lang: Lang) {
  const dev = await loadDeveloper(slug)
  if (!dev) return { robots: { index: false } }
  const name = firstString(dev.data['Developer']) ?? slug
  const aiDesc = tField(dev.data, 'SEO Text', lang)
    ?? tField(dev.data, 'Описание ИИ', lang)
    ?? firstString(dev.data['AI Описание'])
  const description = aiDesc
    ? aiDesc.slice(0, 160).trim() + (aiDesc.length > 160 ? '…' : '')
    : (lang === 'en'
      ? `${name} — Bali property developer. Score across four dimensions, projects, commission, reliability.`
      : `Застройщик ${name} на Бали — рейтинг по 4 направлениям, проекты, комиссия, надёжность.`)
  const ruPath = `/ru/zastrojshhiki/${slug}`
  const enPath = `/en/developers/${slug}`
  const path = lang === 'en' ? enPath : ruPath
  const title = lang === 'en'
    ? `${name} — Bali property developer | projects, score, reviews | Balinsky`
    : `Застройщик ${name} на Бали — проекты, рейтинг, отзывы | Balinsky`
  return {
    title, description,
    alternates: {
      canonical: path,
      languages: { ru: `${SITE_URL}${ruPath}`, en: `${SITE_URL}${enPath}` , 'x-default': `${SITE_URL}${ruPath}`},
    },
    openGraph: {
      title: lang === 'en' ? `${name} — Bali property developer` : `${name} — застройщик на Бали`,
      description, type: 'website' as const,
      url: `${SITE_URL}${path}`,
      images: dev.logo_url ? [{ url: dev.logo_url }] : [],
    },
  }
}

export async function DeveloperDetail({ slug, lang }: { slug: string; lang: Lang }) {
  const dev = await loadDeveloper(slug)
  if (!dev) notFound()
  if (dev.data['Публикация'] !== true) notFound()

  const c = COPY[lang]
  const name = firstString(dev.data['Developer']) ?? slug
  const logoUrl = dev.logo_url ?? logoFromJson(dev.data)
  const aiTextRaw = tField(dev.data, 'SEO Text', lang)
    ?? tField(dev.data, 'Описание ИИ', lang)
    ?? firstString(dev.data['AI Описание'])
  const kb = await loadKbPageContent('developer', dev.airtable_id, lang)
  const aiText = kb?.body ?? aiTextRaw

  const dimensions = [
    { title: c.dim.construction, bullets: parseBullets(tField(dev.data, 'Строительство и недвижимость', lang)), Icon: Building2 },
    { title: c.dim.reputation,   bullets: parseBullets(tField(dev.data, 'Репутация и опыт',             lang)), Icon: Award },
    { title: c.dim.equipment,    bullets: parseBullets(tField(dev.data, 'Техника и производство',       lang)), Icon: Wrench },
    { title: c.dim.management,   bullets: parseBullets(tField(dev.data, 'Управляющая компания',         lang)), Icon: Users },
  ].filter(d => d.bullets.length > 0)

  const extras = [
    { title: c.extras.team,     bullets: parseBullets(tField(dev.data, 'Команда',           lang)), Icon: Users },
    { title: c.extras.business, bullets: parseBullets(tField(dev.data, 'Бизнес и сервисы',  lang)), Icon: Briefcase },
  ].filter(d => d.bullets.length > 0)

  const [{ complexes, apartmentCount }, managers] = await Promise.all([
    loadProjectsByDeveloper(name),
    loadManagersByDeveloperSlug(slug),
  ])
  const districts = [...new Set(complexes.map(c => c.location).filter(Boolean) as string[])]
  const complexSlugs = complexes.map(c => c.slug).filter((s): s is string => !!s)

  const [allNews, allPromo, allEvents, devVideos] = await Promise.all([
    loadAllNews(lang).catch(() => []),
    loadAllPromo(lang).catch(() => []),
    loadAllEvents(lang).catch(() => []),
    loadVideosByDeveloperWithComplexes(slug, complexSlugs, 12, lang).catch(() => []),
  ])
  const devNews = allNews.filter(n => n.developers.some(d => d.slug === slug)).slice(0, 4)
  const devPromo = allPromo.filter(p => p.developers.some(d => d.slug === slug)).slice(0, 4)
  const devEvents = allEvents.filter(e => e.developers.some(d => d.slug === slug)).slice(0, 4)

  const faqItems = (kb?.faq && kb.faq.length) ? kb.faq : c.faq(name)
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question', name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const detailUrl = lang === 'en' ? `${SITE_URL}/en/developers/${slug}` : `${SITE_URL}/ru/zastrojshhiki/${slug}`
  const orgJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': 'RealEstateAgent',
    name, url: detailUrl,
    areaServed: { '@type': 'Place', name: 'Bali, Indonesia' },
  }
  if (logoUrl) orgJsonLd.logo = logoUrl
  if (aiText) orgJsonLd.description = aiText.slice(0, 500)
  // TASK-13b (option 2): editorial "reliability index" from objective delivery
  // data (completed/active projects) — an expert Review by Balinsky, not user
  // reviews. Replaces the unusable 0–100 "Общий рейтинг" (77/114 = 100). The
  // score is rendered visibly below, so the markup mirrors on-page content.
  const reliability = await reliabilityForDeveloper(name)
  if (reliability) {
    orgJsonLd.review = {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: reliability.score, bestRating: 5, worstRating: 1 },
      author: { '@type': 'Organization', name: 'Balinsky', url: `${SITE_URL}/${lang}` },
      itemReviewed: { '@type': 'RealEstateAgent', name },
    }
  }

  const home = lang === 'en' ? '/en' : '/ru'
  const devsRoot = lang === 'en' ? '/en/developers' : '/ru/zastrojshhiki'
  const complexesRoot = lang === 'en' ? '/en/complexes' : '/ru/zhilye-kompleksy'
  const apartmentsRoot = lang === 'en' ? '/en/apartments' : '/ru/apartamenty'
  const villasRoot = lang === 'en' ? '/en/villas' : '/ru/villy'
  const newsBase = lang === 'en' ? '/en/news' : '/ru/novosti'
  const promoBase = lang === 'en' ? '/en/promo' : '/ru/akcii'
  const eventsBase = lang === 'en' ? '/en/events' : '/ru/meropriyatiya'

  return (
    <>
      <Header active="zastrojshhiki" />
      <PageViewTracker kind="developer" slug={slug} title={name} airtableId={dev.airtable_id} lang={lang} />
      <PageContainer>
        <Breadcrumbs currentUrl={`${devsRoot}/${slug}`} items={[
          { label: c.home, href: home },
          { label: c.devsCrumb, href: devsRoot },
          { label: name },
        ]} />

        {/* HERO */}
        <section className="bg-white rounded-3xl border border-[var(--color-border)] p-6 md:p-10 mb-10 mt-2">
          <div className="flex items-start gap-6 flex-wrap md:flex-nowrap">
            <div className="shrink-0 w-[120px] h-[120px] md:w-[160px] md:h-[160px] rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center p-4">
              {logoUrl ? (
                <Image src={logoUrl} alt={name} width={160} height={160} className="max-w-full max-h-full object-contain" />
              ) : (
                <HardHat size={48} className="text-[var(--color-text-muted)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-[var(--color-text-muted)] mb-2">{c.devSubtitle}</div>
              <h1 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.1] mb-4">
                {name}
              </h1>
              <div className="flex items-center flex-wrap gap-x-6 gap-y-2">
                {complexes.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-[var(--color-primary)]" />
                    <span className="text-[15px] font-medium text-[#111827]">{complexes.length}</span>
                    <span className="text-[13px] text-[var(--color-text-muted)]">{c.projects}</span>
                  </div>
                )}
                {districts.length > 0 && (
                  <div className="text-[14px] text-[var(--color-text-muted)]">
                    {c.districts}: <span className="text-[var(--color-text)]">{districts.slice(0, 4).join(', ')}{districts.length > 4 ? ` +${districts.length - 4}` : ''}</span>
                  </div>
                )}
              </div>
              {/* Visible star rating hidden for now — developers raised
                  questions about how it's derived. The reliability Review
                  JSON-LD above stays (for SERP rich snippets) until we settle
                  on an objective, defensible rating methodology. */}
            </div>
          </div>
        </section>

        {managers.length > 0 && <ManagerCard managers={managers} developerName={name} />}

        {extras.length > 0 && (
          <section className="mt-10 mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">{c.extrasHeading}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {dimensions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">{c.ratingHeading}</h2>
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

        {aiText && (
          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">{c.aboutHeading}</h2>
            <ExpandableText className="max-w-3xl" more={lang === 'en' ? 'Read more' : 'Подробнее'} less={lang === 'en' ? 'Show less' : 'Свернуть'}>
              <div className="prose-balinsky text-[15px] leading-relaxed text-[var(--color-text)] whitespace-pre-line">
                {aiText}
              </div>
            </ExpandableText>
          </section>
        )}

        {complexes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-2">{c.projectsHeading}</h2>
            <div className="text-[14px] text-[var(--color-text-muted)] mb-5">{c.projectsSubLine(complexes.length, apartmentCount)}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {complexes.map(it => <ComplexCard key={it.id} c={it} lang={lang} />)}
            </div>
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">{c.relatedHeading}</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 max-w-3xl">
            {[
              { href: devsRoot, label: c.related.allDevs },
              { href: complexesRoot, label: c.related.complexes },
              { href: apartmentsRoot, label: c.related.apartments },
              { href: villasRoot, label: c.related.villas },
              ...districts.slice(0, 4).map(d => ({ href: apartmentsRoot, label: c.related.aptsIn(d) })),
            ].map(l => (
              <li key={l.href + l.label}>
                <Link href={l.href} className="inline-flex items-center gap-1 text-[14px] text-[var(--color-text)] hover:text-[var(--color-primary-pressed)]">
                  <ChevronRight size={14} className="text-[var(--color-primary)]" /> {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {devVideos.length > 0 && <VideoGrid videos={devVideos} title={c.videosTitle(name)} />}

        {devNews.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">{c.newsHeading(name)}</h2>
            <ul className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 -mx-6 px-6 max-w-none md:max-w-full md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {devNews.map(n => (
                <li key={n.id} className="snap-start shrink-0 w-[280px] md:w-auto">
                  <Link href={`${newsBase}/${n.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)]">
                    <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                      {n.photo ? (
                        <Image src={n.photo} alt={n.title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
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

        {devPromo.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">{c.promoHeading(name)}</h2>
            <ul className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 -mx-6 px-6 max-w-none md:max-w-full md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {devPromo.map(p => (
                <li key={p.id} className="snap-start shrink-0 w-[280px] md:w-auto">
                  <Link href={`${promoBase}/${p.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)]">
                    <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                      {p.photo ? (
                        <Image src={p.photo} alt={p.title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
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

        {devEvents.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">{c.eventsHeading(name)}</h2>
            <ul className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 -mx-6 px-6 max-w-none md:max-w-full md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {devEvents.map(e => (
                <li key={e.id} className="snap-start shrink-0 w-[280px] md:w-auto">
                  <Link href={`${eventsBase}/${e.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)]">
                    <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)]">
                      {e.photo ? (
                        <Image src={e.photo} alt={e.title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
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

        <section className="mb-10">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">{c.faqHeading}</h2>
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
