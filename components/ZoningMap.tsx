'use client'

// «Зоны вокруг» в разделе про участок (макет «Зоны вокруг», владелец
// 2026-11-11): спутник, поверх - зоны официального плана застройки (RDTR) в
// радиусе 1 км, цвета как у GISTARU. Ниже легенда: что можно строить, где
// жильё обычно не строят, доля каждой зоны по площади. Данные готовит
// scripts/rdtr_zones.py -> Storage feeds/_rdtr-zones/<slug>.json.

import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { pickCopy, type Lang } from '@/lib/i18n'
import { cdnManifestUrl } from '@/lib/photo-cdn'

type Zone = { name: string; code: string | null; color: string; share: number; geometry: GeoJSON.Geometry }
type ZoneData = {
  center: [number, number]; radius: number; regulation: string | null
  plot: { name: string | null; code: string | null; kdb: string | null; kdh: string | null; klb: string | null } | null
  zones: Zone[]
}

type Group = 'build' | 'nobuild' | 'other'
// Название зоны Индонезии -> группа и подпись. Порядок важен: первое совпадение.
const KINDS: { re: RegExp; group: Group; ru: string; en: string }[] = [
  { re: /^Perumahan/i, group: 'build', ru: 'Жильё', en: 'Housing' },
  { re: /^Perdagangan/i, group: 'build', ru: 'Торговля и услуги', en: 'Shops & services' },
  { re: /^Pariwisata/i, group: 'build', ru: 'Туризм', en: 'Tourism' },
  { re: /^Perkantoran/i, group: 'build', ru: 'Офисы', en: 'Offices' },
  { re: /^Tanaman Pangan/i, group: 'nobuild', ru: 'Рисовые поля', en: 'Rice fields' },
  { re: /^Perkebunan/i, group: 'nobuild', ru: 'Плантации', en: 'Plantations' },
  { re: /^(Badan Air|Perlindungan Setempat|Sempadan)/i, group: 'nobuild', ru: 'Реки и охранные полосы', en: 'Rivers & buffer zones' },
  { re: /^(Taman|Rimba|Jalur Hijau|Pemakaman|Ruang Terbuka Hijau)/i, group: 'nobuild', ru: 'Парки и кладбища', en: 'Parks & cemeteries' },
  { re: /^(Hutan|Kawasan Hutan)/i, group: 'nobuild', ru: 'Лес', en: 'Forest' },
  { re: /^Badan Jalan/i, group: 'other', ru: 'Дороги', en: 'Roads' },
  { re: /^SPU/i, group: 'other', ru: 'Школы, храмы, больницы', en: 'Schools, temples, clinics' },
]
const kindOf = (name: string) => KINDS.find(k => k.re.test(name)) ?? null

const COPY = {
  ru: {
    title: 'Что вокруг по плану застройки',
    sub: (r: number) => `Зоны в радиусе ${r >= 1000 ? `${r / 1000} км` : `${r} м`} от объекта`,
    build: 'Можно строить', nobuild: 'Жильё обычно не строят', other: 'Другое',
    plot: 'Участок объекта', plotRules: (kdb: string | null, kdh: string | null) => [kdb ? `застроить до ${kdb} участка` : null, kdh ? `зелень от ${kdh}` : null].filter(Boolean).join(', '),
    fieldsTitle: (p: number) => `${p}% круга - поля и плантации`,
    fieldsText: 'По плану застройки эта земля остаётся сельхоз землёй.',
    source: (reg: string | null) => `Источник: GISTARU (ATR/BPN)${reg ? `, ${reg}` : ''}. Доли - по площади в круге.`,
    tap: 'Нажмите на участок - покажем его зону',
  },
  en: {
    title: 'What the zoning plan allows nearby',
    sub: (r: number) => `Zones within ${r >= 1000 ? `${r / 1000} km` : `${r} m`} of the property`,
    build: 'Building allowed', nobuild: 'Housing usually not allowed', other: 'Other',
    plot: 'This plot', plotRules: (kdb: string | null, kdh: string | null) => [kdb ? `up to ${kdb} built-up` : null, kdh ? `at least ${kdh} green` : null].filter(Boolean).join(', '),
    fieldsTitle: (p: number) => `${p}% of the circle is fields and plantations`,
    fieldsText: 'Under the zoning plan this land stays agricultural.',
    source: (reg: string | null) => `Source: GISTARU (ATR/BPN)${reg ? `, ${reg}` : ''}. Shares by area within the circle.`,
    tap: 'Tap a plot to see its zone',
  },
} as const

function circleRing([lon, lat]: [number, number], r: number): [number, number][] {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180)
  return Array.from({ length: 129 }, (_, i) => {
    const a = (i / 128) * 2 * Math.PI
    return [lon + (Math.cos(a) * r) / kx, lat + (Math.sin(a) * r) / 111320]
  })
}

export function ZoningMap({ slug, lang }: { slug: string; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const isRu = lang === 'ru' || lang === 'uk'
  const [data, setData] = useState<ZoneData | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  // Грузим, только когда блок близко к экрану.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    let cancelled = false
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return
      io.disconnect()
      const url = cdnManifestUrl(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/feeds/_rdtr-zones/${slug}.json`, 86400)
      fetch(url).then(r => (r.ok ? r.json() : null)).then((j: ZoneData | null) => { if (!cancelled) setData(j) })
        .catch(err => console.error('[zoning] load failed', err))
    }, { rootMargin: '600px' })
    io.observe(el)
    return () => { cancelled = true; io.disconnect() }
  }, [slug])

  useEffect(() => {
    if (!data || !mapRef.current) return
    let map: import('maplibre-gl').Map | null = null
    let cancelled = false
    import('maplibre-gl').then(({ default: ml }) => {
      if (cancelled || !mapRef.current) return
      const kx = 111320 * Math.cos((data.center[1] * Math.PI) / 180)
      const dLon = (data.radius * 1.08) / kx
      const dLat = (data.radius * 1.08) / 111320
      map = new ml.Map({
        container: mapRef.current,
        style: {
          version: 8,
          sources: { sat: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: 'Esri, Maxar · GISTARU ATR/BPN' } },
          layers: [{ id: 'sat', type: 'raster', source: 'sat' }],
        },
        bounds: [[data.center[0] - dLon, data.center[1] - dLat], [data.center[0] + dLon, data.center[1] + dLat]],
        cooperativeGestures: true,
        attributionControl: { compact: true },
      })
      const m = map
      m.on('load', () => {
        const ring = circleRing(data.center, data.radius)
        // Затемнение снаружи круга.
        m.addSource('bx-mask', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]], ring] } } })
        m.addLayer({ id: 'bx-mask', type: 'fill', source: 'bx-mask', paint: { 'fill-color': '#0C100E', 'fill-opacity': 0.55 } })
        m.addSource('bx-zones', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: data.zones.map(z => ({ type: 'Feature', properties: { name: z.name, color: z.color }, geometry: z.geometry })) },
        })
        m.addLayer({ id: 'bx-zones', type: 'fill', source: 'bx-zones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.55 } })
        m.addLayer({ id: 'bx-zones-line', type: 'line', source: 'bx-zones', paint: { 'line-color': '#FFFFFF', 'line-opacity': 0.6, 'line-width': 1 } })
        m.addSource('bx-ring', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ring } } })
        m.addLayer({ id: 'bx-ring', type: 'line', source: 'bx-ring', paint: { 'line-color': '#FFFFFF', 'line-width': 2.5 } })
        m.addSource('bx-pin', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: data.center } } })
        m.addLayer({ id: 'bx-pin', type: 'circle', source: 'bx-pin', paint: { 'circle-radius': 8, 'circle-color': '#E5484D', 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3 } })
        m.on('click', 'bx-zones', e => {
          const name = e.features?.[0]?.properties?.name as string | undefined
          if (name) setPicked(name)
        })
        m.on('mouseenter', 'bx-zones', () => { m.getCanvas().style.cursor = 'pointer' })
        m.on('mouseleave', 'bx-zones', () => { m.getCanvas().style.cursor = '' })
      })
    }).catch(err => console.error('[zoning] map failed', err))
    return () => { cancelled = true; map?.remove() }
  }, [data])

  // Легенда: зоны сворачиваем в понятные группы и складываем доли.
  const rows = new Map<string, { label: string; group: Group; color: string; share: number }>()
  for (const z of data?.zones ?? []) {
    const k = kindOf(z.name)
    const label = k ? (isRu ? k.ru : k.en) : z.name
    const prev = rows.get(label)
    if (prev) prev.share += z.share
    else rows.set(label, { label, group: k?.group ?? 'other', color: z.color, share: z.share })
  }
  const list = [...rows.values()].filter(r => r.share >= 0.005).sort((a, b) => b.share - a.share)
  const pct = (s: number) => `${Math.max(1, Math.round(s * 100))}%`
  const fields = Math.round(list.filter(r => r.label === (isRu ? 'Рисовые поля' : 'Rice fields') || r.label === (isRu ? 'Плантации' : 'Plantations')).reduce((s, r) => s + r.share, 0) * 100)
  const pickedKind = picked ? kindOf(picked) : null
  const plotKind = data?.plot?.name ? kindOf(data.plot.name) : null
  const plotColor = data?.zones.find(z => z.name === data.plot?.name)?.color

  const group = (g: Group, title: string, tone: string) => {
    const items = list.filter(r => r.group === g)
    if (!items.length) return null
    return (
      <div className="flex flex-col gap-3">
        <span className={`text-[13px] font-semibold uppercase tracking-wide ${tone}`}>{title}</span>
        {items.map(r => (
          <div key={r.label} className="flex items-center gap-2.5 text-[15px]">
            <span className="w-3.5 h-3.5 rounded-[3px] shrink-0" style={{ background: r.color }} />
            <span className="flex-1">{r.label}</span>
            <span className="font-semibold tabular-nums">{pct(r.share)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <section ref={boxRef} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[24px] font-semibold tracking-[-0.01em] m-0">{c.title}</h2>
        {data && <p className="m-0 text-[15px] text-[var(--color-text-muted)]">{c.sub(data.radius)}</p>}
      </div>
      <div className="relative h-[358px] sm:h-[480px] rounded-xl overflow-hidden bg-[#1A221E]">
        <div ref={mapRef} className="w-full h-full" />
        {data?.plot?.name && (
          <div className="absolute left-3 top-3 sm:left-4 sm:top-4 max-w-[calc(100%-24px)] sm:max-w-[320px] px-3.5 py-3 rounded-[10px] bg-white/95 shadow-[0_1px_2px_rgb(0_0_0/.06),0_4px_12px_rgb(0_0_0/.1)] flex flex-col gap-1">
            {picked && (
              <button type="button" onClick={() => setPicked(null)} aria-label={isRu ? 'Вернуться к участку объекта' : 'Back to this plot'}
                className="absolute right-1 top-1 w-9 h-9 rounded-full flex items-center justify-center text-[18px] leading-none text-[var(--color-text-muted)] hover:bg-black/5 cursor-pointer">×</button>
            )}
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] pr-6">{picked ? (isRu ? 'Выбранный участок' : 'Selected plot') : c.plot}</span>
            <span className="text-[15px] font-semibold inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: picked ? data.zones.find(z => z.name === picked)?.color : plotColor }} />
              {picked ? (pickedKind ? (isRu ? pickedKind.ru : pickedKind.en) : picked) : `${plotKind ? (isRu ? plotKind.ru : plotKind.en) : data.plot.name}${data.plot.code ? ` · ${data.plot.code}` : ''}`}
            </span>
            {!picked && (data.plot.kdb || data.plot.kdh) && <span className="text-[13px] text-[var(--color-text-muted)]">{c.plotRules(data.plot.kdb, data.plot.kdh)}</span>}
            {picked && <span className="text-[12px] text-[var(--color-text-muted)]">{picked}</span>}
          </div>
        )}
        {data && <span className="hidden sm:block absolute right-4 bottom-8 px-2.5 py-1.5 rounded-lg bg-[rgb(12_16_14/0.75)] text-white text-[13px]">{c.tap}</span>}
      </div>
      {data && list.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {group('build', c.build, 'text-[var(--color-primary)]')}
            {group('nobuild', c.nobuild, 'text-[#9A3412]')}
          </div>
          {fields >= 20 && (
            <div className="px-5 py-4 rounded-xl bg-[#F3F7F4] flex flex-col gap-1.5">
              <span className="text-[16px] font-semibold">{c.fieldsTitle(fields)}</span>
              <span className="text-[15px] leading-[1.55] text-[#36413B]">{c.fieldsText}</span>
            </div>
          )}
          <p className="m-0 text-[13px] text-[var(--color-text-muted)]">{c.source(data.regulation)}</p>
        </>
      )}
    </section>
  )
}
