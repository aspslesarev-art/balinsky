import { redirect } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { loadAllBanners, type Banner } from '@/lib/banners'
import { AdminThemeShell } from '@/components/admin/AdminThemeShell'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false }, title: 'Реклама · Balinsky Admin' }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

type StatRow = {
  banner_id: string
  impressions_count: number
  clicks_count: number
  last_impression_at: string | null
  last_click_at: string | null
  auto_disabled: boolean
}

async function loadStats(): Promise<Map<string, StatRow>> {
  const { data } = await sb.from('ad_banner_stats').select('*')
  const m = new Map<string, StatRow>()
  for (const r of (data ?? []) as StatRow[]) m.set(r.banner_id, r)
  return m
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

function bannerStatus(b: Banner, s: StatRow | undefined): { label: string; tone: 'live' | 'paused' | 'capped' | 'scheduled' | 'expired' } {
  if (s?.auto_disabled) return { label: 'Лимит исчерпан', tone: 'capped' }
  if (!b.active) return { label: 'Отключён в Airtable', tone: 'paused' }
  const now = Date.now()
  if (b.startsAt && Date.parse(b.startsAt) > now) return { label: 'Запланирован', tone: 'scheduled' }
  if (b.endsAt && Date.parse(b.endsAt) < now) return { label: 'Истёк', tone: 'expired' }
  return { label: 'Активен', tone: 'live' }
}

export default async function AdsAdmin() {
  if (!(await requireAdmin())) redirect('/admin')

  const [banners, stats] = await Promise.all([loadAllBanners(), loadStats()])

  return (
    <AdminThemeShell
      title="Рекламные баннеры"
      description={`${banners.length} ${banners.length === 1 ? 'баннер' : 'баннеров'} · карточки берутся из Airtable.`}
    >
        {banners.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--ax-border)] bg-[var(--ax-panel)] p-10 text-center text-[13px] text-[var(--ax-fg-muted)]">
            Баннеров пока нет. Заведите запись в Airtable (таблица «Ad Banners»),
            затем запустите <code className="bg-[#F3F4F6] px-1.5 py-0.5 rounded">node scripts/sync-banners.mjs</code>.
          </div>
        ) : (
          <ul className="space-y-3">
            {banners.map(b => {
              const s = stats.get(b.id)
              const status = bannerStatus(b, s)
              const ctr = (s?.impressions_count ?? 0) > 0
                ? ((s!.clicks_count / s!.impressions_count) * 100).toFixed(2) + '%'
                : '—'
              const limitProgress = b.impressionLimit
                ? Math.min(100, Math.round(((s?.impressions_count ?? 0) / b.impressionLimit) * 100))
                : null
              return (
                <li key={b.id} className="rounded-2xl border border-[var(--ax-border)] bg-[var(--ax-panel)] p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-[#F3F4F6]">
                      {b.imageUrl && <Image src={b.imageUrl} alt={b.alt} fill sizes="80px" className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded ${
                          status.tone === 'live'      ? 'bg-[#D1FAE5] text-[#065F46]'
                          : status.tone === 'capped'  ? 'bg-[#FEE2E2] text-[#991B1B]'
                          : status.tone === 'paused'  ? 'bg-[var(--ax-hover)] text-[var(--ax-fg-soft)]'
                          : status.tone === 'expired' ? 'bg-[#FEF3C7] text-[#92400E]'
                          : 'bg-[#DBEAFE] text-[#1E40AF]'
                        }`}>
                          {status.label}
                        </span>
                        {b.sponsor && <span className="text-[12px] text-[var(--ax-fg-muted)]">{b.sponsor}</span>}
                      </div>
                      <div className="text-[14px] font-medium leading-snug mb-1.5">{b.headline}</div>
                      <a href={b.linkUrl} target="_blank" rel="noopener" className="text-[12px] text-[#1F8B5F] hover:underline break-all">{b.linkUrl}</a>

                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
                        <Stat label="Показы" value={(s?.impressions_count ?? 0).toLocaleString('ru-RU')} />
                        <Stat label="Клики" value={(s?.clicks_count ?? 0).toLocaleString('ru-RU')} />
                        <Stat label="CTR" value={ctr} />
                        <Stat label="Последний показ" value={fmtDateTime(s?.last_impression_at ?? null)} />
                      </div>

                      {limitProgress != null && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] text-[var(--ax-fg-muted)] mb-1">
                            <span>Лимит показов</span>
                            <span>{(s?.impressions_count ?? 0).toLocaleString('ru-RU')} / {b.impressionLimit!.toLocaleString('ru-RU')}</span>
                          </div>
                          <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${limitProgress >= 100 ? 'bg-[#B91C1C]' : 'bg-[#1F8B5F]'}`}
                              style={{ width: limitProgress + '%' }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-3 text-[11px] text-[var(--ax-fg-muted)]">
                        Управление статусом / лимитом — в Airtable, таблица «Ad Banners».
                        После правок запустите <code>node scripts/sync-banners.mjs</code> или дождитесь следующей синхронизации.
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
    </AdminThemeShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--ax-border)] bg-[var(--ax-bg)] p-2">
      <div className="text-[10px] uppercase tracking-wide text-[var(--ax-fg-muted)]">{label}</div>
      <div className="text-[14px] font-semibold text-[var(--ax-fg)]">{value}</div>
    </div>
  )
}
