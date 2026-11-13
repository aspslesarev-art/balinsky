'use client'

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { X, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { InlinePrice } from './InlinePrice'
import { pickCopy, type Lang } from '@/lib/i18n'
import { pluralRu } from '@/lib/plural-ru'

// ─── Data types (serialisable from Server Component) ─────────────

export type CompareVilla = {
  title: string
  photo: string | null
  bedrooms: number | null
  areaSqm: number | null
  landSqm: number | null
  priceUsd: number | null
  leaseYears: number | null
  district: string | null
  lat: number | null
  lng: number | null
  hasPool: boolean | null
}

export type CompareSaleItem = {
  name: string | null
  photo: string | null
  bedrooms: number
  buildingM2: number | null
  landM2: number | null
  priceUsd: number
  leaseYears: number | null
  lat: number
  lng: number
  distanceKm: number
  url: string
  source: string
  catalog?: boolean
}

export type CompareDailyItem = {
  id: string
  name: string
  photo: string | null
  priceUsd: number
  bedrooms: number | null
  areaSqm: number | null
  occupancy: number | null
  rating: number | null
  reviews: number | null
  distanceKm: number
  url: string | null
  source: 'booking' | 'airbnb'
  lat: number
  lng: number
}

export type CompareMonthlyItem = {
  title: string
  photo: string | null
  bedrooms: number
  rentMonthUsd: number
  buildingM2: number | null
  district: string | null
  distanceKm: number | null
  url: string | null
  lat: number | null
  lng: number | null
  hasPool?: boolean
}

export type CompareData = {
  villa: CompareVilla
  sale: CompareSaleItem[]
  daily: CompareDailyItem[]
  monthly: CompareMonthlyItem[]
  villaAdrUsd: number | null
  villaOccupancy: number | null
  villaMonthlyUsd: number | null
  searchRadiusKm: number
}

// ─── Copy ────────────────────────────────────────────────────────

const COPY = {
  ru: {
    heading: 'Сравнение с соседями',
    close: 'Закрыть',
    tabSale: 'Продаётся рядом',
    tabDaily: 'Посуточно',
    tabMonthly: 'Помесячно',
    thisVilla: 'Эта вилла',
    price: 'Цена',
    area: 'Площадь',
    bedrooms: 'Спальни',
    land: 'Земля',
    lease: 'Аренда',
    priceM2: 'Цена/м²',
    source: 'Источник',
    priceNight: 'Цена/ночь',
    occupancy: 'Загрузка',
    incomeYear: 'Доход/год',
    payback: 'Окупаемость',
    priceMonth: 'Цена/мес',
    pool: 'Бассейн',
    district: 'Район',
    noPhoto: 'нет фото',
    km: 'км',
    m2: 'м²',
    years: (n: number) => `${n} ${pluralRu(n, ['год', 'года', 'лет'])}`,
    approxYears: (n: number) => `≈ ${n} ${pluralRu(n, ['год', 'года', 'лет'])}`,
    radius: (r: number, d: string | null) => `${d ?? ''} · радиус ${String(Math.round(r * 10) / 10).replace('.', ',')} км`,
    footer: 'Источники: Booking, Airbnb, rumah123.com, каталог Balinsky',
    yes: '✓',
    no: '—',
    na: '—',
    studio: 'студия',
    prev: 'Назад',
    next: 'Вперёд',
  },
  en: {
    heading: 'Comparison with neighbours',
    close: 'Close',
    tabSale: 'For sale nearby',
    tabDaily: 'Daily rental',
    tabMonthly: 'Monthly rental',
    thisVilla: 'This villa',
    price: 'Price',
    area: 'Area',
    bedrooms: 'Bedrooms',
    land: 'Land',
    lease: 'Lease',
    priceM2: 'Price/m²',
    source: 'Source',
    priceNight: 'Price/night',
    occupancy: 'Occupancy',
    incomeYear: 'Income/year',
    payback: 'Payback',
    priceMonth: 'Price/mo',
    pool: 'Pool',
    district: 'District',
    noPhoto: 'no photo',
    km: 'km',
    m2: 'm²',
    years: (n: number) => `${n} yr${n === 1 ? '' : 's'}`,
    approxYears: (n: number) => `≈ ${n} yr${n === 1 ? '' : 's'}`,
    radius: (r: number, d: string | null) => `${d ?? ''} · ${Math.round(r * 10) / 10} km radius`,
    footer: 'Sources: Booking, Airbnb, rumah123.com, Balinsky catalog',
    yes: '✓',
    no: '—',
    na: '—',
    studio: 'studio',
    prev: 'Back',
    next: 'Next',
  },
} as const

// ─── Helpers ─────────────────────────────────────────────────────

function dec(x: number, lang: Lang): string {
  const s = x < 10 ? x.toFixed(1) : String(Math.round(x))
  return lang === 'ru' || lang === 'uk' ? s.replace('.', ',') : s
}

// ─── Sub-components ──────────────────────────────────────────────

function Thumb({ photo, label, sub, highlighted, noPhotoText }: {
  photo: string | null; label: string; sub: string; highlighted?: boolean; noPhotoText: string
}) {
  const border = highlighted ? 'border-2 border-[var(--color-primary)]' : 'border border-[var(--color-border)]'
  return (
    <div className={`${border} rounded-[10px] overflow-hidden`}>
      <div className="relative aspect-[3/2] bg-[var(--color-search-bg)]">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={label} loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[12px] text-[var(--color-text-muted)]">{noPhotoText}</span>
        )}
      </div>
      <div className="px-2 py-1.5">
        <div className={`text-[12px] font-semibold leading-snug line-clamp-1 ${highlighted ? 'text-[var(--color-primary)]' : ''}`}>{label}</div>
        <div className="text-[11px] text-[var(--color-text-muted)] line-clamp-1">{sub}</div>
      </div>
    </div>
  )
}

function MetricLabel({ children }: { children: ReactNode }) {
  return <div className="sticky left-0 z-[2] bg-white py-2.5 pl-4 md:pl-7 pr-2 text-[13px] text-[var(--color-text-muted)] leading-snug">{children}</div>
}

function CellVal({ children, highlighted }: { children: ReactNode; highlighted?: boolean }) {
  const base = 'py-2.5 px-3 text-[14px] leading-snug'
  if (highlighted) return <div className={`${base} sticky left-[124px] z-[1] font-semibold bg-[var(--color-primary-soft)]`}>{children}</div>
  return <div className={base}>{children}</div>
}

// Настоящая подложка (Esri World Street Map, как в StaticMap) вместо сетки: тайлы обычными
// <img>, без библиотеки. Зум подбирается так, чтобы все точки влезли в окно.
const MAP_TILE = 256
function mapWorldPx(lat: number, lng: number, z: number) {
  const n = 2 ** z * MAP_TILE
  const s = Math.sin((lat * Math.PI) / 180)
  return { x: ((lng + 180) / 360) * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n }
}

function MiniMap({ pins, radius, district, lang }: {
  pins: { lat: number; lng: number; label: string; main?: boolean }[]
  radius: number; district: string | null; lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  if (pins.length === 0) return null
  const H = 280
  const PAD = 28
  const lats = pins.map(p => p.lat)
  const lngs = pins.map(p => p.lng)
  const cLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  let z = 16
  if (w > 0) {
    for (; z > 10; z--) {
      const a = mapWorldPx(Math.max(...lats), Math.min(...lngs), z)
      const b = mapWorldPx(Math.min(...lats), Math.max(...lngs), z)
      if (b.x - a.x <= w - PAD * 2 && b.y - a.y <= H - PAD * 2) break
    }
  }
  const ctr = mapWorldPx(cLat, cLng, z)
  const x0 = ctr.x - w / 2
  const y0 = ctr.y - H / 2
  const tiles: { key: string; src: string; left: number; top: number }[] = []
  if (w > 0) {
    const n = 2 ** z
    for (let tx = Math.floor(x0 / MAP_TILE); tx <= Math.floor((x0 + w) / MAP_TILE); tx++) {
      for (let ty = Math.floor(y0 / MAP_TILE); ty <= Math.floor((y0 + H) / MAP_TILE); ty++) {
        if (ty < 0 || ty >= n) continue
        tiles.push({
          key: `${tx}/${ty}`,
          src: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${ty}/${((tx % n) + n) % n}`,
          left: tx * MAP_TILE - x0, top: ty * MAP_TILE - y0,
        })
      }
    }
  }
  // Главную точку рисуем последней, чтобы соседи её не перекрывали.
  const ordered = [...pins].sort((a, b) => Number(!!a.main) - Number(!!b.main))

  return (
    <div ref={box} className="relative mt-4 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-search-bg)]" style={{ height: H }}>
      {tiles.map(t => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={t.key} src={t.src} alt="" aria-hidden draggable={false} loading="lazy"
          className="pointer-events-none absolute max-w-none select-none" style={{ left: t.left, top: t.top, width: MAP_TILE, height: MAP_TILE }} />
      ))}
      <div className="pointer-events-none absolute inset-0 bg-white/30" aria-hidden />
      {w > 0 && ordered.map((p, i) => {
        const pt = mapWorldPx(p.lat, p.lng, z)
        return (
          <div key={i} title={p.label} className={`absolute ${p.main ? 'z-[2]' : 'z-[1]'}`}
            style={{ left: pt.x - x0, top: pt.y - y0, transform: 'translate(-50%, -50%)' }}>
            <div className={`rounded-full border-2 border-white ${p.main ? 'h-5 w-5 bg-[var(--color-primary)]' : 'h-3.5 w-3.5 bg-[var(--color-text)]'}`}
              style={{ boxShadow: '0 1px 2px rgb(0 0 0/.12), 0 2px 6px rgb(0 0 0/.18)' }} />
            {p.main && (
              <span className="absolute left-1/2 top-[calc(100%+4px)] -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-[12px] font-semibold text-[var(--color-primary-pressed)]"
                style={{ boxShadow: '0 1px 2px rgb(0 0 0/.06), 0 2px 8px rgb(0 0 0/.10)' }}>{p.label}</span>
            )}
          </div>
        )
      })}
      <span className="absolute left-2 bottom-2 z-[3] rounded-md bg-white/90 px-2 py-0.5 text-[12px] text-[var(--color-text-soft)]">
        {c.radius(radius, district)}
      </span>
      <span className="absolute right-1 bottom-1 z-[3] rounded bg-white/80 px-1 text-[10px] text-[var(--color-text-muted)]">© Esri</span>
    </div>
  )
}

// ─── Gallery lightbox ────────────────────────────────────────────

function Gallery({ photos, name, onClose }: { photos: { src: string; alt: string }[]; name: string; onClose: () => void }) {
  const [idx, setIdx] = useState(0)
  const cur = photos[idx]
  if (!cur) return null
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-[rgb(16_24_20/.94)]">
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
        <X size={18} />
      </button>
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[16px] font-semibold text-white">{name}</span>
          <span className="text-[14px] text-white/50">{idx + 1} / {photos.length}</span>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white disabled:opacity-30">
            <ChevronLeft size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cur.src} alt={cur.alt} className="max-h-[60vh] max-w-[70vw] rounded-xl object-contain" />
          <button type="button" onClick={() => setIdx(i => Math.min(photos.length - 1, i + 1))} disabled={idx === photos.length - 1}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white disabled:opacity-30">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex gap-2">
          {photos.map((_, i) => (
            <div key={i} className={`h-2 w-2 rounded-full ${i === idx ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab content builders ────────────────────────────────────────

const COL_W = 150

function SaleTab({ villa, comps, lang }: { villa: CompareVilla; comps: CompareSaleItem[]; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const items = comps
  if (items.length === 0) return null

  const villaM2 = villa.areaSqm && villa.priceUsd ? Math.round(villa.priceUsd / villa.areaSqm) : null

  type Row = { label: string; villa: ReactNode; values: ReactNode[] }
  const rows: Row[] = [
    { label: c.price, villa: villa.priceUsd ? <InlinePrice usd={villa.priceUsd} lang={lang} approx={false} /> : c.na, values: items.map(i => <InlinePrice key={i.url} usd={i.priceUsd} lang={lang} approx={false} />) },
    { label: c.area, villa: villa.areaSqm ? `${villa.areaSqm} ${c.m2}` : c.na, values: items.map(i => i.buildingM2 ? `${i.buildingM2} ${c.m2}` : c.na) },
    { label: c.bedrooms, villa: villa.bedrooms != null ? (villa.bedrooms === 0 ? c.studio : String(villa.bedrooms)) : c.na, values: items.map(i => i.bedrooms === 0 ? c.studio : String(i.bedrooms)) },
    { label: c.land, villa: villa.landSqm ? `${villa.landSqm} ${c.m2}` : c.na, values: items.map(i => i.landM2 ? `${i.landM2} ${c.m2}` : c.na) },
    { label: c.lease, villa: villa.leaseYears ? c.years(villa.leaseYears) : c.na, values: items.map(i => i.leaseYears ? c.years(i.leaseYears) : c.na) },
    { label: c.priceM2, villa: villaM2 ? <InlinePrice usd={villaM2} lang={lang} approx={false} /> : c.na, values: items.map(i => i.buildingM2 ? <InlinePrice usd={Math.round(i.priceUsd / i.buildingM2)} lang={lang} approx={false} /> : c.na) },
    { label: c.source, villa: 'Balinsky', values: items.map(i => i.catalog ? 'Balinsky' : i.source) },
  ]

  const cols = items.length + 1
  const pins: { lat: number; lng: number; label: string; main?: boolean }[] = []
  if (villa.lat != null && villa.lng != null) pins.push({ lat: villa.lat, lng: villa.lng, label: c.thisVilla, main: true })
  items.forEach(i => { if (i.lat && i.lng) pins.push({ lat: i.lat, lng: i.lng, label: i.name ?? `${i.buildingM2 ?? '?'} ${c.m2}` }) })

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto -mx-4 md:-mx-7 pr-4 md:pr-7">
        <div style={{ display: 'grid', gridTemplateColumns: `124px repeat(${cols}, ${COL_W}px)` }}>
          <div className="sticky left-0 z-[2] bg-white pl-4 md:pl-7" />
          <div className="sticky left-[124px] z-[1] bg-white px-1 pb-3"><Thumb photo={villa.photo} label={c.thisVilla} sub={villa.title} highlighted noPhotoText={c.noPhoto} /></div>
          {items.map((item, i) => (
            <div key={i} className="px-1 pb-3">
              <Thumb photo={item.photo} label={item.name ?? `${item.buildingM2 ?? '?'} ${c.m2}`} sub={`${dec(item.distanceKm, lang)} ${c.km} · ${item.catalog ? 'Balinsky' : item.source}`} noPhotoText={c.noPhoto} />
            </div>
          ))}
          {rows.map((row, ri) => (
            <div key={ri} className="contents">
              <MetricLabel>{row.label}</MetricLabel>
              <CellVal highlighted>{row.villa}</CellVal>
              {row.values.map((v, vi) => <CellVal key={vi}>{v}</CellVal>)}
            </div>
          ))}
        </div>
      </div>
      {pins.length > 1 && <MiniMap pins={pins} radius={Math.max(...items.filter(i => i.lat && i.lng).map(i => i.distanceKm), 1)} district={villa.district} lang={lang} />}
    </div>
  )
}

function DailyTab({ villa, comps, villaAdr, villaOcc, lang }: {
  villa: CompareVilla; comps: CompareDailyItem[]; villaAdr: number | null; villaOcc: number | null; lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const items = comps
  if (items.length === 0) return null

  const villaIncomeYear = villaAdr && villaOcc ? Math.round(villaAdr * 365 * (villaOcc / 100) * 0.7) : null
  const villaPaybackYears = villaIncomeYear && villa.priceUsd ? Math.round(villa.priceUsd / villaIncomeYear) : null

  type Row = { label: string; villa: ReactNode; values: ReactNode[] }
  const rows: Row[] = [
    { label: c.priceNight, villa: villaAdr ? <InlinePrice usd={villaAdr} lang={lang} approx={false} /> : c.na, values: items.map(i => <InlinePrice key={i.id} usd={i.priceUsd} lang={lang} approx={false} />) },
    { label: c.occupancy, villa: villaOcc ? `~${villaOcc}%` : c.na, values: items.map(i => i.occupancy ? `${Math.round(i.occupancy)}%` : c.na) },
    { label: c.bedrooms, villa: villa.bedrooms != null ? (villa.bedrooms === 0 ? c.studio : String(villa.bedrooms)) : c.na, values: items.map(i => i.bedrooms != null ? (i.bedrooms === 0 ? c.studio : String(i.bedrooms)) : c.na) },
    { label: c.area, villa: villa.areaSqm ? `${villa.areaSqm} ${c.m2}` : c.na, values: items.map(i => i.areaSqm ? `${Math.round(i.areaSqm)} ${c.m2}` : c.na) },
    { label: c.incomeYear, villa: villaIncomeYear ? <>≈ <InlinePrice usd={villaIncomeYear} lang={lang} approx={false} /></> : c.na, values: items.map(() => c.na) },
    { label: c.payback, villa: villaPaybackYears ? c.approxYears(villaPaybackYears) : c.na, values: items.map(() => c.na) },
  ]

  const cols = items.length + 1
  const pins: { lat: number; lng: number; label: string; main?: boolean }[] = []
  if (villa.lat != null && villa.lng != null) pins.push({ lat: villa.lat, lng: villa.lng, label: c.thisVilla, main: true })
  items.forEach(i => { if (i.lat && i.lng) pins.push({ lat: i.lat, lng: i.lng, label: i.name.split(' ').slice(0, 2).join(' ') }) })

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto -mx-4 md:-mx-7 pr-4 md:pr-7">
        <div style={{ display: 'grid', gridTemplateColumns: `124px repeat(${cols}, ${COL_W}px)` }}>
          <div className="sticky left-0 z-[2] bg-white pl-4 md:pl-7" />
          <div className="sticky left-[124px] z-[1] bg-white px-1 pb-3"><Thumb photo={villa.photo} label={c.thisVilla} sub={villa.title} highlighted noPhotoText={c.noPhoto} /></div>
          {items.map((item, i) => (
            <div key={i} className="px-1 pb-3">
              <Thumb
                photo={item.photo}
                label={item.name.length > 20 ? item.name.slice(0, 18) + '…' : item.name}
                sub={`${dec(item.distanceKm, lang)} ${c.km} · ${item.source === 'airbnb' ? 'Airbnb' : 'Booking'}`}
                noPhotoText={c.noPhoto}
              />
            </div>
          ))}
          {rows.map((row, ri) => (
            <div key={ri} className="contents">
              <MetricLabel>{row.label}</MetricLabel>
              <CellVal highlighted>{row.villa}</CellVal>
              {row.values.map((v, vi) => <CellVal key={vi}>{v}</CellVal>)}
            </div>
          ))}
        </div>
      </div>
      {pins.length > 1 && <MiniMap pins={pins} radius={Math.max(...items.filter(i => i.lat && i.lng).map(i => i.distanceKm), 1)} district={villa.district} lang={lang} />}
    </div>
  )
}

function MonthlyTab({ villa, comps, villaMonthly, lang }: {
  villa: CompareVilla; comps: CompareMonthlyItem[]; villaMonthly: number | null; lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const items = comps
  if (items.length === 0) return null

  const villaIncomeYear = villaMonthly ? Math.round(villaMonthly * 11 * 0.9) : null

  type Row = { label: string; villa: ReactNode; values: ReactNode[] }
  const rows: Row[] = [
    { label: c.priceMonth, villa: villaMonthly ? <InlinePrice usd={villaMonthly} lang={lang} approx={false} /> : c.na, values: items.map(i => <InlinePrice key={i.title} usd={i.rentMonthUsd} lang={lang} approx={false} />) },
    { label: c.bedrooms, villa: villa.bedrooms != null ? (villa.bedrooms === 0 ? c.studio : String(villa.bedrooms)) : c.na, values: items.map(i => i.bedrooms === 0 ? c.studio : String(i.bedrooms)) },
    { label: c.pool, villa: villa.hasPool ? c.yes : villa.hasPool === false ? c.no : c.na, values: items.map(i => i.hasPool ? c.yes : i.hasPool === false ? c.no : c.na) },
    { label: c.district, villa: villa.district ?? c.na, values: items.map(i => i.district ?? c.na) },
    { label: c.incomeYear, villa: villaIncomeYear ? <>≈ <InlinePrice usd={villaIncomeYear} lang={lang} approx={false} /></> : c.na, values: items.map(() => c.na) },
  ]

  const cols = items.length + 1
  const pins: { lat: number; lng: number; label: string; main?: boolean }[] = []
  if (villa.lat != null && villa.lng != null) pins.push({ lat: villa.lat, lng: villa.lng, label: c.thisVilla, main: true })
  items.forEach(i => { if (i.lat != null && i.lng != null) pins.push({ lat: i.lat, lng: i.lng, label: i.title.split(' ').slice(0, 2).join(' ') }) })

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto -mx-4 md:-mx-7 pr-4 md:pr-7">
        <div style={{ display: 'grid', gridTemplateColumns: `124px repeat(${cols}, ${COL_W}px)` }}>
          <div className="sticky left-0 z-[2] bg-white pl-4 md:pl-7" />
          <div className="sticky left-[124px] z-[1] bg-white px-1 pb-3"><Thumb photo={villa.photo} label={c.thisVilla} sub={villa.title} highlighted noPhotoText={c.noPhoto} /></div>
          {items.map((item, i) => (
            <div key={i} className="px-1 pb-3">
              <Thumb photo={item.photo} label={item.title.length > 20 ? item.title.slice(0, 18) + '…' : item.title} sub={item.district ?? ''} noPhotoText={c.noPhoto} />
            </div>
          ))}
          {rows.map((row, ri) => (
            <div key={ri} className="contents">
              <MetricLabel>{row.label}</MetricLabel>
              <CellVal highlighted>{row.villa}</CellVal>
              {row.values.map((v, vi) => <CellVal key={vi}>{v}</CellVal>)}
            </div>
          ))}
        </div>
      </div>
      {pins.length > 1 && <MiniMap pins={pins} radius={3} district={villa.district} lang={lang} />}
    </div>
  )
}

// ─── Main popup ──────────────────────────────────────────────────

type Tab = 'sale' | 'daily' | 'monthly'

export function NeighborComparePopup({ data, lang, onClose, initialTab, overrideAdr, overrideOcc, overrideMonthly }: {
  data: CompareData; lang: Lang; onClose: () => void; initialTab?: Tab
  overrideAdr?: number; overrideOcc?: number; overrideMonthly?: number
}) {
  const c = pickCopy(COPY, lang)

  const available: { key: Tab; label: string; count: number }[] = []
  if (data.sale.length > 0) available.push({ key: 'sale', label: c.tabSale, count: data.sale.length })
  if (data.daily.length > 0) available.push({ key: 'daily', label: c.tabDaily, count: data.daily.length })
  if (data.monthly.length > 0) available.push({ key: 'monthly', label: c.tabMonthly, count: data.monthly.length })

  const startTab = initialTab && available.some(t => t.key === initialTab) ? initialTab : available[0]?.key ?? 'sale'
  const [tab, setTab] = useState<Tab>(startTab)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])
  useEffect(() => {
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onKey])

  if (available.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[rgb(16_24_20/.55)]" />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={c.heading}
        onClick={e => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_12px_rgb(0_0_0/.08),0_24px_64px_rgb(0_0_0/.18)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 md:px-7 md:pt-6">
          <h2 className="m-0 text-[20px] font-semibold tracking-[-0.01em] md:text-[22px]">{c.heading}</h2>
          <button type="button" onClick={onClose} aria-label={c.close}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-white hover:bg-[var(--color-search-bg)]">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        {available.length > 1 && (
          <div role="tablist" className="flex gap-4 overflow-x-auto border-b border-[var(--color-border)] px-4 pt-4 md:gap-6 md:px-7">
            {available.map(t => (
              <button key={t.key} type="button" role="tab" aria-selected={t.key === tab}
                onClick={() => setTab(t.key)}
                className={`shrink-0 border-b-2 pb-2.5 text-[14px] md:text-[15px] transition-colors ${t.key === tab
                  ? 'border-[var(--color-primary)] font-semibold text-[var(--color-text)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                {t.label} · {t.count}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-2 md:px-7">
          {tab === 'sale' && <SaleTab villa={data.villa} comps={data.sale} lang={lang} />}
          {tab === 'daily' && <DailyTab villa={data.villa} comps={data.daily} villaAdr={overrideAdr ?? data.villaAdrUsd} villaOcc={overrideOcc ?? data.villaOccupancy} lang={lang} />}
          {tab === 'monthly' && <MonthlyTab villa={data.villa} comps={data.monthly} villaMonthly={overrideMonthly ?? data.villaMonthlyUsd} lang={lang} />}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--color-border)] px-4 py-3 text-[13px] text-[var(--color-text-muted)] md:px-7">
          {c.footer}
        </div>
      </div>
    </div>
  )
}

// ─── Trigger button (wraps popup state) ──────────────────────────

export function CompareButton({ data, lang, className, initialTab, children, overrideAdr, overrideOcc, overrideMonthly }: {
  data: CompareData; lang: Lang; className?: string; initialTab?: 'sale' | 'daily' | 'monthly'; children?: ReactNode
  overrideAdr?: number; overrideOcc?: number; overrideMonthly?: number
}) {
  const [open, setOpen] = useState(false)
  const c = pickCopy(COPY, lang)
  const total = data.sale.length + data.daily.length + data.monthly.length
  if (total === 0) return null
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        // Один вид на всей странице (у цены продажи и в калькуляторе дохода):
        // заметная плашка с иконкой и стрелкой, ширина по тексту (владелец 10.11.2026).
        className={`inline-flex self-start min-h-12 max-w-full items-center gap-2.5 rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-5 py-2.5 text-left text-[15px] font-semibold leading-snug text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] transition-colors ${className ?? ''}`}>
        <Users size={18} aria-hidden className="shrink-0" />
        <span>{children ?? c.heading}</span>
        <ChevronRight size={18} aria-hidden className="shrink-0" />
      </button>
      {open && <NeighborComparePopup data={data} lang={lang} initialTab={initialTab} overrideAdr={overrideAdr} overrideOcc={overrideOcc} overrideMonthly={overrideMonthly} onClose={() => setOpen(false)} />}
    </>
  )
}
