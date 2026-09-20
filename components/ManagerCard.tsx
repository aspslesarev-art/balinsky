'use client'

import { usePathname } from 'next/navigation'
import { detectLang, pickCopy } from '@/lib/i18n'
import Image from 'next/image'
import { Star, Languages, Video, Clock, Send, MessageCircle } from 'lucide-react'
import type { ManagerItem } from '@/lib/managers'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    heading: 'Контакты застройщика',
    headingMany: 'Контакты застройщика',
    role: (dev?: string | null) => `Менеджер ${dev ? dev : 'застройщика'}`,
    sla: 'Рабочее время Бали, UTC+8',
    videoCall: 'Видеозвонок',
    note: 'Писать вы будете напрямую застройщику. Balinsky в переговорах и сделке не участвует.',
  },
  en: {
    heading: 'Developer contacts',
    headingMany: 'Developer contacts',
    role: (dev?: string | null) => `${dev ? dev : 'Developer'} manager`,
    sla: 'Bali working hours, UTC+8',
    videoCall: 'Video call',
    note: 'These are the developer’s own contacts. Balinsky takes no part in the talks or the transaction.',
  },
  id: {
    heading: 'Kontak pengembang',
    headingMany: 'Kontak pengembang',
    role: (dev?: string | null) => `Manajer ${dev ? dev : 'pengembang'}`,
    sla: 'Jam kerja Bali, UTC+8',
    videoCall: 'Panggilan video',
    note: 'Ini kontak milik pengembang. Balinsky tidak ikut serta dalam negosiasi maupun transaksi.',
  },
  fr: {
    heading: 'Contacts du promoteur',
    headingMany: 'Contacts du promoteur',
    role: (dev?: string | null) => `Conseiller ${dev ? dev : 'du promoteur'}`,
    sla: 'Heures de bureau de Bali, UTC+8',
    videoCall: 'Appel vidéo',
    note: 'Ce sont les contacts du promoteur. Balinsky ne participe ni aux négociations ni à la transaction.',
  },
  de: {
    heading: 'Kontakte des Bauträgers',
    headingMany: 'Kontakte des Bauträgers',
    role: (dev?: string | null) => `Manager ${dev ? dev : 'des Bauträgers'}`,
    sla: 'Geschäftszeiten auf Bali, UTC+8',
    videoCall: 'Videoanruf',
    note: 'Das sind die Kontakte des Bauträgers. Balinsky ist weder an den Verhandlungen noch an der Transaktion beteiligt.',
  },
  zh: {
    heading: '开发商联系方式',
    headingMany: '开发商联系方式',
    role: (dev?: string | null) => `${dev ? dev : '开发商'}经理`,
    sla: '巴厘岛工作时间，UTC+8',
    videoCall: '视频通话',
    note: '这是开发商本人的联系方式。Balinsky 不参与洽谈或交易。',
  },
  nl: {
    heading: 'Contactgegevens van de ontwikkelaar',
    headingMany: 'Contactgegevens van de ontwikkelaar',
    role: (dev?: string | null) => `Manager ${dev ? dev : 'van de ontwikkelaar'}`,
    sla: 'Werktijden op Bali, UTC+8',
    videoCall: 'Videogesprek',
    note: 'Dit zijn de contactgegevens van de ontwikkelaar zelf. Balinsky neemt geen deel aan de onderhandelingen of de transactie.',
  },
  ban: {
    heading: 'Kontak pangwangun',
    headingMany: 'Kontak pangwangun',
    role: (dev?: string | null) => `Manajer ${dev ? dev : 'pangwangun'}`,
    sla: 'Galah makarya ring Bali, UTC+8',
    videoCall: 'Panggilan video',
    note: 'Puniki kontak pangwangun. Balinsky nénten milu ring negosiasi wiadin transaksi.',
  },
  pl: {
    heading: 'Kontakty dewelopera',
    headingMany: 'Kontakty dewelopera',
    role: (dev?: string | null) => `Menedżer ${dev ? dev : 'dewelopera'}`,
    sla: 'Godziny pracy na Bali, UTC+8',
    videoCall: 'Rozmowa wideo',
    note: 'To są kontakty samego dewelopera. Balinsky nie bierze udziału w negocjacjach ani w transakcji.',
  },
  uk: {
    heading: 'Контакти забудовника',
    headingMany: 'Контакти забудовника',
    role: (dev?: string | null) => `Менеджер ${dev ? dev : 'забудовника'}`,
    sla: 'Робочий час Балі, UTC+8',
    videoCall: 'Відеодзвінок',
    note: 'Це контакти самого забудовника. Balinsky у переговорах і угоді участі не бере.',
  },
} as const

// Accept either a single manager (legacy callsites) or an array of
// them — many developers have 2–3 people on rotation and visitors
// should see all of them on the page.
// Прямые каналы оператора объекта. `telegram` в базе может лежать как
// полной ссылкой, так и одним хэндлом — нормализуем оба варианта.
function contactUrls(m: ManagerItem): { tgUrl: string | null; waUrl: string | null } {
  const handle = (m.telegramHandle ?? '').replace(/^@/, '').trim()
  const raw = m.telegram?.trim() ?? ''
  const tgUrl = raw
    ? (raw.startsWith('http') ? raw : `https://t.me/${raw.replace(/^@/, '')}`)
    : handle ? `https://t.me/${handle}` : null
  const waDigits = (m.whatsapp ?? '').replace(/[^\d]/g, '')
  const waUrl = waDigits.length >= 8 ? `https://wa.me/${waDigits}` : null
  return { tgUrl, waUrl }
}

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
  const lang: Lang = detectLang(pathname)
  const c = pickCopy(COPY, lang)

  const list = managers && managers.length > 0
    ? managers
    : manager ? [manager] : []
  if (list.length === 0) return null

  // Per-site Cal.com / Calendly link. Set NEXT_PUBLIC_VIDEO_CALL_URL on
  // Vercel to enable. Hidden when missing — better than a dead button.
  const videoUrl = process.env.NEXT_PUBLIC_VIDEO_CALL_URL?.trim() || null

  // Заявок на сайте больше нет — карточка менеджера имеет смысл только
  // если у него есть живой канал связи (Telegram или WhatsApp).
  const renderable = list.filter(m => {
    const { tgUrl, waUrl } = contactUrls(m)
    return !!(tgUrl || waUrl)
  })
  if (renderable.length === 0) return null

  const heading = renderable.length > 1 ? c.headingMany : c.heading

  return (
    <section id="kontakty-operatora" className="mb-10 scroll-mt-24">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-2">
        {heading}
      </h2>
      {/* Прямо под заголовком — кто именно на том конце. Balinsky не
          собирает заявки и не ведёт переговоры: посетитель пишет
          оператору объекта напрямую. */}
      <p className="mb-4 max-w-[68ch] text-[13px] leading-[1.6] text-[var(--color-text-muted)]">
        {c.note}
      </p>
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
  note: string
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
  // Silent fallback to the RU value when an EN counterpart isn't
  // filled in Airtable yet — manager cards already render fine in
  // mixed locales and a literal "Name En" placeholder would look odd.
  const displayName = lang !== 'ru' && m.nameEn ? m.nameEn : m.name
  const displayLanguages = lang !== 'ru' && m.languagesEn && m.languagesEn.length > 0
    ? m.languagesEn
    : m.languages

  const { tgUrl, waUrl } = contactUrls(m)

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
            {lang === 'ru' && displayLanguages.length > 0 && (
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
        {tgUrl && (
          <a
            href={tgUrl}
            target="_blank"
            rel="noopener nofollow"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[14px] font-medium no-underline transition-colors"
          >
            <Send size={16} strokeWidth={1.6} /> Telegram
          </a>
        )}
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener nofollow"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full border border-[var(--color-border)] bg-white hover:bg-[var(--color-search-bg)] text-[#111827] text-[14px] font-medium no-underline transition-colors"
          >
            <MessageCircle size={16} strokeWidth={1.6} /> WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
