'use client'

import { useMemo, useState } from 'react'
import { finishGap, zoneVerdict, type PremiumZone, type ZoneVerdict } from '@/lib/product-premium'

const VERDICT: Record<ZoneVerdict, { label: string; hint: string; cls: string; rank: number }> = {
  free: {
    label: 'Премиум свободен',
    hint: 'за качество платят вдвое, а качественного предложения мало',
    cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    rank: 0,
  },
  room: {
    label: 'Есть место',
    hint: 'премия за качество ещё заметная',
    cls: 'bg-sky-50 text-sky-800 ring-sky-200',
    rank: 1,
  },
  flat: {
    label: 'Ровный рынок',
    hint: 'качество почти не влияет на ставку',
    cls: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
    rank: 2,
  },
  crowded: {
    label: 'Премиум занят',
    hint: 'больше половины соседей уже премиальны',
    cls: 'bg-amber-50 text-amber-800 ring-amber-200',
    rank: 3,
  },
}

// Ниже этого числа объектов район — нишевый: выводы по нему статистически
// шаткие, и «премиум свободен» там чаще значит «спроса мало».
const THIN_MARKET = 120

type SortKey = 'verdict' | 'adr' | 'gap'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'verdict', label: 'По перспективности' },
  { key: 'adr', label: 'По цене за ночь' },
  { key: 'gap', label: 'По премии за качество' },
]

export function ZoneTable({ zones }: { zones: PremiumZone[] }) {
  const [kind, setKind] = useState<'villa' | 'apartment'>('villa')
  const [sort, setSort] = useState<SortKey>('verdict')

  const rows = useMemo(() => {
    const list = zones.filter(z => z.kind === kind)
    const byAdr = (a: PremiumZone, b: PremiumZone) => b.med_adr - a.med_adr
    const byGap = (a: PremiumZone, b: PremiumZone) => (finishGap(b) ?? 0) - (finishGap(a) ?? 0)
    if (sort === 'adr') return [...list].sort(byAdr)
    if (sort === 'gap') return [...list].sort(byGap)
    // Внутри одного вердикта — по глубине рынка, а не по премии: в районе на
    // 40 объектов «премиум свободен» может означать просто отсутствие спроса.
    return [...list].sort((a, b) => {
      const d = VERDICT[zoneVerdict(a)].rank - VERDICT[zoneVerdict(b)].rank
      if (d !== 0) return d
      const thin = Number(a.n < THIN_MARKET) - Number(b.n < THIN_MARKET)
      return thin !== 0 ? thin : b.n - a.n
    })
  }, [zones, kind, sort])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-neutral-100 p-1 text-sm">
          {(['villa', 'apartment'] as const).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`rounded-full px-4 py-1.5 transition ${
                kind === k ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {k === 'villa' ? 'Виллы' : 'Апартаменты'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5 text-sm">
          {SORTS.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              aria-pressed={sort === s.key}
              className={`rounded-full px-3 py-1.5 ring-1 transition ${
                sort === s.key
                  ? 'bg-neutral-900 text-white ring-neutral-900'
                  : 'bg-white text-neutral-600 ring-neutral-200 hover:text-neutral-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl ring-1 ring-neutral-200">
        <table className="w-full min-w-[720px] border-collapse bg-white text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3 font-medium">Район</th>
              <th className="px-4 py-3 font-medium">Вывод</th>
              <th className="px-4 py-3 text-right font-medium">$/ночь</th>
              <th className="px-4 py-3 text-right font-medium">Загрузка</th>
              <th className="px-4 py-3 text-right font-medium">Уже премиальных</th>
              <th className="px-4 py-3 text-right font-medium">Ставка при отделке</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(z => {
              const v = VERDICT[zoneVerdict(z)]
              const gap = finishGap(z)
              return (
                <tr key={z.zone} className="border-t border-neutral-100 align-middle">
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{z.zone}</div>
                    <div className="text-xs text-neutral-400">
                      {z.n} объектов
                      {z.n < THIN_MARKET ? <span className="text-neutral-400"> · небольшой рынок</span> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${v.cls}`}>
                      {v.label}
                    </span>
                    <div className="mt-1 text-xs text-neutral-400">{v.hint}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-900">${z.med_adr}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-500">{z.med_occ}%</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100">
                        <span
                          className={`block h-full rounded-full ${z.share_hi >= 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(z.share_hi, 100)}%` }}
                        />
                      </span>
                      <span className="w-9 tabular-nums text-neutral-500">{z.share_hi}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {z.adr_t3 && z.adr_t45 ? (
                      <>
                        <span className="text-neutral-400">${z.adr_t3}</span>
                        <span className="mx-1.5 text-neutral-300">→</span>
                        <span className="font-medium text-neutral-900">${z.adr_t45}</span>
                        {gap ? <span className="ml-2 text-xs text-emerald-700">×{gap.toFixed(1)}</span> : null}
                      </>
                    ) : (
                      <span className="text-neutral-300">мало данных</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-400">
        «Уже премиальных» — доля объектов района с отделкой уровня 4–5. «Ставка при отделке» — медианная цена за
        ночь у объектов со средней отделкой против объектов с высокой, в том же районе.
      </p>
    </div>
  )
}
