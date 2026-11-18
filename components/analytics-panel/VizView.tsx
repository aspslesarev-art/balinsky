'use client'
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
              <span className="text-[11px] tabular-nums text-[#39413D]">{c.text}</span>
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
              <span className="text-right font-semibold" style={{ color: r.state === 'warn' ? '#9A5B1E' : undefined }}>{r.value}</span>
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

function MapView({ v }: { v: Extract<Viz, { kind: 'map' }>; lang: string }) {
  const W = 960, H = Math.round(W / v.aspect)
  const c = world(v.center.lat, v.center.lng, v.zoom)
  const x0 = c.x - W / 2, y0 = c.y - H / 2
  const tiles: { tx: number; ty: number }[] = []
  for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + W) / 256); tx++)
    for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + H) / 256); ty++) tiles.push({ tx, ty })
  const P = (lat: number, lng: number) => { const p = world(lat, lng, v.zoom); return { x: ((p.x - x0) / W) * 100, y: ((p.y - y0) / H) * 100 } }
  const inside = (p: { x: number; y: number }) => p.x > 1 && p.x < 99 && p.y > 1 && p.y < 99
  const rosePaths = v.rose ? (() => {
    const mx = Math.max(...v.rose!)
    const pt = (a: number, r: number) => `${(90 + r * Math.sin(a)).toFixed(1)} ${(90 - r * Math.cos(a)).toFixed(1)}`
    return v.rose!.map((p, i) => { const r = Math.max(4, (p / mx) * 78), a = (i * Math.PI) / 4, h = Math.PI / 8; return { d: `M90 90 L${pt(a - h, r)} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${pt(a + h, r)}Z`, op: 0.35 + 0.65 * (p / mx) } })
  })() : null
  return (
    <>
      <div className="relative w-full overflow-hidden rounded-lg bg-[#EEF1EF]" style={{ aspectRatio: String(v.aspect) }} role="img" aria-label={v.alt}>
        {tiles.map(({ tx, ty }) => (
          // eslint-disable-next-line @next/next/no-img-element -- плитки Esri
          <img key={`${tx}-${ty}`} alt="" loading="lazy" draggable={false} src={`${TILE[v.base]}/${v.zoom}/${ty}/${tx}`}
            className="absolute max-w-none select-none" style={{ left: `${((tx * 256 - x0) / W) * 100}%`, top: `${((ty * 256 - y0) / H) * 100}%`, width: `${(256 / W) * 100 + 0.1}%`, height: `${(256 / H) * 100 + 0.1}%` }} />
        ))}
        {v.lines && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 h-full w-full">
            {v.lines.map((l, k) => {
              const pts = l.coords.map(([lng, lat]) => { const p = P(lat, lng); return `${p.x.toFixed(2)},${p.y.toFixed(2)}` }).join(' ')
              return (
                <g key={k}>
                  <polyline points={pts} fill="none" stroke="#fff" strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  <polyline points={pts} pathLength={100} fill="none" stroke={l.color} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="ap-draw" style={{ strokeDasharray: 100, animationDelay: `${k * 400}ms` }} />
                </g>
              )
            })}
          </svg>
        )}
        {rosePaths && (
          <svg viewBox="0 0 180 180" aria-hidden="true" className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2">
            <circle cx="90" cy="90" r="80" fill="none" stroke="#fff" strokeOpacity=".7" />
            <circle cx="90" cy="90" r="40" fill="none" stroke="#fff" strokeOpacity=".5" />
            {rosePaths.map((p, k) => <path key={k} d={p.d} fill={ORANGE} fillOpacity={p.op} stroke="#fff" strokeWidth=".8" />)}
            {[['С', 90, 8, 'middle'], ['В', 176, 94, 'end'], ['Ю', 90, 178, 'middle'], ['З', 4, 94, 'start']].map(([t, x, y, a]) => <text key={t as string} x={x as number} y={y as number} textAnchor={a as 'middle'} fontSize="11" fontWeight="700" fill="#fff">{t}</text>)}
          </svg>
        )}
        {v.pins?.map((p, k) => { const q = P(p.lat, p.lng); return inside(q) && <span key={k} className="ap-chip absolute -ml-1.5 -mt-1.5 h-3 w-3 rounded-full border-2 border-white shadow" style={{ left: `${q.x}%`, top: `${q.y}%`, background: p.color, animationDelay: `${Math.min(k, 30) * 60}ms` }} /> })}
        {v.tags?.map((tg, k) => { const q = P(tg.lat, tg.lng); return inside(q) && <span key={k} className="ap-in absolute whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-[12px] font-semibold text-[#0F1A15] shadow" style={{ left: `${q.x}%`, top: `${q.y}%`, transform: q.x > 60 ? 'translate(calc(-100% - 8px), -50%)' : 'translate(8px, -50%)', animationDelay: `${600 + k * 150}ms` }}>{tg.label}</span> })}
        <Credit text={v.credit} />
      </div>
      {v.legend && <Legend items={v.legend} />}
    </>
  )
}
