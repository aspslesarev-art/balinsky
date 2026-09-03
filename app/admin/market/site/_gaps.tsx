'use client'

import { useState } from 'react'

type Offer = {
  key: string
  area: number | null
  bedrooms: number | null
  price: number
  unitKeys: string[]
  floor: string | null
  unitType: string | null
}

type Gap = {
  complexKey: string
  complex: string
  developer: string
  kind: 'villa' | 'apartment'
  donorId: string | null
  donorName: string | null
  ratio: number
  missing: Offer[]
  covered: number
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('ru-RU')}`
// Смешанный комплекс приходит двумя строками — виллы и апартаменты отдельно.
const rowId = (g: Gap) => `${g.complexKey}:${g.kind}`

// «Есть в прайсе, нет на сайте»: то, что раньше искалось глазами по зелёным
// строкам прайса. Отчёт считается по кнопке, а не при открытии страницы, — он
// читает все объявления и все юниты, и держать его в рендере значило бы
// платить этим при каждом заходе.
export function CatalogGaps() {
  const [gaps, setGaps] = useState<Gap[] | null>(null)
  const [state, setState] = useState<'idle' | 'load' | 'error'>('idle')
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [done, setDone] = useState<Record<string, string>>({})

  const load = async () => {
    setState('load')
    try {
      const r = await fetch('/api/admin/market-gaps')
      const d = await r.json()
      if (Array.isArray(d?.gaps)) { setGaps(d.gaps as Gap[]); setState('idle') } else setState('error')
    } catch { setState('error') }
  }

  const create = async (gap: Gap, offers: string[]) => {
    const id = rowId(gap)
    setBusy(id)
    try {
      const r = await fetch('/api/admin/market-gaps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ complex: gap.complexKey, kind: gap.kind, offers }),
      })
      const d = await r.json()
      const created = Array.isArray(d?.created) ? d.created.length : 0
      const failed: Array<{ error?: string }> = Array.isArray(d?.errors) ? d.errors : []
      setDone(prev => ({
        ...prev,
        [id]: failed.length
          ? `заведено ${created}, не вышло ${failed.length}: ${failed[0]?.error ?? ''}`
          : `заведено карточек: ${created}`,
      }))
      if (created) await load()
    } catch {
      setDone(prev => ({ ...prev, [id]: 'не получилось' }))
    } finally {
      setBusy(null)
    }
  }

  if (gaps === null) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={load}
          disabled={state === 'load'}
          className="text-[12px] px-3 py-1.5 rounded-lg border border-[var(--ax-border)] hover:bg-[var(--ax-bg-soft)] disabled:opacity-50"
        >
          {state === 'load' ? 'считаю…' : 'Показать, чего нет на сайте'}
        </button>
        {state === 'error' && <span className="text-[12px] text-red-500">не получилось</span>}
      </div>
    )
  }

  const total = gaps.reduce((s, g) => s + g.missing.length, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-[13px]">
          Не представлено на сайте: <b>{total}</b> предложений в {gaps.length} комплексах
        </span>
        <button onClick={load} disabled={state === 'load'} className="text-[12px] text-[var(--ax-fg-muted)] hover:text-[var(--ax-fg)] disabled:opacity-50">
          пересчитать
        </button>
      </div>

      <div className="divide-y divide-[var(--ax-border-soft)] border border-[var(--ax-border)] rounded-xl overflow-hidden">
        {gaps.map(g => (
          <div key={rowId(g)}>
            <div className="flex items-center gap-3 px-3 py-2 bg-[var(--ax-panel)]">
              <button
                onClick={() => setOpen(open === rowId(g) ? null : rowId(g))}
                className="flex-1 text-left text-[13px]"
              >
                <span className="font-medium">{g.complex}</span>
                <span className="text-[var(--ax-fg-muted)]"> · {g.developer} · {g.kind === 'villa' ? 'виллы' : 'апартаменты'}</span>
                <span className="text-[var(--ax-fg-muted)]"> — нет {g.missing.length}, есть {g.covered}</span>
              </button>
              {g.donorId ? (
                <button
                  onClick={() => create(g, [])}
                  disabled={busy !== null}
                  className="text-[12px] px-2.5 py-1 rounded-lg border border-[var(--ax-border)] hover:bg-[var(--ax-bg-soft)] disabled:opacity-50"
                >
                  {busy === rowId(g) ? 'завожу…' : `Завести все ${g.missing.length}`}
                </button>
              ) : (
                <span className="text-[12px] text-amber-600">нет образца — заведите первую карточку руками</span>
              )}
            </div>

            {done[rowId(g)] && (
              <div className="px-3 py-1.5 text-[12px] text-[var(--ax-fg-muted)]">{done[rowId(g)]}</div>
            )}

            {open === rowId(g) && (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="text-[var(--ax-fg-muted)]">
                    <tr className="text-left">
                      <th className="px-3 py-1.5 font-normal">юнит</th>
                      <th className="px-3 py-1.5 font-normal">тип</th>
                      <th className="px-3 py-1.5 font-normal">этаж</th>
                      <th className="px-3 py-1.5 font-normal">площадь</th>
                      <th className="px-3 py-1.5 font-normal">цена прайса</th>
                      <th className="px-3 py-1.5 font-normal">цена карточки</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {g.missing.map(o => (
                      <tr key={o.key} className="border-t border-[var(--ax-border-soft)]">
                        <td className="px-3 py-1.5">
                          {o.unitKeys.slice(0, 4).join(', ')}
                          {o.unitKeys.length > 4 ? ` +${o.unitKeys.length - 4}` : ''}
                        </td>
                        <td className="px-3 py-1.5 text-[var(--ax-fg-muted)]">{o.unitType ?? '—'}</td>
                        <td className="px-3 py-1.5 text-[var(--ax-fg-muted)]">{o.floor ?? '—'}</td>
                        <td className="px-3 py-1.5">{o.area ?? '—'} м²{o.bedrooms ? `, ${o.bedrooms} сп.` : ''}</td>
                        <td className="px-3 py-1.5">{usd(o.price)}</td>
                        <td className="px-3 py-1.5">{usd(o.price * g.ratio)}</td>
                        <td className="px-3 py-1.5 text-right">
                          {g.donorId && (
                            <button
                              onClick={() => create(g, [o.key])}
                              disabled={busy !== null}
                              className="text-[var(--color-primary)] hover:underline disabled:opacity-50"
                            >
                              завести
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
