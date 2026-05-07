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
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'

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

type ItemDetail = {
  id: string | null
  kind: 'villa' | 'apartment' | 'complex' | 'rental' | null
  slug: string | null
  title: string | null
  district: string | null
  bedrooms: number | null
  area: number | null
  priceUsd: number | null
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
  items_detail: ItemDetail[] | null
  orientation: 'portrait' | 'landscape' | null
  has_agent: boolean
  lang: 'ru' | 'en' | null
  agent_name: string | null
  agent_telegram: string | null
  agent_whatsapp: string | null
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

type ShortlistMember = {
  airtableId: string
  appearances: number
  title: string | null
  kind: ItemDetail['kind']
  slug: string | null
  district: string | null
}

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
  // Build the count map from items[] (always present) and enrich
  // with the freshest items_detail entry we've seen for that id.
  const counts = new Map<string, number>()
  const meta   = new Map<string, ItemDetail>()
  for (const e of list) {
    for (const id of (e.items ?? [])) counts.set(id, (counts.get(id) ?? 0) + 1)
    for (const d of (e.items_detail ?? [])) {
      if (d?.id && (!meta.has(d.id) || (d.title && !meta.get(d.id)!.title))) {
        meta.set(d.id, d)
      }
    }
  }
  const topItems: ShortlistMember[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([airtableId, appearances]) => {
      const m = meta.get(airtableId)
      return {
        airtableId,
        appearances,
        title:    m?.title    ?? null,
        kind:     m?.kind     ?? null,
        slug:     m?.slug     ?? null,
        district: m?.district ?? null,
      }
    })
  return {
    total: list.length,
    withAgent,
    avgItems: avg,
    topItems,
    recent: list.slice(0, 50),
  }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function detailHref(s: { slug: string | null; objectKind: ItemDetail['kind'] | 'villa' | 'apartment' | 'complex' | null }): string | null {
  if (!s.slug) return null
  if (s.objectKind === 'apartment') return `/ru/apartamenty/o/${s.slug}`
  if (s.objectKind === 'complex')   return `/ru/zhilye-kompleksy/o/${s.slug}`
  if (s.objectKind === 'rental')    return `/ru/arenda/o/${s.slug}`
  return `/ru/villy/o/${s.slug}`
}

function fmtUsd(v: number | null | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—'
  return `$${Math.round(v).toLocaleString('en-US')}`
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
  // Cross-kind feed of agent leads (events that explicitly carried
  // agent contact). Newest first, capped at 50.
  const agentLeads = events
    .filter(e => e.has_agent && (e.agent_name || e.agent_telegram || e.agent_whatsapp))
    .slice(0, 50)

  return (
    <AdminThemeShell
      title="Презентации"
      description="PDF, скачанные с сайта. Считаем оба формата — по одному объекту и по подборке."
      filters={
        <div className="flex flex-wrap gap-2">
          {(['24h', '7d', '30d', 'all'] as Range[]).map(r => (
            <Link
              key={r}
              href={`/admin/presentations?range=${r}`}
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
      }
    >
      <div className="space-y-8 md:space-y-10">
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

        {/* Agent leads — both 'object' and 'shortlist' events that
            carried an agent contact, in one feed. Most actionable
            section for the user, so it sits above the per-object /
            per-shortlist breakdowns. */}
        <section>
          <h2 className="text-[16px] font-semibold mb-3">Лиды с контактом агента</h2>
          {agentLeads.length === 0 ? (
            <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-6 text-[13px] text-[var(--ax-fg-muted)]">
              За выбранный период PDF с контактом агента не скачивались.
            </div>
          ) : (
            <ul className="space-y-2">
              {agentLeads.map(e => {
                const objHref = e.kind === 'object' ? detailHref({ slug: e.slug, objectKind: e.object_kind }) : null
                return (
                  <li key={e.id} className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                      <span className="text-[var(--ax-fg-soft)] font-medium tabular-nums">{fmtDateTime(e.created_at)}</span>
                      <span className="text-[var(--ax-fg-muted)]">·</span>
                      {e.kind === 'object' ? (
                        <>
                          <span className="text-[var(--ax-fg-faint)] text-[11px] uppercase tracking-wide">{kindLabel(e.object_kind)}</span>
                          {objHref ? (
                            <a href={objHref} target="_blank" rel="noopener noreferrer" className="text-[var(--ax-fg)] hover:text-[var(--color-primary-pressed)] no-underline font-medium">{e.title ?? e.slug ?? e.object_id}</a>
                          ) : (
                            <span className="text-[var(--ax-fg)] font-medium">{e.title ?? e.slug ?? e.object_id}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[var(--ax-fg)] font-medium">Подборка из {e.item_count ?? 0} объектов</span>
                      )}
                      <span className="text-[var(--ax-fg-faint)] text-[11px] ml-auto">{(e.lang ?? '').toUpperCase()} · {e.orientation ?? ''}</span>
                    </div>
                    <div className="mt-1.5 text-[12px] flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--ax-fg-soft)]">
                      {e.agent_name     && <span><span className="text-[var(--ax-fg-faint)]">Агент:</span> <span className="font-medium">{e.agent_name}</span></span>}
                      {e.agent_telegram && <span><span className="text-[var(--ax-fg-faint)]">Telegram:</span> <a className="text-[var(--color-primary-pressed)] no-underline" href={tgHref(e.agent_telegram)} target="_blank" rel="noopener noreferrer">{e.agent_telegram}</a></span>}
                      {e.agent_whatsapp && <span><span className="text-[var(--ax-fg-faint)]">WhatsApp:</span> <a className="text-[var(--color-primary-pressed)] no-underline" href={waHref(e.agent_whatsapp)} target="_blank" rel="noopener noreferrer">{e.agent_whatsapp}</a></span>}
                    </div>
                    {e.kind === 'shortlist' && e.items_detail && e.items_detail.length > 0 && (
                      <div className="mt-2 text-[11.5px] text-[var(--ax-fg-muted)] flex flex-wrap gap-x-2 gap-y-0.5">
                        {e.items_detail.slice(0, 8).map((it, i) => (
                          <span key={i}>· {it.title ?? it.id}</span>
                        ))}
                        {e.items_detail.length > 8 && <span className="text-[var(--ax-fg-faint)]">+{e.items_detail.length - 8} ещё</span>}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Per object */}
        <section>
          <h2 className="text-[16px] font-semibold mb-3">По объектам</h2>
          {objects.length === 0 ? (
            <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-6 text-[13px] text-[var(--ax-fg-muted)]">
              За выбранный период нет скачиваний по отдельным объектам.
            </div>
          ) : (
            <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[var(--ax-bg)] text-[var(--ax-fg-muted)] text-[11px] uppercase tracking-wide">
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
                      <tr key={s.objectId} className={i % 2 ? 'bg-[var(--ax-hover)]' : ''}>
                        <td className="px-4 py-2.5">
                          {href ? (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--ax-fg)] hover:text-[var(--color-primary-pressed)] no-underline">
                              {s.title ?? s.slug ?? s.objectId}
                            </a>
                          ) : (
                            <span>{s.title ?? s.slug ?? s.objectId}</span>
                          )}
                          <div className="text-[11px] text-[var(--ax-fg-faint)]">{s.objectId}</div>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--ax-fg-muted)]">{kindLabel(s.objectKind)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">{s.total}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ax-fg-muted)]">{s.withAgent}</td>
                        <td className="px-4 py-2.5 text-[var(--ax-fg-muted)]">{fmtDateTime(s.lastAt)}</td>
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
            <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-6 text-[13px] text-[var(--ax-fg-muted)]">
              Пока нет данных.
            </div>
          ) : (
            <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-[var(--ax-bg)] text-[var(--ax-fg-muted)] text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Объект</th>
                    <th className="text-left px-4 py-2 font-medium">Тип</th>
                    <th className="text-left px-4 py-2 font-medium">Район</th>
                    <th className="text-right px-4 py-2 font-medium">Появлений</th>
                  </tr>
                </thead>
                <tbody>
                  {shortlist.topItems.map((m, i) => {
                    const href = detailHref({ slug: m.slug, objectKind: m.kind })
                    return (
                      <tr key={m.airtableId} className={i % 2 ? 'bg-[var(--ax-hover)]' : ''}>
                        <td className="px-4 py-2.5">
                          {href && m.title ? (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--ax-fg)] hover:text-[var(--color-primary-pressed)] no-underline">{m.title}</a>
                          ) : (
                            <span className="font-mono text-[12px]">{m.title ?? m.airtableId}</span>
                          )}
                          <div className="text-[11px] text-[var(--ax-fg-faint)] font-mono">{m.airtableId}</div>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--ax-fg-muted)]">{kindLabel(m.kind)}</td>
                        <td className="px-4 py-2.5 text-[var(--ax-fg-muted)]">{m.district ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">{m.appearances}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="text-[14px] font-semibold mb-2 mt-6">Последние скачивания подборок</h3>
          {shortlist.recent.length === 0 ? (
            <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-6 text-[13px] text-[var(--ax-fg-muted)]">
              За выбранный период подборки не скачивались.
            </div>
          ) : (
            <ul className="space-y-3">
              {shortlist.recent.map(e => (
                <li key={e.id} className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] overflow-hidden">
                  <div className="px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] border-b border-[var(--ax-border)] bg-[var(--ax-bg)]">
                    <span className="text-[var(--ax-fg-soft)] font-medium tabular-nums">{fmtDateTime(e.created_at)}</span>
                    <span className="text-[var(--ax-fg-muted)]">·</span>
                    <span className="font-medium tabular-nums">{e.item_count ?? 0} объектов</span>
                    {e.has_agent && (
                      <span className="text-[11px] uppercase tracking-wide bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)] px-1.5 py-0.5 rounded">Агент</span>
                    )}
                    <span className="text-[var(--ax-fg-faint)] text-[11px] ml-auto">{(e.lang ?? '').toUpperCase()} · {e.orientation ?? ''}</span>
                  </div>
                  {/* Agent contacts (only on for-agent PDFs) */}
                  {(e.agent_name || e.agent_telegram || e.agent_whatsapp) && (
                    <div className="px-4 py-2.5 border-b border-[var(--ax-border)] text-[12px] flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--ax-fg-soft)]">
                      {e.agent_name     && <span><span className="text-[var(--ax-fg-faint)]">Агент:</span> <span className="font-medium">{e.agent_name}</span></span>}
                      {e.agent_telegram && <span><span className="text-[var(--ax-fg-faint)]">Telegram:</span> <a className="text-[var(--color-primary-pressed)] no-underline" href={tgHref(e.agent_telegram)} target="_blank" rel="noopener noreferrer">{e.agent_telegram}</a></span>}
                      {e.agent_whatsapp && <span><span className="text-[var(--ax-fg-faint)]">WhatsApp:</span> <a className="text-[var(--color-primary-pressed)] no-underline" href={waHref(e.agent_whatsapp)} target="_blank" rel="noopener noreferrer">{e.agent_whatsapp}</a></span>}
                    </div>
                  )}
                  {/* Per-item list */}
                  {e.items_detail && e.items_detail.length > 0 ? (
                    <ol className="divide-y divide-[var(--ax-border-soft)]">
                      {e.items_detail.map((it, idx) => {
                        const href = detailHref({ slug: it.slug, objectKind: it.kind })
                        return (
                          <li key={idx} className="px-4 py-2.5 text-[12.5px] flex items-center gap-3">
                            <span className="text-[var(--ax-fg-faint)] tabular-nums w-[20px] shrink-0">{idx + 1}</span>
                            <span className="flex-1 min-w-0">
                              {href && it.title ? (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--ax-fg)] hover:text-[var(--color-primary-pressed)] no-underline">{it.title}</a>
                              ) : (
                                <span className="text-[var(--ax-fg)]">{it.title ?? it.id ?? '—'}</span>
                              )}
                              <span className="text-[var(--ax-fg-faint)] ml-2 text-[11px]">{kindLabel(it.kind)}{it.district ? ` · ${it.district}` : ''}{it.bedrooms != null ? ` · ${it.bedrooms} BR` : ''}{it.area != null ? ` · ${it.area} м²` : ''}</span>
                            </span>
                            <span className="text-[var(--ax-fg-soft)] tabular-nums shrink-0">{fmtUsd(it.priceUsd)}</span>
                          </li>
                        )
                      })}
                    </ol>
                  ) : (e.items && e.items.length > 0) ? (
                    <div className="px-4 py-2.5 text-[12px] text-[var(--ax-fg-faint)]">
                      Только airtable id (старая запись): {e.items.join(', ')}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminThemeShell>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-4">
      <div className="text-[11px] uppercase tracking-wide text-[var(--ax-fg-muted)] font-medium">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function kindLabel(k: string | null): string {
  if (k === 'apartment') return 'Апартаменты'
  if (k === 'complex')   return 'Комплекс'
  if (k === 'villa')     return 'Вилла'
  if (k === 'rental')    return 'Аренда'
  return '—'
}

function tgHref(raw: string): string {
  const s = raw.trim().replace(/^@+/, '')
  if (/^https?:\/\//.test(s)) return s
  return `https://t.me/${s}`
}
function waHref(raw: string): string {
  const s = raw.trim()
  if (/^https?:\/\//.test(s)) return s
  // Strip non-digits for the wa.me link.
  const digits = s.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : s
}
