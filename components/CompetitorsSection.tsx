'use client'

import { useMemo, useState } from 'react'
import { CompetitorsMap, type CompetitorPoint } from './CompetitorsMap'
import {
  type CompetitorWithDistance,
  groupByLocation,
  summarize,
  summarizeSimilar,
} from '@/lib/competitor-utils'

function fmtUsd(n: number): string {
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') + ' $'
}
function pluralRu(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

export function CompetitorsSection({
  apiKey,
  villa,
  competitors,
  initialRadiusKm = 2,
  minRadiusKm = 0.5,
  maxRadiusKm = 2,
  district,
}: {
  apiKey: string
  villa: { lat: number; lng: number; title: string; bedrooms: number | null; area: number | null }
  competitors: CompetitorWithDistance[]
  initialRadiusKm?: number
  minRadiusKm?: number
  maxRadiusKm?: number
  district: string | null
}) {
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm)

  const filtered = useMemo(
    () => competitors.filter(c => c.distanceKm <= radiusKm),
    [competitors, radiusKm],
  )

  const groups = useMemo(() => groupByLocation(filtered).slice(0, 200), [filtered])
  const stats = useMemo(() => (filtered.length > 0 ? summarize(filtered) : null), [filtered])
  const similar = useMemo(
    () => (filtered.length > 0 ? summarizeSimilar(filtered, { bedrooms: villa.bedrooms, area: villa.area }) : null),
    [filtered, villa.bedrooms, villa.area],
  )

  const points: CompetitorPoint[] = groups.map(g => ({
    id: g.id,
    complex: g.complex,
    address: g.address,
    lat: g.lat,
    lng: g.lng,
    rating: g.rating,
    reviews: g.reviews,
    photo: g.photo,
    url: g.url,
    distanceKm: g.distanceKm,
    unitCount: g.unitCount,
    priceMin: g.priceMin,
    priceMax: g.priceMax,
    priceMedian: g.priceMedian,
    units: g.units.map(u => ({
      id: u.id,
      name: u.name,
      price: u.price,
      bedrooms: u.bedrooms,
      area: u.area,
      url: u.url,
    })),
  }))

  const radiusLabel = radiusKm < 1 ? `${Math.round(radiusKm * 1000)} м` : `${radiusKm} км`

  return (
    <section className="mb-10">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-2">
        Расположение и аренда поблизости
      </h2>
      <div className="text-[14px] text-[var(--color-text-muted)] mb-4">
        {district ? `${district}, ` : ''}Бали, Индонезия · красным — вилла, синим — варианты на Booking.com в радиусе {radiusLabel}
      </div>

      <div className="mb-4 flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white px-5 py-4">
        <div className="text-[13px] font-medium text-[#111827] shrink-0">Радиус</div>
        <input
          type="range"
          min={minRadiusKm}
          max={maxRadiusKm}
          step={0.1}
          value={radiusKm}
          onChange={e => setRadiusKm(Number(e.target.value))}
          className="flex-1 accent-[var(--color-primary)] cursor-pointer"
          aria-label="Радиус поиска конкурентов"
        />
        <div className="text-[14px] font-semibold text-[var(--color-primary-pressed)] tabular-nums shrink-0 w-[56px] text-right">
          {radiusLabel}
        </div>
      </div>

      <CompetitorsMap
        apiKey={apiKey}
        villa={villa}
        competitors={points}
        radiusKm={radiusKm}
      />

      {stats && stats.count > 0 ? (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {similar ? (
              <div className="rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-5">
                <div className="text-[12px] uppercase tracking-wide text-[var(--color-primary-pressed)] mb-1.5 font-medium">
                  Похожие на эту виллу{villa.bedrooms != null ? ` · ${villa.bedrooms} BR` : ''}{similar.matchedByArea ? ` · ~${villa.area} м²` : ''}
                </div>
                <div className="text-[28px] font-semibold text-[#111827] leading-tight">
                  {fmtUsd(similar.median)}<span className="text-[14px] font-normal text-[var(--color-text-muted)]"> / ночь</span>
                </div>
                <div className="text-[13px] text-[var(--color-text-muted)] mt-1">
                  медиана по {similar.count} {pluralRu(similar.count, ['похожему объекту', 'похожим объектам', 'похожим объектам'])}
                </div>
                <div className="text-[12px] text-[var(--color-text-muted)] mt-3">
                  разброс: {fmtUsd(similar.min)} – {fmtUsd(similar.max)} · среднее {fmtUsd(similar.avg)}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-5">
                <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5 font-medium">Похожие на эту виллу</div>
                <div className="text-[14px] text-[var(--color-text-muted)] leading-snug">
                  В радиусе {radiusLabel} нет объектов с такими же характеристиками{villa.bedrooms != null ? ` (${villa.bedrooms} BR${villa.area != null ? `, ~${villa.area} м²` : ''})` : ''}.
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5 font-medium">Все цены поблизости</div>
              <div className="text-[28px] font-semibold text-[#111827] leading-tight">
                {fmtUsd(stats.overall.median)}<span className="text-[14px] font-normal text-[var(--color-text-muted)]"> / ночь</span>
              </div>
              <div className="text-[13px] text-[var(--color-text-muted)] mt-1">
                медиана по {stats.count} {pluralRu(stats.count, ['объекту', 'объектам', 'объектам'])}
              </div>
              <div className="text-[12px] text-[var(--color-text-muted)] mt-3">
                разброс: {fmtUsd(stats.overall.min)} – {fmtUsd(stats.overall.max)}
              </div>
            </div>
          </div>
          {stats.byBedrooms.length > 0 && (
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-3 font-medium">По спальням</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats.byBedrooms.map(g => (
                  <div key={g.label} className="rounded-xl bg-[var(--color-search-bg)] px-3 py-2.5">
                    <div className="text-[12px] text-[var(--color-text-muted)]">{g.label} · {g.count} {pluralRu(g.count, ['объект', 'объекта', 'объектов'])}</div>
                    <div className="text-[16px] font-semibold text-[#111827]">{fmtUsd(g.median)}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{fmtUsd(g.min)} – {fmtUsd(g.max)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 text-[13px] text-[var(--color-text-muted)]">
          В радиусе {radiusLabel} пока нет данных по аренде на Booking.com.
        </div>
      )}
    </section>
  )
}
