// Market-data table: a real <table> from md up, stacked cards on phones —
// the same split InvestmentGuide uses, so wide numeric tables never force a
// horizontal scroll at 390px.

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

export type DataRow = {
  key: string
  /** First cell — the row's name; shown as the card title on phones. */
  label: ReactNode
  cells: ReactNode[]
  href?: string | null
  /** Fewer observations than the page's threshold — marked with *. */
  indicative?: boolean
}

export function DataTable({ columns, rows, linkLabel }: {
  /** Header for the label column followed by one header per cell. */
  columns: string[]
  rows: DataRow[]
  linkLabel?: string
}) {
  const withLinks = !!linkLabel && rows.some(r => r.href)
  return (
    <>
      <ul className="md:hidden space-y-3">
        {rows.map(r => (
          <li key={r.key} className="rounded-xl border border-[var(--color-border)] bg-white p-4">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-[16px] font-semibold text-[#111827]">{r.label}{r.indicative ? '*' : ''}</span>
              {withLinks && r.href && (
                <Link href={r.href} className="shrink-0 text-[13px] text-[var(--color-primary)] no-underline inline-flex items-center gap-0.5">
                  {linkLabel} <ChevronRight size={14} />
                </Link>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
              {r.cells.map((cell, i) => (
                <div key={i}>
                  <dt className="text-[12px] text-[var(--color-text-muted)]">{columns[i + 1]}</dt>
                  <dd className="text-[#111827] tabular-nums">{cell}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-[14px] border-collapse">
          <thead>
            <tr className="text-left text-[12px] text-[var(--color-text-muted)]">
              {columns.map(c => (
                <th key={c} scope="col" className="py-3 px-3 border-b border-[var(--color-border)] font-medium">{c}</th>
              ))}
              {withLinks && <th className="py-3 px-3 border-b border-[var(--color-border)]" />}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key} className="border-b border-[var(--color-border)] align-top">
                <th scope="row" className="py-3 px-3 text-left font-semibold text-[#111827] whitespace-nowrap">{r.label}{r.indicative ? '*' : ''}</th>
                {r.cells.map((cell, i) => (
                  <td key={i} className="py-3 px-3 whitespace-nowrap tabular-nums text-[#1f2937]">{cell}</td>
                ))}
                {withLinks && (
                  <td className="py-3 px-3 text-right">
                    {r.href && (
                      <Link href={r.href} className="text-[13px] text-[var(--color-primary)] no-underline hover:underline inline-flex items-center gap-0.5">
                        {linkLabel} <ChevronRight size={14} />
                      </Link>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
