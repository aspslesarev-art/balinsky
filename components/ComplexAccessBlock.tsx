// Presentational block: traffic-aware drive times from a complex to key Bali
// hubs + nearest beach. Server Component (no 'use client'). Renders nothing
// when there's no usable data. Data from lib/complex-access.ts.
import { Plane, Car, Waves, Mountain } from 'lucide-react'
import type { ComplexAccess, Routes } from '@/lib/complex-access'
import { pickCopy, type Lang } from '@/lib/i18n'
import { placeName } from '@/lib/translit'
import { ROUTE_COLOR, type RouteLines } from '@/lib/listing-map'
import { ListingMap } from './ListingMap'
import { LazyMount } from './LazyMount'

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
  /** Карта с маршрутами (макет «Карты», A — 23.10.2026): линии, точка и имя объекта. */
  map?: { lines: RouteLines; lat: number; lng: number; name: string } | null
}

const MINUTES = (sec: number) => Math.round(sec / 60)

export function ComplexAccessBlock({ access, lang, elevationM, routes, map }: Props) {
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

  const color = (key: string) => map ? (ROUTE_COLOR as Record<string, string>)[key] : undefined
  const mapRoutes = map ? rows.flatMap(r => {
    const line = map.lines[r.key as keyof RouteLines]
    return line?.length ? [{ key: r.key, color: color(r.key)!, label: `${r.label} ${r.text} ${t.min}`, line }] : []
  }) : []

  return (
    <div className={`mb-4 rounded-2xl border border-[var(--color-border)] bg-white p-5 ${map ? 'md:p-6' : ''}`}>
      <h3 className="mb-3 text-[15px] font-semibold text-[var(--color-text)]">{t.title}</h3>
      {/* С картой — полосой: куда сколько ехать слева, карта справа (макет «Удобно ли
          там жить?», B — владелец 23.10.2026). */}
      <div className={map && mapRoutes.length > 0 ? 'grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start lg:gap-8' : ''}>
      {map && mapRoutes.length > 0 && (
        <div className="lg:order-last">
          <LazyMount fallback={<div className="h-[320px] rounded-xl bg-[var(--color-search-bg)]" />}>
            <ListingMap lat={map.lat} lng={map.lng} name={map.name} routes={mapRoutes} />
          </LazyMount>
        </div>
      )}
      {map && mapRoutes.length > 0 ? (
        <dl className="divide-y divide-[var(--color-border)]">
          {rows.map(({ key, label, text }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="flex items-center gap-2.5 text-[15px] text-[var(--color-text)]">
                <span aria-hidden className="h-1 w-5 shrink-0 rounded-full" style={{ background: color(key) }} />
                {label}
              </dt>
              <dd className="shrink-0 text-[15px] font-semibold text-[var(--color-text)]">{text} {t.min}</dd>
            </div>
          ))}
          {hasElevation && (
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="flex items-center gap-2.5 text-[15px] text-[var(--color-text)]"><Mountain size={16} className="shrink-0 text-[var(--color-primary)]" />{t.elevation}</dt>
              <dd className="shrink-0 text-[15px] font-semibold text-[var(--color-text)]">{Math.round(elevationM)} {t.m}</dd>
            </div>
          )}
        </dl>
      ) : (
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {rows.map(({ key, label, text, Icon }) => (
          <div key={key} className="flex min-w-0 items-center gap-1.5">
            {color(key)
              ? <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color(key) }} />
              : <Icon size={16} className="shrink-0 text-[var(--color-primary)]" />}
            <span className="truncate text-[13px] text-[var(--color-text-muted)]">{label}</span>
            <span className="shrink-0 text-[14px] font-semibold text-[var(--color-text)]">
              {text} {t.min}
            </span>
          </div>
        ))}
        {hasElevation && (
          <div className="flex min-w-0 items-center gap-1.5">
            <Mountain size={16} className="shrink-0 text-[var(--color-primary)]" />
            <span className="truncate text-[13px] text-[var(--color-text-muted)]">{t.elevation}</span>
            <span className="shrink-0 text-[14px] font-semibold text-[var(--color-text)]">
              {Math.round(elevationM)} {t.m}
            </span>
          </div>
        )}
        {hasBeach && (
          <div className="col-span-2 flex min-w-0 items-center gap-2 sm:col-span-3">
            <Waves size={16} className="shrink-0 text-[var(--color-primary)]" />
            <span className="shrink-0 text-[13px] text-[var(--color-text-muted)]">{t.beach}:</span>
            <span className="truncate text-[14px] font-medium text-[var(--color-text)]">
              {/* Google Places names are stored in Russian; other locales get Latin. */}
              {placeName(access?.nearest_beach_name, lang)}
            </span>
            <span className="shrink-0 text-[14px] font-semibold text-[var(--color-text)]">
              · {access?.nearest_beach_km} {t.km}
            </span>
          </div>
        )}
      </div>
      )}
      </div>

    </div>
  )
}
