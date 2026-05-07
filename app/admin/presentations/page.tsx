// Admin dashboard: PDF-presentation analytics.
//
// Two question this answers:
//   1. Per object — which villa / apartment / complex got how many
//      single-listing presentation downloads in a chosen window.
//   2. Per shortlist — how many shortlist PDFs were generated total,
//      what was the average shortlist size, and which Airtable ids
//      appeared most often inside those shortlists.
//
// Numbers come from `presentation_events` (see migration 012). Read
// path is server-side with the service role; the page itself is
// admin-gated via requireAdmin().

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminAccountMenu } from '../_account-menu'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Презентации · Balinsky Admin' }

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

type EventRow = {
  id: number
  created_at: string
  kind: 'object' | 'shortlist'
  object_kind: 'villa' | 'apartment' | 'complex' | null
  object_id: string | null
  slug: string | null
  title: string | null
  item_count: number | null
  items: string[] | null
  orientation: 'portrait' | 'landscape' | null
  has_agent: boolean
  lang: 'ru' | 'en' | null
}

async function loadEvents(range: Range): Promise<EventRow[]> {
  const start = rangeStartIso(range)
  let query = sb.from('presentation_events').select('*').order('created_at', { ascending: false }).limit(5000)
  if (start) query = query.gte('created_at', start)
  const { data } = await query
  return (data ?? []) as EventRow[]
}

type ObjectStat = {
  objectId: string
  objectKind: 'villa' | 'apartment' | 'complex' | null
  slug: string | null
  title: string | null
  total: number
  withAgent: number
  lastAt: string
}

function aggregateObjects(events: EventRow[]): ObjectStat[] {
  const m = new Map<string, ObjectStat>()
  for (const e of events) {
    if (e.kind !== 'object' || !e.object_id) continue
    const s = m.get(e.object_id) ?? {
      objectId: e.object_id,
      objectKind: e.object_kind,
      slug: e.slug,
      title: e.title,
      total: 0,
      withAgent: 0,
      lastAt: e.created_at,
    }
    s.total++
    if (e.has_agent) s.withAgent++
    if (e.created_at > s.lastAt) s.lastAt = e.created_at
    // Keep the freshest title/slug if a row updated theirs.
    if (e.title) s.title = e.title
    if (e.slug)  s.slug  = e.slug
    if (e.object_kind) s.objectKind = e.object_kind
    m.set(e.object_id, s)
  }
  return [...m.values()].sort((a, b) => b.total - a.total || b.lastAt.localeCompare(a.lastAt))
}

type ShortlistMember = { airtableId: string; appearances: number }

function aggregateShortlists(events: EventRow[]): {
  total: number
  withAgent: number
  avgItems: number
  topItems: ShortlistMember[]
  recent: EventRow[]
} {
  const list = events.filter(e => e.kind === 'shortlist')
  const withAgent = list.filter(e => e.has_agent).length
  const itemSum = list.reduce((acc, e) => acc + (e.item_count ?? 0), 0)
  const avg = list.length > 0 ? itemSum / list.length : 0
  const memberCounts = new Map<string, number>()
  for (const e of list) {
    for (const id of (e.items ?? [])) {
      memberCounts.set(id, (memberCounts.get(id) ?? 0) + 1)
    }
  }
  const topItems = [...memberCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([airtableId, appearances]) => ({ airtableId, appearances }))
  return {
    total: list.length,
    withAgent,
    avgItems: avg,
    topItems,
    recent: list.slice(0, 25),
  }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function detailHref(s: ObjectStat): string | null {
  if (!s.slug) return null
  if (s.objectKind === 'apartment') return `/ru/apartamenty/o/${s.slug}`
  if (s.objectKind === 'complex')   return `/ru/zhilye-kompleksy/o/${s.slug}`
  return `/ru/villy/o/${s.slug}`
}

export default async function PresentationsAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const ok = await requireAdmin()
  if (!ok) redirect('/admin')

  const sp = await searchParams
  const rangeRaw = typeof sp.range === 'string' ? sp.range : '7d'
  const range = (['24h', '7d', '30d', 'all'].includes(rangeRaw) ? rangeRaw : '7d') as Range

  const events    = await loadEvents(range)
  const objects   = aggregateObjects(events)
  const shortlist = aggregateShortlists(events)
  const totalObjectEvents = events.filter(e => e.kind === 'object').length

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] pb-20">
      <header className="px-6 pt-6 pb-4 border-b border-[#E5E7EB] bg-white">
        <h1 className="text-[22px] font-semibold tracking-tight">Презентации</h1>
        <div className="mt-2 text-[13px] text-[#6B7280]">
          PDF, скачанные с сайта. Считаем оба формата — по одному объекту и по подборке.
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(['24h', '7d', '30d', 'all'] as Range[]).map(r => (
            <Link
              key={r}
              href={`/admin/presentations?range=${r}`}
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
        {/* Top KPIs */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Всего скачиваний" value={String(events.length)} />
          <KpiCard label="По объектам" value={String(totalObjectEvents)} />
          <KpiCard label="По подборкам" value={String(shortlist.total)} />
          <KpiCard
            label="Средний размер подборки"
            value={shortlist.total > 0 ? shortlist.avgItems.toFixed(1) : '—'}
          />
        </section>

        {/* Per object */}
        <section>
          <h2 className="text-[16px] font-semibold mb-3">По объектам</h2>
          {objects.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#E5E7EB] p-6 text-[13px] text-[#6B7280]">
              За выбранный период нет скачиваний по отдельным объектам.
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-[#E5E7EB] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[#F9FAFB] text-[#6B7280] text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Объект</th>
                    <th className="text-left px-4 py-2 font-medium">Тип</th>
                    <th className="text-right px-4 py-2 font-medium">Всего</th>
                    <th className="text-right px-4 py-2 font-medium">С контактом агента</th>
                    <th className="text-left px-4 py-2 font-medium">Последняя</th>
                  </tr>
                </thead>
                <tbody>
                  {objects.map((s, i) => {
                    const href = detailHref(s)
                    return (
                      <tr key={s.objectId} className={i % 2 ? 'bg-[#FAFAFA]' : ''}>
                        <td className="px-4 py-2.5">
                          {href ? (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#111827] hover:text-[var(--color-primary-pressed)] no-underline">
                              {s.title ?? s.slug ?? s.objectId}
                            </a>
                          ) : (
                            <span>{s.title ?? s.slug ?? s.objectId}</span>
                          )}
                          <div className="text-[11px] text-[#9CA3AF]">{s.objectId}</div>
                        </td>
                        <td className="px-4 py-2.5 text-[#6B7280]">{kindLabel(s.objectKind)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">{s.total}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#6B7280]">{s.withAgent}</td>
                        <td className="px-4 py-2.5 text-[#6B7280]">{fmtDateTime(s.lastAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Per shortlist */}
        <section>
          <h2 className="text-[16px] font-semibold mb-3">По подборкам</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <KpiCard label="Скачиваний подборок" value={String(shortlist.total)} />
            <KpiCard label="Из них с контактом агента" value={String(shortlist.withAgent)} />
            <KpiCard label="Объектов в среднем" value={shortlist.total > 0 ? shortlist.avgItems.toFixed(1) : '—'} />
          </div>

          <h3 className="text-[14px] font-semibold mb-2 mt-6">Чаще всего попадают в подборки</h3>
          {shortlist.topItems.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#E5E7EB] p-6 text-[13px] text-[#6B7280]">
              Пока нет данных.
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-[#E5E7EB] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[#F9FAFB] text-[#6B7280] text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Airtable ID</th>
                    <th className="text-right px-4 py-2 font-medium">Появлений в подборках</th>
                  </tr>
                </thead>
                <tbody>
                  {shortlist.topItems.map((m, i) => (
                    <tr key={m.airtableId} className={i % 2 ? 'bg-[#FAFAFA]' : ''}>
                      <td className="px-4 py-2.5 font-mono text-[12px]">{m.airtableId}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">{m.appearances}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="text-[14px] font-semibold mb-2 mt-6">Последние скачивания подборок</h3>
          {shortlist.recent.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#E5E7EB] p-6 text-[13px] text-[#6B7280]">
              За выбранный период подборки не скачивались.
            </div>
          ) : (
            <ul className="rounded-2xl bg-white border border-[#E5E7EB] divide-y divide-[#E5E7EB]">
              {shortlist.recent.map(e => (
                <li key={e.id} className="px-4 py-3 text-[13px] flex items-center gap-3">
                  <span className="text-[#9CA3AF] tabular-nums w-[120px] shrink-0">{fmtDateTime(e.created_at)}</span>
                  <span className="font-medium tabular-nums">{e.item_count ?? 0} объектов</span>
                  {e.has_agent && <span className="text-[11px] uppercase tracking-wide bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)] px-1.5 py-0.5 rounded">Агент</span>}
                  <span className="text-[#9CA3AF] text-[11px]">{e.lang ?? ''} · {e.orientation ?? ''}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
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

function kindLabel(k: string | null): string {
  if (k === 'apartment') return 'Апартаменты'
  if (k === 'complex')   return 'Комплекс'
  if (k === 'villa')     return 'Вилла'
  return '—'
}
