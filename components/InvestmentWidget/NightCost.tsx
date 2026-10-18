'use client'

import { useCurrency } from '../CurrencyContext'
import { pickCopy, type Lang } from '@/lib/i18n'
import type { Snapshot } from './types'
import { fmtMoney, pluralRu } from './utils'

// Переводы на остальные языки — после ок владельца (RU и EN сначала).
const COPY = {
  ru: {
    eyebrow: 'Себестоимость',
    title: 'Сколько стоит вам одна ночь',
    own: 'Владение',
    perNight: ' / ночь',
    perMonth: (m: string) => `${m} в месяц. Цена ÷ ночи лизхолда`,
    sold: 'Проданная ночь',
    soldSub: (occ: number) => `При загрузке ${occ}%. Ниже этой цены сдавать в минус`,
    market: 'Сдают рядом',
    marketSub: 'Похожие объявления рядом, обычная цена',
    marketOwn: 'Этот комплекс на Booking',
    yours: (v: string) => `Ваша ночь ${v}`,
    marketBar: (v: string) => `Рынок ${v}`,
    cheaper: (x: string) => `Ночь обходится в ${x} раза дешевле, чем сдают рядом`,
    pricier: 'Ночь обходится дороже, чем сдают рядом',
    note: (price: string, lease: string, build: string, total: string, nights: string) =>
      `Примерно. Цена ${price}, лизхолд ${lease}${build} → ${total} = ${nights} ночей. В конце срока вилла возвращается владельцу земли. Расходы на управление не учтены.`,
    buildPart: (b: string) => `, из них ${b} стройка`,
  },
  en: {
    eyebrow: 'Cost price',
    title: 'What one night costs you',
    own: 'Ownership',
    perNight: ' / night',
    perMonth: (m: string) => `${m} a month. Price ÷ leasehold nights`,
    sold: 'Booked night',
    soldSub: (occ: number) => `At ${occ}% occupancy. Below this rate you rent at a loss`,
    market: 'Rented nearby',
    marketSub: 'Similar listings nearby, typical rate',
    marketOwn: 'This complex on Booking',
    yours: (v: string) => `Your night ${v}`,
    marketBar: (v: string) => `Market ${v}`,
    cheaper: (x: string) => `A night costs you ${x}× less than rentals nearby charge`,
    pricier: 'A night costs you more than rentals nearby charge',
    note: (price: string, lease: string, build: string, total: string, nights: string) =>
      `Approximate. Price ${price}, leasehold ${lease}${build} → ${total} = ${nights} nights. At the end of the term the villa returns to the landowner. Management costs not included.`,
    buildPart: (b: string) => `, of which ${b} construction`,
  },
}

const yrs = (n: number, lang: Lang) => {
  const s = (Math.round(n * 10) / 10).toString()
  if (lang === 'en') return `${s} yrs`
  // Дробные — «года»: 1,5 года, 28,5 года.
  return `${s.replace('.', ',')} ${Number.isInteger(n) ? pluralRu(n, ['год', 'года', 'лет']) : 'года'}`
}

export function NightCost({ snap, lang }: { snap: Snapshot; lang: Lang }) {
  const t = pickCopy(COPY, lang)
  const { currency } = useCurrency()
  const price = snap.villa.askingPrice
  const lease = snap.villa.leaseholdYearsLeft
  const build = Math.min(snap.villa.buildYearsLeft ?? 0, lease ?? 0)
  const sc = snap.scenarios
  if (price == null || !(price > 0) || lease == null || !(lease - build > 0) || !sc) return null

  // Те же стартовые цифры, что у калькулятора ниже: свой Booking комплекса, иначе соседи.
  const own = snap.ownBooking
  const market = own?.adr ?? sc.median.adrAsking
  const occ = Math.round((own?.occupancy ?? snap.region.occupancyByScenario.median) * 100)

  const years = lease - build
  const nights = Math.round(years * 365)
  const perNight = price / nights
  const soldNight = perNight / (occ / 100)
  const ratio = market / soldNight
  const money = (n: number) => fmtMoney(Math.round(n), currency)
  const loc = lang === 'en' ? 'en-US' : 'ru-RU'
  const ratioText = (Math.round(ratio * 10) / 10).toLocaleString(loc)

  return (
    <section className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-8" aria-labelledby="night-cost-title">
      <div className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t.eyebrow}</div>
      <h3 id="night-cost-title" className="mt-1 text-[18px] font-semibold tracking-tight text-[var(--color-text)]">{t.title}</h3>

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--color-surface-alt)] p-4">
          <div className="text-[14px] text-[var(--color-text-muted)]">{t.own}</div>
          <div className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--color-text)] tabular-nums">
            {money(perNight)}<span className="whitespace-nowrap text-[14px] font-normal text-[var(--color-text-muted)]">{t.perNight}</span>
          </div>
          <div className="text-[13px] leading-snug text-[var(--color-text-muted)]">{t.perMonth(money(perNight * 365 / 12))}</div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--color-primary-soft)] p-4 text-[var(--color-primary-pressed)]">
          <div className="text-[14px]">{t.sold}</div>
          <div className="text-[28px] font-semibold leading-tight tracking-tight tabular-nums">
            {money(soldNight)}<span className="whitespace-nowrap text-[14px] font-normal">{t.perNight}</span>
          </div>
          <div className="text-[13px] leading-snug">{t.soldSub(occ)}</div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--color-surface-alt)] p-4">
          <div className="text-[14px] text-[var(--color-text-muted)]">{own?.adr != null ? t.marketOwn : t.market}</div>
          <div className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--color-text)] tabular-nums">
            {money(market)}<span className="whitespace-nowrap text-[14px] font-normal text-[var(--color-text-muted)]">{t.perNight}</span>
          </div>
          <div className="text-[13px] leading-snug text-[var(--color-text-muted)]">{own?.adr != null ? 'Booking' : t.marketSub}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <div className="relative h-3 rounded-full bg-[var(--color-primary-soft)]" aria-hidden="true">
          <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.min(100, Math.max(4, 100 / ratio))}%` }} />
        </div>
        <div className="flex justify-between gap-4 text-[14px] text-[var(--color-text-muted)] tabular-nums">
          <span>{t.yours(money(soldNight))}</span>
          <span>{t.marketBar(money(market))}</span>
        </div>
        <div className="text-[16px] font-semibold text-[var(--color-text)]">
          {ratio > 1.05 ? t.cheaper(ratioText) : t.pricier}
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--color-border)] pt-4">
        <p className="max-w-[68ch] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          {t.note(
            money(price),
            yrs(lease, lang),
            build > 0 ? t.buildPart(yrs(build, lang)) : '',
            yrs(years, lang),
            nights.toLocaleString(loc),
          )}
        </p>
      </div>
    </section>
  )
}
