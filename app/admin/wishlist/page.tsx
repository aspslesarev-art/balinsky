// Admin dashboard: wishlist (heart) analytics.
//
// What gets liked? Aggregated across the four kinds — villas,
// apartments, complexes, rentals — so you can see at a glance which
// listings the audience saves to their shortlist most often.
//
// Data path: every add to wishlist fires /api/track/wishlist
// (WishlistContext) → row in wishlist_events (migration 014). This
// page reads service-role with a range filter and groups by listing.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Лайки · Balinsky Admin' }

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

type Kind = 'villa' | 'apartment' | 'complex' | 'rental'

type EventRow = {
  id: number
  created_at: string
  kind: Kind
  airtable_id: string | null
  slug: string
  title: string | null
  district: string | null
  bedrooms: number | null
  area: number | string | null     // numeric in PG can come back as string
  price_usd: number | string | null
  lang: string | null
}

async function loadEvents(range: Range): Promise<EventRow[]> {
  const start = rangeStartIso(range)
  let query = sb
    .from('wishlist_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20000)
  if (start) query = query.gte('created_at', start)
  const { data } = await query
  return (data ?? []) as EventRow[]
}

type Aggregated = {
  kind: Kind
  slug: string
  airtableId: string | null
  title: string | null
  district: string | null
  priceUsd: number | null
  likes: number
  lastAt: string
}

function aggregate(events: EventRow[]): Aggregated[] {
  const m = new Map<string, Aggregated>()
  for (const e of events) {
    const key = `${e.kind}:${e.slug}`
    const priceUsd = typeof e.price_usd === 'number' ? e.price_usd
      : typeof e.price_usd === 'string' ? parseFloat(e.price_usd) || null
      : null
    const s = m.get(key) ?? {
      kind: e.kind,
      slug: e.slug,
      airtableId: e.airtable_id,
      title: e.title,
      district: e.district,
      priceUsd,
      likes: 0,
      lastAt: e.created_at,
    }
    s.likes++
    if (e.created_at > s.lastAt) s.lastAt = e.created_at
    if (e.title) s.title = e.title
    if (e.district) s.district = e.district
    if (priceUsd != null) s.priceUsd = priceUsd
    if (e.airtable_id) s.airtableId = e.airtable_id
    m.set(key, s)
  }
  return [...m.values()].sort((a, b) => b.likes - a.likes || b.lastAt.localeCompare(a.lastAt))
}

function detailHref(a: Pick<Aggregated, 'kind' | 'slug'>): string {
  switch (a.kind) {
    case 'villa':     return `/ru/villy/o/${a.slug}`
    case 'apartment': return `/ru/apartamenty/o/${a.slug}`
    case 'complex':   return `/ru/zhilye-kompleksy/o/${a.slug}`
    case 'rental':    return `/ru/arenda/o/${a.slug}`
  }
}

function kindLabel(k: Kind): string {
  if (k === 'villa')     return 'Виллы'
  if (k === 'apartment') return 'Апартаменты'
  if (k === 'complex')   return 'Комплексы'
  return 'Аренда'
}

function fmtUsd(v: number | null | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—'
  return `$${Math.round(v).toLocaleString('en-US')}`
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

export default async function WishlistAdmin({
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
  const totalLikes = events.length
  const uniqueListings = all.length

  const byKind: Record<Kind, Aggregated[]> = {
    villa:     all.filter(a => a.kind === 'villa'),
    apartment: all.filter(a => a.kind === 'apartment'),
    complex:   all.filter(a => a.kind === 'complex'),
    rental:    all.filter(a => a.kind === 'rental'),
  }
  const totalsByKind: Record<Kind, number> = {
    villa:     byKind.villa.reduce((acc, a) => acc + a.likes, 0),
    apartment: byKind.apartment.reduce((acc, a) => acc + a.likes, 0),
    complex:   byKind.complex.reduce((acc, a) => acc + a.likes, 0),
    rental:    byKind.rental.reduce((acc, a) => acc + a.likes, 0),
  }

  return (
    <AdminThemeShell
      title="Лайки"
      description="Что посетители сохраняют в избранное. Считаем добавления (heart-tap), не считаем удаления."
      filters={
        <div className="flex flex-wrap gap-2">
          {(['24h', '7d', '30d', 'all'] as Range[]).map(r => (
            <Link
              key={r}
              href={`/admin/wishlist?range=${r}`}
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
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard label="Всего лайков" value={String(totalLikes)} />
          <KpiCard label="Виллы"        value={String(totalsByKind.villa)} />
          <KpiCard label="Апартаменты"  value={String(totalsByKind.apartment)} />
          <KpiCard label="Комплексы"    value={String(totalsByKind.complex)} />
          <KpiCard label="Аренда"       value={String(totalsByKind.rental)} />
        </section>

        <div className="text-[12px] text-[var(--ax-fg-faint)]">
          Уникальных объектов с лайками: {uniqueListings}
        </div>

        {(['villa', 'apartment', 'complex', 'rental'] as Kind[]).map(kind => (
          <section key={kind}>
            <h2 className="text-[15px] md:text-[16px] font-semibold mb-3 text-[var(--ax-fg)]">{kindLabel(kind)}</h2>
            {byKind[kind].length === 0 ? (
              <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-6 text-[13px] text-[var(--ax-fg-muted)]">
                За выбранный период нет лайков.
              </div>
            ) : (
              <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] overflow-x-auto">
                <table className="w-full text-[13px] min-w-[600px]">
                  <thead className="text-[var(--ax-fg-muted)] text-[11px] uppercase tracking-wide">
                    <tr className="border-b border-[var(--ax-border-soft)]">
                      <th className="text-left  px-4 py-2 font-medium">Объект</th>
                      <th className="text-left  px-4 py-2 font-medium hidden md:table-cell">Район</th>
                      <th className="text-right px-4 py-2 font-medium hidden md:table-cell">Цена</th>
                      <th className="text-right px-4 py-2 font-medium">Лайков</th>
                      <th className="text-left  px-4 py-2 font-medium hidden lg:table-cell">Последний</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byKind[kind].map((a, i) => (
                      <tr key={`${a.kind}:${a.slug}`} className={i % 2 ? 'bg-[var(--ax-hover)]' : ''}>
                        <td className="px-4 py-2.5">
                          <a href={detailHref(a)} target="_blank" rel="noopener noreferrer" className="text-[var(--ax-fg)] hover:text-[var(--color-primary)] no-underline">
                            {a.title ?? a.slug}
                          </a>
                          {a.airtableId && <div className="text-[11px] text-[var(--ax-fg-faint)] font-mono">{a.airtableId}</div>}
                          {/* Mobile-only inline meta — district / price collapse on small screens */}
                          <div className="text-[11px] text-[var(--ax-fg-muted)] mt-0.5 md:hidden">
                            {a.district ?? '—'}{a.priceUsd != null && ` · ${fmtUsd(a.priceUsd)}`}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--ax-fg-muted)] hidden md:table-cell">{a.district ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ax-fg-soft)] hidden md:table-cell">{fmtUsd(a.priceUsd)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-[var(--ax-fg)]">{a.likes}</td>
                        <td className="px-4 py-2.5 text-[var(--ax-fg-muted)] hidden lg:table-cell">{fmtDateTime(a.lastAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </AdminThemeShell>
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
