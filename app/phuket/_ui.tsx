// Презентационные примитивы лендинга /phuket. Визуальный язык взят с
// главной Balinsky: eyebrow капсом с широким трекингом, лёгкий заголовок
// с отрицательным трекингом, белые карточки со скруглением 2xl и
// границей var(--color-border), зелёные CTA-пилюли.

import { MessageCircle } from 'lucide-react'
import { lineHref, whatsappHref } from './_content'

export function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[1140px] px-5 sm:px-7 lg:px-10">{children}</div>
}

type SectionProps = {
  children: React.ReactNode
  className?: string
  id?: string
}

export function Section({ children, className = '', id }: SectionProps) {
  return (
    <section id={id} className={`py-14 md:py-20 ${className}`}>
      <Container>{children}</Container>
    </section>
  )
}

type SectionHeadProps = {
  eyebrow?: string
  title: string
  sub?: string
  isOnDark?: boolean
}

export function SectionHead({ eyebrow, title, sub, isOnDark = false }: SectionHeadProps) {
  const titleColor = isOnDark ? 'text-white' : 'text-[#0E1A14]'
  const eyebrowColor = isOnDark ? 'text-white/70' : 'text-[var(--color-primary)]'
  const subColor = isOnDark ? 'text-white/80' : 'text-[#4B5563]'
  return (
    <div className="max-w-[820px]">
      {eyebrow && (
        <div className={`text-[11px] md:text-[12px] uppercase tracking-[0.2em] font-semibold mb-4 ${eyebrowColor}`}>
          {eyebrow}
        </div>
      )}
      <h2 className={`text-[26px] md:text-[40px] leading-[1.12] font-light tracking-[-0.02em] ${titleColor}`}>
        {title}
      </h2>
      {sub && <p className={`mt-4 text-[16px] md:text-[18px] leading-[1.55] ${subColor}`}>{sub}</p>}
    </div>
  )
}

/**
 * Пара кнопок брони. Обе ведут к Елене — она держит расписание слотов.
 * `isOnDark` переключает вторичную кнопку на светлую обводку.
 */
export function CtaButtons({ isOnDark = false }: { isOnDark?: boolean }) {
  const secondary = isOnDark
    ? 'border-white/40 text-white hover:bg-white/10'
    : 'border-[var(--color-border)] text-[#0E1A14] hover:bg-[var(--color-search-bg)]'
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <a
        href={whatsappHref()}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-[15px] font-medium hover:bg-[var(--color-primary-pressed)] transition-colors"
      >
        <MessageCircle size={17} strokeWidth={1.8} />
        Забронировать в WhatsApp
      </a>
      <a
        href={lineHref()}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border bg-transparent text-[15px] font-medium transition-colors ${secondary}`}
      >
        <MessageCircle size={17} strokeWidth={1.8} />
        Написать в Line
      </a>
    </div>
  )
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[var(--color-border)] bg-white ${className}`}>{children}</div>
}
