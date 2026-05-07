// Admin dashboard: detail-page views.
//
// One row per page mount in `page_views` (migration 015) — the
// PageViewTracker on each _detail.tsx fires on first useEffect with a
// per-(kind, slug) sessionStorage debounce, and the API filters bots
// by user-agent. So this page answers "what's getting attention".

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminAccountMenu } from '../_account-menu'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Просмотры · Balinsky Admin' }

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

type Range = '24h' | '7d' | '30d' | 'all'
const RANGE_LABELS: Record<Range, string> = {
  '24h': 'За 24 часа', '7d': 'За 7 дней', '30d': 'За 30 дней', 'all': 'Всё время',
}
function rangeStartIso(range: Range): string | null {
  if (range === 'all') return null
  const ms = range === '24h' ? 24 * 3600_000 : range === '7d' ? 7 * 86_400_000 : 30 * 86_400_000
  return new Date(Date.now() - ms).toISOString()
}

type Kind =
  | 'villa' | 'apartment' | 'complex' | 'developer'
  | 'event' | 'promo' | 'news' | 'knowledge' | 'rental'

const KINDS_ORDER: Kind[] = [
  'villa', 'apartment', 'complex', 'developer',
  'rental', 'event', 'promo', 'news', 'knowledge',
]

const KIND_LABELS: Record<Kind, string> = {
  villa:     'Виллы',
  apartment: 'Апартаменты',
  complex:   'Комплексы',
  developer: 'Застройщики',
  rental:    'Аренда',
  event:     'Мероприятия',
  promo:     'Акции',
  news:      'Новости',
  knowledge: 'Знания',
}

type EventRow = {
  id: number
  created_at: string
  kind: Kind
  slug: string
  title: string | null
  airtable_id: string | null
  lang: 'ru' | 'en' | null
}

async function loadEvents(range: Range): Promise<EventRow[]> {
  const start = rangeStartIso(range)
  let query = sb
    .from('page_views')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50000)
  if (start) query = query.gte('created_at', start)
  const { data } = await query
  return (data ?? []) as EventRow[]
}

type Aggregated = {
  kind: Kind
  slug: string
  title: string | null
  airtableId: string | null
  views: number
  lastAt: string
}

function aggregate(events: EventRow[]): Aggregated[] {
  const m = new Map<string, Aggregated>()
  for (const e of events) {
    const key = `${e.kind}:${e.slug}`
    const s = m.get(key) ?? {
      kind: e.kind,
      slug: e.slug,
      title: e.title,
      airtableId: e.airtable_id,
      views: 0,
      lastAt: e.created_at,
    }
    s.views++
    if (e.created_at > s.lastAt) s.lastAt = e.created_at
    if (e.title) s.title = e.title
    if (e.airtable_id) s.airtableId = e.airtable_id
    m.set(key, s)
  }
  return [...m.values()].sort((a, b) => b.views - a.views || b.lastAt.localeCompare(a.lastAt))
}

function detailHref(a: Pick<Aggregated, 'kind' | 'slug'>): string {
  switch (a.kind) {
    case 'villa':     return `/ru/villy/o/${a.slug}`
    case 'apartment': return `/ru/apartamenty/o/${a.slug}`
    case 'complex':   return `/ru/zhilye-kompleksy/o/${a.slug}`
    case 'developer': return `/ru/zastrojshhiki/${a.slug}`
    case 'rental':    return `/ru/arenda/o/${a.slug}`
    case 'event':     return `/ru/meropriyatiya/${a.slug}`
    case 'promo':     return `/ru/akcii/${a.slug}`
    case 'news':      return `/ru/novosti/${a.slug}`
    case 'knowledge': return `/ru/znaniya/${a.slug}`
  }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

export default async function ViewsAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (!(await requireAdmin())) redirect('/admin')

  const sp = await searchParams
  const rangeRaw = typeof sp.range === 'string' ? sp.range : '7d'
  const range = (['24h', '7d', '30d', 'all'].includes(rangeRaw) ? rangeRaw : '7d') as Range

  const events = await loadEvents(range)
  const all = aggregate(events)
  const totalsByKind = {} as Record<Kind, number>
  for (const k of KINDS_ORDER) totalsByKind[k] = events.filter(e => e.kind === k).length

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] pb-20">
      <header className="px-6 pt-6 pb-4 border-b border-[#E5E7EB] bg-white">
        <h1 className="text-[22px] font-semibold tracking-tight">Просмотры</h1>
        <div className="mt-2 text-[13px] text-[#6B7280]">
          Просмотры детальных страниц по всему сайту. Боты отфильтрованы по user-agent. Внутри одной сессии один объект — один просмотр (повторное открытие не учитывается).
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(['24h', '7d', '30d', 'all'] as Range[]).map(r => (
            <Link
              key={r}
              href={`/admin/views?range=${r}`}
              className={`px-3 py-1.5 rounded-full text-[13px] no-underline transition-colors ${
                r === range
                  ? 'bg-[#111827] text-white'
                  : 'bg-white border border-[#E5E7EB] text-[#374151] hover:border-[#9CA3AF]'
              }`}
            >
              {RANGE_LABELS[r]}
            </Link>
          ))}
        </div>
      </header>

      <main className="px-6 py-6 max-w-[1200px] mx-auto space-y-10">
        {/* Top KPIs — total + per kind */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Всего просмотров" value={String(events.length)} />
          {KINDS_ORDER.slice(0, 4).map(k => (
            <KpiCard key={k} label={KIND_LABELS[k]} value={String(totalsByKind[k])} />
          ))}
        </section>
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 -mt-4">
          {KINDS_ORDER.slice(4).map(k => (
            <KpiCard key={k} label={KIND_LABELS[k]} value={String(totalsByKind[k])} />
          ))}
        </section>

        {/* One section per kind */}
        {KINDS_ORDER.map(kind => {
          const items = all.filter(a => a.kind === kind)
          return (
            <section key={kind}>
              <h2 className="text-[16px] font-semibold mb-3">{KIND_LABELS[kind]}</h2>
              {items.length === 0 ? (
                <div className="rounded-2xl bg-white border border-[#E5E7EB] p-6 text-[13px] text-[#6B7280]">
                  За выбранный период просмотров нет.
                </div>
              ) : (
                <div className="rounded-2xl bg-white border border-[#E5E7EB] overflow-hidden">
                  <table className="w-full text-[13px]">
                    <thead className="bg-[#F9FAFB] text-[#6B7280] text-[11px] uppercase tracking-wide">
                      <tr>
                        <th className="text-left  px-4 py-2 font-medium">Объект</th>
                        <th className="text-right px-4 py-2 font-medium">Просмотров</th>
                        <th className="text-left  px-4 py-2 font-medium">Последний</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((a, i) => (
                        <tr key={`${a.kind}:${a.slug}`} className={i % 2 ? 'bg-[#FAFAFA]' : ''}>
                          <td className="px-4 py-2.5">
                            <a href={detailHref(a)} target="_blank" rel="noopener noreferrer" className="text-[#111827] hover:text-[var(--color-primary-pressed)] no-underline">
                              {a.title ?? a.slug}
                            </a>
                            <div className="text-[11px] text-[#9CA3AF] font-mono">
                              {a.slug}{a.airtableId ? ` · ${a.airtableId}` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{a.views}</td>
                          <td className="px-4 py-2.5 text-[#6B7280]">{fmtDateTime(a.lastAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )
        })}
      </main>

      <AdminAccountMenu variant="floating" />
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E5E7EB] p-4">
      <div className="text-[11px] uppercase tracking-wide text-[#6B7280] font-medium">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tabular-nums">{value}</div>
    </div>
  )
}
