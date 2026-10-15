// Отметка «Подтверждённая доходность» — у объектов комплексов с реальными
// бронями от управляющей (lib/verified-yield.ts).
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: { label: 'Подтверждённая доходность', hint: 'Загрузка взята из реальных броней этого комплекса, а не из витрины Booking' },
  en: { label: 'Verified yield', hint: 'Occupancy comes from this complex’s real bookings, not from Booking listings' },
}

export function VerifiedYieldBadge({ lang, className = '', onPhoto = false }: { lang: Lang; className?: string; onPhoto?: boolean }) {
  const c = pickCopy(COPY, lang)
  // На фото — белая плашка с тенью, иначе зелёный фон теряется на снимке.
  const look = onPhoto
    ? 'bg-white text-[var(--color-primary-pressed)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
    : 'bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]'
  return (
    <span title={c.hint} className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ${look} ${className}`}>
      {c.label}
    </span>
  )
}
