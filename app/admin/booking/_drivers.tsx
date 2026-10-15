'use client'

// «Что влияет на загрузку»: удобства, признаки с фото, место и отзывы.
// Разница — внутри похожих объектов (район × тип/спальни), см. миграцию 108.

import { useMemo, useState } from 'react'
import type { OccDriver, OccDriversMeta } from '@/lib/booking-occ/dashboard'
import { featureLabel } from '@/lib/booking-occ/feature-labels'

const MIN_N = 30 // меньше 30 с признаком или без — наблюдение, а не вывод
const SCALE = 20 // полуширина шкалы разницы, п.п.

type Kind = OccDriver['kind']
type Source = 'all' | OccDriver['source']
type Level = 'sure' | 'likely' | 'noise'

const KIND_LABEL: Record<Kind, string> = { hotel: 'Отели и гестхаусы', villa: 'Сдаются целиком (виллы)' }
const KIND_UNIT: Record<Kind, string> = { hotel: 'типов номеров', villa: 'объектов' }
const SOURCE_LABEL: Record<Source, string> = { all: 'Все', fac: 'Удобства', ph: 'Фото', pl: 'Место и отзывы' }
const LEVEL_LABEL: Record<Level, string> = { sure: 'уверенно', likely: 'вероятно', noise: 'шум' }

// Признаков сотни, поэтому порог «уверенно» строже обычных двух ошибок:
// при 2σ каждый двадцатый признак выглядел бы важным случайно.
function level(r: OccDriver): Level {
  if (r.n_with < MIN_N || r.n_without < MIN_N || !r.se) return 'noise'
  const z = Math.abs(r.lift) / r.se
  return z >= 3 ? 'sure' : z >= 2 ? 'likely' : 'noise'
}
const pp = (v: number) => `${v > 0 ? '+' : ''}${v.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} п.`
const pct = (v: number) => `${Math.round(v)}%`
const n = (v: number) => v.toLocaleString('ru-RU')
const dm = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`

export function OccDrivers({ rows, meta }: { rows: OccDriver[]; meta: OccDriversMeta | null }) {
  const [kind, setKind] = useState<Kind>('villa')
  const [source, setSource] = useState<Source>('all')
  const [all, setAll] = useState(false)
  const [sort, setSort] = useState<{ k: 'lift' | 'n'; desc: boolean }>({ k: 'lift', desc: true })

  const scoped = useMemo(() => rows.filter(r => r.kind === kind).map(r => ({ ...r, lvl: level(r) })), [rows, kind])
  const top = useMemo(() => {
    const sure = scoped.filter(r => r.lvl === 'sure')
    return {
      up: [...sure].filter(r => r.lift > 0).sort((a, b) => b.lift - a.lift).slice(0, 5),
      down: [...sure].filter(r => r.lift < 0).sort((a, b) => a.lift - b.lift).slice(0, 5),
    }
  }, [scoped])
  const list = scoped
    .filter(r => (source === 'all' || r.source === source) && (all || r.lvl !== 'noise'))
    .sort((a, b) => {
      const c = sort.k === 'lift' ? a.lift - b.lift : a.n_with - b.n_with
      return sort.desc ? -c : c
    })

  const units = meta ? (kind === 'hotel' ? meta.hotel_units : meta.villa_units) : 0
  const vision = meta ? (kind === 'hotel' ? meta.hotel_vision : meta.villa_vision) : 0

  return (
    <section className="bg-[var(--ax-panel)] border border-[var(--ax-border)] rounded-2xl p-5 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold">Что влияет на загрузку</h2>
          <div className="text-[12px] text-[var(--ax-fg-muted)] max-w-[80ch]">
            Сравниваю похожие объекты: тот же район, тот же тип и число спален — с признаком и без него.
            {meta?.first_day && meta.last_day
              ? ` Данные: ${dm(meta.first_day)}–${dm(meta.last_day)} (${meta.days} дн.), ${n(units)} ${KIND_UNIT[kind]}, фото разобраны у ${n(vision)}.`
              : ''}
            {' '}Пока данных мало — картина предварительная, надёжная примерно через 3–4 недели.
          </div>
        </div>
        <Segmented value={kind} onChange={setKind} options={(['villa', 'hotel'] as Kind[]).map(k => [k, KIND_LABEL[k]])} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TopList title="Чаще занято, если есть" rows={top.up} kind={kind} empty="уверенных плюсов пока нет" />
        <TopList title="Реже занято, если есть" rows={top.down} kind={kind} empty="уверенных минусов пока нет" />
      </div>

      <p className="max-w-[80ch] text-[12px] leading-relaxed text-[var(--ax-fg-muted)]">
        Это связь, а не доказанная причина. Мелочи вроде фена, утюга или чайника обычно говорят о другом: хозяин аккуратно
        заполнил объявление и следит за объектом. Фото сравниваются только среди номеров, где фото уже разобраны.
        {kind === 'villa' && vision < 300 ? ' У вилл фото разобраны пока у немногих — их разбор идёт первым, полная картина через 3–4 ночи.' : ''}
      </p>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented value={source} onChange={setSource} options={(['all', 'fac', 'ph', 'pl'] as Source[]).map(s => [s, SOURCE_LABEL[s]])} />
          <label className="inline-flex items-center gap-2 text-[12px] text-[var(--ax-fg-muted)] cursor-pointer">
            <input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} className="accent-[var(--ax-series-1)]" />
            показать и шум
          </label>
        </div>
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-[12px] text-[var(--ax-fg-muted)] text-left">
                <tr>
                  <th className="font-normal pb-2 pr-3">Признак</th>
                  <SortTh label="Есть у" active={sort.k === 'n'} desc={sort.desc} onClick={() => setSort(s => ({ k: 'n', desc: s.k === 'n' ? !s.desc : true }))} hide />
                  <th className="font-normal pb-2 pr-3 text-right whitespace-nowrap hidden sm:table-cell">С ним</th>
                  <th className="font-normal pb-2 pr-3 text-right whitespace-nowrap hidden sm:table-cell">Без него</th>
                  <SortTh label="Разница" active={sort.k === 'lift'} desc={sort.desc} onClick={() => setSort(s => ({ k: 'lift', desc: s.k === 'lift' ? !s.desc : true }))} />
                  <th className="font-normal pb-2 text-right whitespace-nowrap hidden md:table-cell">Надёжность</th>
                </tr>
              </thead>
              <tbody>
                {list.map(r => (
                  <tr key={r.source + r.feature} className={`border-t border-[var(--ax-border-soft)] ${r.lvl === 'noise' ? 'opacity-50' : ''}`}>
                    <td className="py-1.5 pr-3">
                      {featureLabel(r.feature)}
                      <span className="ml-2 text-[12px] text-[var(--ax-fg-muted)]">{SOURCE_LABEL[r.source]}</span>
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap hidden sm:table-cell">{n(r.n_with)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums hidden sm:table-cell">{pct(r.occ_with)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums hidden sm:table-cell">{pct(r.occ_with - r.lift)}</td>
                    <td className="py-1.5 pr-3"><Diverging v={r.lift} /></td>
                    <td className="py-1.5 text-right text-[12px] text-[var(--ax-fg-muted)] whitespace-nowrap hidden md:table-cell">
                      {LEVEL_LABEL[r.lvl]} <span className="tabular-nums">±{r.se.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-[13px] text-[var(--ax-fg-muted)]">
            {all ? 'нет данных' : 'уверенных выводов в этом разделе пока нет — включи «показать и шум», чтобы увидеть всё'}
          </div>
        )}
      </div>
    </section>
  )
}

function TopList({ title, rows, kind, empty }: { title: string; rows: (OccDriver & { lvl: Level })[]; kind: Kind; empty: string }) {
  return (
    <div className="rounded-xl border border-[var(--ax-border)] p-4">
      <div className="text-[12px] text-[var(--ax-fg-muted)] mb-2">{title}</div>
      {rows.length ? (
        <ul className="space-y-2">
          {rows.map(r => (
            <li key={r.feature} className="text-[13px] leading-snug">
              <span className="font-semibold tabular-nums">{pp(r.lift)}</span> {featureLabel(r.feature)}
              <div className="text-[12px] text-[var(--ax-fg-muted)]">
                с ним {pct(r.occ_with)}, у похожих без него ~{pct(r.occ_with - r.lift)} · {n(r.n_with)} {KIND_UNIT[kind]}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-[13px] text-[var(--ax-fg-muted)]">{empty}</div>
      )}
    </div>
  )
}

// Расходящаяся шкала от нуля: синий — чаще занято, красный — реже (палитра dataviz).
function Diverging({ v }: { v: number }) {
  const w = Math.min(Math.abs(v), SCALE) / SCALE * 50
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="tabular-nums w-[64px] text-right whitespace-nowrap">{pp(v)}</span>
      <span className="relative hidden sm:block h-2 w-28 rounded-full bg-[var(--ax-border-soft)]" aria-hidden>
        <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--ax-fg-faint)]" />
        <span
          className="absolute inset-y-0 rounded-full"
          style={{ width: `${w}%`, left: v >= 0 ? '50%' : `${50 - w}%`, background: v >= 0 ? 'var(--ax-series-1)' : 'var(--ax-neg)' }}
        />
      </span>
    </div>
  )
}

function SortTh({ label, active, desc, onClick, hide }: { label: string; active: boolean; desc: boolean; onClick: () => void; hide?: boolean }) {
  return (
    <th className={`font-normal pb-2 pr-3 text-right whitespace-nowrap ${hide ? 'hidden sm:table-cell' : ''}`}>
      <button type="button" onClick={onClick} className="rounded hover:text-[var(--ax-fg)] focus-visible:outline-2 focus-visible:outline-[var(--ax-series-1)]">
        {label}{active ? (desc ? ' ↓' : ' ↑') : ''}
      </button>
    </th>
  )
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-[var(--ax-border)] p-0.5" role="tablist">
      {options.map(([k, label]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={`rounded-md px-3 py-1.5 text-[12px] transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-[var(--ax-series-1)] ${
            value === k ? 'bg-[var(--ax-hover)] text-[var(--ax-fg)] font-semibold' : 'text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
