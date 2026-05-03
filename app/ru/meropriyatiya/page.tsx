import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { LocalDateTime } from '@/components/LocalDateTime'
import { loadAllEvents } from '@/lib/events'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Мероприятия от застройщиков Бали | Balinsky',
  description: 'Брокер-туры, презентации, нетворкинг и события от застройщиков Бали.',
  alternates: { canonical: '/ru/meropriyatiya' },
}

function startTimeMs(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY
}
function isPast(iso: string | null): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return Number.isFinite(t) && t < Date.now()
}

export default async function EventsListPage() {
  const items = await loadAllEvents()
  const upcoming = items
    .filter(e => !isPast(e.startsAt))
    .sort((a, b) => startTimeMs(a.startsAt) - startTimeMs(b.startsAt))
  const past = items
    .filter(e => isPast(e.startsAt))
    .sort((a, b) => startTimeMs(b.startsAt) - startTimeMs(a.startsAt))
  return (
    <>
      <Header />
      <PageContainer>
        <h1 className="pt-8 mb-4 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">
          Мероприятия
        </h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-8">
          Брокер-туры, презентации проектов, нетворкинг
        </div>

        {upcoming.length > 0 && (
          <>
            <h2 className="text-[18px] md:text-[20px] font-semibold text-[#111827] mb-4">Ближайшие</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {upcoming.map(e => (
                <li key={e.id}>
                  <EventCard e={e} />
                </li>
              ))}
            </ul>
          </>
        )}

        {past.length > 0 && (
          <>
            <h2 className="text-[18px] md:text-[20px] font-semibold text-[#111827] mb-4">Прошедшие</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {past.slice(0, 24).map(e => (
                <li key={e.id} className="opacity-70">
                  <EventCard e={e} />
                </li>
              ))}
            </ul>
          </>
        )}

        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center text-[var(--color-text-muted)]">
            Пока нет запланированных мероприятий.
          </div>
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}

function EventCard({ e }: { e: import('@/lib/events').EventItem }) {
  return (
    <Link href={`/ru/meropriyatiya/${e.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
      {e.photo ? (
        <img src={e.photo} alt={e.title} className="w-full h-[180px] object-cover" />
      ) : (
        <div className="w-full h-[180px] bg-[var(--color-search-bg)] flex items-center justify-center text-3xl">🎟️</div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          {e.developers[0]?.name && (
            <span className="text-[11px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium">{e.developers[0].name}</span>
          )}
          {e.format && (
            <span className="text-[10px] uppercase tracking-wide bg-[#E5E7EB] text-[#374151] px-1.5 py-0.5 rounded">{e.format}</span>
          )}
        </div>
        <div className="text-[16px] font-semibold leading-snug mb-2 line-clamp-3">{e.title}</div>
        {e.startsAt && (
          <LocalDateTime
            iso={e.startsAt}
            withTime
            className="text-[12px] text-[var(--color-text-muted)]"
          />
        )}
      </div>
    </Link>
  )
}
