'use client'
import { Sun, Umbrella } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Viz } from '@/lib/analytics-panel/types'

// Графики итога анализа. Всё на CSS/SVG без библиотек; карты — плитки Esri
// (бесплатно, без ключа: Google Maps здесь платный и на localhost не работает).

const GREEN = '#1F8B5F'
const ORANGE = '#E78C3D'

export function VizView({ v, lang }: { v: Viz; lang: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4">
      <div className="text-[14px] font-semibold">{v.title}</div>
      {render(v, lang)}
    </div>
  )
}

/** Обложка карточки анализа (макет «Обложки — чистый график», владелец
 *  19.11.2026): та же суть, что в графике, но без единой подписи — точки,
 *  шкалы, дуги, столбики в цвете темы; карты — без надписей. */
export function VizCover({ v, lang, accent = '#1F8B5F' }: { v: Viz; lang: string; accent?: string }) {
  const svg = (children: ReactNode, label: string) => (
    <svg viewBox="0 0 300 172" preserveAspectRatio="xMidYMid meet" role="img" aria-label={label} className="ap-cover absolute inset-0 h-full w-full">{children}</svg>
  )
  const soft = `${accent}40`
  switch (v.kind) {
    case 'map':
      return <div className="ap-kb absolute inset-0 flex items-center [&>div]:shrink-0"><MapView v={v} lang={lang} bare /></div>
    case 'image':
      // eslint-disable-next-line @next/next/no-img-element -- готовый снимок зон из Storage
      return <img src={v.src} alt={v.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
    case 'scatter': {
      const X = (x: number) => 36 + pct(x, v.xLo, v.xHi) * 2.28, Y = (y: number) => 146 - pct(y, v.yLo, v.yHi) * 1.2
      return svg(<>{v.points.map((p, k) => <circle key={k} cx={X(p.x)} cy={Y(p.y)} r={9} fill={accent} opacity={p.good ? 0.95 : 0.45} className="ap-float" style={{ animationDelay: `${-k * 0.7}s`, animationDuration: `${3 + (k % 3) * 0.6}s` }} />)}</>, v.title)
    }
    case 'gauge': {
      const a = Math.PI * (1 - Math.max(0, Math.min(100, v.avg)) / 100)
      const ex = 150 + 80 * Math.cos(a), ey = 140 - 80 * Math.sin(a)
      return svg(<>
        <path d="M70 140 A80 80 0 0 1 230 140" fill="none" stroke={soft} strokeWidth="18" strokeLinecap="round" />
        <path d={`M70 140 A80 80 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`} fill="none" stroke={accent} strokeWidth="18" strokeLinecap="round" pathLength={100} className="ap-breathe-dash" style={{ strokeDasharray: 100 }} />
        <circle cx={ex} cy={ey} r="7" fill="#fff" stroke="#0F1A15" strokeWidth="3" className="ap-pulse" />
      </>, v.title)
    }
    case 'strip': {
      const X = (x: number) => 40 + pct(x, v.lo, v.hi) * 2.2
      return svg(<>
        <line x1="36" y1="86" x2="264" y2="86" stroke={soft} strokeWidth="6" strokeLinecap="round" />
        {v.points.map((p, k) => <circle key={k} cx={X(p)} cy="86" r="5" fill={accent} opacity=".7" className="ap-float" style={{ animationDelay: `${-k * 0.45}s` }} />)}
        <line x1={X(v.mark.value)} y1="58" x2={X(v.mark.value)} y2="114" stroke={accent} strokeWidth="3" strokeLinecap="round" className="ap-breathe-y" style={{ transformOrigin: 'center' }} />
        {v.self && <path d={`M${X(v.self.value)} 72 l-10 -18 h20 z`} fill="#0F1A15" className="ap-bob" />}
      </>, v.title)
    }
    case 'checks': {
      const n = Math.min(5, v.rows.length), w = 48, x0 = 150 - ((n - 1) * w) / 2
      return svg(<>{v.rows.slice(0, n).map((r, k) => {
        const cx = x0 + k * w, c = r.state === 'ok' ? accent : r.state === 'warn' ? '#C9772B' : '#9AA39E'
        return r.state === 'ok'
          ? <g key={k} className="ap-breathe" style={{ animationDelay: `${k * 0.5}s` }}><circle cx={cx} cy="86" r="20" fill={c} /><path d={`M${cx - 9} 86 l6 6 l12 -12`} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></g>
          : <g key={k} className="ap-pulse" style={{ animationDelay: `${k * 0.5}s` }}><circle cx={cx} cy="86" r="18" fill="none" stroke={c} strokeWidth="4" /><line x1={cx} y1="77" x2={cx} y2="88" stroke={c} strokeWidth="4" strokeLinecap="round" /><circle cx={cx} cy="95" r="2.5" fill={c} /></g>
      })}</>, v.title)
    }
    case 'bars': {
      const rows = v.rows.slice(0, 6), h = Math.min(16, 110 / rows.length - 6)
      return svg(<>{rows.map((r, k) => {
        const y = 86 - (rows.length * (h + 8)) / 2 + k * (h + 8)
        return <g key={k}><rect x="44" y={y} width="212" height={h} rx={h / 2} fill={soft} /><rect x="44" y={y} width={Math.max(h, (pct(r.value, 0, v.max) / 100) * 212)} height={h} rx={h / 2} fill={accent} className="ap-breathe-x" style={{ transformOrigin: 'left', animationDelay: `${-k * 0.6}s` }} /></g>
      })}</>, v.title)
    }
    case 'cols': {
      const cols = v.cols.slice(0, 14), w = Math.min(18, 220 / cols.length - 4)
      return svg(<>{cols.map((c, k) => {
        const hh = Math.max(4, (c.value / v.max) * 104), x = 150 - (cols.length * (w + 4)) / 2 + k * (w + 4)
        return <rect key={k} x={x} y={140 - hh} width={w} height={hh} rx={Math.min(4, w / 2)} fill={c.hot === false ? soft : accent} opacity={c.hot ? 1 : 0.8} className="ap-breathe-y" style={{ transformOrigin: 'bottom', animationDelay: `${-k * 0.3}s` }} />
      })}</>, v.title)
    }
    case 'months': {
      const mx = Math.max(1, ...v.months.map(m => m.sunny))
      return svg(<>{v.months.map((m, k) => {
        const hh = Math.max(4, (m.sunny / mx) * 104)
        return <rect key={k} x={44 + k * 19} y={140 - hh} width="14" height={hh} rx="4" fill={m.sunny >= 21 ? '#F2A33A' : m.sunny >= 14 ? '#F6CB85' : '#B9C8EC'} className="ap-breathe-y" style={{ transformOrigin: 'bottom', animationDelay: `${-k * 0.3}s` }} />
      })}</>, v.title)
    }
  }
}

const pct = (x: number, lo: number, hi: number) => (hi > lo ? Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100)) : 50)

function render(v: Viz, lang: string) {
  switch (v.kind) {
    case 'bars':
      return (
        <div className="flex flex-col gap-1.5">
          {v.rows.map(r => (
            <div key={r.label} className="grid items-center gap-3 text-[13px]" style={{ gridTemplateColumns: 'minmax(96px, 140px) minmax(0, 1fr) 72px' }}>
              <span className="truncate text-[#39413D]">{r.label}</span>
              <span className="h-3 overflow-hidden rounded-md bg-[#EEF1EF]"><span className="ap-grow block h-3 origin-left rounded-md" style={{ width: `${pct(r.value, 0, v.max)}%`, background: v.color ?? GREEN }} /></span>
              <span className="text-right font-semibold tabular-nums">{r.text}</span>
            </div>
          ))}
        </div>
      )
    case 'cols':
      return (
        <div className="flex h-[132px] items-end gap-1.5">
          {v.cols.map((c, k) => (
            <div key={k} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="whitespace-nowrap text-[11px] tabular-nums text-[#39413D]">{c.text}</span>
              <span className="ap-growy w-full origin-bottom rounded-t" style={{ height: Math.max(2, Math.round((c.value / v.max) * 96)), background: c.hot === false ? '#F3C9A3' : c.hot ? ORANGE : GREEN }} />
              <span className="text-[11px] text-[var(--color-text-muted)]">{c.label}</span>
            </div>
          ))}
        </div>
      )
    case 'strip':
      return (
        <>
          <div className="relative mx-2 h-[84px]">
            <div className="absolute inset-x-0 top-[34px] h-2 rounded bg-[#EEF1EF]" />
            {v.points.map((p, k) => <span key={k} className="ap-chip absolute top-[30px] -ml-2 h-4 w-4 rounded-full border-2 border-[#39413D] bg-white" style={{ left: `${pct(p, v.lo, v.hi)}%` }} />)}
            <span className="absolute top-[18px] h-10 w-0.5 bg-[var(--color-primary)]" style={{ left: `${pct(v.mark.value, v.lo, v.hi)}%` }} />
            <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[12px] font-semibold text-[var(--color-primary-pressed)]" style={{ left: `${pct(v.mark.value, v.lo, v.hi)}%` }}>{v.mark.label}</span>
            {v.self && <>
              <span className="absolute top-[26px] -ml-3 h-6 w-6 rounded-full border-[3px] border-white bg-[#0F1A15] shadow" style={{ left: `${pct(v.self.value, v.lo, v.hi)}%` }} />
              <span className="absolute top-[58px] -translate-x-1/2 whitespace-nowrap text-[12px] font-semibold" style={{ left: `${pct(v.self.value, v.lo, v.hi)}%` }}>{v.self.label}</span>
            </>}
            <span className="absolute left-0 top-[64px] text-[12px] text-[var(--color-text-muted)]">{v.loLabel}</span>
            <span className="absolute right-0 top-[64px] text-[12px] text-[var(--color-text-muted)]">{v.hiLabel}</span>
          </div>
          {v.note && <div className="text-[13px] text-[#39413D]">{v.note}</div>}
        </>
      )
    case 'checks':
      return (
        <div className="flex flex-col">
          {v.rows.map(r => (
            <div key={r.label} className="flex items-center gap-3 border-b border-[#EEF1EF] py-2.5 text-[14px]">
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: r.state === 'ok' ? GREEN : r.state === 'warn' ? '#C9772B' : '#9AA39E' }}>{r.state === 'ok' ? '✓' : r.state === 'warn' ? '!' : 'i'}</span>
              <span className="flex-grow">{r.label}</span>
              <span className="shrink-0 whitespace-nowrap text-right font-semibold" style={{ color: r.state === 'warn' ? '#9A5B1E' : undefined }}>{r.value}</span>
            </div>
          ))}
        </div>
      )
    case 'scatter':
      return (
        <>
          <div className="relative mb-5 ml-10 mr-2 h-[160px] border-b border-l border-[#CDD3D0]">
            {v.points.map((p, k) => (
              <span key={k}>
                <span title={p.label} className="absolute -mb-1.5 -ml-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow" style={{ left: `${pct(p.x, v.xLo, v.xHi)}%`, bottom: `${pct(p.y, v.yLo, v.yHi)}%`, background: p.good ? '#33A474' : ORANGE }} />
              </span>
            ))}
            <span className="absolute -left-10 -top-0.5 text-[11px] text-[var(--color-text-muted)]">{v.yHiLabel}</span>
            <span className="absolute -bottom-1.5 -left-10 text-[11px] text-[var(--color-text-muted)]">{v.yLoLabel}</span>
            <span className="absolute -bottom-5 left-0 text-[11px] text-[var(--color-text-muted)]">{v.xLoLabel}</span>
            <span className="absolute -bottom-5 right-0 text-[11px] text-[var(--color-text-muted)]">{v.xHiLabel}</span>
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">{v.caption}</div>
        </>
      )
    case 'gauge':
      return (
        <>
          <div className="relative mx-2 h-[72px]">
            <div className="absolute inset-x-0 top-7 h-3 rounded-md" style={{ background: 'linear-gradient(90deg, #E8A3A3 0%, #F3D37A 40%, #9ED3B6 60%, #33A474 100%)' }} />
            <span className="absolute top-[22px] -ml-3 h-6 w-6 rounded-full border-[3px] border-white bg-[#0F1A15] shadow" style={{ left: `${v.avg}%` }} />
            <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[12px] font-semibold" style={{ left: `${v.avg}%` }}>{v.avgLabel}</span>
            <span className="absolute left-0 top-[50px] text-[12px] text-[var(--color-text-muted)]">{v.loLabel}</span>
            <span className="absolute right-0 top-[50px] text-[12px] text-[var(--color-text-muted)]">{v.hiLabel}</span>
          </div>
          <div className="text-[13px] text-[#39413D]">{v.caption}</div>
        </>
      )
    case 'months':
      // Как блок погоды на сайте: солнечные дни, температура, дождливые дни.
      return (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {v.months.map(mo => (
            <div key={mo.label} className="flex min-w-0 flex-col gap-1 rounded-lg px-2.5 py-2" style={{ background: mo.sunny >= 21 ? 'rgb(245 165 36 / .14)' : mo.sunny >= 14 ? '#F3F7F4' : 'rgb(80 140 255 / .10)' }}>
              <span className="text-[12px] text-[#4C5751]">{mo.label}</span>
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-[17px] font-semibold leading-none tabular-nums" title={v.sunnyLbl}><Sun size={14} strokeWidth={2} aria-hidden className="shrink-0" />{mo.sunny}</span>
              <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 whitespace-nowrap text-[12px] leading-none text-[#4C5751] tabular-nums">
                {mo.tmax != null && <span>{Math.round(mo.tmax)}°</span>}
                <span className="inline-flex items-center gap-1"><Umbrella size={12} strokeWidth={2} aria-hidden className="shrink-0" />{mo.wet}</span>
              </span>
            </div>
          ))}
        </div>
      )
    case 'image':
      return (
        <>
          <div className="relative w-full overflow-hidden rounded-lg bg-[#EEF1EF]" style={{ aspectRatio: String(v.aspect) }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- готовый снимок зон из Storage */}
            <img src={v.src} alt={v.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <Credit text={v.credit} />
          </div>
          {v.legend && <Legend items={v.legend} />}
        </>
      )
    case 'map':
      return <MapView v={v} lang={lang} />
  }
}

function Credit({ text }: { text: string }) {
  return <span className="absolute bottom-0.5 right-1 rounded-sm bg-white/75 px-1 text-[10px] text-[#39413D]">{text}</span>
}
function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#39413D]">
      {items.map(l => <span key={l.label} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />{l.label}</span>)}
    </div>
  )
}

const r4 = (x: number) => Math.round(x * 1e4) / 1e4

// Меркатор: пиксели мира на зуме z.
function world(lat: number, lng: number, z: number) {
  const s = 256 * 2 ** z
  const r = (lat * Math.PI) / 180
  return { x: ((lng + 180) / 360) * s, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * s }
}
const TILE = {
  street: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile',
  sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile',
}

// Стороны света на розе ветров: север, юг, запад, восток.
const COMPASS: Record<string, string[]> = {
  ru: ['С', 'Ю', 'З', 'В'], en: ['N', 'S', 'W', 'E'], uk: ['Пн', 'Пд', 'Зх', 'Сх'], pl: ['N', 'S', 'W', 'E'], de: ['N', 'S', 'W', 'O'],
  fr: ['N', 'S', 'O', 'E'], nl: ['N', 'Z', 'W', 'O'], id: ['U', 'S', 'B', 'T'], ban: ['U', 'S', 'B', 'T'], zh: ['北', '南', '西', '东'],
}

function MapView({ v, lang, bare }: { v: Extract<Viz, { kind: 'map' }>; lang: string; bare?: boolean }) {
  const W = 960, H = Math.round(W / v.aspect)
  const c = world(v.center.lat, v.center.lng, v.zoom)
  const x0 = c.x - W / 2, y0 = c.y - H / 2
  const tiles: { tx: number; ty: number }[] = []
  for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + W) / 256); tx++)
    for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + H) / 256); ty++) tiles.push({ tx, ty })
  // Округляем: иначе сервер и браузер печатают проценты по-разному (ошибка гидрации).
  const P = (lat: number, lng: number) => { const p = world(lat, lng, v.zoom); return { x: Math.round(((p.x - x0) / W) * 1e6) / 1e4, y: Math.round(((p.y - y0) / H) * 1e6) / 1e4 } }
  const inside = (p: { x: number; y: number }) => p.x > 1 && p.x < 99 && p.y > 1 && p.y < 99
  // Ветер: штрихи летят по направлению ветра; чем чаще дует с румба, тем их
  // больше. rose — доли «откуда дует», с севера по часовой.
  const windStreaks = v.rose ? (() => {
    const mx = Math.max(...v.rose!)
    const out: { deg: number; off: number; delay: number; dur: number; op: number }[] = []
    v.rose!.forEach((p, i) => {
      const n = Math.round((p / mx) * 14)
      for (let j = 0; j < n; j++) {
        const h = ((i * 7 + j * 13) * 2654435761) % 1000 / 1000
        out.push({ deg: i * 45 + 90, off: (j / Math.max(1, n - 1) - 0.5) * 90 + (h - 0.5) * 8, delay: -h * 3.2 - j * 0.37, dur: 2.6 + h * 1.2, op: 0.45 + 0.5 * (p / mx) })
      }
    })
    return out
  })() : null
  return (
    <>
      <div className="relative w-full overflow-hidden rounded-lg bg-[#EEF1EF]" style={{ aspectRatio: String(v.aspect) }} role="img" aria-label={v.alt}>
        {tiles.map(({ tx, ty }) => (
          // eslint-disable-next-line @next/next/no-img-element -- плитки Esri
          <img key={`${tx}-${ty}`} alt="" loading="lazy" draggable={false} src={`${TILE[v.base]}/${v.zoom}/${ty}/${tx}`}
            className="absolute max-w-none select-none" style={{ left: `${r4(((tx * 256 - x0) / W) * 100)}%`, top: `${r4(((ty * 256 - y0) / H) * 100)}%`, width: `${r4((256 / W) * 100 + 0.1)}%`, height: `${r4((256 / H) * 100 + 0.1)}%` }} />
        ))}
        {v.polys && v.polys.length > 0 && (
          <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="ap-in absolute inset-0 h-full w-full">
            {v.polys.map((g, k) => (
              <path key={k} fillRule="evenodd" fill={g.color} fillOpacity=".5" stroke={g.color} strokeOpacity=".95" strokeWidth="1.5"
                d={g.rings.map(r => 'M' + r.map(([lng, lat]) => { const p = world(lat, lng, v.zoom); return `${(p.x - x0).toFixed(1)} ${(p.y - y0).toFixed(1)}` }).join('L') + 'Z').join(' ')} />
            ))}
          </svg>
        )}
        {v.lines && (
          // Координаты в пикселях карты (W×H), без non-scaling-stroke: иначе
          // pathLength не работает и линия рисуется пунктиром.
          <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="absolute inset-0 h-full w-full">
            {v.lines.map((l, k) => {
              const pts = l.coords.map(([lng, lat]) => { const p = world(lat, lng, v.zoom); return `${(p.x - x0).toFixed(1)},${(p.y - y0).toFixed(1)}` }).join(' ')
              return (
                <g key={k}>
                  <polyline points={pts} pathLength={100} fill="none" stroke="#fff" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" className="ap-draw" style={{ strokeDasharray: 100, animationDelay: `${k * 500}ms` }} />
                  <polyline points={pts} pathLength={100} fill="none" stroke={l.color} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" className="ap-draw" style={{ strokeDasharray: 100, animationDelay: `${k * 500}ms` }} />
                </g>
              )
            })}
          </svg>
        )}
        {v.heat && v.heat.length > 0 && (() => {
          // Клетка тепловой карты ~500 м: мягкое пятно, ярче там, где туристов больше.
          const mpp = (156543.03392 * Math.cos((v.center.lat * Math.PI) / 180)) / 2 ** v.zoom
          const rad = 420 / mpp
          const mx = v.heatMax ?? Math.max(...v.heat!.map(h => h.w))
          return (
            <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="absolute inset-0 h-full w-full">
              <defs>
                <radialGradient id="ap-heat"><stop offset="0%" stopColor="#E0452B" stopOpacity="1" /><stop offset="55%" stopColor="#F29B38" stopOpacity=".55" /><stop offset="100%" stopColor="#F29B38" stopOpacity="0" /></radialGradient>
              </defs>
              {v.heat!.map((h, k) => { const p = world(h.lat, h.lng, v.zoom); return <circle key={k} cx={p.x - x0} cy={p.y - y0} r={rad} fill="url(#ap-heat)" opacity={Math.min(0.85, 0.15 + 0.7 * (h.w / mx))} className="ap-in" style={{ animationDelay: `${Math.min(k, 40) * 40}ms` }} /> })}
            </svg>
          )
        })()}
        {v.rings && v.rings.length > 0 && (() => {
          // Метров в пикселе на этом зуме и широте (Web Mercator).
          const mpp = (156543.03392 * Math.cos((v.center.lat * Math.PI) / 180)) / 2 ** v.zoom
          const cx = W / 2, cy = H / 2
          return (
            <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="absolute inset-0 h-full w-full">
              {v.rings!.map((r, k) => {
                const rad = r.m / mpp
                return (
                  <g key={r.m}>
                    <circle cx={cx} cy={cy} r={rad} fill={k === 0 ? 'rgb(15 26 21 / .06)' : 'none'} stroke="#0F1A15" strokeOpacity=".55" strokeWidth="2" strokeDasharray={k === 0 ? undefined : '8 6'} className="ap-in" style={{ animationDelay: `${k * 150}ms` }} />
                    {!bare && <g transform={`translate(${cx}, ${cy - rad})`}>
                      <rect x={-30} y={-13} width={60} height={24} rx={6} fill="#fff" stroke="#0F1A15" strokeOpacity=".2" />
                      <text x={0} y={4} textAnchor="middle" fontSize="15" fontWeight="600" fill="#0F1A15">{r.label}</text>
                    </g>}
                  </g>
                )
              })}
            </svg>
          )
        })()}
        {windStreaks && (
          <div aria-hidden="true" className="absolute inset-0 [container-type:size]">
            {windStreaks.map((w, k) => (
              // Обёртка повёрнута по ветру (от румба «откуда» к противоположному),
              // внутри штрих пролетает её из конца в конец.
              <div key={k} className="absolute left-1/2 top-1/2 h-0 w-[150%] max-w-none" style={{ transform: `translate(-50%, 0) rotate(${w.deg}deg) translateY(${w.off}cqmin)` }}>
                <div className="ap-wind h-0 w-full" style={{ animationDuration: `${w.dur}s`, animationDelay: `${w.delay}s` }}>
                  <span className="block h-1 w-[12%] rounded-full" style={{ background: `linear-gradient(90deg, transparent, rgb(255 255 255 / ${w.op}))`, filter: 'drop-shadow(0 0 2px rgb(0 0 0 / .35))' }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {v.rose && !bare && (
          <>
            {(['left-1/2 top-2 -translate-x-1/2', 'left-1/2 bottom-2 -translate-x-1/2', 'left-2 top-1/2 -translate-y-1/2', 'right-2 top-1/2 -translate-y-1/2'] as const).map((pos, k) => (
              <span key={pos} className={`absolute ${pos} grid h-8 w-8 place-items-center rounded-full bg-white text-[13px] font-bold text-[#0F1A15] shadow`}>{(COMPASS[lang === 'ua' ? 'uk' : lang] ?? COMPASS.en)[k]}</span>
            ))}
          </>
        )}
        {v.pins?.map((p, k) => { const q = P(p.lat, p.lng); return inside(q) && <span key={k} className="ap-chip absolute -ml-1.5 -mt-1.5 h-3 w-3 rounded-full border-2 border-white shadow" style={{ left: `${q.x}%`, top: `${q.y}%`, background: p.color, animationDelay: `${Math.min(k, 30) * 60}ms` }} /> })}
        {!bare && v.tags?.map((tg, k) => { const q = P(tg.lat, tg.lng); return inside(q) && <span key={k} className="ap-in absolute whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-[12px] font-semibold text-[#0F1A15] shadow" style={{ left: `${q.x}%`, top: `${q.y}%`, transform: q.x > 60 ? 'translate(calc(-100% - 8px), -50%)' : 'translate(8px, -50%)', animationDelay: `${600 + k * 150}ms` }}>{tg.label}</span> })}
        <Credit text={v.credit} />
      </div>
      {!bare && v.legend && <Legend items={v.legend} />}
    </>
  )
}
