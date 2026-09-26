// Клики по кнопкам Telegram и WhatsApp по всему сайту (таблица
// contact_clicks, миграция 086). Пишет lib/contact-click.ts из общего
// слушателя в components/Analytics.tsx — наши собственные браузеры не
// считаются. Отвечает на вопрос «сколько людей написали застройщикам и кому».

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Клики в мессенджеры · Balinsky Admin' }

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

type Click = {
  id: number
  created_at: string
  channel: 'telegram' | 'whatsapp'
  target: string
  placement: string | null
  page_path: string | null
  page_kind: string | null
  page_slug: string | null
  page_title: string | null
  manager_id: string | null
  manager_name: string | null
  developer_name: string | null
  lang: string | null
  visitor_id: string | null
  country: string | null
  device: string | null
}

async function loadClicks(range: Range): Promise<{ rows: Click[]; error: string | null }> {
  const start = rangeStartIso(range)
  let q = sb.from('contact_clicks').select('*').order('created_at', { ascending: false }).limit(50000)
  if (start) q = q.gte('created_at', start)
  const { data, error } = await q
  return { rows: (data ?? []) as Click[], error: error?.message ?? null }
}

type Group = { key: string; label: string; sub: string | null; href: string | null; tg: number; wa: number; people: number; lastAt: string }

function group(rows: Click[], keyOf: (c: Click) => { key: string; label: string; sub?: string | null; href?: string | null } | null): Group[] {
  const m = new Map<string, Group & { visitors: Set<string> }>()
  for (const c of rows) {
    const k = keyOf(c)
    if (!k) continue
    const g = m.get(k.key) ?? { key: k.key, label: k.label, sub: k.sub ?? null, href: k.href ?? null, tg: 0, wa: 0, people: 0, lastAt: c.created_at, visitors: new Set<string>() }
    if (c.channel === 'telegram') g.tg++; else g.wa++
    g.visitors.add(c.visitor_id ?? `row-${c.id}`)
    if (c.created_at > g.lastAt) g.lastAt = c.created_at
    m.set(k.key, g)
  }
  return [...m.values()]
    .map(({ visitors, ...g }) => ({ ...g, people: visitors.size }))
    .sort((a, b) => (b.tg + b.wa) - (a.tg + a.wa) || b.lastAt.localeCompare(a.lastAt))
}

const PLACEMENT_LABELS: Record<string, string> = {
  'manager-card': 'Карточка менеджера',
  footer: 'Подвал сайта',
  header: 'Шапка сайта',
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })
  } catch { return iso }
}

export default async function ContactClicksAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (!(await requireAdmin())) redirect('/admin')

  const sp = await searchParams
  const rangeRaw = typeof sp.range === 'string' ? sp.range : '30d'
  const range = (['24h', '7d', '30d', 'all'].includes(rangeRaw) ? rangeRaw : '30d') as Range

  const { rows, error } = await loadClicks(range)
  const tg = rows.filter(r => r.channel === 'telegram').length
  const wa = rows.length - tg
  const people = new Set(rows.map(r => r.visitor_id ?? `row-${r.id}`)).size

  const byManager = group(rows, c => ({
    key: c.manager_id ?? c.target,
    label: c.manager_name ?? c.target,
    sub: [c.developer_name, c.manager_name ? c.target : null].filter(Boolean).join(' · ') || null,
  }))
  const byDeveloper = group(rows, c => c.developer_name ? { key: c.developer_name, label: c.developer_name } : null)
  const byPage = group(rows, c => c.page_path ? {
    key: c.page_path,
    label: (c.page_title ?? c.page_path).replace(/\s*\|\s*Balinsky\s*$/i, ''),
    sub: c.page_path,
    href: c.page_path,
  } : null)
  const byPlacement = group(rows, c => {
    const p = c.placement ?? 'не определено'
    return { key: p, label: PLACEMENT_LABELS[p] ?? p }
  })

  return (
    <AdminThemeShell
      title="Клики в мессенджеры"
      description="Нажатия на кнопки Telegram и WhatsApp по всему сайту: у менеджеров застройщиков, в подвале и везде, где есть такие ссылки. Боты и ваши собственные браузеры не считаются. «Людей» — уникальные браузеры."
      filters={<RangeTabs range={range} />}
    >
      <div className="space-y-8 md:space-y-10">
        {error && (
          <div className="rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] p-5 text-[13px] text-[var(--ax-fg-muted)]">
            Таблица для кликов ещё не создана в базе (миграция 086_contact_clicks.sql). Пока её нет, клики не сохраняются.
            <div className="mt-1 font-mono text-[11px] text-[var(--ax-fg-faint)]">{error}</div>
          </div>
        )}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Всего кликов" value={rows.length} />
          <KpiCard label="Telegram" value={tg} />
          <KpiCard label="WhatsApp" value={wa} />
          <KpiCard label="Людей" value={people} />
        </section>

        <GroupTable title="По менеджерам и адресатам" empty="Кликов пока нет." rows={byManager} firstCol="Кому" />
        <GroupTable title="По застройщикам" empty="Кликов по кнопкам менеджеров пока нет." rows={byDeveloper} firstCol="Застройщик" />
        <GroupTable title="По страницам" empty="Кликов пока нет." rows={byPage} firstCol="Страница" />
        <GroupTable title="Где стояла кнопка" empty="Кликов пока нет." rows={byPlacement} firstCol="Место" />

        <section>
          <h2 className="text-[15px] md:text-[16px] font-semibold mb-3 text-[var(--ax-fg)]">Последние клики</h2>
          {rows.length === 0 ? (
            <Empty text="Кликов пока нет." />
          ) : (
            <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] overflow-x-auto">
              <table className="w-full text-[13px] min-w-[560px]">
                <thead className="text-[var(--ax-fg-muted)] text-[11px] uppercase tracking-wide">
                  <tr className="border-b border-[var(--ax-border-soft)]">
                    <th className="text-left px-4 py-2 font-medium">Когда</th>
                    <th className="text-left px-4 py-2 font-medium">Куда</th>
                    <th className="text-left px-4 py-2 font-medium">Страница</th>
                    <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Откуда</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((c, i) => (
                    <tr key={c.id} className={i % 2 ? 'bg-[var(--ax-hover)]' : ''}>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[var(--ax-fg-muted)]">{fmtDateTime(c.created_at)}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-[var(--ax-fg)]">{c.channel === 'telegram' ? 'Telegram' : 'WhatsApp'}</span>
                        {' · '}{c.manager_name ?? c.target}
                        {c.developer_name && <div className="text-[11px] text-[var(--ax-fg-faint)]">{c.developer_name}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        {c.page_path ? (
                          <a href={c.page_path} target="_blank" rel="noopener noreferrer" className="text-[var(--ax-fg)] hover:text-[var(--color-primary)] no-underline">
                            {(c.page_title ?? c.page_path).replace(/\s*\|\s*Balinsky\s*$/i, '')}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--ax-fg-muted)] hidden md:table-cell">
                        {[c.country, c.device, c.lang?.toUpperCase()].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminThemeShell>
  )
}

function GroupTable({ title, empty, rows, firstCol }: { title: string; empty: string; rows: Group[]; firstCol: string }) {
  return (
    <section>
      <h2 className="text-[15px] md:text-[16px] font-semibold mb-3 text-[var(--ax-fg)]">{title}</h2>
      {rows.length === 0 ? <Empty text={empty} /> : (
        <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] overflow-x-auto">
          <table className="w-full text-[13px] min-w-[480px]">
            <thead className="text-[var(--ax-fg-muted)] text-[11px] uppercase tracking-wide">
              <tr className="border-b border-[var(--ax-border-soft)]">
                <th className="text-left px-4 py-2 font-medium">{firstCol}</th>
                <th className="text-right px-4 py-2 font-medium">Telegram</th>
                <th className="text-right px-4 py-2 font-medium">WhatsApp</th>
                <th className="text-right px-4 py-2 font-medium">Людей</th>
                <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Последний</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g, i) => (
                <tr key={g.key} className={i % 2 ? 'bg-[var(--ax-hover)]' : ''}>
                  <td className="px-4 py-2.5">
                    {g.href ? (
                      <a href={g.href} target="_blank" rel="noopener noreferrer" className="text-[var(--ax-fg)] hover:text-[var(--color-primary)] no-underline">{g.label}</a>
                    ) : <span className="text-[var(--ax-fg)]">{g.label}</span>}
                    {g.sub && <div className="text-[11px] text-[var(--ax-fg-faint)] break-all">{g.sub}</div>}
                    <div className="text-[11px] text-[var(--ax-fg-muted)] mt-0.5 md:hidden">{fmtDateTime(g.lastAt)}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{g.tg}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{g.wa}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ax-fg-muted)]">{g.people}</td>
                  <td className="px-4 py-2.5 text-[var(--ax-fg-muted)] hidden md:table-cell">{fmtDateTime(g.lastAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-6 text-[13px] text-[var(--ax-fg-muted)]">{text}</div>
  )
}

function RangeTabs({ range }: { range: Range }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(['24h', '7d', '30d', 'all'] as Range[]).map(r => (
        <Link
          key={r}
          href={`/admin/kontakty?range=${r}`}
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

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-4">
      <div className="text-[11px] uppercase tracking-wide text-[var(--ax-fg-muted)] font-medium">{label}</div>
      <div className="mt-1 text-[22px] md:text-[24px] font-semibold tabular-nums text-[var(--ax-fg)]">{value}</div>
    </div>
  )
}
