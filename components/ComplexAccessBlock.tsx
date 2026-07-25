// Presentational block: traffic-aware drive times from a complex to key Bali
// hubs + nearest beach. Server Component (no 'use client'). Renders nothing
// when there's no usable data. Data from lib/complex-access.ts.
import { Plane, Car, Waves } from 'lucide-react'
import type { ComplexAccess } from '@/lib/complex-access'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: { title: 'Как добраться', airport: 'Аэропорт', canggu: 'Чангу', seminyak: 'Семиньяк', ubud: 'Убуд', uluwatu: 'Улувату', min: 'мин', km: 'км', beach: 'До пляжа' },
  en: { title: 'Getting there', airport: 'Airport', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', min: 'min', km: 'km', beach: 'Nearest beach' },
  id: { title: 'Cara ke sini', airport: 'Bandara', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', min: 'mnt', km: 'km', beach: 'Pantai terdekat' },
  fr: { title: 'Accès', airport: 'Aéroport', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', min: 'min', km: 'km', beach: 'Plage la plus proche' },
  de: { title: 'Anfahrt', airport: 'Flughafen', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', min: 'Min.', km: 'km', beach: 'Nächster Strand' },
  zh: { title: '交通', airport: '机场', canggu: '张古', seminyak: '水明漾', ubud: '乌布', uluwatu: '乌鲁瓦图', min: '分钟', km: '公里', beach: '最近海滩' },
  nl: { title: 'Bereikbaarheid', airport: 'Luchthaven', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', min: 'min', km: 'km', beach: 'Dichtstbijzijnde strand' },
  ban: { title: 'Akses', airport: 'Bandara', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', min: 'mnt', km: 'km', beach: 'Pasih paek' },
  pl: { title: 'Dojazd', airport: 'Lotnisko', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', min: 'min', km: 'km', beach: 'Najbliższa plaża' },
  uk: { title: 'Як дістатися', airport: 'Аеропорт', canggu: 'Чангу', seminyak: 'Семіньяк', ubud: 'Убуд', uluwatu: 'Улувату', min: 'хв', km: 'км', beach: 'До пляжу' },
} as const

type Props = {
  access: ComplexAccess
  lang: Lang
}

export function ComplexAccessBlock({ access, lang }: Props) {
  const t = pickCopy(COPY, lang)
  const rows = [
    { key: 'airport', label: t.airport, min: access.drive_airport_min, Icon: Plane },
    { key: 'canggu', label: t.canggu, min: access.drive_canggu_min, Icon: Car },
    { key: 'seminyak', label: t.seminyak, min: access.drive_seminyak_min, Icon: Car },
    { key: 'ubud', label: t.ubud, min: access.drive_ubud_min, Icon: Car },
    { key: 'uluwatu', label: t.uluwatu, min: access.drive_uluwatu_min, Icon: Car },
  ].filter((r) => r.min != null)

  const hasBeach = access.nearest_beach_name != null && access.nearest_beach_km != null
  if (rows.length === 0 && !hasBeach) return null

  return (
    <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <h3 className="mb-3 text-[15px] font-semibold text-[#111827]">{t.title}</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {rows.map(({ key, label, min, Icon }) => (
          <div key={key} className="flex min-w-0 items-center gap-1.5">
            <Icon size={16} className="shrink-0 text-[var(--color-primary)]" />
            <span className="truncate text-[13px] text-[var(--color-text-muted)]">{label}</span>
            <span className="shrink-0 text-[14px] font-semibold text-[#111827]">
              {min} {t.min}
            </span>
          </div>
        ))}
        {hasBeach && (
          <div className="col-span-2 flex min-w-0 items-center gap-2 sm:col-span-3">
            <Waves size={16} className="shrink-0 text-[var(--color-primary)]" />
            <span className="shrink-0 text-[13px] text-[var(--color-text-muted)]">{t.beach}:</span>
            <span className="truncate text-[14px] font-medium text-[#111827]">
              {access.nearest_beach_name}
            </span>
            <span className="shrink-0 text-[14px] font-semibold text-[#111827]">
              · {access.nearest_beach_km} {t.km}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
