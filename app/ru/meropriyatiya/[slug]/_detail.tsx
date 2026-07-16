// Shared event-detail renderer.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin, HardHat, Video, Send } from 'lucide-react'
import { botLink } from '@/lib/bot-link'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { LocalDateTime } from '@/components/LocalDateTime'
import { PageViewTracker } from '@/components/PageViewTracker'
import { loadEventBySlug } from '@/lib/events'
import { RelatedContent } from '@/components/RelatedContent'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

const COPY = {
  ru: {
    home: 'Главная', eventsCrumb: 'Мероприятия',
    pastBadge: 'прошло',
    register: 'Записаться через Telegram',
    onMap: 'На карте',
    video: 'Видео',
  },
  en: {
    home: 'Home', eventsCrumb: 'Events',
    pastBadge: 'past',
    register: 'Register via Telegram',
    onMap: 'On the map',
    video: 'Video',
  },
} as const

function isPast(iso: string | null): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return Number.isFinite(t) && t < Date.now()
}

export async function generateEventDetailMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const e = await loadEventBySlug(slug, lang)
  if (!e) return { robots: { index: false, follow: false } }
  const ruPath = `/ru/meropriyatiya/${e.slug}`
  const enPath = `/en/events/${e.slug}`
  const path = switchLangPath(ruPath, lang)
  return {
    title: `${e.title} | Balinsky`,
    description: e.seoDescription ?? (e.body?.slice(0, 160) ?? e.title),
    alternates: {
      canonical: path,
      languages: { ru: `${SITE_URL}${ruPath}`, en: `${SITE_URL}${enPath}` , 'x-default': `${SITE_URL}${ruPath}`},
    },
    openGraph: {
      title: e.title,
      description: e.seoDescription ?? undefined,
      images: e.photo ? [e.photo] : undefined,
      type: 'article',
    },
  }
}

export async function EventDetail({ slug, lang }: { slug: string; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const e = await loadEventBySlug(slug, lang)
  if (!e) notFound()
  const home = switchLangPath('/ru', lang)
  const eventsRoot = switchLangPath('/ru/meropriyatiya', lang)
  const developersRoot = switchLangPath('/ru/zastrojshhiki', lang)

  const past = isPast(e.startsAt)

  // Schema.org/Event requires `location` for any in-person event and
  // it must have a Place / VirtualLocation with at least a name —
  // missing it gets the page rejected from rich-result eligibility.
  // We default to a Bali Place when the format isn't explicitly
  // online; online events get a VirtualLocation pointing to the
  // event's register / location URL when present.
  const isOnline = e.format?.toLowerCase().includes('онлайн') || e.format?.toLowerCase().includes('online')
  const location = isOnline
    ? {
        '@type': 'VirtualLocation',
        url: e.locationUrl ?? e.registerUrl ?? `${SITE_URL}${switchLangPath(`/ru/meropriyatiya/${e.slug}`, lang)}`,
      }
    : {
        '@type': 'Place',
        name: e.format?.trim() || (lang === 'ru' ? 'Бали, Индонезия' : 'Bali, Indonesia'),
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'ID',
          addressRegion: 'Bali',
        },
        ...(e.locationUrl ? { url: e.locationUrl } : {}),
      }

  // Performer falls back to organiser when no explicit performer is in
  // the data — keeps Google happy and roughly accurate (a developer
  // hosting their own pitch IS the performer in our context).
  const organizerName = e.developers[0]?.name ?? 'Balinsky'
  const organizerUrl = e.developers[0]?.slug
    ? `${SITE_URL}${switchLangPath(`/ru/zastrojshhiki/${e.developers[0].slug}`, lang)}`
    : `${SITE_URL}${switchLangPath('/ru', lang)}`

  // Event JSON-LD only when we have the required fields. `startDate`
  // is mandatory per schema.org/Event — without it Google rejects
  // the whole block. Same for a non-empty `description`. If either
  // is missing we skip the script tag instead of emitting an
  // invalid Event (which is exactly what triggered the GSC errors).
  const description = e.seoDescription?.trim()
    || (e.body ? e.body.trim().slice(0, 250) : null)
  const eventJsonLd = (e.startsAt && description) ? {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    description,
    startDate: e.startsAt,
    endDate: e.endsAt ?? e.startsAt,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: isOnline
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    location,
    image: e.photo ? [e.photo] : undefined,
    organizer: {
      '@type': 'Organization',
      name: organizerName,
      url: organizerUrl,
    },
    performer: {
      '@type': 'Organization',
      name: organizerName,
    },
    // Free admission with optional registration — give Google a
    // valid Offer block. price 0 still counts as a "free" offer per
    // the spec; without it the page can't qualify as a rich result.
    offers: {
      '@type': 'Offer',
      url: e.registerUrl ?? `${SITE_URL}${switchLangPath(`/ru/meropriyatiya/${e.slug}`, lang)}`,
      price: 0,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      validFrom: e.startsAt,
    },
    url: `${SITE_URL}${switchLangPath(`/ru/meropriyatiya/${e.slug}`, lang)}`,
  } : null

  return (
    <>
      <Header />
      <PageViewTracker kind="event" slug={slug} title={e.title} airtableId={e.id} lang={lang} />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.eventsCrumb, href: eventsRoot },
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
                <LocalDateTime iso={e.startsAt} withYear withTime lang={lang} />
                {e.endsAt && (<><span> – </span><LocalDateTime iso={e.endsAt} withTime lang={lang} /></>)}
              </span>
            )}
            {e.developers[0] && (
              e.developers[0].slug ? (
                <Link href={`${developersRoot}/${e.developers[0].slug}`} className="inline-flex items-center gap-1.5 text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] no-underline">
                  <HardHat size={14} /> {e.developers[0].name}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5"><HardHat size={14} /> {e.developers[0].name}</span>
              )
            )}
            {e.format && <span className="inline-flex items-center gap-1.5">📍 {e.format}</span>}
            {past && <span className="text-[10px] uppercase tracking-wide bg-[#E5E7EB] text-[#374151] px-1.5 py-0.5 rounded">{c.pastBadge}</span>}
          </div>

          {e.photo && (
            <div className="relative w-full mb-8 rounded-2xl overflow-hidden bg-[var(--color-search-bg)] aspect-[16/9]">
              <Image src={e.photo} alt={e.title} fill sizes="(max-width: 768px) 100vw, 800px" priority className="object-cover" />
            </div>
          )}
          {e.body && (
            <div className="text-[16px] leading-[1.7] text-[var(--color-text)] whitespace-pre-wrap">{e.body}</div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {!past && (
              <a href={botLink('event', e.id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[14px] font-medium no-underline hover:bg-[var(--color-primary-hover)]">
                <Send size={14} /> {c.register}
              </a>
            )}
            {e.locationUrl && (
              <a href={e.locationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-[14px] hover:border-[var(--color-primary)] no-underline">
                <MapPin size={14} /> {c.onMap}
              </a>
            )}
            {e.videoUrl && (
              <a href={e.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[var(--color-border)] text-[14px] hover:border-[var(--color-primary)] no-underline">
                <Video size={14} /> {c.video}
              </a>
            )}
          </div>
        </article>

        <RelatedContent lang={lang} developers={e.developers} complexNames={[]} title={e.title} />

        {eventJsonLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />
        )}
        <div className="h-16" />
      </PageContainer>
    </>
  )
}
