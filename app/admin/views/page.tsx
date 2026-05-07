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
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'

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
    <AdminThemeShell
      title="Просмотры"
      description="Просмотры детальных страниц по всему сайту. Боты отфильтрованы по user-agent. Внутри одной сессии один объект — один просмотр (повторное открытие не учитывается)."
      filters={<RangeTabs range={range} />}
    >
      <div className="space-y-8 md:space-y-10">
        {/* Top KPIs — total + per kind. 5-up on desktop, 2-up on mobile. */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Всего просмотров" value={String(events.length)} />
          {KINDS_ORDER.slice(0, 4).map(k => (
            <KpiCard key={k} label={KIND_LABELS[k]} value={String(totalsByKind[k])} />
          ))}
        </section>
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 -mt-4 md:-mt-6">
          {KINDS_ORDER.slice(4).map(k => (
            <KpiCard key={k} label={KIND_LABELS[k]} value={String(totalsByKind[k])} />
          ))}
        </section>

        {/* One section per kind */}
        {KINDS_ORDER.map(kind => {
          const items = all.filter(a => a.kind === kind)
          return (
            <section key={kind}>
              <h2 className="text-[15px] md:text-[16px] font-semibold mb-3 text-[var(--ax-fg)]">{KIND_LABELS[kind]}</h2>
              {items.length === 0 ? (
                <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-6 text-[13px] text-[var(--ax-fg-muted)]">
                  За выбранный период просмотров нет.
                </div>
              ) : (
                <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] overflow-x-auto">
                  <table className="w-full text-[13px] min-w-[480px]">
                    <thead className="text-[var(--ax-fg-muted)] text-[11px] uppercase tracking-wide">
                      <tr className="border-b border-[var(--ax-border-soft)]">
                        <th className="text-left  px-4 py-2 font-medium">Объект</th>
                        <th className="text-right px-4 py-2 font-medium">Просмотров</th>
                        <th className="text-left  px-4 py-2 font-medium hidden md:table-cell">Последний</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((a, i) => (
                        <tr key={`${a.kind}:${a.slug}`} className={i % 2 ? 'bg-[var(--ax-hover)]' : ''}>
                          <td className="px-4 py-2.5">
                            <a href={detailHref(a)} target="_blank" rel="noopener noreferrer" className="text-[var(--ax-fg)] hover:text-[var(--color-primary)] no-underline">
                              {a.title ?? a.slug}
                            </a>
                            <div className="text-[11px] text-[var(--ax-fg-faint)] font-mono">
                              {a.slug}{a.airtableId ? ` · ${a.airtableId}` : ''}
                            </div>
                            {/* Show timestamp under title on mobile (last column collapsed) */}
                            <div className="text-[11px] text-[var(--ax-fg-muted)] mt-0.5 md:hidden">{fmtDateTime(a.lastAt)}</div>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{a.views}</td>
                          <td className="px-4 py-2.5 text-[var(--ax-fg-muted)] hidden md:table-cell">{fmtDateTime(a.lastAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </AdminThemeShell>
  )
}

function RangeTabs({ range }: { range: Range }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(['24h', '7d', '30d', 'all'] as Range[]).map(r => (
        <Link
          key={r}
          href={`/admin/views?range=${r}`}
          className={`px-3 py-1.5 rounded-full text-[13px] no-underline transition-colors ${
            r === range
              ? 'bg-[var(--ax-fg)] text-[var(--ax-bg)]'
              : 'bg-[var(--ax-panel)] border border-[var(--ax-border)] text-[var(--ax-fg-soft)] hover:text-[var(--ax-fg)]'
          }`}
        >
          {RANGE_LABELS[r]}
        </Link>
      ))}
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-4">
      <div className="text-[11px] uppercase tracking-wide text-[var(--ax-fg-muted)] font-medium">{label}</div>
      <div className="mt-1 text-[22px] md:text-[24px] font-semibold tabular-nums text-[var(--ax-fg)]">{value}</div>
    </div>
  )
}
