// Глава страницы виллы (макет «Структура страницы», вариант A, владелец
// 2026-11-11): номер и тема мелко, заголовок крупно, подзаголовок. Главы
// «Проверка» и «Место» - на светлой полосе во всю ширину экрана (тень + clip-path,
// без горизонтальной прокрутки). Строка глав сверху - VillaChapterNav.
import type { ReactNode } from 'react'

export function VillaChapter({ id, no, eyebrow, title, lead, band = false, plain = false, journal = false, children }: {
  id: string
  no: string
  eyebrow: string
  title?: string
  lead?: string
  band?: boolean
  /** Без строки «03 · Проверка» — на странице ЖК, где глав-разделов нет. */
  plain?: boolean
  /** Стиль «Журнал» (макет владельца 19.11.2026): мелкий номер «01», крупный
   *  заголовок и тёмная линия 1px снизу. Заголовок — `title`, иначе `eyebrow`. */
  journal?: boolean
  children: ReactNode
}) {
  if (journal) return (
    <section id={id} data-chapter={id} className="scroll-mt-[136px] flex flex-col gap-5 md:gap-8">
      <div className="flex items-baseline gap-4 border-b border-[#0F1A15] pb-4">
        <span className="text-[13px] tabular-nums text-[#6B7570]">{no}</span>
        <h2 className="m-0 font-display text-[26px] md:text-[32px] font-bold tracking-[-0.02em] leading-[1.15] text-[#0F1A15]">{title ?? eyebrow}</h2>
      </div>
      {lead && <p className="m-0 text-[15px] leading-[1.55] text-[#4A5550]">{lead}</p>}
      {children}
    </section>
  )
  return (
    <section id={id} data-chapter={id}
      className={`scroll-mt-[136px] flex flex-col gap-8 ${band ? 'py-12 lg:py-16 bg-[#F6F8F7] shadow-[0_0_0_100vmax_#F6F8F7] [clip-path:inset(0_-100vmax)]' : 'py-4'}`}>
      <div className="flex flex-col gap-2">
        {!plain && <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">{no} · {eyebrow}</span>}
        {title && <h2 className="m-0 text-[28px] lg:text-[32px] font-semibold tracking-[-0.02em] leading-[1.15] text-[var(--color-text)]">{title}</h2>}
        {lead && <p className="m-0 text-[15px] leading-[1.55] text-[var(--color-text-muted)]">{lead}</p>}
      </div>
      {children}
    </section>
  )
}

/** Белая карточка блока внутри главы. */
export function VillaBlock({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-[#E4E9E6] bg-white p-5 lg:p-6">{children}</div>
}
