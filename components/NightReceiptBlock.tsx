import { pickCopy, type Lang } from '@/lib/i18n'
import type { Receipt, ReceiptLine } from '@/lib/investment/night-economics'
import { ChevronDown } from 'lucide-react'
import { InlinePrice } from './InlinePrice'

// «С каждой ночи остаётся…» — чек одной сданной ночи (вкладка «Посуточно»)
// или одного сданного месяца (вкладка «Помесячно») в «Будет ли спрос?». Макет «Себестоимость: понятный вывод», A
// (владелец 23.10.2026). Вместо трёх плиток «Владение / Проданная ночь /
// Цена комплекса», из которых не было понятно, сколько остаётся на руки.

const yearsRu = (n: number) => {
  const s = (Math.round(n * 10) / 10).toString().replace('.', ',')
  return Number.isInteger(n) ? `${s} ${n % 10 === 1 && n % 100 !== 11 ? 'год' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'года' : 'лет'}` : `${s} года`
}

type Node = React.ReactNode

const COPY = {
  ru: {
    verdict: (u: Receipt['unit'], net: Node, earn: Node, back: Node) => <>{u === 'night' ? 'С каждой сданной ночи' : 'С каждого сданного месяца'} вам остаётся около {net}. Из них {earn} - заработок, {back} возвращают вложенное.</>,
    verdictShort: (u: Receipt['unit'], net: Node) => <>{u === 'night' ? 'С каждой сданной ночи' : 'С каждого сданного месяца'} вам остаётся около {net}. Этого не хватает, чтобы вернуть вложенное за срок лизхолда.</>,
    eyebrow: (u: Receipt['unit']) => u === 'night' ? 'Одна сданная ночь' : 'Один сданный месяц',
    kNet: (u: Receipt['unit']) => u === 'night' ? 'С одной сданной ночи' : 'С одного сданного месяца',
    kNetSub: (x: Node) => <>из них {x} - заработок</>,
    kNetLoss: 'не возвращает вложенное за срок лизхолда',
    kMonth: 'В месяц на руки',
    kMonthSub: (r: Receipt) => r.unit === 'night' ? `при загрузке ${r.occupancyPct}%` : `если сдано ${r.monthsRented} мес. из 12`,
    kBe: 'В минус, если дешевле',
    kBeUnit: (u: Receipt['unit']) => u === 'night' ? 'за ночь' : 'в месяц',
    kBeRatio: (k: string) => `в ${k} раза ниже, чем сдают рядом`,
    kBeAbove: 'дороже, чем сейчас сдают рядом',
    how: (u: Receipt['unit']) => u === 'night' ? 'Как посчитано: чек одной ночи' : 'Как посчитано: чек одного месяца',
    guest: (u: Receipt['unit']) => u === 'night' ? 'Гость платит' : 'Жилец платит',
    guestOwn: 'Цена этого комплекса на Booking сейчас',
    guestMarket: (u: Receipt['unit']) => u === 'night' ? 'Средняя цена похожих объектов рядом' : 'Средняя цена похожих объектов рядом, помесячно',
    line: {
      discount: ['Скидки и акции', (p?: number) => `В среднем гости платят на ${p}% меньше витрины`],
      platform: ['Комиссия Booking / Airbnb', (p?: number) => `${p}%`],
      mgmt: ['Управляющая компания', (p?: number) => `${p}%`],
      agent: ['Комиссия агента', (p?: number) => `${p}% с суммы договора`],
      taxes: ['Налоги с аренды', () => 'Налог на проживание и налог на доход'],
      rentTax: ['Налог с аренды', (p?: number) => `${p}% с суммы аренды`],
      upkeep: ['Свет, вода, уборка, ремонт', () => ''],
      ownerUpkeep: ['Бассейн, сад, ремонт', () => 'Свет, воду и уборку платит жилец'],
    } as Record<ReceiptLine['key'], [string, (p?: number) => string]>,
    net: 'Вам на руки',
    back: 'Возвращает вложенное',
    earn: 'Ваш заработок сверху',
    month: (x: Node) => <>В месяц около {x} на руки</>,
    monthEarn: (x: Node) => <>Из них {x} - заработок сверх возврата вложенного</>,
    safety: (u: Receipt['unit'], be: Node) => <>Запас прочности: в минус уйдёте, только если сдавать дешевле <b className="font-semibold">{be}</b> {u === 'night' ? 'за ночь' : 'в месяц'}.</>,
    safetyRatio: (k: string) => ` Это в ${k} раза ниже, чем сдают рядом.`,
    load: (r: Receipt) => r.unit === 'night' ? `при загрузке ${r.occupancyPct}%` : `если сдано ${r.monthsRented} месяцев из 12`,
    note: (load: string, entry: Node, years: string) => <>Примерно, {load}. Вложенное - {entry} (цена, оформление и мебель) делится на {years} лизхолда: после него объект возвращается владельцу земли. Расходы - по нашей модели, подробно в калькуляторе ниже.</>,
    years: yearsRu,
    dec: (x: number) => x.toFixed(1).replace('.', ','),
  },
  en: {
    verdict: (u: Receipt['unit'], net: Node, earn: Node, back: Node) => <>Each rented {u} leaves you about {net}. Of that, {earn} is profit and {back} pays back what you invested.</>,
    verdictShort: (u: Receipt['unit'], net: Node) => <>Each rented {u} leaves you about {net}. That is not enough to pay back the investment within the leasehold.</>,
    eyebrow: (u: Receipt['unit']) => u === 'night' ? 'One booked night' : 'One rented month',
    kNet: (u: Receipt['unit']) => u === 'night' ? 'From one booked night' : 'From one rented month',
    kNetSub: (x: Node) => <>of that, {x} is profit</>,
    kNetLoss: 'does not pay back the investment within the leasehold',
    kMonth: 'In hand per month',
    kMonthSub: (r: Receipt) => r.unit === 'night' ? `at ${r.occupancyPct}% occupancy` : `if rented ${r.monthsRented} of 12 months`,
    kBe: 'At a loss below',
    kBeUnit: (u: Receipt['unit']) => u === 'night' ? 'a night' : 'a month',
    kBeRatio: (k: string) => `${k}× below what rentals nearby charge`,
    kBeAbove: 'above what rentals nearby charge now',
    how: (u: Receipt['unit']) => u === 'night' ? 'How it is calculated: one night' : 'How it is calculated: one month',
    guest: (u: Receipt['unit']) => u === 'night' ? 'Guest pays' : 'Tenant pays',
    guestOwn: 'This complex’s current rate on Booking',
    guestMarket: (u: Receipt['unit']) => u === 'night' ? 'Average rate of similar listings nearby' : 'Average monthly rent of similar listings nearby',
    line: {
      discount: ['Discounts and promos', (p?: number) => `On average guests pay ${p}% below the listed rate`],
      platform: ['Booking / Airbnb commission', (p?: number) => `${p}%`],
      mgmt: ['Management company', (p?: number) => `${p}%`],
      agent: ['Agent commission', (p?: number) => `${p}% of the lease amount`],
      taxes: ['Rental taxes', () => 'Hotel tax and income tax'],
      rentTax: ['Rental tax', (p?: number) => `${p}% of the rent`],
      upkeep: ['Utilities, cleaning, repairs', () => ''],
      ownerUpkeep: ['Pool, garden, repairs', () => 'The tenant pays utilities and cleaning'],
    } as Record<ReceiptLine['key'], [string, (p?: number) => string]>,
    net: 'You keep',
    back: 'Pays back the investment',
    earn: 'Your profit on top',
    month: (x: Node) => <>About {x} a month in hand</>,
    monthEarn: (x: Node) => <>Of that, {x} is profit beyond paying back the investment</>,
    safety: (u: Receipt['unit'], be: Node) => <>Safety margin: you only lose money if you rent below <b className="font-semibold">{be}</b> a {u}.</>,
    safetyRatio: (k: string) => ` That is ${k}× below what rentals nearby charge.`,
    load: (r: Receipt) => r.unit === 'night' ? `at ${r.occupancyPct}% occupancy` : `if rented ${r.monthsRented} months out of 12`,
    note: (load: string, entry: Node, years: string) => <>Approximate, {load}. The investment of {entry} (price, closing costs and furniture) is spread over {years} of leasehold, after which the property returns to the landowner. Costs follow our model, see the calculator below.</>,
    years: (n: number) => `${Math.round(n * 10) / 10} yrs`,
    dec: (x: number) => x.toFixed(1),
  },
}

function Row({ label, sub, value, minus = false }: { label: string; sub?: string; value: Node; minus?: boolean }) {
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

/** Три цифры сверху и чек под «Как посчитано» (макет «Будет ли спрос → Посуточно», A —
 *  владелец 23.10.2026): раньше чек занимал пол-экрана и вкладка разваливалась. */
export function NightReceiptBlock({ r, marketMedian, lang }: { r: Receipt; marketMedian: number | null; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const P = (usd: number) => <span className="whitespace-nowrap"><InlinePrice usd={usd} lang={lang} approx={false} /></span>
  const earn = r.net - r.payback
  const ratio = r.breakeven && marketMedian ? marketMedian / r.breakeven : null
  const tile = 'flex flex-col gap-1 rounded-xl px-4 py-3.5'
  return (
    <section aria-label={c.eyebrow(r.unit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {/* Без заливки по смыслу (владелец 23.10.2026): цветные плитки путались с
            цветными зонами «плохо / средне / хорошо» ниже. */}
        <div className={`${tile} bg-[var(--color-surface-alt)]`}>
          <span className="text-[13px] text-[var(--color-text-muted)]">{c.kNet(r.unit)}</span>
          <span className="text-[24px] font-semibold leading-tight tracking-tight tabular-nums">{P(r.net)}</span>
          <span className="text-[12px] leading-snug text-[var(--color-text-muted)]">{earn > 0 ? c.kNetSub(P(earn)) : c.kNetLoss}</span>
        </div>
        <div className={`${tile} bg-[var(--color-surface-alt)]`}>
          <span className="text-[13px] text-[var(--color-text-muted)]">{c.kMonth}</span>
          <span className="text-[24px] font-semibold leading-tight tracking-tight tabular-nums">{P(r.month)}</span>
          <span className="text-[12px] leading-snug text-[var(--color-text-muted)]">{c.kMonthSub(r)}</span>
        </div>
        {r.breakeven != null && (
          <div className={`${tile} bg-[var(--color-surface-alt)]`}>
            <span className="text-[13px] text-[var(--color-text-muted)]">{c.kBe}</span>
            <span className="text-[24px] font-semibold leading-tight tracking-tight tabular-nums">{P(r.breakeven)} <span className="text-[13px] font-normal text-[var(--color-text-muted)]">{c.kBeUnit(r.unit)}</span></span>
            <span className="text-[12px] leading-snug text-[var(--color-text-muted)]">{ratio != null ? (ratio > 1.05 ? c.kBeRatio(c.dec(ratio)) : ratio < 0.95 ? c.kBeAbove : '') : ''}</span>
          </div>
        )}
      </div>
      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[14px] font-medium text-[var(--color-primary)] [&::-webkit-details-marker]:hidden">
          {c.how(r.unit)} <ChevronDown size={16} aria-hidden className="transition-transform duration-[120ms] group-open:rotate-180" />
        </summary>
        <div className="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-[var(--color-surface-alt)] p-4 md:p-5">
            <span className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{c.eyebrow(r.unit)}</span>
            <Row label={c.guest(r.unit)} sub={r.ownRate ? c.guestOwn : c.guestMarket(r.unit)} value={P(r.guest)} />
            {r.lines.map(l => {
              const [label, sub] = c.line[l.key]
              return <Row key={l.key} label={label} sub={sub(l.pct) || undefined} value={P(l.value)} minus />
            })}
            <div className="flex items-baseline justify-between gap-4 border-t border-[var(--color-text)] pt-3 text-[15px] font-semibold">
              <span>{c.net}</span>
              <span className="tabular-nums">{P(r.net)}</span>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
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
            <p className="max-w-[68ch] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
              {c.note(c.load(r), P(r.entryPrice), c.years(r.leaseYears - r.buildYears))}
            </p>
          </div>
        </div>
      </details>
    </section>
  )
}
