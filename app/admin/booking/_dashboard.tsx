'use client'

// Загрузка на Booking: районы, типы номеров, виллы по спальням, динамика по дням.
// Данные — одна сводка из booking_occ_dashboard(); фильтр по району на клиенте.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { OccDashboard, OccHotelSeg, OccVillaSeg, OccZone } from '@/lib/booking-occ/dashboard'

const ALL = '__all'
const MIN_UNITS = 30 // меньше — это наблюдение, а не вывод (см. CLAUDE.md, «Аналитика рынка»)
// Сравнение отелей день к дню честное только с этой даты (метод сборщика поменялся 14.10).
const METHOD_SINCE = '2026-10-14'

const occ = (free: number | null | undefined, inv: number | null | undefined) =>
  inv ? Math.round(1000 * (1 - (free ?? 0) / inv)) / 10 : null
const share = (part: number | null | undefined, whole: number | null | undefined) =>
  whole ? Math.round(1000 * (part ?? 0) / whole) / 10 : null
const n = (v: number | null | undefined) => (v == null ? '—' : Math.round(v).toLocaleString('ru-RU'))
const p = (v: number | null) => (v == null ? '—' : `${v.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`)
const dm = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`

export function OccDashboardView({ data }: { data: OccDashboard }) {
  const [zone, setZone] = useState<string>(ALL)
  const zones = useMemo(
    () => [...data.zones].sort((a, b) => (b.hotel_rooms ?? 0) + (b.villas ?? 0) - (a.hotel_rooms ?? 0) - (a.villas ?? 0)),
    [data.zones],
  )
  const z: OccZone | null = zone === ALL ? null : zones.find(x => x.zone === zone) ?? null
  const cur = z ?? { ...data.total, zone: 'Весь Бали', c14: null, n14: null, cfar: null, nfar: null }
  const allVilla = data.villa_segments.filter(s => s.zone === null)
  const tot14 = sum(allVilla, 'c14'), totN14 = sum(allVilla, 'n14'), totFar = sum(allVilla, 'cfar'), totNFar = sum(allVilla, 'nfar')
  const near = z ? share(z.c14, z.n14) : share(tot14, totN14)
  const far = z ? share(z.cfar, z.nfar) : share(totFar, totNFar)

  const last = data.runs.at(-1)
  const hotelNow = occ(cur.hotel_free, cur.hotel_rooms)
  const hotelPrev = data.prev_date && data.prev_date >= METHOD_SINCE ? occ(cur.hotel_free_prev, cur.hotel_rooms_prev) : null
  const villaNow = share(cur.villa_booked, cur.villa_open)
  const closedLast = data.closed_by_day.at(-1)

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-wide text-[var(--ax-fg-muted)] mb-1">Booking · объекты до 40 номеров</div>
          <h1 className="text-[24px] font-semibold tracking-tight">Загрузка Бали</h1>
          {last ? (
            <div className="mt-1 text-[13px] text-[var(--ax-fg-muted)]">
              Последний сбор {dm(last.d)}
              {last.finished_at ? ` в ${new Date(last.finished_at).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' })}` : ' — ещё идёт'}
              {last.singles != null ? `: ${n((last.singles ?? 0) + (last.multis ?? 0))} объектов, ошибок ${n(last.errors)}` : ''}
            </div>
          ) : null}
          {last?.alerts ? <div className="mt-1 text-[13px] text-[var(--ax-error-fg)]">Проверить: {last.alerts}</div> : null}
        </div>
        <label className="flex flex-col gap-1 text-[12px] text-[var(--ax-fg-muted)]">
          Район
          <select
            value={zone}
            onChange={e => setZone(e.target.value)}
            className="min-w-[220px] rounded-lg border border-[var(--ax-input-border)] bg-[var(--ax-input-bg)] px-3 py-2 text-[13px] text-[var(--ax-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ax-series-1)]"
          >
            <option value={ALL}>Весь Бали</option>
            {zones.map(x => <option key={x.zone} value={x.zone}>{x.zone}</option>)}
          </select>
        </label>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Отели: занято сегодня" value={p(hotelNow)} sub={hotelPrev != null ? `вчера ${p(hotelPrev)}` : `${n(cur.hotel_rooms)} номеров`} />
        <Kpi label="Виллы: сдано сегодня" value={p(villaNow)} sub={`${n(cur.villa_booked)} из ${n(cur.villa_open)} открытых`} />
        <Kpi label="Виллы: спрос на 2 недели" value={p(near)} sub={`ночей закрылось; дальше 2 нед. — ${p(far)}`} />
        {z ? (
          <Kpi label="Под наблюдением" value={`${n(cur.hotel_props)} отелей`} sub={`и ${n(cur.villas)} вилл`} />
        ) : (
          <Kpi label="Брони вилл за сутки" value={`${n(closedLast?.nights)} ночей`} sub={closedLast ? `в ${n(closedLast.villas)} виллах, ${dm(closedLast.d)}` : 'пока нет'} />
        )}
      </section>

      {!z ? (
        <Panel title="По дням" hint="весь Бали; цифры по виллам честные примерно с 27.10 — бронь видна, только если ночь сначала была свободна">
          <TrendChart data={data} />
        </Panel>
      ) : null}

      <Panel
        title={`Отели и гестхаусы по типу номера${z ? ` — ${z.zone}` : ''}`}
        hint="занято сегодня ночью; тип и спальни — из названия номера на Booking; бледные строки — меньше 30 номеров, это наблюдение, а не вывод"
      >
        <HotelSegTable rows={data.hotel_segments.filter(s => (z ? s.zone === z.zone : s.zone === null))} />
      </Panel>

      <Panel
        title={`Сдаются целиком: виллы и апартаменты${z ? ` — ${z.zone}` : ''}`}
        hint="спальни — по данным Booking, а если их нет — из названия, описания или адреса страницы; «Номер / комната» — гестхаусы и отели, где продаётся одна комната. «Закрыто» = ночь была свободна и закрылась (бронь или блок хозяина). Ближние 2 недели закрываются бронями, дальние даты — чаще блоки хозяев"
      >
        <VillaSegTable rows={data.villa_segments.filter(s => (z ? s.zone === z.zone : s.zone === null))} />
      </Panel>

      <Panel title="Районы" hint="клик по строке — показать район; сортировка — клик по заголовку">
        <ZoneTable zones={zones} prevOk={!!data.prev_date && data.prev_date >= METHOD_SINCE} onPick={setZone} />
      </Panel>

      <p className="max-w-[68ch] text-[12px] leading-relaxed text-[var(--ax-fg-muted)]">
        Сбор каждый день в 12:00 WITA: 5,6 тыс. вилл (календарь на 60 дней) и 7,5 тыс. отелей до 40 номеров (свободные номера на сегодня).
        Это только Booking и только активные объекты — абсолютный процент выше официального (BPS, август 2026: отели без звёзд 43%),
        поэтому полезнее сравнения: район с районом, тип с типом, день с днём.
      </p>
    </>
  )
}

function sum<T>(rows: T[], k: keyof T): number {
  return rows.reduce((a, r) => a + (Number(r[k]) || 0), 0)
}

// ── Динамика ────────────────────────────────────────────────────────────────

function TrendChart({ data }: { data: OccDashboard }) {
  const [hover, setHover] = useState<number | null>(null)
  const days = useMemo(() => {
    const vt = new Map(data.villa_trend.map(v => [v.d, v]))
    const cl = new Map(data.closed_by_day.map(v => [v.d, v]))
    return data.runs.map(r => ({
      d: r.d,
      hotel: r.d >= METHOD_SINCE && r.hotel_pct != null ? Number(r.hotel_pct) : null,
      villa: vt.get(r.d) && vt.get(r.d)!.booked ? share(vt.get(r.d)!.booked, vt.get(r.d)!.open) : null,
      closed: cl.get(r.d)?.nights ?? null,
    })).filter(d => d.hotel != null || d.villa != null)
  }, [data])

  // Рисуем в настоящих пикселях контейнера, чтобы подписи не растягивались вместе с SVG.
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(640)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = 220, L = 40, R = 60, T = 12, B = 28
  const x = (i: number) => L + (days.length <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (days.length - 1))
  const y = (v: number) => T + ((100 - v) * (H - T - B)) / 100
  const line = (k: 'hotel' | 'villa') =>
    days.map((d, i) => (d[k] == null ? null : `${x(i)},${y(d[k]!)}`)).filter(Boolean).join(' ')
  const lastOf = (k: 'hotel' | 'villa') => { for (let i = days.length - 1; i >= 0; i--) if (days[i][k] != null) return i; return -1 }
  const step = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor((W - L - R) / 56))))
  const h = hover != null ? days[hover] : null

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-[12px] text-[var(--ax-fg-soft)]">
        <Legend color="var(--ax-series-1)">Отели, занято номеров</Legend>
        <Legend color="var(--ax-series-2)">Виллы, сдано</Legend>
      </div>
      <div className="relative" ref={box}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label="Загрузка по дням: отели и виллы">
          {[0, 25, 50, 75, 100].map(v => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--ax-border)" strokeWidth={1} />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--ax-fg-muted)">{v}%</text>
            </g>
          ))}
          {days.map((d, i) => (i % step === 0 || i === days.length - 1) ? (
            <text key={d.d} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--ax-fg-muted)">{dm(d.d)}</text>
          ) : null)}
          {hover != null ? <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--ax-fg-faint)" strokeWidth={1} /> : null}
          {(['hotel', 'villa'] as const).map(k => {
            const c = k === 'hotel' ? 'var(--ax-series-1)' : 'var(--ax-series-2)'
            const li = lastOf(k)
            return (
              <g key={k}>
                <polyline points={line(k)} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {days.map((d, i) => d[k] == null ? null : (
                  <circle key={i} cx={x(i)} cy={y(d[k]!)} r={4} fill={c} stroke="var(--ax-panel)" strokeWidth={2} />
                ))}
                {li >= 0 ? (
                  <text x={x(li) + 10} y={y(days[li][k]!) + 4} fontSize={12} fill="var(--ax-fg)">{p(days[li][k])}</text>
                ) : null}
              </g>
            )
          })}
          {days.map((d, i) => (
            <rect
              key={d.d}
              x={x(i) - (W - L - R) / Math.max(2, days.length) / 2}
              y={T}
              width={(W - L - R) / Math.max(2, days.length)}
              height={H - T - B}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        {h ? (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-[var(--ax-border)] bg-[var(--ax-panel)] px-3 py-2 text-[12px] shadow-[0_1px_2px_rgb(0_0_0/.04),0_4px_12px_rgb(0_0_0/.08)]"
            style={{ left: `${(x(hover!) / W) * 100}%`, transform: `translateX(${hover! > days.length / 2 ? '-105%' : '5%'})` }}
          >
            <div className="font-semibold mb-1">{dm(h.d)}</div>
            <div>Отели: {p(h.hotel)}</div>
            <div>Виллы: {p(h.villa)}</div>
            <div className="text-[var(--ax-fg-muted)]">Закрылось ночей вилл: {n(h.closed)}</div>
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="text-[12px] text-[var(--ax-fg-muted)] text-left">
            <tr><Th>День</Th><Th right>Отели</Th><Th right>Виллы</Th><Th right>Брони вилл, ночей</Th></tr>
          </thead>
          <tbody>
            {[...days].reverse().map(d => (
              <tr key={d.d} className="border-t border-[var(--ax-border-soft)]">
                <Td>{dm(d.d)}</Td><Td right>{p(d.hotel)}</Td><Td right>{p(d.villa)}</Td><Td right>{n(d.closed)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Legend({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-[2px] w-4 rounded-full" style={{ background: color }} />
      {children}
    </span>
  )
}

// ── Таблицы ────────────────────────────────────────────────────────────────

function Bar({ v }: { v: number | null }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="tabular-nums w-[52px] text-right">{p(v)}</span>
      <span className="hidden sm:block h-2 w-24 rounded-full bg-[var(--ax-border-soft)] overflow-hidden" aria-hidden>
        <span className="block h-full rounded-full bg-[var(--ax-series-1)]" style={{ width: `${v ?? 0}%` }} />
      </span>
    </div>
  )
}

const SEG_ORDER = ['Номер', 'Семейный номер', 'Сьют', 'Бунгало', 'Апартаменты', 'Вилла']
const segRank = (s: string) => { if (s.includes('сдаётся отдельно')) return 9999; const i = SEG_ORDER.findIndex(x => s.startsWith(x)); return (i < 0 ? 99 : i) * 100 + (s.includes('не указаны') ? 50 : 0) }

function HotelSegTable({ rows }: { rows: OccHotelSeg[] }) {
  if (!rows.length) return <Empty>в этом районе нет отелей под наблюдением</Empty>
  const sorted = [...rows].sort((a, b) => segRank(a.seg) - segRank(b.seg) || a.seg.localeCompare(b.seg, 'ru'))
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="text-[12px] text-[var(--ax-fg-muted)] text-left">
          <tr><Th>Тип номера</Th><Th right hide>Объектов</Th><Th right>Номеров</Th><Th right>Занято</Th></tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.seg} className={`border-t border-[var(--ax-border-soft)] ${r.inv < MIN_UNITS ? 'opacity-50' : ''}`}>
              <Td>{r.seg}</Td><Td right hide>{n(r.props)}</Td><Td right>{n(r.inv)}</Td><Td right><Bar v={occ(r.free, r.inv)} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VillaSegTable({ rows }: { rows: OccVillaSeg[] }) {
  if (!rows.length) return <Empty>в этом районе нет вилл под наблюдением</Empty>
  const sorted = [...rows].sort((a, b) => segRank(a.seg) - segRank(b.seg) || a.seg.localeCompare(b.seg, 'ru'))
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="text-[12px] text-[var(--ax-fg-muted)] text-left">
          <tr><Th>Тип</Th><Th right hide>Объектов</Th><Th right>Сегодня</Th><Th right>2 нед.</Th><Th right hide>Дальше</Th></tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.seg} className={`border-t border-[var(--ax-border-soft)] ${r.units < MIN_UNITS ? 'opacity-50' : ''}`}>
              <Td>{r.seg}</Td><Td right hide>{n(r.units)}</Td>
              <Td right>{r.open ? `${p(share(r.booked, r.open))}` : '—'}<span className="hidden sm:inline text-[var(--ax-fg-muted)]"> · {n(r.booked)}/{n(r.open)}</span></Td>
              <Td right><Bar v={share(r.c14, r.n14)} /></Td>
              <Td right hide>{p(share(r.cfar, r.nfar))}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type ZoneKey = 'zone' | 'hotel' | 'delta' | 'rooms' | 'villa' | 'villas' | 'near'

function ZoneTable({ zones, prevOk, onPick }: { zones: OccZone[]; prevOk: boolean; onPick: (z: string) => void }) {
  const [sort, setSort] = useState<{ k: ZoneKey; desc: boolean }>({ k: 'hotel', desc: true })
  const rows = zones.map(z => {
    const hotel = occ(z.hotel_free, z.hotel_rooms), prev = prevOk ? occ(z.hotel_free_prev, z.hotel_rooms_prev) : null
    return { z, zone: z.zone, hotel, delta: hotel != null && prev != null ? Math.round(10 * (hotel - prev)) / 10 : null,
      rooms: z.hotel_rooms, villa: share(z.villa_booked, z.villa_open), villas: z.villas, near: share(z.c14, z.n14) }
  })
  rows.sort((a, b) => {
    const av = a[sort.k], bv = b[sort.k]
    if (av == null) return 1
    if (bv == null) return -1
    const c = typeof av === 'string' ? av.localeCompare(String(bv), 'ru') : Number(av) - Number(bv)
    return sort.desc ? -c : c
  })
  const head = (k: ZoneKey, label: string, right = true, hide = false) => (
    <th className={`font-normal pb-2 pr-3 last:pr-0 whitespace-nowrap ${right ? 'text-right' : ''} ${hide ? 'hidden sm:table-cell' : ''}`}>
      <button
        type="button"
        onClick={() => setSort(s => ({ k, desc: s.k === k ? !s.desc : k !== 'zone' }))}
        className="rounded hover:text-[var(--ax-fg)] focus-visible:outline-2 focus-visible:outline-[var(--ax-series-1)]"
      >
        {label}{sort.k === k ? (sort.desc ? ' ↓' : ' ↑') : ''}
      </button>
    </th>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="text-[12px] text-[var(--ax-fg-muted)] text-left">
          <tr>
            {head('zone', 'Район', false)}{head('hotel', 'Отели')}{head('delta', 'К вчера', true, true)}{head('rooms', 'Номеров', true, true)}
            {head('villa', 'Виллы')}{head('near', 'Виллы, 2 нед.', true, true)}{head('villas', 'Вилл', true, true)}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const small = (r.rooms ?? 0) < 100 && (r.villas ?? 0) < MIN_UNITS
            return (
              <tr
                key={r.zone}
                onClick={() => { onPick(r.zone); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className={`border-t border-[var(--ax-border-soft)] cursor-pointer hover:bg-[var(--ax-hover)] ${small ? 'opacity-50' : ''}`}
              >
                <Td>{r.zone}</Td>
                <Td right>{p(r.hotel)}</Td>
                <Td right hide>{r.delta == null ? '—' : <span className="text-[var(--ax-fg-soft)]">{r.delta > 0 ? '+' : ''}{r.delta.toLocaleString('ru-RU')} п.</span>}</Td>
                <Td right hide>{n(r.rooms)}</Td>
                <Td right>{p(r.villa)}</Td>
                <Td right hide>{p(r.near)}</Td>
                <Td right hide>{n(r.villas)}</Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Мелочи в стиле соседних админ-страниц (market/page.tsx) ──────────────

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl p-5">
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint ? <div className="text-[12px] text-[var(--ax-fg-muted)] max-w-[80ch]">{hint}</div> : null}
      </div>
      {children}
    </section>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl p-4">
      <div className="text-[12px] text-[var(--ax-fg-muted)]">{label}</div>
      <div className="text-[20px] font-semibold tracking-tight tabular-nums">{value}</div>
      {sub ? <div className="text-[12px] text-[var(--ax-fg-muted)] mt-0.5">{sub}</div> : null}
    </div>
  )
}

// hide — колонка второго плана, на телефоне не показываем (иначе цифры уезжают за край).
function Th({ children, right, hide }: { children: React.ReactNode; right?: boolean; hide?: boolean }) {
  return <th className={`font-normal pb-2 pr-3 last:pr-0 ${right ? 'text-right whitespace-nowrap' : ''} ${hide ? 'hidden sm:table-cell' : ''}`}>{children}</th>
}

function Td({ children, right, hide }: { children: React.ReactNode; right?: boolean; hide?: boolean }) {
  return <td className={`py-1.5 pr-3 last:pr-0 ${right ? 'text-right tabular-nums whitespace-nowrap' : ''} ${hide ? 'hidden sm:table-cell' : ''}`}>{children}</td>
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] text-[var(--ax-fg-muted)]">{children}</div>
}
