import { pickCopy, type Lang } from '@/lib/i18n'
import type { NightReceipt } from '@/lib/investment/night-economics'
import { InlinePrice } from './InlinePrice'

// «С каждой ночи остаётся…» — чек одной сданной ночи во вкладке
// «Будет ли спрос → Посуточно». Макет «Себестоимость: понятный вывод», A
// (владелец 23.10.2026). Вместо трёх плиток «Владение / Проданная ночь /
// Цена комплекса», из которых не было понятно, сколько остаётся на руки.

const yearsRu = (n: number) => {
  const s = (Math.round(n * 10) / 10).toString().replace('.', ',')
  return Number.isInteger(n) ? `${s} ${n % 10 === 1 && n % 100 !== 11 ? 'год' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'года' : 'лет'}` : `${s} года`
}

const COPY = {
  ru: {
    verdict: (net: React.ReactNode, earn: React.ReactNode, back: React.ReactNode) => <>С каждой сданной ночи вам остаётся около {net}. Из них {earn} - заработок, {back} возвращают вложенное.</>,
    verdictShort: (net: React.ReactNode) => <>С каждой сданной ночи вам остаётся около {net}. Этого не хватает, чтобы вернуть вложенное за срок лизхолда.</>,
    eyebrow: 'Одна сданная ночь',
    guest: 'Гость платит',
    guestOwn: 'Цена этого комплекса на Booking сейчас',
    guestMarket: 'Средняя цена похожих объектов рядом',
    discount: 'Скидки и акции',
    discountSub: (p: number) => `В среднем гости платят на ${p}% меньше витрины`,
    platform: 'Комиссия Booking / Airbnb',
    mgmt: 'Управляющая компания',
    taxes: 'Налоги с аренды',
    taxesSub: 'Налог на проживание и налог на доход',
    upkeep: 'Свет, вода, уборка, ремонт',
    net: 'Вам на руки',
    back: 'Возвращает вложенное',
    earn: 'Ваш заработок сверху',
    month: (x: React.ReactNode) => <>В месяц около {x} на руки</>,
    monthEarn: (x: React.ReactNode) => <>Из них {x} - заработок сверх возврата вложенного</>,
    safety: (be: React.ReactNode) => <>Запас прочности: в минус уйдёте, только если сдавать дешевле <b className="font-semibold">{be}</b> за ночь.</>,
    safetyRatio: (k: string) => ` Это в ${k} раза ниже, чем сдают рядом.`,
    note: (occ: number, entry: React.ReactNode, years: string) => <>Примерно, при загрузке {occ}%. Вложенное - {entry} (цена, оформление и мебель) делится на {years} лизхолда: после него объект возвращается владельцу земли. Расходы - по нашей модели, подробно в калькуляторе ниже.</>,
    years: yearsRu,
    dec: (x: number) => x.toFixed(1).replace('.', ','),
  },
  en: {
    verdict: (net: React.ReactNode, earn: React.ReactNode, back: React.ReactNode) => <>Each booked night leaves you about {net}. Of that, {earn} is profit and {back} pays back what you invested.</>,
    verdictShort: (net: React.ReactNode) => <>Each booked night leaves you about {net}. That is not enough to pay back the investment within the leasehold.</>,
    eyebrow: 'One booked night',
    guest: 'Guest pays',
    guestOwn: 'This complex’s current rate on Booking',
    guestMarket: 'Average rate of similar listings nearby',
    discount: 'Discounts and promos',
    discountSub: (p: number) => `On average guests pay ${p}% below the listed rate`,
    platform: 'Booking / Airbnb commission',
    mgmt: 'Management company',
    taxes: 'Rental taxes',
    taxesSub: 'Hotel tax and income tax',
    upkeep: 'Utilities, cleaning, repairs',
    net: 'You keep',
    back: 'Pays back the investment',
    earn: 'Your profit on top',
    month: (x: React.ReactNode) => <>About {x} a month in hand</>,
    monthEarn: (x: React.ReactNode) => <>Of that, {x} is profit beyond paying back the investment</>,
    safety: (be: React.ReactNode) => <>Safety margin: you only lose money if you rent below <b className="font-semibold">{be}</b> a night.</>,
    safetyRatio: (k: string) => ` That is ${k}× below what rentals nearby charge.`,
    note: (occ: number, entry: React.ReactNode, years: string) => <>Approximate, at {occ}% occupancy. The investment of {entry} (price, closing costs and furniture) is spread over {years} of leasehold, after which the property returns to the landowner. Costs follow our model, see the calculator below.</>,
    years: (n: number) => `${Math.round(n * 10) / 10} yrs`,
    dec: (x: number) => x.toFixed(1),
  },
}

function Row({ label, sub, value, minus = false }: { label: string; sub?: string; value: React.ReactNode; minus?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px]">{label}</span>
        {sub && <span className="text-[13px] leading-snug text-[var(--color-text-muted)]">{sub}</span>}
      </span>
      <span className={`shrink-0 whitespace-nowrap text-[15px] tabular-nums ${minus ? 'text-[var(--color-text-muted)]' : ''}`}>{minus && '−'}{value}</span>
    </div>
  )
}

export function NightReceiptBlock({ r, marketMedian, lang }: { r: NightReceipt; marketMedian: number | null; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const P = (usd: number) => <InlinePrice usd={usd} lang={lang} approx={false} />
  const earn = r.net - r.payback
  const ratio = r.breakeven && marketMedian ? marketMedian / r.breakeven : null
  return (
    <section aria-label={c.eyebrow} className="flex flex-col gap-6 rounded-2xl border border-[var(--color-border)] bg-white p-4 md:p-6">
      <p className="text-[18px] font-semibold leading-snug tracking-tight md:text-[20px]">
        {earn > 0 ? c.verdict(<span className="whitespace-nowrap">{P(r.net)}</span>, <span className="whitespace-nowrap">{P(earn)}</span>, <span className="whitespace-nowrap">{P(r.payback)}</span>) : c.verdictShort(<span className="whitespace-nowrap">{P(r.net)}</span>)}
      </p>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-[var(--color-surface-alt)] p-4 md:p-5">
          <span className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{c.eyebrow}</span>
          <Row label={c.guest} sub={r.ownRate ? c.guestOwn : c.guestMarket} value={P(r.guest)} />
          <Row label={c.discount} sub={c.discountSub(r.discountPct)} value={P(r.discount)} minus />
          <Row label={c.platform} sub={`${r.platformPct}%`} value={P(r.platform)} minus />
          <Row label={c.mgmt} sub={`${r.mgmtPct}%`} value={P(r.mgmt)} minus />
          <Row label={c.taxes} sub={c.taxesSub} value={P(r.taxes)} minus />
          <Row label={c.upkeep} value={P(r.upkeep)} minus />
          <div className="flex items-baseline justify-between gap-4 border-t border-[var(--color-text)] pt-3 text-[15px] font-semibold">
            <span>{c.net}</span>
            <span className="whitespace-nowrap tabular-nums">{P(r.net)}</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          {earn > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex h-10 overflow-hidden rounded-lg text-[14px] font-semibold" aria-hidden="true">
                <div className="flex min-w-fit items-center justify-center bg-[#C9D2CE] px-2" style={{ width: `${(r.payback / r.net) * 100}%` }}>{P(r.payback)}</div>
                <div className="flex min-w-fit flex-1 items-center justify-center bg-[var(--color-primary)] px-2 text-white">{P(earn)}</div>
              </div>
              <div className="flex justify-between gap-4 text-[14px] text-[var(--color-text-muted)]">
                <span>{c.back}</span><span className="text-right">{c.earn}</span>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1 rounded-xl bg-[var(--color-primary-soft)] px-5 py-4 text-[var(--color-primary-pressed)]">
            <span className="text-[15px] font-semibold">{c.month(<span className="whitespace-nowrap">{P(r.month)}</span>)}</span>
            {r.monthEarn > 0 && <span className="text-[14px]">{c.monthEarn(<span className="whitespace-nowrap">{P(r.monthEarn)}</span>)}</span>}
          </div>
          {r.breakeven != null && (
            <p className="text-[15px] leading-relaxed">
              {c.safety(<span className="whitespace-nowrap">{P(r.breakeven)}</span>)}
              {ratio != null && ratio > 1.05 ? c.safetyRatio(c.dec(ratio)) : ''}
            </p>
          )}
        </div>
      </div>
      <p className="max-w-[68ch] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
        {c.note(r.occupancyPct, <span className="whitespace-nowrap">{P(r.entryPrice)}</span>, c.years(r.leaseYears - r.buildYears))}
      </p>
    </section>
  )
}
