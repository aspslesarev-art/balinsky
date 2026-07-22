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
import { tField, pickCopy, switchLangPath, type Lang } from '@/lib/i18n'
import { hasCyrillic, translitPreserveCase } from '@/lib/translit'
import { cleanDeveloperBullets } from '@/lib/developer-highlights'
import { isHiddenDeveloper } from '@/lib/hidden-developers'
import { loadKbPageContent } from '@/lib/kb-page-content'
import { loadAllTranslations, mergeAllTranslations } from '@/lib/en-translations'

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
      loadAllTranslations('developers'),
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
        data: mergeAllTranslations(d, rr.airtable_id as string, enCache),
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
  id: {
    home: 'Beranda',
    devsCrumb: 'Pengembang',
    devSubtitle: 'Pengembang properti Bali',
    projects: 'proyek',
    districts: 'Wilayah',
    ratingHeading: 'Skor per dimensi',
    aboutHeading: 'Tentang pengembang',
    projectsHeading: 'Proyek pengembang ini',
    projectsSubLine: (n: number, apts: number) => `${n} kompleks hunian${apts > 0 ? ` · ${apts} apartemen dijual` : ''}`,
    extrasHeading: 'Tambahan',
    relatedHeading: 'Terkait',
    videosTitle: (name: string) => `Video tentang ${name}`,
    newsHeading: (name: string) => `Berita dari ${name}`,
    promoHeading: (name: string) => `Promo dari ${name}`,
    eventsHeading: (name: string) => `Acara bersama ${name}`,
    faqHeading: 'Pertanyaan yang sering diajukan',
    dim: { construction: 'Konstruksi & properti', reputation: 'Reputasi & pengalaman', equipment: 'Peralatan & produksi', management: 'Perusahaan pengelola' },
    extras: { team: 'Tim', business: 'Bisnis & layanan' },
    related: { allDevs: 'Semua pengembang Bali', complexes: 'Kompleks hunian Bali', apartments: 'Apartemen di Bali', villas: 'Vila dan rumah', aptsIn: (d: string) => `Apartemen di ${d}` },
    faq: (name: string) => [
      { q: `Berapa banyak proyek yang dimiliki ${name} di Bali?`,
        a: `Proyek aktif ${name} tercantum di atas pada halaman ini. Setiap proyek adalah kartu tersendiri dengan foto, wilayah, dan tanggal serah terima.` },
      { q: `Bagaimana cara memverifikasi keandalan ${name}?`,
        a: 'Periksa empat sinyal: jumlah proyek yang selesai, izin PBG/SLF aktif pada proyek berjalan, format kepemilikan (leasehold / freehold), dan keberadaan perusahaan pengelola yang nyata.' },
      { q: `Bisakah saya membeli unit dari ${name} secara langsung?`,
        a: 'Ya — sebagian besar pengembang Bali menjual langsung tanpa perantara. Transaksi dilakukan di notaris PPAT, pembayaran mengikuti jadwal yang terkait dengan tahapan konstruksi.' },
      { q: 'Apa yang perlu diperiksa sebelum membeli?',
        a: 'Jangka waktu hak sewa dan syarat perpanjangan, izin PBG dan SLF, peruntukan tanah, sambungan utilitas, dan keberadaan perusahaan pengelola. Ini memberi keyakinan atas keabsahan hukum transaksi dan kemampuan menyewakan properti secara legal.' },
    ],
  },
  fr: {
    home: 'Accueil',
    devsCrumb: 'Promoteurs',
    devSubtitle: 'Promoteur immobilier à Bali',
    projects: 'projets',
    districts: 'Quartiers',
    ratingHeading: 'Score par dimension',
    aboutHeading: 'À propos du promoteur',
    projectsHeading: 'Projets de ce promoteur',
    projectsSubLine: (n: number, apts: number) => `${n} résidences${apts > 0 ? ` · ${apts} appartements en vente` : ''}`,
    extrasHeading: 'Compléments',
    relatedHeading: 'Sur le même thème',
    videosTitle: (name: string) => `Vidéos sur ${name}`,
    newsHeading: (name: string) => `Actualités de ${name}`,
    promoHeading: (name: string) => `Promotions de ${name}`,
    eventsHeading: (name: string) => `Événements avec ${name}`,
    faqHeading: 'Questions fréquentes',
    dim: { construction: 'Construction & immobilier', reputation: 'Réputation & expérience', equipment: 'Équipement & production', management: 'Société de gestion' },
    extras: { team: 'Équipe', business: 'Activités & services' },
    related: { allDevs: 'Tous les promoteurs de Bali', complexes: 'Résidences de Bali', apartments: 'Appartements à Bali', villas: 'Villas et maisons', aptsIn: (d: string) => `Appartements à ${d}` },
    faq: (name: string) => [
      { q: `Combien de projets ${name} compte-t-il à Bali ?`,
        a: `Les projets actifs de ${name} sont listés ci-dessus sur cette page. Chaque projet est une fiche distincte avec photos, quartier et date de livraison.` },
      { q: `Comment vérifier la fiabilité de ${name} ?`,
        a: 'Vérifiez quatre signaux : nombre de projets livrés, permis PBG/SLF actif sur le chantier en cours, format de propriété (leasehold / freehold) et présence d\'une véritable société de gestion.' },
      { q: `Puis-je acheter une unité directement auprès de ${name} ?`,
        a: 'Oui — la plupart des promoteurs de Bali vendent directement, sans intermédiaire. La transaction se conclut chez un notaire PPAT, le paiement suit un échéancier lié aux étapes de construction.' },
      { q: 'Que faut-il vérifier avant d\'acheter ?',
        a: 'La durée du bail et les conditions de renouvellement, les permis PBG et SLF, l\'affectation du terrain, le raccordement aux réseaux et la présence d\'une société de gestion. Cela garantit la validité juridique de la transaction et la possibilité de louer légalement le bien.' },
    ],
  },
  de: {
    home: 'Startseite',
    devsCrumb: 'Bauträger',
    devSubtitle: 'Immobilien-Bauträger auf Bali',
    projects: 'Projekte',
    districts: 'Gegenden',
    ratingHeading: 'Bewertung nach Dimension',
    aboutHeading: 'Über den Bauträger',
    projectsHeading: 'Projekte dieses Bauträgers',
    projectsSubLine: (n: number, apts: number) => `${n} Wohnanlagen${apts > 0 ? ` · ${apts} Apartments im Verkauf` : ''}`,
    extrasHeading: 'Extras',
    relatedHeading: 'Ähnliches',
    videosTitle: (name: string) => `Videos über ${name}`,
    newsHeading: (name: string) => `Neuigkeiten von ${name}`,
    promoHeading: (name: string) => `Aktionen von ${name}`,
    eventsHeading: (name: string) => `Veranstaltungen mit ${name}`,
    faqHeading: 'Häufig gestellte Fragen',
    dim: { construction: 'Bau & Immobilien', reputation: 'Reputation & Erfahrung', equipment: 'Technik & Produktion', management: 'Verwaltungsgesellschaft' },
    extras: { team: 'Team', business: 'Geschäft & Services' },
    related: { allDevs: 'Alle Bali-Bauträger', complexes: 'Bali-Wohnanlagen', apartments: 'Apartments auf Bali', villas: 'Villen und Häuser', aptsIn: (d: string) => `Apartments in ${d}` },
    faq: (name: string) => [
      { q: `Wie viele Projekte hat ${name} auf Bali?`,
        a: `Die aktiven Projekte von ${name} sind oben auf dieser Seite aufgeführt. Jedes Projekt ist eine eigene Karte mit Fotos, Gegend und Fertigstellungstermin.` },
      { q: `Wie prüfe ich, ob ${name} zuverlässig ist?`,
        a: 'Prüfen Sie vier Signale: Anzahl fertiggestellter Projekte, eine gültige PBG/SLF-Genehmigung für den aktuellen Bau, die Eigentumsform (Leasehold / Freehold) und ob eine echte Verwaltungsgesellschaft vorhanden ist.' },
      { q: `Kann ich eine Einheit direkt von ${name} kaufen?`,
        a: 'Ja — die meisten Bali-Bauträger verkaufen direkt ohne Zwischenhändler. Der Kauf wird bei einem PPAT-Notar abgeschlossen, die Zahlung erfolgt nach einem an die Baufortschritte gekoppelten Zeitplan.' },
      { q: 'Was sollte ich vor dem Kauf prüfen?',
        a: 'Leasehold-Laufzeit und Verlängerungsbedingungen, PBG- und SLF-Genehmigungen, Flächenwidmung, Versorgungsanschluss und Vorhandensein einer Verwaltungsgesellschaft. Das gibt Ihnen Sicherheit über die rechtliche Sauberkeit des Kaufs und die Möglichkeit, die Immobilie legal zu vermieten.' },
    ],
  },
  zh: {
    home: '首页',
    devsCrumb: '开发商',
    devSubtitle: '巴厘岛房地产开发商',
    projects: '个项目',
    districts: '地区',
    ratingHeading: '各维度评分',
    aboutHeading: '关于开发商',
    projectsHeading: '该开发商的项目',
    projectsSubLine: (n: number, apts: number) => `${n} 个住宅区${apts > 0 ? ` · ${apts} 套公寓在售` : ''}`,
    extrasHeading: '更多',
    relatedHeading: '相关',
    videosTitle: (name: string) => `关于 ${name} 的视频`,
    newsHeading: (name: string) => `${name} 的新闻`,
    promoHeading: (name: string) => `${name} 的优惠`,
    eventsHeading: (name: string) => `${name} 的活动`,
    faqHeading: '常见问题',
    dim: { construction: '建筑与房产', reputation: '声誉与经验', equipment: '设备与生产', management: '管理公司' },
    extras: { team: '团队', business: '业务与服务' },
    related: { allDevs: '巴厘岛所有开发商', complexes: '巴厘岛住宅区', apartments: '巴厘岛公寓', villas: '别墅和房屋', aptsIn: (d: string) => `${d} 的公寓` },
    faq: (name: string) => [
      { q: `${name} 在巴厘岛有多少个项目？`,
        a: `${name} 的在建项目列于本页上方。每个项目都是独立卡片，含照片、地区和交付日期。` },
      { q: `如何核实 ${name} 是否可靠？`,
        a: '查看四个信号：已完成项目数量、当前在建项目的有效 PBG/SLF 许可、产权形式（租赁产权 / 永久产权），以及是否配备真正的管理公司。' },
      { q: `我可以直接向 ${name} 购买一套单元吗？`,
        a: '可以——大多数巴厘岛开发商直接销售，无中介。交易在 PPAT 公证人处完成，付款按与施工节点挂钩的时间表进行。' },
      { q: '购买前应核实什么？',
        a: '租赁产权期限及续期条件、PBG 和 SLF 许可、土地用途、公用设施接入以及是否有管理公司。这能让您确信交易在法律上清晰，并且房产可以合法出租。' },
    ],
  },
  nl: {
    home: 'Home',
    devsCrumb: 'Ontwikkelaars',
    devSubtitle: 'Vastgoedontwikkelaar op Bali',
    projects: 'projecten',
    districts: 'Gebieden',
    ratingHeading: 'Score per dimensie',
    aboutHeading: 'Over de ontwikkelaar',
    projectsHeading: 'Projecten van deze ontwikkelaar',
    projectsSubLine: (n: number, apts: number) => `${n} wooncomplexen${apts > 0 ? ` · ${apts} appartementen te koop` : ''}`,
    extrasHeading: 'Extra\'s',
    relatedHeading: 'Gerelateerd',
    videosTitle: (name: string) => `Video\'s over ${name}`,
    newsHeading: (name: string) => `Nieuws van ${name}`,
    promoHeading: (name: string) => `Aanbiedingen van ${name}`,
    eventsHeading: (name: string) => `Evenementen met ${name}`,
    faqHeading: 'Veelgestelde vragen',
    dim: { construction: 'Bouw & vastgoed', reputation: 'Reputatie & ervaring', equipment: 'Techniek & productie', management: 'Beheermaatschappij' },
    extras: { team: 'Team', business: 'Zaken & diensten' },
    related: { allDevs: 'Alle Bali-ontwikkelaars', complexes: 'Bali-wooncomplexen', apartments: 'Appartementen op Bali', villas: 'Villa\'s en huizen', aptsIn: (d: string) => `Appartementen in ${d}` },
    faq: (name: string) => [
      { q: `Hoeveel projecten heeft ${name} op Bali?`,
        a: `De actieve projecten van ${name} staan hierboven op deze pagina. Elk project is een aparte kaart met foto\'s, gebied en opleverdatum.` },
      { q: `Hoe controleer ik of ${name} betrouwbaar is?`,
        a: 'Let op vier signalen: aantal opgeleverde projecten, een geldige PBG/SLF-vergunning voor de huidige bouw, de eigendomsvorm (leasehold / freehold) en of er een echte beheermaatschappij aanwezig is.' },
      { q: `Kan ik een unit rechtstreeks bij ${name} kopen?`,
        a: 'Ja — de meeste Bali-ontwikkelaars verkopen rechtstreeks, zonder tussenpersonen. De transactie wordt afgesloten bij een PPAT-notaris, de betaling verloopt via een schema gekoppeld aan de bouwfasen.' },
      { q: 'Wat moet ik controleren voordat ik koop?',
        a: 'Leaseholdtermijn en verlengingsvoorwaarden, PBG- en SLF-vergunningen, bestemming van de grond, nutsaansluiting en aanwezigheid van een beheermaatschappij. Dat geeft u zekerheid over de juridische zuiverheid van de deal en de mogelijkheid om het object legaal te verhuren.' },
    ],
  },
  ban: {
    home: 'Beranda',
    devsCrumb: 'Pangwangun',
    devSubtitle: 'Pangwangun properti ring Bali',
    projects: 'proyek',
    districts: 'Wewidangan',
    ratingHeading: 'Skor manut dimensi',
    aboutHeading: 'Indik pangwangun',
    projectsHeading: 'Proyek pangwangun puniki',
    projectsSubLine: (n: number, apts: number) => `${n} kompleks${apts > 0 ? ` · ${apts} apartemen kaadol` : ''}`,
    extrasHeading: 'Tambahan',
    relatedHeading: 'Sane pateh',
    videosTitle: (name: string) => `Video indik ${name}`,
    newsHeading: (name: string) => `Orti saking ${name}`,
    promoHeading: (name: string) => `Promo saking ${name}`,
    eventsHeading: (name: string) => `Acara sareng ${name}`,
    faqHeading: 'Patakon sane sering katakenang',
    dim: { construction: 'Konstruksi & properti', reputation: 'Reputasi & pengalaman', equipment: 'Peralatan & produksi', management: 'Pausahaan pangelola' },
    extras: { team: 'Tim', business: 'Bisnis & layanan' },
    related: { allDevs: 'Sami pangwangun Bali', complexes: 'Kompleks ring Bali', apartments: 'Apartemen ring Bali', villas: 'Vila lan umah', aptsIn: (d: string) => `Apartemen ring ${d}` },
    faq: (name: string) => [
      { q: `Kuda proyek sane kadruenang ${name} ring Bali?`,
        a: `Proyek aktif ${name} kacantum baduur ring kaca puniki. Suang-suang proyek inggih punika kartu tersendiri madaging foto, wewidangan, lan tanggal serah terima.` },
      { q: `Sapunapi ngecek keandalan ${name}?`,
        a: 'Cingakin petang sinyal: akeh proyek sane sampun puput, izin PBG/SLF aktif ring proyek sane mamargi, format kepemilikan (leasehold / freehold), lan wentennyane pausahaan pangelola sane nyata.' },
      { q: `Punapi tiang dados numbas unit saking ${name} langsung?`,
        a: 'Inggih — akehan pangwangun Bali ngadol langsung tanpa perantara. Transaksi kalaksanayang ring notaris PPAT, pembayaran manut jadwal sane kagandeng ring tahapan konstruksi.' },
      { q: 'Napi sane patut kacek sadurung numbas?',
        a: 'Jangka waktu hak sewa lan syarat perpanjangan, izin PBG lan SLF, peruntukan tanah, sambungan utilitas, lan wentennyane pausahaan pangelola. Puniki ngicen kapastian indik keabsahan hukum transaksi lan kabisan nyewayang properti sacara legal.' },
    ],
  },
  pl: {
    home: 'Strona główna',
    devsCrumb: 'Deweloperzy',
    devSubtitle: 'Deweloper nieruchomości na Bali',
    projects: 'projekty',
    districts: 'Rejony',
    ratingHeading: 'Ocena według wymiarów',
    aboutHeading: 'O deweloperze',
    projectsHeading: 'Projekty tego dewelopera',
    projectsSubLine: (n: number, apts: number) => `${n} kompleksów mieszkaniowych${apts > 0 ? ` · ${apts} apartamentów w sprzedaży` : ''}`,
    extrasHeading: 'Dodatki',
    relatedHeading: 'Powiązane',
    videosTitle: (name: string) => `Filmy o ${name}`,
    newsHeading: (name: string) => `Aktualności od ${name}`,
    promoHeading: (name: string) => `Promocje od ${name}`,
    eventsHeading: (name: string) => `Wydarzenia z ${name}`,
    faqHeading: 'Najczęściej zadawane pytania',
    dim: { construction: 'Budownictwo i nieruchomości', reputation: 'Reputacja i doświadczenie', equipment: 'Wyposażenie i produkcja', management: 'Firma zarządzająca' },
    extras: { team: 'Zespół', business: 'Biznes i usługi' },
    related: { allDevs: 'Wszyscy deweloperzy na Bali', complexes: 'Kompleksy mieszkaniowe na Bali', apartments: 'Apartamenty na Bali', villas: 'Wille i domy', aptsIn: (d: string) => `Apartamenty w ${d}` },
    faq: (name: string) => [
      { q: `Ile projektów ma ${name} na Bali?`,
        a: `Aktywne projekty ${name} są wymienione powyżej na tej stronie. Każdy projekt to osobna karta ze zdjęciami, rejonem i terminem oddania.` },
      { q: `Jak sprawdzić, czy ${name} jest wiarygodny?`,
        a: 'Sprawdź cztery sygnały: liczbę ukończonych projektów, aktywne pozwolenie PBG/SLF dla obecnej budowy, formę własności (leasehold / freehold) oraz obecność prawdziwej firmy zarządzającej.' },
      { q: `Czy mogę kupić lokal od ${name} bezpośrednio?`,
        a: 'Tak — większość deweloperów na Bali sprzedaje bezpośrednio bez pośredników. Transakcja jest zawierana u notariusza PPAT, płatność przebiega według harmonogramu powiązanego z etapami budowy.' },
      { q: 'Co należy sprawdzić przed zakupem?',
        a: 'Okres leasehold i warunki przedłużenia, pozwolenia PBG i SLF, przeznaczenie gruntu, podłączenie mediów oraz obecność firmy zarządzającej. Daje to pewność co do czystości prawnej transakcji i możliwości legalnego wynajmu nieruchomości.' },
    ],
  },
  uk: {
    home: 'Головна',
    devsCrumb: 'Забудовники',
    devSubtitle: 'Забудовник нерухомості на Балі',
    projects: 'проєкти',
    districts: 'Райони',
    ratingHeading: 'Оцінка за напрямами',
    aboutHeading: 'Про забудовника',
    projectsHeading: 'Проєкти цього забудовника',
    projectsSubLine: (n: number, apts: number) => `${n} житлових комплексів${apts > 0 ? ` · ${apts} апартаментів у продажу` : ''}`,
    extrasHeading: 'Додатково',
    relatedHeading: 'Схоже',
    videosTitle: (name: string) => `Відео про ${name}`,
    newsHeading: (name: string) => `Новини від ${name}`,
    promoHeading: (name: string) => `Акції від ${name}`,
    eventsHeading: (name: string) => `Події з ${name}`,
    faqHeading: 'Часті запитання',
    dim: { construction: 'Будівництво та нерухомість', reputation: 'Репутація та досвід', equipment: 'Обладнання та виробництво', management: 'Керуюча компанія' },
    extras: { team: 'Команда', business: 'Бізнес та послуги' },
    related: { allDevs: 'Усі забудовники Балі', complexes: 'Житлові комплекси Балі', apartments: 'Апартаменти на Балі', villas: 'Вілли та будинки', aptsIn: (d: string) => `Апартаменти в ${d}` },
    faq: (name: string) => [
      { q: `Скільки проєктів має ${name} на Балі?`,
        a: `Активні проєкти ${name} наведені вище на цій сторінці. Кожен проєкт — це окрема картка з фото, районом і датою здачі.` },
      { q: `Як перевірити, чи ${name} надійний?`,
        a: 'Перевірте чотири сигнали: кількість зданих проєктів, активний дозвіл PBG/SLF на поточному будівництві, форму власності (leasehold / freehold) та наявність реальної керуючої компанії.' },
      { q: `Чи можу я купити юніт у ${name} безпосередньо?`,
        a: 'Так — більшість забудовників Балі продають безпосередньо без посередників. Угода укладається у нотаріуса PPAT, оплата йде за графіком, прив’язаним до етапів будівництва.' },
      { q: 'Що слід перевірити перед покупкою?',
        a: 'Термін leasehold та умови продовження, дозволи PBG і SLF, призначення землі, підключення комунікацій і наявність керуючої компанії. Це дає впевненість у юридичній чистоті угоди та можливості легально здавати нерухомість в оренду.' },
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
  // Localized meta templates (title / description / OG) per language — the
  // metadata was previously RU-or-English only, so de/zh/nl/id/fr/ban tabs
  // and SERP snippets showed English.
  const META: Record<Lang, { title: (n: string) => string; desc: (n: string) => string; og: (n: string) => string }> = {
    ru: { title: n => `Застройщик ${n} на Бали — проекты, рейтинг, отзывы | Balinsky`, desc: n => `Застройщик ${n} на Бали — рейтинг по 4 направлениям, проекты, комиссия, надёжность.`, og: n => `${n} — застройщик на Бали` },
    en: { title: n => `${n} — Bali property developer | projects, score, reviews | Balinsky`, desc: n => `${n} — Bali property developer. Score across four dimensions, projects, commission, reliability.`, og: n => `${n} — Bali property developer` },
    de: { title: n => `${n} — Bali-Bauträger | Projekte, Bewertung, Rezensionen | Balinsky`, desc: n => `${n} — Bali-Bauträger. Bewertung in vier Dimensionen, Projekte, Provision, Zuverlässigkeit.`, og: n => `${n} — Bali-Bauträger` },
    zh: { title: n => `${n} — 巴厘岛开发商 | 项目、评分、评价 | Balinsky`, desc: n => `${n} — 巴厘岛开发商。四个维度评分、项目、佣金、可靠性。`, og: n => `${n} — 巴厘岛开发商` },
    nl: { title: n => `${n} — Bali-ontwikkelaar | projecten, score, reviews | Balinsky`, desc: n => `${n} — Bali-ontwikkelaar. Beoordeling op vier dimensies, projecten, commissie, betrouwbaarheid.`, og: n => `${n} — Bali-ontwikkelaar` },
    id: { title: n => `${n} — Pengembang properti Bali | proyek, skor, ulasan | Balinsky`, desc: n => `${n} — Pengembang properti Bali. Skor empat dimensi, proyek, komisi, keandalan.`, og: n => `${n} — Pengembang properti Bali` },
    fr: { title: n => `${n} — Promoteur immobilier à Bali | projets, note, avis | Balinsky`, desc: n => `${n} — Promoteur immobilier à Bali. Note sur quatre dimensions, projets, commission, fiabilité.`, og: n => `${n} — Promoteur immobilier à Bali` },
    ban: { title: n => `${n} — Pangwangun properti Bali | proyek, skor, ulasan | Balinsky`, desc: n => `${n} — Pangwangun properti Bali. Skor patpat dimensi, proyek, komisi, kaandelan.`, og: n => `${n} — Pangwangun properti Bali` },
    pl: { title: n => `${n} — deweloper na Bali | inwestycje, ocena, opinie | Balinsky`, desc: n => `${n} — deweloper na Bali. Ocena w czterech wymiarach, inwestycje, prowizja, wiarygodność.`, og: n => `${n} — deweloper na Bali` },
    uk: { title: n => `${n} — забудовник на Балі | проєкти, рейтинг, відгуки | Balinsky`, desc: n => `${n} — забудовник на Балі. Оцінка за чотирма напрямами, проєкти, комісія, надійність.`, og: n => `${n} — забудовник на Балі` },
  }
  const meta = META[lang] ?? META.en
  const description = aiDesc
    ? aiDesc.slice(0, 160).trim() + (aiDesc.length > 160 ? '…' : '')
    : meta.desc(name)
  const ruPath = `/ru/zastrojshhiki/${slug}`
  const enPath = `/en/developers/${slug}`
  const path = switchLangPath(ruPath, lang)
  const title = meta.title(name)
  return {
    title, description,
    alternates: {
      canonical: path,
      languages: { ru: `${SITE_URL}${ruPath}`, en: `${SITE_URL}${enPath}` , 'x-default': `${SITE_URL}${ruPath}`},
    },
    openGraph: {
      title: meta.og(name),
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

  const c = pickCopy(COPY, lang)
  const name = firstString(dev.data['Developer']) ?? slug
  const logoUrl = dev.logo_url ?? logoFromJson(dev.data)
  const nativeBody = tField(dev.data, 'SEO Text', lang)
    ?? tField(dev.data, 'Описание ИИ', lang)
  const rawBody = firstString(dev.data['AI Описание'])
  const kb = await loadKbPageContent('developer', dev.airtable_id, lang)
  // Non-RU: prefer the native-language Airtable field over the KB body, which
  // only exists in RU + EN — otherwise DE/ZH/NL render the English KB body.
  // RU keeps the KB body first (unchanged).
  const aiTextResolved = lang === 'ru'
    ? (kb?.body ?? nativeBody ?? rawBody)
    : (nativeBody ?? kb?.body ?? rawBody)
  // Free-text body: no Russian may leak on a non-RU page. tField already
  // translits its RU last-resort, but the `AI Описание` raw fallback and the
  // kb body are not guaranteed de-Cyrillicized — guard here.
  const aiText = aiTextResolved && lang !== 'ru' && lang !== 'uk' && hasCyrillic(aiTextResolved)
    ? translitPreserveCase(aiTextResolved)
    : aiTextResolved

  // Editorial bullets: drop AI meta-commentary junk and de-Cyrillic any RU
  // last-resort text (cleanDeveloperBullets handles both).
  const dimensions = [
    { title: c.dim.construction, bullets: cleanDeveloperBullets(parseBullets(tField(dev.data, 'Строительство и недвижимость', lang)), lang), Icon: Building2 },
    { title: c.dim.reputation,   bullets: cleanDeveloperBullets(parseBullets(tField(dev.data, 'Репутация и опыт',             lang)), lang), Icon: Award },
    { title: c.dim.equipment,    bullets: cleanDeveloperBullets(parseBullets(tField(dev.data, 'Техника и производство',       lang)), lang), Icon: Wrench },
    { title: c.dim.management,   bullets: cleanDeveloperBullets(parseBullets(tField(dev.data, 'Управляющая компания',         lang)), lang), Icon: Users },
  ].filter(d => d.bullets.length > 0)

  const extras = [
    { title: c.extras.team,     bullets: cleanDeveloperBullets(parseBullets(tField(dev.data, 'Команда',           lang)), lang), Icon: Users },
    { title: c.extras.business, bullets: cleanDeveloperBullets(parseBullets(tField(dev.data, 'Бизнес и сервисы',  lang)), lang), Icon: Briefcase },
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

  // kb.faq is EN-only (KB stores RU + EN). For non-RU pages prefer the native
  // localized c.faq(...) template so de/zh/nl/id/fr/ban don't render English.
  const faqItems = lang === 'ru'
    ? ((kb?.faq && kb.faq.length) ? kb.faq : c.faq(name))
    : c.faq(name)
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question', name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const detailUrl = `${SITE_URL}${switchLangPath(`/ru/zastrojshhiki/${slug}`, lang)}`
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

  const home = switchLangPath('/ru', lang)
  const devsRoot = switchLangPath('/ru/zastrojshhiki', lang)
  const complexesRoot = switchLangPath('/ru/zhilye-kompleksy', lang)
  const apartmentsRoot = switchLangPath('/ru/apartamenty', lang)
  const villasRoot = switchLangPath('/ru/villy', lang)
  const newsBase = switchLangPath('/ru/novosti', lang)
  const promoBase = switchLangPath('/ru/akcii', lang)
  const eventsBase = switchLangPath('/ru/meropriyatiya', lang)

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
            <ExpandableText className="max-w-3xl" more={pickCopy({ ru: 'Подробнее', en: 'Read more', id: 'Selengkapnya', fr: 'En savoir plus', de: 'Mehr anzeigen', zh: '展开', nl: 'Meer', ban: 'Selengkapnya', pl: 'Więcej', uk: 'Докладніше' }, lang)} less={pickCopy({ ru: 'Свернуть', en: 'Show less', id: 'Tutup', fr: 'Réduire', de: 'Weniger', zh: '收起', nl: 'Minder', ban: 'Tutup', pl: 'Zwiń', uk: 'Згорнути' }, lang)}>
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
