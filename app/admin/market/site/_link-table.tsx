'use client'

import { useState } from 'react'
import type { LinkedRow, PendingRow } from '@/lib/market/site-report'

const usd = (n: number | null) => (n === null ? '—' : `$${n.toLocaleString('ru-RU')}`)

async function save(body: Record<string, unknown>): Promise<boolean> {
  const r = await fetch('/api/admin/market-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return r.ok
}

// Объявления, у которых пары ещё нет: выбрать юнит из списка комплекса.
export function PendingTable({ rows }: { rows: PendingRow[] }) {
  const [done, setDone] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [choice, setChoice] = useState<Record<string, number>>({})

  if (!rows.length) return <div className="text-[13px] text-[var(--ax-fg-muted)]">все объявления в комплексах трекера связаны</div>

  return (
    <div className="space-y-2">
      {rows.map(r => {
        const key = `${r.kind}:${r.listingId}`
        if (done[key]) return null
        return (
          <div key={key} className="flex flex-wrap items-center gap-2 text-[13px] border-b border-[var(--ax-border)] pb-2">
            <span className="w-[110px] font-medium">{r.listingName ?? r.listingId}</span>
            <span className="w-[200px] text-[var(--ax-fg-muted)] truncate">{r.complex}</span>
            <span className="w-[130px] text-[var(--ax-fg-muted)]">
              {r.listingArea ?? '?'} м², {r.listingBedrooms ?? '?'} сп. · {usd(r.listingPrice)}
            </span>
            <select
              className="flex-1 min-w-[260px] bg-[var(--ax-bg)] border border-[var(--ax-border)] rounded-lg px-2 py-1"
              value={choice[key] ?? ''}
              onChange={e => setChoice({ ...choice, [key]: Number(e.target.value) })}
            >
              <option value="">— выбрать юнит из прайса —</option>
              {r.candidates.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <button
              disabled={!choice[key] || busy === key}
              onClick={async () => {
                setBusy(key)
                const ok = await save({ listingKind: r.kind, listingId: r.listingId, unitId: choice[key] })
                setBusy(null)
                if (ok) setDone({ ...done, [key]: choice[key] })
              }}
              className="px-3 py-1 rounded-lg border border-[var(--ax-border)] disabled:opacity-40 hover:bg-[var(--ax-bg-soft)]"
            >
              {busy === key ? '…' : 'связать'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// Уже связанные: видно расхождение цены, можно выключить автообновление
// или снять пару.
export function LinkedTable({ rows }: { rows: LinkedRow[] }) {
  const [state, setState] = useState<Record<string, { auto: boolean; gone?: boolean }>>({})

  if (!rows.length) return <div className="text-[13px] text-[var(--ax-fg-muted)]">пар пока нет</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="text-[var(--ax-fg-muted)] text-left">
          <tr className="border-b border-[var(--ax-border)]">
            <th className="py-2 pr-3">объявление</th>
            <th className="py-2 pr-3">комплекс</th>
            <th className="py-2 pr-3">юнит в прайсе</th>
            <th className="py-2 pr-3 text-right">на сайте</th>
            <th className="py-2 pr-3 text-right">в прайсе</th>
            <th className="py-2 pr-3">статус</th>
            <th className="py-2 pr-3">надбавка</th>
            <th className="py-2 pr-3">авто</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const key = `${r.kind}:${r.listingId}`
            const s = state[key]
            if (s?.gone) return null
            const auto = s?.auto ?? r.autoSync
            const diff = r.listingPrice !== null && r.unitPrice !== null && Math.abs(r.listingPrice - r.unitPrice) >= 1
            return (
              <tr key={key} className="border-b border-[var(--ax-border)]">
                <td className="py-2 pr-3 font-medium">
                  {r.listingName ?? r.listingId}
                  {r.sharedUnit && (
                    <span className="ml-1 text-[11px] text-[var(--ax-fg-muted)]" title="у этого юнита в каталоге несколько объявлений — разная комплектация или перепродажа, у каждого своя цена и своя надбавка">
                      ×2
                    </span>
                  )}
                  {r.unitResale && (
                    <span className="ml-1 text-[11px] text-amber-500" title="в прайсе юнит помечен как перепродажа: цену ставит инвестор, а не застройщик — возможно, автообновление тут лишнее">
                      перепродажа
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-[var(--ax-fg-muted)]">{r.complex}</td>
                <td className="py-2 pr-3">{r.unitKey} <span className="text-[var(--ax-fg-muted)]">· {r.unitArea ?? '?'} м²</span></td>
                <td className="py-2 pr-3 text-right">{usd(r.listingPrice)}</td>
                <td className={`py-2 pr-3 text-right ${diff ? 'text-amber-500' : ''}`}>{usd(r.unitPrice)}</td>
                <td className="py-2 pr-3 text-[var(--ax-fg-muted)]">{r.unitStatus}</td>
                <td className="py-2 pr-3">
                  <MarkupInput row={r} />
                </td>
                <td className="py-2 pr-3">
                  <button
                    onClick={async () => {
                      const next = !auto
                      setState({ ...state, [key]: { auto: next } })
                      await save({ listingKind: r.kind, listingId: r.listingId, autoSync: next })
                    }}
                    className={`px-2 py-0.5 rounded-md border text-[12px] ${auto ? 'border-emerald-600 text-emerald-500' : 'border-[var(--ax-border)] text-[var(--ax-fg-muted)]'}`}
                  >
                    {auto ? 'вкл' : 'выкл'}
                  </button>
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={async () => {
                      setState({ ...state, [key]: { auto, gone: true } })
                      await save({ listingKind: r.kind, listingId: r.listingId, unitId: null })
                    }}
                    className="text-[12px] text-[var(--ax-fg-muted)] hover:text-red-500"
                  >
                    отвязать
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Надбавка каталога к прайсу в процентах. Объекты продаются
// меблированными, а прайс застройщика бывает и без мебели, и в
// рассрочку — процент фиксируется один раз, и дальше цена едет от прайса
// вместе с ним.
function MarkupInput({ row }: { row: LinkedRow }) {
  const initial = row.ratio === null ? '' : ((row.ratio - 1) * 100).toFixed(1)
  const [value, setValue] = useState(initial)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const commit = async () => {
    const pct = Number(value.replace(',', '.'))
    if (!Number.isFinite(pct)) { setState('error'); return }
    setState('saving')
    const ok = await save({ listingKind: row.kind, listingId: row.listingId, ratio: 1 + pct / 100 })
    setState(ok ? 'saved' : 'error')
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        value={value}
        onChange={e => { setValue(e.target.value); setState('idle') }}
        onBlur={() => { if (value !== initial) void commit() }}
        onKeyDown={e => { if (e.key === 'Enter') void commit() }}
        className={`w-[58px] bg-[var(--ax-bg)] border rounded-md px-1.5 py-0.5 text-right ${
          state === 'error' ? 'border-red-500' : state === 'saved' ? 'border-emerald-600' : 'border-[var(--ax-border)]'
        }`}
        placeholder="0"
      />
      <span className="text-[var(--ax-fg-muted)]">%</span>
    </span>
  )
}
