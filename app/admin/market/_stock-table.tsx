'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { StockRow } from '@/lib/market/report'

// Таблица объёма по комплексам: фильтры по застройщику и комплексу плюс
// сортировка по любой колонке. Данные приходят целиком (сотня строк —
// это немного), поэтому фильтрация и сортировка идут на клиенте и
// работают мгновенно, без похода на сервер.

type SortKey = 'developer' | 'complex' | 'available' | 'reserved' | 'sold' | 'total' | 'value'
type SortDir = 'asc' | 'desc'

const COLUMNS: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: 'developer', label: 'Застройщик' },
  { key: 'complex', label: 'Комплекс' },
  { key: 'available', label: 'В продаже', numeric: true },
  { key: 'reserved', label: 'Бронь', numeric: true },
  { key: 'sold', label: 'Продано', numeric: true },
  { key: 'total', label: 'Всего', numeric: true },
  { key: 'value', label: 'Объём, $', numeric: true },
]

export function StockTable({ rows }: { rows: StockRow[] }) {
  const [devs, setDevs] = useState<Set<string>>(new Set())
  const [complexes, setComplexes] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'value', dir: 'desc' })

  const allDevs = useMemo(
    () => [...new Set(rows.map(r => r.developer))].sort((a, b) => a.localeCompare(b, 'ru')),
    [rows],
  )

  // Список комплексов сужается под выбранных застройщиков — иначе в нём
  // сотня чужих названий, среди которых не найти нужное.
  const allComplexes = useMemo(() => {
    const pool = devs.size ? rows.filter(r => devs.has(r.developer)) : rows
    return [...new Set(pool.map(r => r.complex))].sort((a, b) => a.localeCompare(b, 'ru'))
  }, [rows, devs])

  const visible = useMemo(() => {
    const filtered = rows.filter(
      r => (!devs.size || devs.has(r.developer)) && (!complexes.size || complexes.has(r.complex)),
    )
    return [...filtered].sort((a, b) => compare(a, b, sort.key) * (sort.dir === 'asc' ? 1 : -1))
  }, [rows, devs, complexes, sort])

  const totals = useMemo(
    () =>
      visible.reduce(
        (acc, r) => ({
          available: acc.available + num(r.available),
          reserved: acc.reserved + num(r.reserved),
          sold: acc.sold + num(r.sold),
          value: acc.value + num(r.available_value_usd),
        }),
        { available: 0, reserved: 0, sold: 0, value: 0 },
      ),
    [visible],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Picker
          label="Застройщик"
          options={allDevs}
          selected={devs}
          onChange={next => {
            setDevs(next)
            // Выбранный комплекс мог принадлежать снятому застройщику —
            // иначе таблица молча опустеет.
            setComplexes(prev => {
              const pool = new Set(
                (next.size ? rows.filter(r => next.has(r.developer)) : rows).map(r => r.complex),
              )
              return new Set([...prev].filter(c => pool.has(c)))
            })
          }}
        />
        <Picker label="Комплекс" options={allComplexes} selected={complexes} onChange={setComplexes} />

        {(devs.size > 0 || complexes.size > 0) && (
          <button
            onClick={() => { setDevs(new Set()); setComplexes(new Set()) }}
            className="text-[12px] px-2.5 py-1.5 rounded-lg border border-[var(--ax-border)] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)]"
          >
            Сбросить
          </button>
        )}

        <div className="ml-auto text-[12px] text-[var(--ax-fg-muted)]">
          {visible.length} из {rows.length} · в продаже {totals.available} на {usd(totals.value)}
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
            {visible.map((r, i) => (
              <tr key={`${r.developer}/${r.complex}/${i}`} className="border-t border-[var(--ax-border)] hover:bg-[var(--ax-bg)]">
                <td className="py-1.5 text-[var(--ax-fg-muted)]">{r.developer}</td>
                <td className="py-1.5">
                  <Link
                    href={`/admin/market/${encodeURIComponent(r.developer)}/${encodeURIComponent(r.complex)}`}
                    className="underline decoration-[var(--ax-border)] underline-offset-2 hover:decoration-current"
                  >
                    {r.complex}
                  </Link>
                </td>
                <td className="py-1.5 text-right tabular-nums">{r.available}</td>
                <td className="py-1.5 text-right tabular-nums">{r.reserved}</td>
                <td className="py-1.5 text-right tabular-nums">{r.sold}</td>
                <td className="py-1.5 text-right tabular-nums text-[var(--ax-fg-muted)]">{r.total}</td>
                <td className="py-1.5 text-right tabular-nums">{r.available_value_usd ? usd(num(r.available_value_usd)) : '—'}</td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={COLUMNS.length} className="py-6 text-center text-[var(--ax-fg-muted)]">
                  Под фильтры ничего не подошло
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Выпадающий список с галочками. На <details> — чтобы закрытие по клику
// вне и по Esc работали сами, без обработчиков на document.
function Picker({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const [query, setQuery] = useState('')
  const shown = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options

  return (
    <details className="relative">
      <summary className="list-none cursor-pointer text-[12px] px-2.5 py-1.5 rounded-lg border border-[var(--ax-border)] hover:text-[var(--ax-fg)] text-[var(--ax-fg-muted)]">
        {label}
        {selected.size > 0 && <span className="ml-1.5 text-[var(--ax-fg)]">· {selected.size}</span>}
      </summary>

      <div className="absolute z-20 mt-1 w-[280px] max-h-[320px] overflow-auto rounded-xl border border-[var(--ax-border)] bg-[var(--ax-panel)] p-2 shadow-lg">
        {options.length > 8 && (
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск…"
            className="w-full mb-2 px-2 py-1 text-[12px] rounded-lg bg-[var(--ax-bg)] border border-[var(--ax-border)] outline-none"
          />
        )}
        {shown.map(o => (
          <label key={o} className="flex items-center gap-2 px-1 py-1 text-[12px] cursor-pointer hover:text-[var(--ax-fg)]">
            <input
              type="checkbox"
              checked={selected.has(o)}
              onChange={() => {
                const next = new Set(selected)
                if (next.has(o)) next.delete(o)
                else next.add(o)
                onChange(next)
              }}
            />
            <span className="truncate">{o}</span>
          </label>
        ))}
        {!shown.length && <div className="text-[12px] text-[var(--ax-fg-muted)] px-1 py-2">Ничего не найдено</div>}
      </div>
    </details>
  )
}

function compare(a: StockRow, b: StockRow, key: SortKey): number {
  switch (key) {
    case 'developer': return a.developer.localeCompare(b.developer, 'ru')
    case 'complex': return a.complex.localeCompare(b.complex, 'ru')
    case 'value': return num(a.available_value_usd) - num(b.available_value_usd)
    default: return num(a[key]) - num(b[key])
  }
}

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function usd(n: number): string {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)} млн`
  return `$${Math.round(n).toLocaleString('ru-RU')}`
}
