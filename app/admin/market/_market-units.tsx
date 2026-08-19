'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Picker } from './_picker'
import type { MarketUnitRow } from '@/lib/market/units-report'

// Сквозная таблица по всем юнитам рынка: фильтры по застройщику,
// комплексу, статусу, спальням, цене и площади плюс движение цены.
// Всё считается на клиенте — данные приходят разом.

type SortKey = 'developer' | 'complex' | 'unit_key' | 'bedrooms' | 'area_m2' | 'status' | 'price_usd' | 'price_per_m2' | 'priceChangePct'
type SortDir = 'asc' | 'desc'

const PAGE = 300

const STATUS_LABEL: Record<string, string> = {
  available: 'в продаже',
  reserved: 'бронь',
  sold: 'продан',
  unknown: 'неясен',
}

const STATUS_COLOR: Record<string, string> = {
  available: 'text-emerald-500',
  reserved: 'text-amber-500',
  sold: 'text-[var(--ax-fg-muted)]',
  unknown: 'text-[var(--ax-fg-faint)]',
}

const STATUSES = ['available', 'reserved', 'sold', 'unknown'] as const
const BEDROOMS = ['1', '2', '3', '4+'] as const
const MOVES = [
  { key: 'any', label: 'Любое движение цены' },
  { key: 'down', label: 'Подешевели' },
  { key: 'up', label: 'Подорожали' },
] as const

const COLUMNS: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: 'developer', label: 'Застройщик' },
  { key: 'complex', label: 'Комплекс' },
  { key: 'unit_key', label: 'Юнит' },
  { key: 'bedrooms', label: 'Сп.', numeric: true },
  { key: 'area_m2', label: 'Площадь', numeric: true },
  { key: 'status', label: 'Статус' },
  { key: 'price_usd', label: 'Цена', numeric: true },
  { key: 'price_per_m2', label: '$/м²', numeric: true },
  { key: 'priceChangePct', label: 'Δ цены', numeric: true },
]

export function MarketUnits({ units }: { units: MarketUnitRow[] }) {
  const [devs, setDevs] = useState<Set<string>>(new Set())
  const [complexes, setComplexes] = useState<Set<string>>(new Set())
  const [statuses, setStatuses] = useState<Set<string>>(new Set(['available']))
  const [beds, setBeds] = useState<Set<string>>(new Set())
  const [move, setMove] = useState<string | null>(null)
  const [priceFrom, setPriceFrom] = useState('')
  const [priceTo, setPriceTo] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'price_usd', dir: 'desc' })
  const [limit, setLimit] = useState(PAGE)

  const allDevs = useMemo(
    () => [...new Set(units.map(u => u.developer))].sort((a, b) => a.localeCompare(b, 'ru')),
    [units],
  )

  const allComplexes = useMemo(() => {
    const pool = devs.size ? units.filter(u => devs.has(u.developer)) : units
    return [...new Set(pool.map(u => u.complex))].sort((a, b) => a.localeCompare(b, 'ru'))
  }, [units, devs])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const from = Number(priceFrom.replace(/\D/g, '')) || 0
    const to = Number(priceTo.replace(/\D/g, '')) || Infinity

    const filtered = units.filter(u => {
      if (devs.size && !devs.has(u.developer)) return false
      if (complexes.size && !complexes.has(u.complex)) return false
      if (statuses.size && !statuses.has(u.status)) return false
      if (beds.size && !beds.has(bedKey(u.bedrooms))) return false
      if (move === 'any' && u.priceChangePct === null) return false
      if (move === 'down' && !(u.priceChangePct !== null && u.priceChangePct < 0)) return false
      if (move === 'up' && !(u.priceChangePct !== null && u.priceChangePct > 0)) return false
      // Юнит без цены не должен молча выпадать, когда границы не заданы.
      if ((from > 0 || to < Infinity) && (u.price_usd === null || u.price_usd < from || u.price_usd > to)) return false
      if (q && !`${u.unit_key} ${u.complex} ${u.developer} ${u.unit_type ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })

    return [...filtered].sort((a, b) => compare(a, b, sort.key) * (sort.dir === 'asc' ? 1 : -1))
  }, [units, devs, complexes, statuses, beds, move, priceFrom, priceTo, query, sort])

  const totals = useMemo(
    () => ({
      count: visible.length,
      value: visible.reduce((s, u) => s + (u.price_usd ?? 0), 0),
      withPrice: visible.filter(u => u.price_usd !== null).length,
    }),
    [visible],
  )

  const reset = () => {
    setDevs(new Set()); setComplexes(new Set()); setStatuses(new Set()); setBeds(new Set())
    setMove(null); setPriceFrom(''); setPriceTo(''); setQuery('')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Picker
          label="Застройщик"
          options={allDevs}
          selected={devs}
          onChange={next => {
            setDevs(next)
            setComplexes(prev => {
              const pool = new Set((next.size ? units.filter(u => next.has(u.developer)) : units).map(u => u.complex))
              return new Set([...prev].filter(c => pool.has(c)))
            })
          }}
        />
        <Picker label="Комплекс" options={allComplexes} selected={complexes} onChange={setComplexes} />

        <Chips
          options={STATUSES.map(s => ({ key: s, label: STATUS_LABEL[s] }))}
          selected={statuses}
          onToggle={k => setStatuses(toggle(statuses, k))}
        />
        <Chips
          options={BEDROOMS.map(b => ({ key: b, label: `${b} сп.` }))}
          selected={beds}
          onToggle={k => setBeds(toggle(beds, k))}
        />

        {MOVES.map(m => (
          <button
            key={m.key}
            onClick={() => setMove(prev => (prev === m.key ? null : m.key))}
            className={`text-[12px] px-2.5 py-1.5 rounded-lg border ${
              move === m.key
                ? 'border-[var(--ax-fg)] text-[var(--ax-fg)]'
                : 'border-[var(--ax-border)] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]'
            }`}
          >
            {m.label}
          </button>
        ))}

        <div className="flex items-center gap-1 text-[12px] text-[var(--ax-fg-muted)]">
          <span>$</span>
          <input value={priceFrom} onChange={e => setPriceFrom(e.target.value)} placeholder="от"
            className="w-[80px] px-2 py-1.5 rounded-lg bg-[var(--ax-bg)] border border-[var(--ax-border)] outline-none" />
          <input value={priceTo} onChange={e => setPriceTo(e.target.value)} placeholder="до"
            className="w-[80px] px-2 py-1.5 rounded-lg bg-[var(--ax-bg)] border border-[var(--ax-border)] outline-none" />
        </div>

        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск…"
          className="text-[12px] px-2.5 py-1.5 rounded-lg bg-[var(--ax-bg)] border border-[var(--ax-border)] outline-none w-[150px]" />

        <button onClick={reset}
          className="text-[12px] px-2.5 py-1.5 rounded-lg border border-[var(--ax-border)] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]">
          Сбросить
        </button>
      </div>

      <div className="text-[12px] text-[var(--ax-fg-muted)]">
        {totals.count} юнитов из {units.length} · сумма по {totals.withPrice} с ценой: {usd(totals.value)}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="text-[var(--ax-fg-muted)] text-left">
            <tr>
              {COLUMNS.map(c => (
                <th key={c.key}
                  onClick={() =>
                    setSort(s => (s.key === c.key
                      ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
                      : { key: c.key, dir: c.numeric ? 'desc' : 'asc' }))
                  }
                  className={`font-normal pb-2 cursor-pointer select-none hover:text-[var(--ax-fg)] ${c.numeric ? 'text-right' : ''}`}>
                  {c.label}
                  <span className="ml-1 opacity-60">{sort.key === c.key ? (sort.dir === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, limit).map(u => (
              <tr key={u.id} className="border-t border-[var(--ax-border)] hover:bg-[var(--ax-hover)]">
                <td className="py-1.5 text-[var(--ax-fg-muted)]">{u.developer}</td>
                <td className="py-1.5">
                  <Link href={`/admin/market/${encodeURIComponent(u.developer)}/${encodeURIComponent(u.complex)}`}
                    className="underline decoration-[var(--ax-border)] underline-offset-2 hover:decoration-current">
                    {u.complex}
                  </Link>
                </td>
                <td className="py-1.5">
                  {u.unit_key}
                  {u.returned_count > 0 && <span className="text-[11px] text-amber-500"> ↩{u.returned_count}</span>}
                </td>
                <td className="py-1.5 text-right tabular-nums">{u.bedrooms ?? '—'}</td>
                <td className="py-1.5 text-right tabular-nums">{u.area_m2 ? `${u.area_m2} м²` : '—'}</td>
                <td className={`py-1.5 ${STATUS_COLOR[u.status] ?? ''}`}>{STATUS_LABEL[u.status] ?? u.status}</td>
                <td className="py-1.5 text-right tabular-nums">{money(u.price_usd)}</td>
                <td className="py-1.5 text-right tabular-nums text-[var(--ax-fg-muted)]">
                  {u.price_per_m2 ? `$${Math.round(u.price_per_m2).toLocaleString('ru-RU')}` : '—'}
                </td>
                <td className={`py-1.5 text-right tabular-nums ${u.priceChangePct === null ? 'text-[var(--ax-fg-faint)]' : u.priceChangePct > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {u.priceChangePct === null ? '—' : `${u.priceChangePct > 0 ? '+' : ''}${u.priceChangePct.toFixed(1)}%`}
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr><td colSpan={COLUMNS.length} className="py-6 text-center text-[var(--ax-fg-muted)]">Под фильтры ничего не подошло</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {visible.length > limit && (
        <button onClick={() => setLimit(l => l + PAGE)}
          className="w-full py-2 text-[12px] rounded-lg border border-[var(--ax-border)] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]">
          Показать ещё {Math.min(PAGE, visible.length - limit)} из {visible.length - limit}
        </button>
      )}
    </div>
  )
}

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ key: string; label: string }>
  selected: Set<string>
  onToggle: (key: string) => void
}) {
  return (
    <div className="flex gap-1">
      {options.map(o => (
        <button key={o.key} onClick={() => onToggle(o.key)}
          className={`text-[12px] px-2 py-1.5 rounded-lg border ${
            selected.has(o.key)
              ? 'border-[var(--ax-fg)] text-[var(--ax-fg)]'
              : 'border-[var(--ax-border)] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function toggle(set: Set<string>, key: string): Set<string> {
  const next = new Set(set)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

function bedKey(n: number | null): string {
  if (n === null) return '—'
  return n >= 4 ? '4+' : String(n)
}

function compare(a: MarketUnitRow, b: MarketUnitRow, key: SortKey): number {
  switch (key) {
    case 'developer': return a.developer.localeCompare(b.developer, 'ru')
    case 'complex': return a.complex.localeCompare(b.complex, 'ru')
    case 'unit_key': return a.unit_key.localeCompare(b.unit_key, 'ru', { numeric: true })
    case 'status': return a.status.localeCompare(b.status)
    // Юниты без значения всегда внизу, куда бы ни сортировали: иначе
    // верх таблицы занимают прочерки.
    default: return nullLast(a[key]) - nullLast(b[key])
  }
}

function nullLast(v: number | null): number {
  return v === null ? -Infinity : v
}

function usd(n: number): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)} млн`
  return `$${Math.round(n).toLocaleString('ru-RU')}`
}

function money(n: number | null): string {
  return n === null ? '—' : `$${Math.round(n).toLocaleString('ru-RU')}`
}
