// Отметка «Подтверждённая доходность» — у объектов, чей комплекс сам
// сдаётся на Booking (lib/verified-yield.ts).
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: { label: 'Подтверждённая доходность', hint: 'Доходность посчитана по реальной загрузке и цене этого комплекса на Booking' },
  en: { label: 'Verified yield', hint: 'Yield is based on this complex’s real occupancy and rates on Booking' },
}

export function VerifiedYieldBadge({ lang, className = '' }: { lang: Lang; className?: string }) {
  const c = pickCopy(COPY, lang)
  return (
    <span title={c.hint} className={`inline-flex items-center rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-primary-pressed)] ${className}`}>
      {c.label}
    </span>
  )
}
