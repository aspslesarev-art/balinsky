'use client'

import { useMemo, useState } from 'react'
import type { ComplexUnit, UnitPoint } from '@/lib/market/complex-report'

// Полный список юнитов комплекса с историей по каждому: клик по строке
// разворачивает, что с юнитом происходило — как менялась цена и когда он
// сменил статус.

type SortKey = 'unit_key' | 'bedrooms' | 'area_m2' | 'status' | 'price_usd' | 'price_per_m2'
type SortDir = 'asc' | 'desc'

const STATUS_LABEL: Record<string, string> = {
  available: 'в продаже',
  reserved: 'бронь',
  sold: 'продан',
  unknown: 'статус неясен',
}

const STATUS_COLOR: Record<string, string> = {
  available: 'text-emerald-500',
  reserved: 'text-amber-500',
  sold: 'text-[var(--ax-fg-muted)]',
  unknown: 'text-[var(--ax-fg-faint)]',
}

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'available', label: 'В продаже' },
  { key: 'reserved', label: 'Бронь' },
  { key: 'sold', label: 'Продано' },
  { key: 'moved', label: 'Цена менялась' },
]

const COLUMNS: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: 'unit_key', label: 'Юнит' },
  { key: 'bedrooms', label: 'Спален', numeric: true },
  { key: 'area_m2', label: 'Площадь', numeric: true },
  { key: 'status', label: 'Статус' },
  { key: 'price_usd', label: 'Цена', numeric: true },
  { key: 'price_per_m2', label: '$/м²', numeric: true },
]

export function UnitsTable({
  units,
  history,
}: {
  units: ComplexUnit[]
  history: Record<number, UnitPoint[]>
}) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'unit_key', dir: 'asc' })
  const [open, setOpen] = useState<Set<number>>(new Set())

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = units.filter(u => {
      if (filter === 'moved' && !hasPriceMove(history[u.id])) return false
      if (filter !== 'all' && filter !== 'moved' && u.status !== filter) return false
      if (q && !`${u.unit_key} ${u.unit_type ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
    return [...filtered].sort((a, b) => compare(a, b, sort.key) * (sort.dir === 'asc' ? 1 : -1))
  }, [units, history, filter, query, sort])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[12px] px-2.5 py-1.5 rounded-lg border ${
              filter === f.key
                ? 'border-[var(--ax-fg)] text-[var(--ax-fg)]'
                : 'border-[var(--ax-border)] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]'
            }`}
          >
            {f.label}
            <span className="ml-1 opacity-60">{countFor(units, history, f.key)}</span>
          </button>
        ))}
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Номер юнита…"
          className="text-[12px] px-2.5 py-1.5 rounded-lg bg-[var(--ax-bg)] border border-[var(--ax-border)] outline-none w-[160px]"
        />
        <div className="ml-auto text-[12px] text-[var(--ax-fg-muted)]">
          {visible.length} из {units.length} · клик по строке — история
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="text-[var(--ax-fg-muted)] text-left">
            <tr>
              {COLUMNS.map(c => (
                <th
                  key={c.key}
                  onClick={() =>
                    setSort(s =>
                      s.key === c.key
                        ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
                        : { key: c.key, dir: c.numeric ? 'desc' : 'asc' },
                    )
                  }
                  className={`font-normal pb-2 cursor-pointer select-none hover:text-[var(--ax-fg)] ${c.numeric ? 'text-right' : ''}`}
                >
                  {c.label}
                  <span className="ml-1 opacity-60">{sort.key === c.key ? (sort.dir === 'asc' ? '↑' : '↓') : ''}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(u => {
              const points = history[u.id] ?? []
              const isOpen = open.has(u.id)
              return (
                <tr key={u.id} className="border-t border-[var(--ax-border)] align-top">
                  <td colSpan={COLUMNS.length} className="p-0">
                    <button
                      onClick={() =>
                        setOpen(prev => {
                          const next = new Set(prev)
                          if (next.has(u.id)) next.delete(u.id)
                          else next.add(u.id)
                          return next
                        })
                      }
                      className="w-full text-left hover:bg-[var(--ax-hover)]"
                    >
                      <span className="grid grid-cols-[1fr_70px_90px_130px_110px_90px] items-center py-1.5 px-1">
                        <span>
                          <span className="opacity-50 mr-1">{isOpen ? '▾' : '▸'}</span>
                          {u.unit_key}
                          {u.unit_type ? <span className="text-[var(--ax-fg-muted)]"> · {u.unit_type}</span> : null}
                          {u.returned_count > 0 && (
                            <span className="text-[11px] text-amber-500"> · возвращался {u.returned_count}×</span>
                          )}
                        </span>
                        <span className="text-right tabular-nums">{u.bedrooms ?? '—'}</span>
                        <span className="text-right tabular-nums">{u.area_m2 ? `${u.area_m2} м²` : '—'}</span>
                        <span className={STATUS_COLOR[u.status] ?? ''}>{STATUS_LABEL[u.status] ?? u.status}</span>
                        <span className="text-right tabular-nums">{money(u.price_usd)}</span>
                        <span className="text-right tabular-nums text-[var(--ax-fg-muted)]">
                          {u.price_per_m2 ? `$${Math.round(Number(u.price_per_m2)).toLocaleString('ru-RU')}` : '—'}
                        </span>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-6 pb-3 pt-1 text-[12px] space-y-1">
                        <div className="text-[var(--ax-fg-muted)]">
                          Впервые увиден {u.first_seen}, последний срез {u.last_seen}
                          {u.sold_at ? ` · продан ${u.sold_at}` : ''}
                        </div>
                        {points.length > 1 ? (
                          points.map((p, i) => {
                            const prev = points[i - 1]
                            const delta = prev && prev.price && p.price ? ((p.price - prev.price) / prev.price) * 100 : 0
                            return (
                              <div key={p.d} className="flex flex-wrap gap-x-3">
                                <span className="text-[var(--ax-fg-muted)] tabular-nums">{p.d}</span>
                                <span className={STATUS_COLOR[p.status] ?? ''}>{STATUS_LABEL[p.status] ?? p.status}</span>
                                <span className="tabular-nums">{money(p.price)}</span>
                                {delta !== 0 && (
                                  <span className={delta > 0 ? 'text-red-500' : 'text-emerald-500'}>
                                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-[var(--ax-fg-muted)]">
                            С начала наблюдения ничего не менялось — цена и статус те же
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {!visible.length && (
              <tr>
                <td colSpan={COLUMNS.length} className="py-6 text-center text-[var(--ax-fg-muted)]">
                  Под фильтр ничего не подошло
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function hasPriceMove(points: UnitPoint[] | undefined): boolean {
  if (!points || points.length < 2) return false
  return points.some((p, i) => i > 0 && points[i - 1].price !== p.price)
}

function countFor(units: ComplexUnit[], history: Record<number, UnitPoint[]>, key: string): number {
  if (key === 'all') return units.length
  if (key === 'moved') return units.filter(u => hasPriceMove(history[u.id])).length
  return units.filter(u => u.status === key).length
}

function compare(a: ComplexUnit, b: ComplexUnit, key: SortKey): number {
  if (key === 'unit_key') return a.unit_key.localeCompare(b.unit_key, 'ru', { numeric: true })
  if (key === 'status') return String(a.status).localeCompare(String(b.status))
  return num(a[key]) - num(b[key])
}

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function money(n: number | null): string {
  return n ? `$${Math.round(Number(n)).toLocaleString('ru-RU')}` : '—'
}
