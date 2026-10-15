// «Что продаётся рядом»: похожие виллы на продаже по соседству (rumah123.com)
// и где цена этого объекта относительно них. Данные — lib/sale-comps.ts.
//
// Для лизхолда сравниваем цену за м² на год владения: вилла на 25 лет и
// вилла на 50 при одной цене за м² — разные покупки.

import Image from 'next/image'
import { Tags, ArrowUpRight } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { SOLID_N, type SaleCompsBundle, type SaleComp } from '@/lib/sale-comps'
import { InlinePrice } from './InlinePrice'
import { CardRail } from './CardRail'

const COPY = {
  ru: {
    title: 'Что продаётся рядом',
    sub: (n: number, r: number, beds: string, lease: boolean) =>
      `${n} ${plural(n, ['похожая вилла', 'похожие виллы', 'похожих вилл'])}${lease ? ' на лизхолде' : ''} в радиусе ${r} км, ${beds}. Цены из объявлений rumah123.com.`,
    beds: (b: number, relaxed: boolean) => relaxed ? `${b - 1}–${b + 1} спальни` : `${b} ${plural(b, ['спальня', 'спальни', 'спален'])}`,
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
    bedShort: 'сп',
    m2: 'м²',
    lease: (y: number) => `лизхолд ${y} ${plural(y, ['год', 'года', 'лет'])}`,
    freehold: 'фрихолд',
    km: 'км',
    open: 'Объявление',
    prev: 'Назад', next: 'Дальше',
    asOf: (d: string) => `Данные на ${d}`,
  },
  en: {
    title: 'What is for sale nearby',
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

function fmtDate(iso: string, lang: Lang): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function SaleCompsBlock({ data, bedrooms, lang }: { data: SaleCompsBundle; bedrooms: number | null; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const isYear = data.metric === 'year'
  const unit = isYear ? c.perYear : c.perM2
  const diff = data.diffPct
  const diffText = diff == null ? null : Math.abs(diff) < 5 ? c.same : diff > 0 ? c.pricier(diff) : c.cheaper(-diff)

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
      <div className="px-5 py-4 md:px-6 md:py-6">
        <div className="flex items-start gap-3">
          <Tags size={18} className="text-[var(--color-primary)] mt-0.5 shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-semibold text-[var(--color-text)] leading-tight">{c.title}</h3>
            <p className="mt-1 text-[14px] leading-relaxed text-[var(--color-text-muted)] max-w-[68ch]">
              {c.sub(data.n, data.radiusKm, c.beds(bedrooms ?? 2, data.bedroomsRelaxed), isYear)}
            </p>
          </div>
        </div>

        {data.median != null && data.self != null ? (
          <>
            <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Stat label={c.self} value={<InlinePrice usd={Math.round(data.self)} lang={lang} />} sub={unit} />
              <Stat label={c.market} value={<InlinePrice usd={Math.round(data.median)} lang={lang} />} sub={unit} />
              <Stat label={c.diff} value={diffText} tone={diff != null && Math.abs(diff) >= 5 ? 'accent' : 'plain'} />
            </dl>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-text-muted)] max-w-[68ch]">
              {isYear ? c.howYear : c.howM2} {c.caveat}{data.n < SOLID_N ? ` ${c.few}` : ''}
            </p>
          </>
        ) : (
          <p className="mt-4 text-[13px] leading-relaxed text-[var(--color-text-muted)] max-w-[68ch]">{c.noVerdict}</p>
        )}

        <div className="mt-6">
          <CardRail prevLabel={c.prev} nextLabel={c.next}>
            {data.comps.map(comp => <CompCard key={comp.url} comp={comp} isYear={isYear} lang={lang} />)}
          </CardRail>
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--color-border)] text-[12px] text-[var(--color-text-muted)]">
          {c.asOf(fmtDate(data.asOf, lang))} · {data.source}
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value, sub, tone = 'plain' }: { label: string; value: React.ReactNode; sub?: string; tone?: 'plain' | 'accent' }) {
  return (
    <div className="rounded-xl bg-[var(--color-search-bg)] px-4 py-3">
      <dt className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</dt>
      <dd className={`mt-1 text-[20px] font-semibold leading-tight ${tone === 'accent' ? 'text-[var(--color-primary-pressed)]' : 'text-[var(--color-text)]'}`}>
        {value}
        {sub && <span className="ml-1 text-[13px] font-normal text-[var(--color-text-muted)]">{sub}</span>}
      </dd>
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
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-white transition-colors duration-[120ms] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      >
        <div className="relative aspect-[3/2] bg-[var(--color-search-bg)]">
          {photo && (
            <Image src={photo} alt={`${facts}, ${comp.district ?? 'Bali'}`} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" referrerPolicy="no-referrer" loading="lazy" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <div className="text-[17px] font-semibold text-[var(--color-text)] leading-tight">
            <InlinePrice usd={comp.priceUsd} lang={lang} />
          </div>
          <div className="text-[14px] text-[var(--color-text)]">{facts}</div>
          {metric != null && (
            <div className="text-[13px] text-[var(--color-text-muted)]">
              <InlinePrice usd={Math.round(metric)} lang={lang} /> {isYear ? c.perYear : c.perM2}
            </div>
          )}
          <div className="mt-auto pt-2 flex items-center justify-between gap-2 text-[13px] text-[var(--color-text-muted)]">
            <span className="truncate">{[comp.district, `${comp.distanceKm.toFixed(1)} ${c.km}`].filter(Boolean).join(' · ')}</span>
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[var(--color-primary-pressed)] group-hover:underline">
              {c.open} <ArrowUpRight size={14} aria-hidden />
            </span>
          </div>
        </div>
      </a>
  )
}
