// Вкладка «Генплан» окна медиаблока (макет «Окно медиаблока» 3 и телефон 5,
// владелец 2026-11-11): шахматка слева, справа (на телефоне - ниже) список
// вилл комплекса со статусом и ценой. Статусы - из шахматки (хотспоты).
import Link from 'next/link'
import type { ReactNode } from 'react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { Money } from './Money'

export type MasterplanRow = {
  label: string
  status: 'free' | 'reserved' | 'sold' | null
  sub: string | null
  priceUsd: number | null
  url: string | null
  current: boolean
}

const COPY = {
  ru: { count: (n: number) => `${n} вилл в комплексе`, hint: 'Статусы - по шахматке застройщика', free: 'В продаже', reserved: 'Забронировано', sold: 'Продано', off: 'Не продаётся', this: 'эта' },
  en: { count: (n: number) => `${n} villas in the complex`, hint: 'Statuses from the developer’s availability chart', free: 'For sale', reserved: 'Reserved', sold: 'Sold', off: 'Not for sale', this: 'this one' },
} as const

const DOT: Record<string, string> = { free: '#8FD9B3', reserved: '#F5A524', sold: '#E5484D', off: 'rgba(255,255,255,.35)' }

export function MasterplanWithList({ plan, rows, lang }: { plan: ReactNode; rows: MasterplanRow[]; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const list = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-[17px] font-semibold">{c.count(rows.length)}</span>
        <span className="text-[13px] text-white/60">{c.hint}</span>
      </div>
      <div className="flex flex-col">
        {rows.map((r, i) => {
          const key = r.status ?? 'off'
          const statusText = r.status ? c[r.status] : c.off
          const body = (
            <>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.current ? '#FFFFFF' : DOT[key] }} />
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{r.label}{r.current ? ` · ${c.this}` : ''}</span>
                <span className="text-[13px] text-white/60">{r.sub ?? statusText}</span>
              </span>
              <span className={`text-[14px] tabular-nums ${r.status === 'free' && r.priceUsd ? 'text-white' : 'text-white/60'}`}>{r.status === 'free' && r.priceUsd ? <Money usd={r.priceUsd} lang={lang} /> : statusText}</span>
            </>
          )
          const cls = `flex items-center gap-3 min-h-[52px] px-3 rounded-[10px] no-underline text-white ${r.current ? 'bg-white/[0.08]' : ''}`
          return r.url && !r.current
            ? <Link key={i} href={r.url} className={`${cls} hover:bg-white/5 transition-colors duration-[120ms]`}>{body}</Link>
            : <div key={i} className={cls}>{body}</div>
        })}
      </div>
    </div>
  )
  return (
    <div className="lg:h-full flex flex-col lg:flex-row lg:min-h-0">
      <div className="lg:flex-1 min-w-0 overflow-y-auto p-4 lg:p-6">{plan}</div>
      <aside className="lg:w-[360px] shrink-0 p-4 lg:p-6 lg:border-l border-white/[0.08] lg:overflow-y-auto">{list}</aside>
    </div>
  )
}
