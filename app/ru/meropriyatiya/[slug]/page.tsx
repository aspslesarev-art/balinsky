import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Calendar, MapPin, HardHat, Video, Send } from 'lucide-react'
import { botLink } from '@/lib/bot-link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { LocalDateTime } from '@/components/LocalDateTime'
import { loadAllEvents, loadEventBySlug } from '@/lib/events'

export const revalidate = 600
export function generateStaticParams() { return [] }

type Params = Promise<{ slug: string }>
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

function isPast(iso: string | null): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return Number.isFinite(t) && t < Date.now()
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const e = await loadEventBySlug(slug)
  if (!e) return { robots: { index: false, follow: false } }
  return {
    title: `${e.title} | Balinsky`,
    description: e.seoDescription ?? (e.body?.slice(0, 160) ?? e.title),
    alternates: { canonical: `/ru/meropriyatiya/${e.slug}` },
    openGraph: {
      title: e.title,
      description: e.seoDescription ?? undefined,
      images: e.photo ? [e.photo] : undefined,
      type: 'article',
    },
  }
}

export default async function EventDetailPage({ params }: { params: Params }) {
  const { slug } = await params
  const e = await loadEventBySlug(slug)
  if (!e) notFound()

  const past = isPast(e.startsAt)

  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    description: e.seoDescription ?? undefined,
    startDate: e.startsAt ?? undefined,
    endDate: e.endsAt ?? undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: e.format === 'Онлайн'
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    image: e.photo ? [e.photo] : undefined,
    organizer: e.developers[0]?.name ? { '@type': 'Organization', name: e.developers[0].name } : undefined,
    url: `${SITE_URL}/ru/meropriyatiya/${e.slug}`,
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: 'Главная', href: '/ru' },
          { label: 'Мероприятия', href: '/ru/meropriyatiya' },
          { label: e.title },
        ]} />

        <article className="mt-4">
          <h1 className="text-[28px] md:text-[40px] font-semibold leading-tight tracking-tight text-[#111827] mb-4">
            {e.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--color-text-muted)] mb-6">
            {e.startsAt && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} />
                <LocalDateTime iso={e.startsAt} withYear withTime />
                {e.endsAt && (<><span> – </span><LocalDateTime iso={e.endsAt} withTime /></>)}
              </span>
            )}
            {e.developers[0] && (
              e.developers[0].slug ? (
                <Link href={`/ru/zastrojshhiki/${e.developers[0].slug}`} className="inline-flex items-center gap-1.5 text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] no-underline">
                  <HardHat size={14} /> {e.developers[0].name}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5"><HardHat size={14} /> {e.developers[0].name}</span>
              )
            )}
            {e.format && <span className="inline-flex items-center gap-1.5">📍 {e.format}</span>}
            {past && <span className="text-[10px] uppercase tracking-wide bg-[#F1F5F9] text-[#6B7280] px-1.5 py-0.5 rounded">прошло</span>}
          </div>

          {e.photo && (
            <div className="w-full mb-8 rounded-2xl overflow-hidden bg-[var(--color-search-bg)] aspect-[16/9]">
              <img src={e.photo} alt={e.title} className="w-full h-full object-cover" />
            </div>
          )}
          {e.body && (
            <div className="text-[16px] leading-[1.7] text-[var(--color-text)] whitespace-pre-wrap">{e.body}</div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {!past && (
              <a href={botLink('event', e.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[14px] font-medium no-underline hover:bg-[var(--color-primary-hover)]">
                <Send size={14} /> Записаться через Telegram
              </a>
            )}
            {e.locationUrl && (
              <a href={e.locationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-[14px] hover:border-[var(--color-primary)] no-underline">
                <MapPin size={14} /> На карте
              </a>
            )}
            {e.videoUrl && (
              <a href={e.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-[14px] hover:border-[var(--color-primary)] no-underline">
                <Video size={14} /> Видео
              </a>
            )}
          </div>
        </article>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
