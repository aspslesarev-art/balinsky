// Homepage block: four headline market figures, each linking to the page
// that explains it. RU and EN only — the data pages exist in those two.

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Lang } from '@/lib/i18n'
import { MARKET, marketPath, usd, asOfLabel } from '@/lib/market-index'

export function MarketNumbers({ lang }: { lang: 'ru' | 'en' }) {
  const V = MARKET.island.villas
  const ru = lang === 'ru'
  const l = lang as Lang
  const cards = [
    { v: usd(V.median, l), t: ru ? `медианная цена виллы, ${V.n} объектов` : `median villa asking price, ${V.n} listings`, href: marketPath('prices', l) },
    { v: usd(V.perM2, l), t: ru ? 'за м² — медиана по виллам' : 'per m² — villa median', href: marketPath('prices', l) },
    { v: usd(MARKET.monthly.island.villa2br.median, l), t: ru ? 'в месяц — аренда виллы с 2 спальнями' : 'a month — renting a 2-bedroom villa', href: marketPath('rent', l) },
    { v: usd(MARKET.island.villaRent['2br'].median, l), t: ru ? 'за ночь — вилла с 2 спальнями посуточно' : 'a night — 2-bedroom holiday villa', href: marketPath('rent', l) },
  ]
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <h2 className="text-[26px] md:text-[38px] leading-[1.15] font-light tracking-[-0.02em] text-[#0E1A14]">
          {ru ? 'Рынок Бали в цифрах' : 'The Bali market in numbers'}
        </h2>
        <p className="text-[13px] text-[#4B5563]">
          {ru ? `Данные за ${asOfLabel(l)} · ` : `Data for ${asOfLabel(l)} · `}
          <Link href={marketPath('method', l)} className="text-[var(--color-primary)] underline underline-offset-2 hover:no-underline">
            {ru ? 'как мы считаем' : 'how we calculate'}
          </Link>
        </p>
      </div>
      <ul className="mt-8 md:mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <li key={c.t}>
            <Link href={c.href} className="group block h-full rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6 no-underline hover:border-[var(--color-primary)] transition-colors">
              <div className="text-[26px] md:text-[32px] font-light tabular-nums leading-none text-[#0E1A14]">{c.v}</div>
              <div className="mt-3 text-[13.5px] leading-[1.45] text-[#4B5563]">{c.t}</div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
        <Link href={marketPath('prices', l)} className="inline-flex items-center gap-1.5 font-medium text-[var(--color-primary)] no-underline hover:gap-2.5 transition-all">
          {ru ? 'Цены по районам' : 'Prices by area'} <ArrowRight size={15} />
        </Link>
        <Link href={marketPath('rent', l)} className="inline-flex items-center gap-1.5 font-medium text-[var(--color-primary)] no-underline hover:gap-2.5 transition-all">
          {ru ? 'Сколько стоит аренда' : 'What rent costs'} <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}
