// «Продаются в этом районе»: похожие виллы на продаже по соседству (rumah123.com).
// Данные — lib/sale-comps.ts.
//
// Для лизхолда сравниваем цену за м² на год владения: вилла на 25 лет и
// вилла на 50 при одной цене за м² — разные покупки.

import Image from 'next/image'
import { pickCopy, type Lang } from '@/lib/i18n'
import { type SaleCompsBundle, type SaleComp } from '@/lib/sale-comps'
import { InlinePrice } from './InlinePrice'
import { CardRail } from './CardRail'

const COPY = {
  ru: {
    title: 'Продаются в этом районе',
    line: (beds: string, r: number) => `${beds[0].toUpperCase() + beds.slice(1)} в радиусе ${String(r).replace('.', ',')} км`,
    avg: 'в среднем', range: 'обычно от', to: 'до',
    sub: (n: number, r: number, beds: string, lease: boolean) =>
      `${n} ${plural(n, ['похожая вилла', 'похожие виллы', 'похожих вилл'])}${lease ? ' на лизхолде' : ''} в радиусе ${r} км, ${beds}. Цены из объявлений rumah123.com.`,
    beds: (b: number, relaxed: boolean) => relaxed ? `${b - 1}–${b + 1} ${plural(b + 1, ['спальня', 'спальни', 'спален'])}` : `${b} ${plural(b, ['спальня', 'спальни', 'спален'])}`,
    self: 'Эта вилла',
    market: 'Середина рынка рядом',
    diff: 'Разница',
    perYear: 'за м² в год',
    perM2: 'за м²',
    pricier: (p: number) => `дороже на ${p}%`,
    cheaper: (p: number) => `дешевле на ${p}%`,
    same: 'на уровне рынка',
    howYear: 'Цена за м² в год = цена ÷ площадь ÷ срок лизхолда. Так честно сравниваются виллы на 25 и на 30 лет.',
    howM2: 'Цена за м² = цена ÷ площадь дома.',
    caveat: 'В объявлениях запрашиваемые цены, и там есть как новые, так и пожившие виллы.',
    few: 'Объявлений меньше 30 — это ориентир, а не рыночная цифра.',
    noVerdict: 'Похожих объявлений с площадью и сроком мало, поэтому цену не сравниваем.',
    bedShort: 'сп.',
    m2: 'м²',
    lease: (y: number) => `лизхолд ${y} ${plural(y, ['год', 'года', 'лет'])}`,
    freehold: 'фрихолд',
    km: 'км',
    open: 'Объявление',
    prev: 'Назад', next: 'Дальше',
    asOf: (d: string) => `Данные на ${d}`,
  },
  en: {
    title: 'For sale in this area',
    line: (beds: string, r: number) => `${beds[0].toUpperCase() + beds.slice(1)} within ${r} km`,
    avg: 'typically', range: 'usually from', to: 'to',
    sub: (n: number, r: number, beds: string, lease: boolean) =>
      `${n} similar ${n === 1 ? 'villa' : 'villas'}${lease ? ' on leasehold' : ''} within ${r} km, ${beds}. Prices from rumah123.com listings.`,
    beds: (b: number, relaxed: boolean) => relaxed ? `${b - 1}–${b + 1} bedrooms` : `${b} ${b === 1 ? 'bedroom' : 'bedrooms'}`,
    self: 'This villa',
    market: 'Market midpoint nearby',
    diff: 'Difference',
    perYear: 'per m² per year',
    perM2: 'per m²',
    pricier: (p: number) => `${p}% higher`,
    cheaper: (p: number) => `${p}% lower`,
    same: 'in line with the market',
    howYear: 'Price per m² per year = price ÷ floor area ÷ lease term. This makes 25- and 30-year leases comparable.',
    howM2: 'Price per m² = price ÷ floor area.',
    caveat: 'Listings show asking prices and include both new and lived-in villas.',
    few: 'Fewer than 30 listings — treat this as a guide, not a market figure.',
    noVerdict: 'Too few similar listings with area and lease term to compare the price.',
    bedShort: 'bd',
    m2: 'm²',
    lease: (y: number) => `leasehold ${y} yrs`,
    freehold: 'freehold',
    km: 'km',
    open: 'Listing',
    prev: 'Previous', next: 'Next',
    asOf: (d: string) => `Data as of ${d}`,
  },
}

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}


// Как «Сдают помесячно/посуточно в этом районе» (ListingVerdict → DemandSummary):
// заголовок, одна строка цен и объявления с фото от дорогих к дешёвым. Сравнение
// цены этого объекта за м² — одной фразой в «Сколько принесёт?».
export function SaleCompsBlock({ data, bedrooms, lang, hideTitle }: { data: SaleCompsBundle; bedrooms: number | null; lang: Lang; hideTitle?: boolean }) {
  const c = pickCopy(COPY, lang)
  const isYear = data.metric === 'year'
  const prices = data.comps.map(x => x.priceUsd).filter(x => x > 0).sort((x, y) => x - y)
  const q = (p: number) => prices[Math.min(prices.length - 1, Math.floor((prices.length - 1) * p))]
  const sorted = [...data.comps].sort((x, y) => y.priceUsd - x.priceUsd)
  return (
    <div>
      {!hideTitle && <h3 className="text-[18px] md:text-[20px] font-semibold text-[var(--color-text)]">{c.title}</h3>}
      {prices.length >= 3 && (
        <p className={`${hideTitle ? '' : 'mt-1 '}mb-4 text-[16px] text-[var(--color-text)]`}>
          {c.line(c.beds(bedrooms ?? 2, data.bedroomsRelaxed), data.radiusKm)}: {c.avg} <span className="whitespace-nowrap"><InlinePrice usd={q(0.5)} lang={lang} /></span>, {c.range} <span className="whitespace-nowrap"><InlinePrice usd={q(0.25)} lang={lang} approx={false} /></span> {c.to} <span className="whitespace-nowrap"><InlinePrice usd={q(0.75)} lang={lang} approx={false} /></span>.
        </p>
      )}
      <CardRail prevLabel={c.prev} nextLabel={c.next}>
        {sorted.map(comp => <CompCard key={comp.url} comp={comp} isYear={isYear} lang={lang} />)}
      </CardRail>
    </div>
  )
}

function CompCard({ comp, isYear, lang }: { comp: SaleComp; isYear: boolean; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  // rumah123 отдаёт картинку в нужном размере сам — большую не тянем.
  const photo = comp.photo?.replace('/1080x720-fit/', '/720x480-fit/') ?? null
  const right = comp.leasehold === true && comp.leaseYears ? c.lease(comp.leaseYears) : comp.leasehold === false ? c.freehold : null
  const metric = isYear ? comp.ppmYear : comp.ppm
  const facts = [`${comp.bedrooms} ${c.bedShort}`, comp.buildingM2 && `${comp.buildingM2} ${c.m2}`, right].filter(Boolean).join(' · ')
  return (
      <a
        href={comp.url}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white transition-colors duration-[120ms] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      >
        <div className="relative aspect-[3/2] bg-[var(--color-search-bg)]">
          {photo && (
            <Image src={photo} alt={`${facts}, ${comp.district ?? 'Bali'}`} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" referrerPolicy="no-referrer" loading="lazy" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-5">
          <div className="text-[20px] font-semibold text-[var(--color-text)] leading-tight">
            <InlinePrice usd={comp.priceUsd} lang={lang} />
          </div>
          <div className="text-[15px] font-medium text-[var(--color-text)]">{facts}</div>
          {metric != null && (
            <div className="text-[13px] text-[var(--color-text-muted)]">
              <InlinePrice usd={Math.round(metric)} lang={lang} /> {isYear ? c.perYear : c.perM2}
            </div>
          )}
          <div className="text-[14px] text-[var(--color-text-muted)]">
            {[comp.district, `${lang === 'en' || lang === 'zh' ? comp.distanceKm.toFixed(1) : comp.distanceKm.toFixed(1).replace('.', ',')} ${c.km}`].filter(Boolean).join(' · ')}
          </div>
        </div>
      </a>
  )
}
