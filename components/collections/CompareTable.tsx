'use client'

import { useState } from 'react'
import { useCurrency } from '@/components/CurrencyContext'
import { formatPrice } from '@/lib/currency'
import type { ClientItem } from './ClientCollection'
import type { Lang } from '@/lib/i18n'
import { clientCopy } from '@/lib/collections-copy'

// Сравнение объектов подборки для клиента (макет
// https://claude.ai/artifact/TEUDdpFWhCUY4aDcWN3N5K, экраны 7–8). Строки — как
// в «Избранном», без застройщика и его обещаний. Зелёным — лучшее в строке.
// На телефоне подписи строк стоят на месте, объекты листаются вбок.

type Best = 'min' | 'max' | null
type Row = { group?: string; label: string; best: Best; num: (i: ClientItem) => number | null; text: (i: ClientItem) => string | null }

const pct = (x: number, lang: Lang) => `${(Math.round(x * 1000) / 10).toFixed(1).replace('.', lang === 'en' || lang === 'zh' ? '.' : ',')}%`

export function CompareTable({ items, token, lang, onOpen }: { items: ClientItem[]; token: string; lang: Lang; onOpen: (it: ClientItem) => void }) {
  const c = clientCopy(lang)
  const m2 = lang === 'ru' || lang === 'uk' ? 'м²' : 'm²'
  const { currency } = useCurrency()
  const [diffOnly, setDiffOnly] = useState(false)
  const money = (v: number | null) => (v != null ? formatPrice(v, currency, lang) : null)

  const rows: Row[] = [
    { group: c.gPrice, label: c.rPrice, best: 'min', num: i => i.priceUsd, text: i => money(i.priceUsd) },
    { label: c.rPriceM2, best: 'min', num: i => i.pricePerSqmUsd, text: i => money(i.pricePerSqmUsd) },
    { group: c.gObject, label: c.rKind, best: null, num: () => null, text: i => c.kind[i.kind] },
    { label: c.rDistrict, best: null, num: () => null, text: i => i.district },
    { label: c.rBedrooms, best: 'max', num: i => i.bedrooms, text: i => (i.bedrooms != null ? String(i.bedrooms) : null) },
    { label: c.rArea, best: 'max', num: i => i.area, text: i => (i.area != null ? `${i.area} ${m2}` : null) },
    { label: c.rLand, best: 'max', num: i => (i.kind === 'villa' ? i.land : null), text: i => (i.kind === 'apartment' ? '—' : i.land != null ? `${i.land} ${m2}` : null) },
    { group: c.gDocs, label: c.rLease, best: 'max', num: i => i.leaseYears, text: i => (i.leaseYears != null ? c.years(i.leaseYears) : null) },
    { label: c.rPermit, best: null, num: () => null, text: i => i.permit },
    { label: c.rBuild, best: null, num: () => null, text: i => i.status },
    { group: c.gIncome, label: c.rYield, best: 'max', num: i => i.yieldPct, text: i => (i.yieldPct != null ? pct(i.yieldPct, lang) : null) },
  ]

  const cells = rows.map(r => {
    const nums = items.map(r.num)
    const known = nums.filter((n): n is number => n != null)
    const target = r.best && known.length >= 2 && Math.min(...known) !== Math.max(...known)
      ? (r.best === 'min' ? Math.min(...known) : Math.max(...known)) : null
    const texts = items.map(r.text)
    const same = texts.every(t => t === texts[0])
    return { r, texts, best: nums.map(n => target != null && n === target), same }
  })
  // Пустую строку (нет данных ни у кого) не показываем вовсе.
  const visible = cells.filter(c => c.texts.some(t => t != null && t !== '—') && !(diffOnly && c.same))
  let lastGroup = ''
  const groupOf = (i: number) => { for (let k = i; k >= 0; k--) if (rows[k].group) return rows[k].group!; return '' }

  const cellCls = (best: boolean, t: string | null) =>
    `inline-block rounded-lg px-2 py-0.5 -ml-2 ${best ? 'bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary-pressed)]' : t == null ? 'text-[#7A847F]' : 'font-medium'}`

  return (
    <section className="flex flex-col gap-4" aria-labelledby="compare-h">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="compare-h" className="text-[24px] font-semibold tracking-tight md:text-[32px]">{c.cmpTitle(items.length)}</h2>
          <p className="text-[14px] text-[var(--color-text-muted)] md:text-[15px]">{c.cmpBest}<span className="md:hidden">{c.cmpScroll}</span></p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] sm:ml-auto">
          <input type="checkbox" checked={diffOnly} onChange={e => setDiffOnly(e.target.checked)} className="h-[18px] w-[18px] accent-[var(--color-primary)]" />
          {c.cmpDiff}
        </label>
      </div>

      <div className="max-w-none overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
        <table className="w-full min-w-max border-collapse text-[14px] md:min-w-0 md:table-fixed md:text-[15px]">
          <colgroup>
            <col className="w-[112px] md:w-[240px]" />
            {items.map(i => <col key={i.n} className="w-[150px] md:w-auto" />)}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white p-3 text-left align-bottom text-[12px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] shadow-[4px_0_8px_rgb(0_0_0/.04)] md:static md:px-6 md:py-4 md:text-[13px] md:shadow-none">{c.cmpObject}</th>
              {items.map(i => (
                <th key={i.n} className="p-3 text-left align-top font-normal md:py-4 md:pl-0 md:pr-4">
                  <a href={`/p/${token}/${i.n}?lang=${lang}`} onClick={() => onOpen(i)} className="flex flex-col gap-2 text-[var(--color-text)] no-underline md:gap-3">
                    <span className="relative block">
                      {i.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- фото из снимка объекта
                        <img src={i.photo} alt={i.title} className="block h-[76px] w-full rounded-lg object-cover md:h-[150px]" />
                      ) : <span className="block h-[76px] w-full rounded-lg bg-[var(--color-search-bg)] md:h-[150px]" />}
                      <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[12px] font-semibold md:left-2 md:top-2 md:h-7 md:w-7 md:text-[14px]">{i.n}</span>
                    </span>
                    <span className="text-[13px] font-semibold leading-snug md:text-[16px]">{i.title}</span>
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(row => {
              const idx = rows.indexOf(row.r)
              const g = groupOf(idx)
              const showGroup = g !== lastGroup
              lastGroup = g
              return [
                showGroup && (
                  <tr key={`g-${g}`} className="hidden md:table-row">
                    <td colSpan={items.length + 1} className="border-t border-[var(--color-border)] bg-[var(--color-surface-alt)] px-6 pb-2 pt-5 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">{g}</td>
                  </tr>
                ),
                <tr key={row.r.label}>
                  <th scope="row" className="sticky left-0 z-10 border-t border-[var(--color-border)] bg-white px-3 py-3 text-left text-[13px] font-normal leading-snug text-[var(--color-text-muted)] shadow-[4px_0_8px_rgb(0_0_0/.04)] md:static md:px-6 md:text-[15px] md:shadow-none">{row.r.label}</th>
                  {row.texts.map((t, k) => (
                    <td key={k} className="border-t border-[var(--color-border)] px-3 py-3 md:py-2.5 md:pl-0 md:pr-4">
                      <span className={cellCls(row.best[k], t)}>{t ?? c.noData}</span>
                    </td>
                  ))}
                </tr>,
              ]
            })}
          </tbody>
          <tfoot className="hidden md:table-footer-group">
            <tr>
              <td className="border-t border-[var(--color-border)]" />
              {items.map(i => (
                <td key={i.n} className="border-t border-[var(--color-border)] py-4 pr-4">
                  <a href={`/p/${token}/${i.n}?lang=${lang}`} onClick={() => onOpen(i)}
                    className="flex h-11 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[15px] font-semibold text-[var(--color-primary-pressed)] no-underline hover:bg-[#d3e8dc]">{c.moreShort}</a>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      {items.some(i => i.yieldPct != null) && (
        <p className="max-w-[68ch] text-[13px] leading-relaxed text-[var(--color-text-muted)]">{c.yieldNote}</p>
      )}
    </section>
  )
}
