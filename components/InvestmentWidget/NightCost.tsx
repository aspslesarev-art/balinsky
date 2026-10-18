'use client'

import { useCurrency } from '../CurrencyContext'
import { pickCopy, type Lang } from '@/lib/i18n'
import { MONTHS_RENTED } from '@/lib/investment/monthly'
import type { Snapshot } from './types'
import { fmtMoney, pluralRu } from './utils'

// Переводы на остальные языки — после ок владельца (RU и EN сначала).
const COPY = {
  ru: {
    eyebrow: 'Себестоимость',
    note: (price: string, lease: string, build: string, total: string, nights: string) =>
      `Примерно. Цена ${price}, лизхолд ${lease}${build} → ${total} = ${nights} ночей. В конце срока вилла возвращается владельцу земли. Расходы на управление не учтены.`,
    buildPart: (b: string) => `, из них ${b} стройка`,
    marketBar: (v: string) => `Рынок ${v}`,
    own: 'Владение',
    market: 'Сдают рядом',
    daily: {
      title: 'Сколько стоит вам одна ночь',
      per: ' / ночь',
      ownSub: (other: string) => `${other} в месяц. Цена ÷ ночи лизхолда`,
      sold: 'Проданная ночь',
      soldSub: (occ: number) => `При загрузке ${occ}%. Ниже этой цены сдавать в минус`,
      marketSub: 'Похожие объявления рядом, обычная цена',
      marketOwn: 'Этот комплекс на Booking',
      yours: (v: string) => `Ваша ночь ${v}`,
      cheaper: (x: string) => `Ночь обходится в ${x} раза дешевле, чем сдают рядом`,
      pricier: 'Ночь обходится дороже, чем сдают рядом',
    },
    monthly: {
      title: 'Сколько стоит вам один месяц',
      per: ' / мес',
      ownSub: (other: string) => `${other} за ночь. Цена ÷ месяцы лизхолда`,
      sold: 'Сданный месяц',
      soldSub: (months: number) => `Сдаётся ${months} месяцев из 12. Ниже этой цены сдавать в минус`,
      marketSub: 'Похожие объявления рядом, помесячно',
      marketOwn: '',
      yours: (v: string) => `Ваш месяц ${v}`,
      cheaper: (x: string) => `Месяц обходится в ${x} раза дешевле, чем сдают рядом`,
      pricier: 'Месяц обходится дороже, чем сдают рядом',
    },
  },
  en: {
    eyebrow: 'Cost price',
    note: (price: string, lease: string, build: string, total: string, nights: string) =>
      `Approximate. Price ${price}, leasehold ${lease}${build} → ${total} = ${nights} nights. At the end of the term the villa returns to the landowner. Management costs not included.`,
    buildPart: (b: string) => `, of which ${b} construction`,
    marketBar: (v: string) => `Market ${v}`,
    own: 'Ownership',
    market: 'Rented nearby',
    daily: {
      title: 'What one night costs you',
      per: ' / night',
      ownSub: (other: string) => `${other} a month. Price ÷ leasehold nights`,
      sold: 'Booked night',
      soldSub: (occ: number) => `At ${occ}% occupancy. Below this rate you rent at a loss`,
      marketSub: 'Similar listings nearby, typical rate',
      marketOwn: 'This complex on Booking',
      yours: (v: string) => `Your night ${v}`,
      cheaper: (x: string) => `A night costs you ${x}× less than rentals nearby charge`,
      pricier: 'A night costs you more than rentals nearby charge',
    },
    monthly: {
      title: 'What one month costs you',
      per: ' / mo',
      ownSub: (other: string) => `${other} a night. Price ÷ leasehold months`,
      sold: 'Rented month',
      soldSub: (months: number) => `Rented ${months} months out of 12. Below this rate you rent at a loss`,
      marketSub: 'Similar listings nearby, monthly',
      marketOwn: '',
      yours: (v: string) => `Your month ${v}`,
      cheaper: (x: string) => `A month costs you ${x}× less than rentals nearby charge`,
      pricier: 'A month costs you more than rentals nearby charge',
    },
  },
}

const yrs = (n: number, lang: Lang) => {
  const s = (Math.round(n * 10) / 10).toString()
  if (lang === 'en') return `${s} yrs`
  // Дробные — «года»: 1,5 года, 28,5 года.
  return `${s.replace('.', ',')} ${Number.isInteger(n) ? pluralRu(n, ['год', 'года', 'лет']) : 'года'}`
}

export function NightCost({ snap, lang, mode = 'daily' }: { snap: Snapshot; lang: Lang; mode?: 'daily' | 'monthly' }) {
  const c = pickCopy(COPY, lang)
  const t = c[mode]
  const { currency } = useCurrency()
  const price = snap.villa.askingPrice
  const lease = snap.villa.leaseholdYearsLeft
  const build = Math.min(snap.villa.buildYearsLeft ?? 0, lease ?? 0)
  if (price == null || !(price > 0) || lease == null || !(lease - build > 0)) return null

  const years = lease - build
  const nights = Math.round(years * 365)
  const perNight = price / nights
  const perMonth = perNight * 365 / 12

  // Те же стартовые цифры, что у калькулятора ниже. Посуточно: свой Booking
  // комплекса, иначе соседи. Помесячно: медиана соседей и 11 месяцев из 12.
  let unit: number, sold: number, market: number, soldSub: string, marketOwn = false
  if (mode === 'monthly') {
    if (!snap.monthly) return null
    const months = MONTHS_RENTED.median
    unit = perMonth
    sold = perMonth * 12 / months
    market = snap.monthly.p50
    soldSub = c.monthly.soldSub(months)
  } else {
    const sc = snap.scenarios
    if (!sc) return null
    const own = snap.ownBooking
    const occ = Math.round((own?.occupancy ?? snap.region.occupancyByScenario.median) * 100)
    marketOwn = own?.adr != null
    unit = perNight
    sold = perNight / (occ / 100)
    market = own?.adr ?? sc.median.adrAsking
    soldSub = c.daily.soldSub(occ)
  }

  const ratio = market / sold
  const money = (n: number) => fmtMoney(Math.round(n), currency)
  const loc = lang === 'en' ? 'en-US' : 'ru-RU'
  const ratioText = (Math.round(ratio * 10) / 10).toLocaleString(loc)

  return (
    <section className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-8" aria-labelledby={`night-cost-title-${mode}`}>
      <div className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{c.eyebrow}</div>
      <h3 id={`night-cost-title-${mode}`} className="mt-1 text-[18px] font-semibold tracking-tight text-[var(--color-text)]">{t.title}</h3>

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--color-surface-alt)] p-4">
          <div className="text-[14px] text-[var(--color-text-muted)]">{c.own}</div>
          <div className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--color-text)] tabular-nums">
            {money(unit)}<span className="whitespace-nowrap text-[14px] font-normal text-[var(--color-text-muted)]">{t.per}</span>
          </div>
          <div className="text-[13px] leading-snug text-[var(--color-text-muted)]">{t.ownSub(money(mode === 'monthly' ? perNight : perMonth))}</div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--color-primary-soft)] p-4 text-[var(--color-primary-pressed)]">
          <div className="text-[14px]">{t.sold}</div>
          <div className="text-[28px] font-semibold leading-tight tracking-tight tabular-nums">
            {money(sold)}<span className="whitespace-nowrap text-[14px] font-normal">{t.per}</span>
          </div>
          <div className="text-[13px] leading-snug">{soldSub}</div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--color-surface-alt)] p-4">
          <div className="text-[14px] text-[var(--color-text-muted)]">{marketOwn ? t.marketOwn : c.market}</div>
          <div className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--color-text)] tabular-nums">
            {money(market)}<span className="whitespace-nowrap text-[14px] font-normal text-[var(--color-text-muted)]">{t.per}</span>
          </div>
          <div className="text-[13px] leading-snug text-[var(--color-text-muted)]">{marketOwn ? 'Booking' : t.marketSub}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {/* Шкала до большего из двух: дороже рынка — оранжевая полоса и отметка рынка. */}
        <div className="relative h-3 rounded-full bg-[var(--color-primary-soft)]" aria-hidden="true">
          <div className={`absolute inset-y-0 left-0 rounded-full ${ratio < 1 ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-primary)]'}`} style={{ width: `${Math.max(4, Math.min(1, 1 / ratio) * 100)}%` }} />
          {ratio < 1 && <div className="absolute -inset-y-1 w-0.5 rounded-full bg-[var(--color-text)]" style={{ left: `${ratio * 100}%` }} />}
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[14px] text-[var(--color-text-muted)] tabular-nums">
          <span className="whitespace-nowrap">{t.yours(money(sold))}</span>
          <span className="whitespace-nowrap">{c.marketBar(money(market))}</span>
        </div>
        <div className="text-[16px] font-semibold text-[var(--color-text)]">
          {ratio > 1.05 ? t.cheaper(ratioText) : t.pricier}
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--color-border)] pt-4">
        <p className="max-w-[68ch] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          {c.note(
            money(price),
            yrs(lease, lang),
            build > 0 ? c.buildPart(yrs(build, lang)) : '',
            yrs(years, lang),
            nights.toLocaleString(loc),
          )}
        </p>
      </div>
    </section>
  )
}
