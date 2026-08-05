// Presentational block: traffic-aware drive times from a complex to key Bali
// hubs + nearest beach. Server Component (no 'use client'). Renders nothing
// when there's no usable data. Data from lib/complex-access.ts.
import { Plane, Car, Waves, Mountain } from 'lucide-react'
import type { ComplexAccess, Routes } from '@/lib/complex-access'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: { title: 'Как добраться', airport: 'Аэропорт', canggu: 'Чангу', seminyak: 'Семиньяк', ubud: 'Убуд', uluwatu: 'Улувату', sanur: 'Санур', min: 'мин', km: 'км', beach: 'До пляжа', elevation: 'Высота над морем', m: 'м' },
  en: { title: 'Getting there', airport: 'Airport', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', sanur: 'Sanur', min: 'min', km: 'km', beach: 'Nearest beach', elevation: 'Elevation', m: 'm' },
  id: { title: 'Cara ke sini', airport: 'Bandara', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', sanur: 'Sanur', min: 'mnt', km: 'km', beach: 'Pantai terdekat', elevation: 'Ketinggian', m: 'm' },
  fr: { title: 'Accès', airport: 'Aéroport', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', sanur: 'Sanur', min: 'min', km: 'km', beach: 'Plage la plus proche', elevation: 'Altitude', m: 'm' },
  de: { title: 'Anfahrt', airport: 'Flughafen', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', sanur: 'Sanur', min: 'Min.', km: 'km', beach: 'Nächster Strand', elevation: 'Höhe ü. M.', m: 'm' },
  zh: { title: '交通', airport: '机场', canggu: '张古', seminyak: '水明漾', ubud: '乌布', uluwatu: '乌鲁瓦图', sanur: '沙努尔', min: '分钟', km: '公里', beach: '最近海滩', elevation: '海拔', m: '米' },
  nl: { title: 'Bereikbaarheid', airport: 'Luchthaven', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', sanur: 'Sanur', min: 'min', km: 'km', beach: 'Dichtstbijzijnde strand', elevation: 'Hoogte', m: 'm' },
  ban: { title: 'Akses', airport: 'Bandara', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', sanur: 'Sanur', min: 'mnt', km: 'km', beach: 'Pasih paek', elevation: 'Tegeh', m: 'm' },
  pl: { title: 'Dojazd', airport: 'Lotnisko', canggu: 'Canggu', seminyak: 'Seminyak', ubud: 'Ubud', uluwatu: 'Uluwatu', sanur: 'Sanur', min: 'min', km: 'km', beach: 'Najbliższa plaża', elevation: 'Wysokość n.p.m.', m: 'm' },
  uk: { title: 'Як дістатися', airport: 'Аеропорт', canggu: 'Чангу', seminyak: 'Семіньяк', ubud: 'Убуд', uluwatu: 'Улувату', sanur: 'Санур', min: 'хв', km: 'км', beach: 'До пляжу', elevation: 'Висота над морем', m: 'м' },
} as const

type Props = {
  /**
   * Complex-only logistics (nearest beach, the legacy drive times). Villas and
   * apartments have no such row, so this is optional — they render from
   * `routes` and `elevationM` alone.
   */
  access?: ComplexAccess | null
  lang: Lang
  /** Metres above sea level; the row hides itself when we have no measurement. */
  elevationM?: number | null
  /**
   * Google Routes readings (traffic + clear road). When present they win over
   * the older complex_access numbers, which were measured once at a single
   * unlabelled hour and read up to half an hour longer for the same trip.
   */
  routes?: Routes | null
}

const MINUTES = (sec: number) => Math.round(sec / 60)

export function ComplexAccessBlock({ access, lang, elevationM, routes }: Props) {
  const t = pickCopy(COPY, lang)
  // Both numbers when the road makes a real difference, one when it doesn't:
  // "45–56" says something, "45–46" is noise.
  const range = (leg: { s: number; static_s: number | null } | undefined) => {
    if (!leg) return null
    const traffic = MINUTES(leg.s)
    const free = leg.static_s != null ? MINUTES(leg.static_s) : null
    if (free == null || traffic - free < 3) return `${traffic}`
    return `${free}–${traffic}`
  }

  const rows = routes
    ? [
        { key: 'airport', label: t.airport, text: range(routes.airport), Icon: Plane },
        { key: 'canggu', label: t.canggu, text: range(routes.canggu), Icon: Car },
        { key: 'ubud', label: t.ubud, text: range(routes.ubud), Icon: Car },
        { key: 'uluwatu', label: t.uluwatu, text: range(routes.uluwatu), Icon: Car },
        { key: 'sanur', label: t.sanur, text: range(routes.sanur), Icon: Car },
      ].filter((r) => r.text != null)
    : [
        { key: 'airport', label: t.airport, text: access?.drive_airport_min?.toString() ?? null, Icon: Plane },
        { key: 'canggu', label: t.canggu, text: access?.drive_canggu_min?.toString() ?? null, Icon: Car },
        { key: 'seminyak', label: t.seminyak, text: access?.drive_seminyak_min?.toString() ?? null, Icon: Car },
        { key: 'ubud', label: t.ubud, text: access?.drive_ubud_min?.toString() ?? null, Icon: Car },
        { key: 'uluwatu', label: t.uluwatu, text: access?.drive_uluwatu_min?.toString() ?? null, Icon: Car },
      ].filter((r) => r.text != null)

  const hasBeach = access?.nearest_beach_name != null && access?.nearest_beach_km != null
  const hasElevation = elevationM != null
  if (rows.length === 0 && !hasBeach && !hasElevation) return null

  return (
    <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <h3 className="mb-3 text-[15px] font-semibold text-[#111827]">{t.title}</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {rows.map(({ key, label, text, Icon }) => (
          <div key={key} className="flex min-w-0 items-center gap-1.5">
            <Icon size={16} className="shrink-0 text-[var(--color-primary)]" />
            <span className="truncate text-[13px] text-[var(--color-text-muted)]">{label}</span>
            <span className="shrink-0 text-[14px] font-semibold text-[#111827]">
              {text} {t.min}
            </span>
          </div>
        ))}
        {hasElevation && (
          <div className="flex min-w-0 items-center gap-1.5">
            <Mountain size={16} className="shrink-0 text-[var(--color-primary)]" />
            <span className="truncate text-[13px] text-[var(--color-text-muted)]">{t.elevation}</span>
            <span className="shrink-0 text-[14px] font-semibold text-[#111827]">
              {Math.round(elevationM)} {t.m}
            </span>
          </div>
        )}
        {hasBeach && (
          <div className="col-span-2 flex min-w-0 items-center gap-2 sm:col-span-3">
            <Waves size={16} className="shrink-0 text-[var(--color-primary)]" />
            <span className="shrink-0 text-[13px] text-[var(--color-text-muted)]">{t.beach}:</span>
            <span className="truncate text-[14px] font-medium text-[#111827]">
              {access?.nearest_beach_name}
            </span>
            <span className="shrink-0 text-[14px] font-semibold text-[#111827]">
              · {access?.nearest_beach_km} {t.km}
            </span>
          </div>
        )}
      </div>

    </div>
  )
}
