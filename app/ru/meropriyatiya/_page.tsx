// Shared events-list shell for /ru/meropriyatiya and /en/events.

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { LocalDateTime } from '@/components/LocalDateTime'
import { loadAllEvents, type EventItem } from '@/lib/events'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    title: 'Мероприятия от застройщиков Бали | Balinsky',
    description: 'Брокер-туры, презентации, нетворкинг и события от застройщиков Бали.',
    h1: 'Мероприятия',
    sub: 'Брокер-туры, презентации проектов, нетворкинг',
    upcoming: 'Ближайшие',
    past: 'Прошедшие',
    empty: 'Пока нет запланированных мероприятий.',
  },
  en: {
    title: 'Events from Bali developers | Balinsky',
    description: 'Broker tours, project presentations, networking and events from Bali developers.',
    h1: 'Events',
    sub: 'Broker tours, project presentations, networking',
    upcoming: 'Upcoming',
    past: 'Past',
    empty: 'No scheduled events yet.',
  },
} as const

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

export function generateEventsListMetadata(lang: Lang): Metadata {
  const c = pickCopy(COPY, lang)
  const ruPath = '/ru/meropriyatiya'
  const enPath = '/en/events'
  const path = lang === 'en' ? enPath : ruPath
  return {
    title: c.title,
    description: c.description,
    alternates: {
      canonical: path,
      languages: { ru: `https://balinsky.info${ruPath}`, en: `https://balinsky.info${enPath}` , 'x-default': `https://balinsky.info${ruPath}`},
    },
  }
}

export async function EventsList({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const items = await loadAllEvents(lang)
  const upcoming = items.filter(e => !isPast(e.startsAt)).sort((a, b) => startTimeMs(a.startsAt) - startTimeMs(b.startsAt))
  const past = items.filter(e => isPast(e.startsAt)).sort((a, b) => startTimeMs(b.startsAt) - startTimeMs(a.startsAt))
  return (
    <>
      <Header />
      <PageContainer>
        <h1 className="pt-8 mb-4 text-[28px] md:text-[36px] font-semibold tracking-tight text-[#111827]">{c.h1}</h1>
        <div className="text-[14px] text-[var(--color-text-muted)] mb-8">{c.sub}</div>

        {upcoming.length > 0 && (
          <>
            <h2 className="text-[18px] md:text-[20px] font-semibold text-[#111827] mb-4">{c.upcoming}</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {upcoming.map(e => (<li key={e.id}><EventCard e={e} lang={lang} /></li>))}
            </ul>
          </>
        )}

        {past.length > 0 && (
          <>
            <h2 className="text-[18px] md:text-[20px] font-semibold text-[#111827] mb-4">{c.past}</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {past.slice(0, 24).map(e => (<li key={e.id} className="opacity-70"><EventCard e={e} lang={lang} /></li>))}
            </ul>
          </>
        )}

        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-8 text-center text-[var(--color-text-muted)]">
            {c.empty}
          </div>
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}

function EventCard({ e, lang }: { e: EventItem; lang: Lang }) {
  const detailRoot = lang === 'en' ? '/en/events' : '/ru/meropriyatiya'
  return (
    <Link href={`${detailRoot}/${e.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
      {e.photo ? (
        <div className="relative w-full h-[180px]">
          <Image src={e.photo} alt={e.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        </div>
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
          <LocalDateTime iso={e.startsAt} withTime lang={lang} className="text-[12px] text-[var(--color-text-muted)]" />
        )}
      </div>
    </Link>
  )
}
