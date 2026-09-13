import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { BookingWidget } from './BookingWidget'
import { MEETING_COPY, type MeetingLang } from './copy'

// Ссылка рассылается лично, в поиске странице делать нечего.
export function bookingMetadata(lang: MeetingLang): Metadata {
  const c = MEETING_COPY[lang]
  return { title: c.metaTitle, description: c.metaDescription, robots: { index: false, follow: false } }
}

export function BookingPage({ lang }: { lang: MeetingLang }) {
  const c = MEETING_COPY[lang]
  return (
    <>
      <Header />
      <PageContainer>
        <div className="pt-8 pb-24 sm:pt-12">
          <header className="max-w-[68ch]">
            <p className="text-[0.8125rem] font-medium uppercase tracking-wide text-[var(--color-primary)]">{c.eyebrow}</p>
            <h1 className="mt-3 text-[2rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.75rem]">{c.h1}</h1>
            <p className="mt-4 text-[1rem] leading-relaxed text-[var(--color-text-muted)] sm:text-[1.25rem] sm:leading-[1.55]">{c.lead}</p>
          </header>
          <div className="mt-12">
            <BookingWidget lang={lang} />
          </div>
        </div>
      </PageContainer>
    </>
  )
}
