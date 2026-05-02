import { Suspense } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { DevelopersList } from '@/components/DevelopersList'
import { DevelopersSeoContent } from '@/components/DevelopersSeoContent'
import { DevelopersSortToggle, type DevelopersSortKey } from '@/components/DevelopersSortToggle'
import type { DeveloperRowData } from '@/components/DeveloperRow'
import { scoreDeveloper, type ComplexStats } from '@/lib/developer-score'

export const revalidate = 3600

export const metadata = {
  title: 'Застройщики на Бали — каталог девелоперов недвижимости 2026 | Balinsky',
  description:
    'Каталог застройщиков Бали с действующими проектами: виллы, апартаменты, жилые комплексы. Сравнение по рейтингу, надёжности, управляющей компании. 80+ компаний.',
  alternates: { canonical: '/ru/zastrojshhiki' },
  openGraph: {
    title: 'Застройщики на Бали — каталог девелоперов 2026 | Balinsky',
    description:
      'Каталог застройщиков Бали: рейтинги, репутация, проекты, управляющие компании.',
    type: 'website',
    url: '/ru/zastrojshhiki',
  },
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

type Row = { data: Record<string, unknown>; logo_url: string | null }

function logoFromJson(data: Record<string, unknown>): string | null {
  const arr = data['Logo']
  if (Array.isArray(arr) && arr[0] && typeof arr[0] === 'object' && 'url' in arr[0]) {
    const url = (arr[0] as { url: unknown }).url
    return typeof url === 'string' ? url : null
  }
  return null
}

// Some Airtable AI fields come back as { state, value } instead of plain
// strings; normalize so DeveloperRow's parseBullets() (which calls .trim)
// never blows up.
function asText(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v) && v.length) return asText(v[0])
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) return asText((v as Record<string, unknown>).value)
  return null
}

type SP = Promise<Record<string, string | string[] | undefined>>

function parseSort(v: string | string[] | undefined): DevelopersSortKey {
  const s = Array.isArray(v) ? v[0] : v
  if (s === 'ready' || s === 'inprogress' || s === 'experience') return s
  return 'balanced'
}

function richnessLen(v: unknown): number {
  if (!v) return 0
  if (typeof v === 'string') return v.trim().length
  if (typeof v === 'number') return String(v).length
  if (Array.isArray(v) && v.length) return richnessLen(v[0])
  if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) return richnessLen((v as Record<string, unknown>).value)
  return 0
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const sort = parseSort(sp.sort)
  const [{ data: devData }, { data: complexData }] = await Promise.all([
    sb.from('raw_developers').select('data, logo_url').limit(200),
    sb.from('raw_complexes').select('data').limit(2000),
  ])

  const rows = (devData ?? []) as Row[]
  // Build a Developer-name → { total, ready } map and use it both for the
  // score and for the chips on each card. Some catalog rows use the short
  // brand name ("LB Group") while the developer record carries it with a
  // parens suffix ("LB Group (LOYO&BONDAR)"); canonicalize by stripping any
  // trailing "(...)" so they collapse to the same key.
  const canonicalize = (s: string) =>
    s.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()
  const statsByDev = new Map<string, ComplexStats>()
  for (const cr of (complexData ?? []) as { data: Record<string, unknown> }[]) {
    const dev = (cr.data['Developer1'] ?? '').toString().trim()
    if (!dev) continue
    const status = (cr.data['Статус'] ?? cr.data['Готовность'] ?? '').toString()
    const key = canonicalize(dev)
    const cur = statsByDev.get(key) ?? { total: 0, ready: 0 }
    cur.total += 1
    if (/(построен|сдан|готов|complet)/i.test(status)) cur.ready += 1
    statsByDev.set(key, cur)
  }

  const enriched = rows
    .filter(r => r.data['Публикация'] === true && r.data['SEO:Slug'] && r.data['Developer'])
    .map(r => {
      const name = String(r.data['Developer'])
      const stats = statsByDev.get(canonicalize(name)) ?? { total: 0, ready: 0 }
      const construction = asText(r.data['Строительство и недвижимость'])
      const reputation = asText(r.data['Репутация и опыт'])
      const equipment = asText(r.data['Техника и производство'])
      const management = asText(r.data['Управляющая компания'])
      const team = asText(r.data['Команда'])
      const business = asText(r.data['Бизнес и сервисы'])
      const yieldText = asText(r.data['Доходность'])
      const score = scoreDeveloper(stats, { construction, reputation, equipment, management, team, business, yieldText })
      // Experience score = how rich the editorial copy is on the dimensions
      // that describe construction know-how + reputation + team. Length is a
      // crude proxy but it's the best signal we have without a manual
      // "years on the market" field.
      const expScore =
        richnessLen(r.data['Репутация и опыт']) +
        richnessLen(r.data['Строительство и недвижимость']) +
        richnessLen(r.data['Техника и производство']) +
        richnessLen(r.data['Команда'])
      return { r, name, stats, score, expScore, construction, reputation, equipment, management }
    })

  const sortKey = sort
  enriched.sort((a, b) => {
    if (sortKey === 'ready')      return b.stats.ready - a.stats.ready || b.score - a.score
    if (sortKey === 'inprogress') {
      const aIp = a.stats.total - a.stats.ready
      const bIp = b.stats.total - b.stats.ready
      return bIp - aIp || b.score - a.score
    }
    if (sortKey === 'experience') return b.expScore - a.expScore || b.score - a.score
    return b.score - a.score // balanced (default)
  })

  const items: DeveloperRowData[] = enriched.map(({ r, name, stats, construction, reputation, equipment, management }) => ({
    slug: String(r.data['SEO:Slug'] ?? '') || null,
    name,
    logoUrl: r.logo_url ?? logoFromJson(r.data),
    construction,
    reputation,
    equipment,
    management,
    complexesReady: stats.ready,
    complexesTotal: stats.total,
  }))

  return (
    <>
      <Header active="zastrojshhiki" />
      <PageContainer>
        <h1 className="pt-12 text-[26px] md:text-[36px] font-semibold tracking-tight text-[var(--color-text)] mb-3">
          Застройщики на Бали
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-5">
          {items.length} компаний в каталоге
        </div>

        <p className="max-w-3xl text-[15px] leading-relaxed text-[var(--color-text)] mb-3">
          На странице собраны застройщики и девелоперы Бали с действующими проектами — виллами,
          апартаментами и жилыми комплексами. По каждой компании показан рейтинг по четырём
          направлениям: качество строительства и недвижимости, репутация и опыт, техника и
          производство, управляющая компания после ввода.
        </p>
        <p className="max-w-3xl text-[15px] leading-relaxed text-[var(--color-text-muted)] mb-6">
          Переключайте сортировку под свой критерий: сбалансированный рейтинг учитывает всё разом,
          «Сданные ЖК» показывают тех, кто реально достроил, «Активные стройки» — кто
          сейчас работает, «Опыт и репутация» — насыщенность данных о компании.
        </p>

        <Suspense fallback={null}>
          <DevelopersSortToggle current={sort} />
        </Suspense>

        <DevelopersList items={items} />

        <DevelopersSeoContent />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
