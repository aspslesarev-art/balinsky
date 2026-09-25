// Аналитика закрытого лендинга для застройщиков (/agentskaya-set).
//
// Строки пишет /api/track/landing (миграция 084): одна строка на сессию,
// с итогами — сколько секунд вкладка была на экране, до куда долистали,
// сколько секунд провели на каждом разделе, жали ли «Написать». «Кто» —
// метка ?from= из персональной ссылки; повторные заходы одного браузера
// склеиваются по visitor_id.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'
import { LANDING_SECTIONS, LANDING_SEEN_SEC, fmtDur } from '@/lib/landing-sections'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Лендинг · Balinsky Admin' }

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const PAGE = 'agentskaya-set'
const PAGE_URL = 'https://balinsky.info/agentskaya-set/'

const SECTIONS = LANDING_SECTIONS
const SEEN_SEC = LANDING_SEEN_SEC

type Range = '24h' | '7d' | '30d' | 'all'
const RANGE_LABELS: Record<Range, string> = {
  '24h': 'За 24 часа', '7d': 'За 7 дней', '30d': 'За 30 дней', 'all': 'Всё время',
}

type Visit = {
  id: string
  who: string | null
  visitor_id: string | null
  started_at: string
  active_sec: number
  max_scroll: number
  sections: Record<string, number>
  cta_clicks: number
  city: string | null
  country: string | null
  device: string | null
  referrer: string | null
}

async function loadVisits(range: Range): Promise<{ visits: Visit[]; error: string | null }> {
  let q = sb.from('landing_visits')
    .select('id, who, visitor_id, started_at, active_sec, max_scroll, sections, cta_clicks, city, country, device, referrer')
    .eq('page', PAGE)
    .order('started_at', { ascending: false })
    .limit(1000)
  if (range !== 'all') {
    const ms = range === '24h' ? 86_400_000 : range === '7d' ? 7 * 86_400_000 : 30 * 86_400_000
    q = q.gte('started_at', new Date(Date.now() - ms).toISOString())
  }
  const { data, error } = await q
  if (error) return { visits: [], error: error.message }
  return { visits: (data ?? []) as Visit[], error: null }
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    timeZone: 'Asia/Makassar', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default async function LendingAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (!(await requireAdmin())) redirect('/admin')

  const sp = await searchParams
  const rangeRaw = typeof sp.range === 'string' ? sp.range : '30d'
  const range = (['24h', '7d', '30d', 'all'].includes(rangeRaw) ? rangeRaw : '30d') as Range

  const { visits, error } = await loadVisits(range)

  // Номер захода для каждого браузера — «заход №3» заметнее, чем голый id.
  const byVisitor = new Map<string, Visit[]>()
  for (const v of [...visits].reverse()) {
    if (!v.visitor_id) continue
    byVisitor.set(v.visitor_id, [...(byVisitor.get(v.visitor_id) ?? []), v])
  }
  const visitNo = (v: Visit) => (v.visitor_id ? (byVisitor.get(v.visitor_id) ?? []).indexOf(v) + 1 : 1)
  // Метка из ссылки могла быть только в первом заходе — подписываем и остальные.
  const whoOf = (v: Visit) => v.who ?? (v.visitor_id ? (byVisitor.get(v.visitor_id) ?? []).find(x => x.who)?.who : null) ?? null

  const people = new Set(visits.map(v => v.visitor_id ?? v.id)).size
  const avg = visits.length ? Math.round(visits.reduce((a, v) => a + v.active_sec, 0) / visits.length) : 0
  const cta = visits.filter(v => v.cta_clicks > 0).length

  const sectionStats = SECTIONS.map(([key, label]) => {
    const seen = visits.filter(v => (v.sections?.[key] ?? 0) >= SEEN_SEC)
    const total = visits.reduce((a, v) => a + (v.sections?.[key] ?? 0), 0)
    return { key, label, reach: visits.length ? Math.round((seen.length / visits.length) * 100) : 0, avg: seen.length ? Math.round(total / seen.length) : 0 }
  })

  return (
    <AdminThemeShell
      title="Лендинг для застройщиков"
      description="Кто открывал предложение, когда, сколько читал и какие блоки смотрел. Время — по Бали, считается только пока вкладка на экране."
      filters={<RangeTabs range={range} />}
    >
      <div className="space-y-8 md:space-y-10">
        {error && (
          <div className="rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] p-5 text-[14px] text-[var(--ax-fg)]">
            Таблица визитов недоступна: <code>{error}</code>. Похоже, не применена миграция <code>084_landing_visits.sql</code>.
          </div>
        )}

        <section className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-5 text-[14px] text-[var(--ax-fg-soft)] leading-relaxed">
          <div className="text-[11px] uppercase tracking-wide text-[var(--ax-fg-muted)] font-medium mb-2">Как узнать, кто открыл</div>
          Отправляйте каждому застройщику свою ссылку с меткой:{' '}
          <code className="text-[var(--ax-fg)]">{PAGE_URL}?from=vertikal</code>. Метка появится в колонке «Кто» и в уведомлении в Telegram.
          Свои заходы не считаем: откройте один раз <code className="text-[var(--ax-fg)]">{PAGE_URL}?notrack=1</code> на каждом своём устройстве.
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Заходов" value={String(visits.length)} />
          <KpiCard label="Разных людей" value={String(people)} />
          <KpiCard label="Среднее время" value={fmtDur(avg)} />
          <KpiCard label="Нажали «Написать»" value={String(cta)} />
        </section>

        <section>
          <h2 className="text-[15px] md:text-[16px] font-semibold mb-3 text-[var(--ax-fg)]">Какие блоки смотрят</h2>
          <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-5 space-y-2.5">
            {sectionStats.map(s => (
              <div key={s.key} className="grid grid-cols-[140px_1fr_120px] md:grid-cols-[180px_1fr_160px] items-center gap-3 text-[13px]">
                <div className="text-[var(--ax-fg)] truncate">{s.label}</div>
                <div className="h-2 rounded-full bg-[var(--ax-hover)] overflow-hidden">
                  <div className="h-full bg-[#E78C3D]" style={{ width: `${s.reach}%` }} />
                </div>
                <div className="text-right tabular-nums text-[var(--ax-fg-muted)]">
                  {s.reach}%{s.avg ? ` · ${fmtDur(s.avg)}` : ''}
                </div>
              </div>
            ))}
            <p className="pt-2 text-[12px] text-[var(--ax-fg-muted)]">Процент — доля заходов, где на блоке задержались хотя бы {SEEN_SEC} секунды. Время — среднее у тех, кто задержался.</p>
          </div>
        </section>

        <section>
          <h2 className="text-[15px] md:text-[16px] font-semibold mb-3 text-[var(--ax-fg)]">Заходы</h2>
          {visits.length === 0 ? (
            <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] p-6 text-[13px] text-[var(--ax-fg-muted)]">
              За выбранный период заходов нет.
            </div>
          ) : (
            <div className="rounded-2xl bg-[var(--ax-panel)] border border-[var(--ax-border)] divide-y divide-[var(--ax-border-soft)]">
              {visits.map(v => {
                const who = whoOf(v)
                const n = visitNo(v)
                const secs = SECTIONS.filter(([k]) => (v.sections?.[k] ?? 0) >= SEEN_SEC)
                const maxSec = Math.max(1, ...SECTIONS.map(([k]) => v.sections?.[k] ?? 0))
                return (
                  <details key={v.id} className="group">
                    <summary className="cursor-pointer list-none p-4 grid grid-cols-2 md:grid-cols-[130px_1fr_150px_110px_90px] gap-x-4 gap-y-1 items-center text-[13px] hover:bg-[var(--ax-hover)]">
                      <div className="tabular-nums text-[var(--ax-fg-muted)]">{fmtWhen(v.started_at)}</div>
                      <div className="font-semibold text-[var(--ax-fg)] truncate">
                        {who ?? <span className="font-normal text-[var(--ax-fg-muted)]">без метки</span>}
                        {n > 1 && <span className="ml-2 text-[12px] font-normal text-[var(--ax-fg-muted)]">заход №{n}</span>}
                      </div>
                      <div className="text-[var(--ax-fg-soft)] truncate">{[v.city, v.country].filter(Boolean).join(', ') || '—'} · {v.device ?? '—'}</div>
                      <div className="tabular-nums text-[var(--ax-fg)]">{fmtDur(v.active_sec)} · {v.max_scroll}%</div>
                      <div className={v.cta_clicks ? 'text-[#E78C3D] font-semibold' : 'text-[var(--ax-fg-muted)]'}>
                        {v.cta_clicks ? 'написал' : '—'}
                      </div>
                    </summary>
                    <div className="px-4 pb-4 space-y-1.5">
                      {secs.length === 0 ? (
                        <div className="text-[13px] text-[var(--ax-fg-muted)]">Ни на одном блоке не задержался дольше {SEEN_SEC} секунд.</div>
                      ) : secs.map(([k, label]) => (
                        <div key={k} className="grid grid-cols-[140px_1fr_70px] items-center gap-3 text-[12px]">
                          <div className="text-[var(--ax-fg-soft)] truncate">{label}</div>
                          <div className="h-1.5 rounded-full bg-[var(--ax-hover)] overflow-hidden">
                            <div className="h-full bg-[#E78C3D]" style={{ width: `${Math.round(((v.sections?.[k] ?? 0) / maxSec) * 100)}%` }} />
                          </div>
                          <div className="text-right tabular-nums text-[var(--ax-fg-muted)]">{fmtDur(v.sections?.[k] ?? 0)}</div>
                        </div>
                      ))}
                      {v.referrer && <div className="pt-2 text-[12px] text-[var(--ax-fg-muted)] truncate">Пришёл с: {v.referrer}</div>}
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </section>
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
          href={`/admin/lending?range=${r}`}
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
