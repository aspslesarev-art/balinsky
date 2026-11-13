// Глава страницы виллы (макет «Структура страницы», вариант A, владелец
// 2026-11-11): номер и тема мелко, заголовок крупно, подзаголовок. Главы
// «Проверка» и «Место» - на светлой полосе во всю ширину экрана (тень + clip-path,
// без горизонтальной прокрутки). Строка глав сверху - VillaChapterNav.
import type { ReactNode } from 'react'

export function VillaChapter({ id, no, eyebrow, title, lead, band = false, plain = false, children }: {
  id: string
  no: string
  eyebrow: string
  title?: string
  lead?: string
  band?: boolean
  /** Без строки «03 · Проверка» — на странице ЖК, где глав-разделов нет. */
  plain?: boolean
  children: ReactNode
}) {
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
