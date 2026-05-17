'use client'

import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Send, MessageCircle, Star, Languages, Video, Clock } from 'lucide-react'
import type { ManagerItem } from '@/lib/managers'
import { botLink } from '@/lib/bot-link'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    heading: 'Связаться с менеджером',
    headingMany: 'Связаться с менеджерами',
    role: (dev?: string | null) => `Менеджер ${dev ? dev : 'застройщика'}`,
    sla: 'Обычно отвечает в течение часа в рабочее время Бали (UTC+8)',
    videoCall: 'Видеозвонок',
  },
  en: {
    heading: 'Contact the manager',
    headingMany: 'Contact the managers',
    role: (dev?: string | null) => `${dev ? dev : 'Developer'} manager`,
    sla: 'Usually replies within an hour during Bali working hours (UTC+8)',
    videoCall: 'Video call',
  },
} as const

// Accept either a single manager (legacy callsites) or an array of
// them — many developers have 2–3 people on rotation and visitors
// should see all of them on the page.
export function ManagerCard({
  manager,
  managers,
  developerName,
}: {
  manager?: ManagerItem | null
  managers?: ManagerItem[]
  developerName?: string | null
}) {
  const pathname = usePathname() ?? ''
  const lang: Lang = pathname.startsWith('/en') ? 'en' : 'ru'
  const c = COPY[lang]

  const list = managers && managers.length > 0
    ? managers
    : manager ? [manager] : []
  if (list.length === 0) return null

  // Per-site Cal.com / Calendly link. Set NEXT_PUBLIC_VIDEO_CALL_URL on
  // Vercel to enable. Hidden when missing — better than a dead button.
  const videoUrl = process.env.NEXT_PUBLIC_VIDEO_CALL_URL?.trim() || null

  // Drop entries that have no actionable contact channel — render
  // nothing if the whole list is empty after filtering.
  const renderable = list.filter(m => m.telegram || m.whatsapp || videoUrl)
  if (renderable.length === 0) return null

  const heading = renderable.length > 1 ? c.headingMany : c.heading

  return (
    <section className="mb-10">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-4">
        {heading}
      </h2>
      <div className="space-y-3">
        {renderable.map(m => (
          <ManagerRow key={m.id} m={m} lang={lang} c={c} developerName={developerName ?? null} videoUrl={videoUrl} />
        ))}
      </div>
    </section>
  )
}

type ManagerCopy = {
  role: (dev?: string | null) => string
  sla: string
  videoCall: string
}
function ManagerRow({
  m,
  lang,
  c,
  developerName,
  videoUrl,
}: {
  m: ManagerItem
  lang: Lang
  c: ManagerCopy
  developerName: string | null
  videoUrl: string | null
}) {
  const tg = m.telegram ? botLink('manager', m.id) : null
  const wa = m.whatsapp

  // Silent fallback to the RU value when an EN counterpart isn't
  // filled in Airtable yet — manager cards already render fine in
  // mixed locales and a literal "Name En" placeholder would look odd.
  const displayName = lang === 'en' && m.nameEn ? m.nameEn : m.name
  const displayLanguages = lang === 'en' && m.languagesEn && m.languagesEn.length > 0
    ? m.languagesEn
    : m.languages

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6">
      <div className="flex items-center gap-4 sm:flex-1 min-w-0">
        <div className="shrink-0 w-[64px] h-[64px] md:w-[80px] md:h-[80px] rounded-full overflow-hidden bg-[var(--color-search-bg)] border border-[var(--color-border)] relative">
          {m.photo ? (
            <Image src={m.photo} alt={displayName} fill sizes="80px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[24px] text-[var(--color-text-muted)]">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[16px] md:text-[18px] font-semibold text-[#111827] truncate">{displayName}</div>
          <div className="text-[12px] md:text-[13px] text-[var(--color-text-muted)] truncate">
            {c.role(developerName)}
          </div>
          {m.regalia && (
            <div className="mt-1 text-[12px] md:text-[13px] text-[var(--color-text-muted)] line-clamp-2">
              {m.regalia}
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {m.rating != null && (
              <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
                <Star size={12} className="text-[#F59E0B] fill-[#F59E0B]" />
                <span className="font-medium text-[#111827]">{m.rating.toFixed(1)}</span>
              </span>
            )}
            {lang !== 'en' && displayLanguages.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
                <Languages size={12} />
                <span className="truncate">{displayLanguages.join(', ')}</span>
              </span>
            )}
          </div>
          <div className="mt-2 inline-flex items-start gap-1.5 text-[12px] text-[var(--color-text-muted)]">
            <Clock size={12} className="mt-0.5 shrink-0" />
            <span>{c.sla}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:shrink-0">
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[14px] font-medium no-underline transition-colors"
          >
            <Video size={16} /> {c.videoCall}
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[#25D366] hover:bg-[#1EBE5B] text-white text-[14px] font-medium no-underline transition-colors"
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
        )}
        {tg && (
          <a
            href={tg}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[#229ED9] hover:bg-[#1A8CC2] text-white text-[14px] font-medium no-underline transition-colors"
          >
            <Send size={16} /> Telegram
          </a>
        )}
      </div>
    </div>
  )
}
