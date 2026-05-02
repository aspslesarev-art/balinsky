import { createClient } from '@supabase/supabase-js'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { DevelopersList } from '@/components/DevelopersList'
import { DevelopersSeoContent } from '@/components/DevelopersSeoContent'
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

export default async function Page() {
  const [{ data: devData }, { data: complexData }] = await Promise.all([
    sb.from('raw_developers').select('data, logo_url').limit(200),
    sb.from('raw_complexes').select('data').limit(2000),
  ])

  const rows = (devData ?? []) as Row[]
  // Build a Developer-name → { total, ready } map and use it both for the
  // score and for the chips on each card.
  const statsByDev = new Map<string, ComplexStats>()
  for (const cr of (complexData ?? []) as { data: Record<string, unknown> }[]) {
    const dev = (cr.data['Developer1'] ?? '').toString().trim()
    if (!dev) continue
    const status = (cr.data['Статус'] ?? cr.data['Готовность'] ?? '').toString()
    const cur = statsByDev.get(dev.toLowerCase()) ?? { total: 0, ready: 0 }
    cur.total += 1
    if (/(построен|сдан|готов|complet)/i.test(status)) cur.ready += 1
    statsByDev.set(dev.toLowerCase(), cur)
  }

  const enriched = rows
    .filter(r => r.data['Публикация'] === true && r.data['SEO:Slug'] && r.data['Developer'])
    .map(r => {
      const name = String(r.data['Developer'])
      const stats = statsByDev.get(name.toLowerCase()) ?? { total: 0, ready: 0 }
      const construction = asText(r.data['Строительство и недвижимость'])
      const reputation = asText(r.data['Репутация и опыт'])
      const equipment = asText(r.data['Техника и производство'])
      const management = asText(r.data['Управляющая компания'])
      const team = asText(r.data['Команда'])
      const business = asText(r.data['Бизнес и сервисы'])
      const yieldText = asText(r.data['Доходность'])
      const score = scoreDeveloper(stats, { construction, reputation, equipment, management, team, business, yieldText })
      return { r, name, stats, score, construction, reputation, equipment, management }
    })
    .sort((a, b) => b.score - a.score)

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
        <p className="max-w-3xl text-[15px] leading-relaxed text-[var(--color-text-muted)] mb-8">
          Сортировка — объективная: на первом месте те, у кого больше сданных жилых комплексов,
          далее идут активные с проектами в стройке, и насыщенность данных по 4 направлениям
          добавляет небольшой вес. Это помогает отсеять случайных игроков и сфокусироваться на
          девелоперах с реальным портфолио.
        </p>

        <DevelopersList items={items} />

        <DevelopersSeoContent />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
