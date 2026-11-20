// Отметка «Подтверждённая доходность» — у объектов комплексов с реальными
// бронями от управляющей (lib/verified-yield.ts).
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: { label: 'Подтверждённая доходность', hint: 'Загрузка взята из реальных броней этого комплекса, а не из витрины Booking' },
  en: { label: 'Verified yield', hint: 'Occupancy comes from this complex’s real bookings, not from Booking listings' },
  id: { label: 'Hasil terverifikasi', hint: 'Okupansi diambil dari pemesanan nyata kompleks ini, bukan dari etalase Booking' },
  fr: { label: 'Rendement vérifié', hint: 'Le taux d’occupation provient des réservations réelles de cette résidence, pas des annonces Booking' },
  de: { label: 'Geprüfte Rendite', hint: 'Die Auslastung stammt aus echten Buchungen dieser Anlage, nicht aus Booking-Inseraten' },
  zh: { label: '收益已核实', hint: '入住率来自本项目的真实预订，而非 Booking 上的展示数据' },
  nl: { label: 'Geverifieerd rendement', hint: 'De bezetting komt uit echte boekingen van dit complex, niet uit Booking-advertenties' },
  ban: { label: 'Pikolih sampun kauji', hint: 'Okupansi kaambil saking pesenan sujati kompleks puniki, nenten saking etalase Booking' },
  pl: { label: 'Potwierdzona rentowność', hint: 'Obłożenie pochodzi z rzeczywistych rezerwacji tego kompleksu, a nie z ofert w Booking' },
  uk: { label: 'Підтверджена дохідність', hint: 'Завантаженість узята з реальних бронювань цього комплексу, а не з вітрини Booking' },
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
