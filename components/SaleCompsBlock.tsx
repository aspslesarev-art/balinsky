// «Продаются в этом районе»: похожие виллы на продаже по соседству (rumah123.com).
// Данные — lib/sale-comps.ts.
//
// Для лизхолда сравниваем цену за м² на год владения: вилла на 25 лет и
// вилла на 50 при одной цене за м² — разные покупки.

import Image from 'next/image'
import { pickCopy, type Lang } from '@/lib/i18n'
import { type SaleCompsBundle, type SaleComp, CATALOG_FAR_KM } from '@/lib/sale-comps'
import { InlinePrice } from './InlinePrice'
import { CardRail } from './CardRail'
import { BandedRail } from './BandedRail'
import { BAND_SURFACE, BAND_TEXT, type Band } from '@/lib/band-colors'

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
    bedShort: 'сп.', studio: 'студия',
    m2: 'м²',
    lease: (y: number) => `лизхолд ${y} ${plural(y, ['год', 'года', 'лет'])}`,
    freehold: 'фрихолд',
    km: 'км',
    open: 'Объявление',
    prev: 'Назад', next: 'Дальше',
    asOf: (d: string) => `Данные на ${d}`,
    verdict: (diff: number, year: boolean) => `${Math.abs(diff) <= 5 ? 'Эта вилла на уровне рынка' : `Эта вилла ${diff > 0 ? 'дороже' : 'дешевле'} рынка на ${Math.abs(diff)}%`} - если сравнивать цену ${year ? 'за м² на год владения' : 'за м²'}`,
    midMark: 'середина рынка',
    selfMark: 'эта вилла',
    note: (n: number, r: number, year: boolean, cat: number) => `${year ? 'За м² в год = цена ÷ площадь дома ÷ срок лизхолда. Так честно сравниваются виллы с разным сроком. ' : 'За м² = цена ÷ площадь дома. '}${n} ${plural(n, ['похожая вилла', 'похожие виллы', 'похожих вилл'])} в ${String(r).replace('.', ',')} км: ${cat ? `${cat} из каталога Balinsky, остальные - ` : ''}объявления rumah123.com.`,
    catalog: 'В каталоге Balinsky',
    far: (n: number, km: number) => `Ещё ${n} ${plural(n, ['вилла', 'виллы', 'вилл'])} из каталога Balinsky - чуть дальше, до ${km} км, в среднюю цену не ${n === 1 ? 'входит' : 'входят'}.`,
    heading: 'Что продаётся рядом',
    zone: { good: 'Дешевле рынка', mid: 'Середина рынка', bad: 'Дороже рынка' } as Record<Band, string>,
    tag: { good: 'Дешевле', mid: 'Середина', bad: 'Дороже' } as Record<Band, string>,
    upTo: 'до', from: 'от',
    count: (n: number, here: boolean) => `${n} ${plural(n, ['вилла', 'виллы', 'вилл'])}${here ? ' · здесь эта вилла' : ''}`,
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
    bedShort: 'bd', studio: 'studio',
    m2: 'm²',
    lease: (y: number) => `leasehold ${y} yrs`,
    freehold: 'freehold',
    km: 'km',
    open: 'Listing',
    prev: 'Previous', next: 'Next',
    asOf: (d: string) => `Data as of ${d}`,
    verdict: (diff: number, year: boolean) => `${Math.abs(diff) <= 5 ? 'This villa is in line with the market' : `This villa is ${Math.abs(diff)}% ${diff > 0 ? 'above' : 'below'} the market`} - comparing price per m² ${year ? 'per year of ownership' : ''}`.trim(),
    midMark: 'market midpoint',
    selfMark: 'this villa',
    note: (n: number, r: number, year: boolean, cat: number) => `${year ? 'Per m² per year = price ÷ floor area ÷ lease term, so different lease terms compare fairly. ' : 'Per m² = price ÷ floor area. '}${n} similar ${n === 1 ? 'villa' : 'villas'} within ${r} km: ${cat ? `${cat} from the Balinsky catalog, the rest ` : ''}rumah123.com listings.`,
    catalog: 'In the Balinsky catalog',
    far: (n: number, km: number) => `${n} more from the Balinsky catalog, a bit further out (up to ${km} km), not included in the average.`,
    heading: 'For sale nearby',
    zone: { good: 'Below market', mid: 'Market midpoint', bad: 'Above market' } as Record<Band, string>,
    tag: { good: 'Cheaper', mid: 'Midpoint', bad: 'Pricier' } as Record<Band, string>,
    upTo: 'up to', from: 'from',
    count: (n: number, here: boolean) => `${n} ${n === 1 ? 'villa' : 'villas'}${here ? ' · this villa is here' : ''}`,
  },
}

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}


// Вкладка «Продажа рядом» (макет «Продажа рядом: вариант 1», владелец 23.10.2026):
// вывод «дороже/дешевле рынка на X% за м² в год», шкала с этой виллой и
// серединой рынка, три зоны «дешевле / середина / дороже» с подсветкой карточек.
export function SaleCompsBlock({ data, lang, hideTitle }: { data: SaleCompsBundle; bedrooms: number | null; lang: Lang; hideTitle?: boolean }) {
  const c = pickCopy(COPY, lang)
  const isYear = data.metric === 'year'
  const q = data.q
  const metric = (x: SaleComp) => isYear ? x.ppmYear : x.ppm
  // Для покупателя дешевле — хорошо: зелёный, дороже — красный (владелец 23.10.2026).
  const band = (v: number): Band => !q ? 'mid' : v < q.p25 ? 'good' : v > q.p75 ? 'bad' : 'mid'
  const sorted = [...data.comps].sort((x, y) => (metric(x) ?? 0) - (metric(y) ?? 0))
  const P = (usd: number) => <span className="whitespace-nowrap"><InlinePrice usd={Math.round(usd)} lang={lang} approx={false} /></span>
  // Позиция на шкале: три равные трети — до четверти, середина, после трёх четвертей.
  const pos = (v: number) => {
    if (!q) return 50
    const seg = (a: number, b: number, lo: number) => lo + (b > a ? Math.min(1, Math.max(0, (v - a) / (b - a))) : 0.5) * 100 / 3
    return v < q.p25 ? seg(q.min, q.p25, 0) : v <= q.p75 ? seg(q.p25, q.p75, 100 / 3) : seg(q.p75, Math.max(q.max, v), 200 / 3)
  }
  const selfBand = data.self != null ? band(data.self) : null
  const unit = <span className="whitespace-nowrap text-[14px] font-medium text-[var(--color-text-muted)]">{isYear ? c.perYear : c.perM2}</span>

  return (
    <div className="flex flex-col gap-8">
      {!hideTitle && <h3 className="text-[18px] md:text-[20px] font-semibold text-[var(--color-text)]">{c.title}</h3>}
      {data.diffPct != null && data.self != null && data.median != null && q && (
        <section className="flex flex-col gap-5 rounded-2xl border border-[var(--color-border)] bg-white p-4 md:p-6">
          <p className="text-[18px] font-semibold leading-snug tracking-tight md:text-[20px]">{c.verdict(data.diffPct, isYear)}</p>
          <div className="flex flex-col gap-2 px-2">
            {/* Эта вилла — подписью над шкалой, середина рынка — под ней: так не накладываются. */}
            <div className="relative h-10 text-[13px]">
              <span className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-center font-semibold text-[var(--color-text)]" style={{ left: `${Math.min(85, Math.max(15, pos(data.self)))}%` }}>{c.selfMark}<br />{P(data.self)} <span className="font-normal text-[var(--color-text-muted)]">{isYear ? c.perYear : c.perM2}</span></span>
            </div>
            <div className="relative h-3 rounded-full bg-[linear-gradient(90deg,rgb(31_139_95/.25)_0_33.3%,rgb(232_160_40/.3)_33.3%_66.6%,rgb(209_67_52/.25)_66.6%_100%)]" aria-hidden="true">
              <div className="absolute -inset-y-1.5 w-0.5 bg-[var(--color-text-muted)]" style={{ left: `${pos(data.median)}%` }} />
              <div className="absolute -top-[5px] h-[22px] w-[22px] -translate-x-1/2 rounded-full border-[3px] border-white bg-[#D93025] shadow-[0_0_0_2px_#D93025]" style={{ left: `${pos(data.self)}%` }} />
            </div>
            <div className="relative h-10 text-[13px] text-[var(--color-text-muted)]">
              <span className="absolute -translate-x-1/2 whitespace-nowrap text-center" style={{ left: `${Math.min(85, Math.max(15, pos(data.median)))}%` }}>{P(data.median)} {isYear ? c.perYear : c.perM2}<br />{c.midMark}</span>
            </div>
          </div>
          <p className="max-w-[68ch] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            {c.note(data.n, data.radiusKm, isYear, data.catalogN ?? 0)}{data.n < 30 ? ` ${c.few}` : ''}{data.catalogFar ? ` ${c.far(data.catalogFar, Math.max(data.radiusKm, CATALOG_FAR_KM))}` : ''}
          </p>
        </section>
      )}
      {q && data.counts ? (
        <BandedRail heading={c.heading} prevLabel={c.prev} nextLabel={c.next}
          chips={[
            // Без единицы «$40» читалось как цена виллы (владелец 23.10.2026).
            { band: 'good', title: c.zone.good, range: <>{c.upTo} {P(q.p25)} {unit}</>, money: c.count(data.counts.cheap, selfBand === 'good') },
            { band: 'mid', title: c.zone.mid, range: <>{P(q.p25)} – {P(q.p75)} {unit}</>, money: c.count(data.counts.mid, selfBand === 'mid') },
            { band: 'bad', title: c.zone.bad, range: <>{c.from} {P(q.p75)} {unit}</>, money: c.count(data.counts.pricey, selfBand === 'bad') },
          ]}
          items={sorted.map(comp => {
            const t = band(metric(comp) ?? q.p50)
            return { band: t, node: <CompCard key={comp.url} comp={comp} isYear={isYear} lang={lang} tone={t} tag={c.tag[t]} /> }
          })} />
      ) : (
        <CardRail prevLabel={c.prev} nextLabel={c.next}>
          {sorted.map(comp => <CompCard key={comp.url} comp={comp} isYear={isYear} lang={lang} />)}
        </CardRail>
      )}
    </div>
  )
}

function CompCard({ comp, isYear, lang, tone, tag }: { comp: SaleComp; isYear: boolean; lang: Lang; tone?: Band; tag?: string }) {
  const c = pickCopy(COPY, lang)
  // rumah123 отдаёт картинку в нужном размере сам — большую не тянем.
  const photo = comp.catalog ? comp.photo : comp.photo?.replace('/1080x720-fit/', '/720x480-fit/') ?? null
  const right = comp.leasehold === true && comp.leaseYears ? c.lease(comp.leaseYears) : comp.leasehold === false ? c.freehold : null
  const metric = isYear ? comp.ppmYear : comp.ppm
  const facts = [comp.bedrooms === 0 ? c.studio : `${comp.bedrooms} ${c.bedShort}`, comp.buildingM2 && `${comp.buildingM2} ${c.m2}`, right].filter(Boolean).join(' · ')
  return (
      <a
        href={comp.url}
        target="_blank"
        rel={comp.catalog ? 'noopener' : 'nofollow noopener noreferrer'}
        className={`group flex h-full flex-col overflow-hidden rounded-2xl border ${tone ? BAND_SURFACE[tone] : 'border-[var(--color-border)] bg-white'} transition-colors duration-[120ms] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]`}
      >
        <div className="relative aspect-[3/2] bg-[var(--color-search-bg)]">
          {photo && (
            <Image src={photo} alt={`${facts}, ${comp.district ?? 'Bali'}`} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" referrerPolicy="no-referrer" loading="lazy" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-5">
          {((tone && tag) || comp.catalog) && (
            <div className="mb-1 flex flex-wrap gap-1.5">
              {tone && tag && <span className={`rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold ${BAND_TEXT[tone]}`}>{tag}</span>}
              {comp.catalog && <span className="rounded-full bg-[var(--color-primary)] px-2.5 py-0.5 text-[12px] font-semibold text-white">{c.catalog}</span>}
            </div>
          )}
          <div className="text-[20px] font-semibold text-[var(--color-text)] leading-tight">
            <InlinePrice usd={comp.priceUsd} lang={lang} />
          </div>
          {comp.name && <div className="line-clamp-1 text-[15px] font-semibold text-[var(--color-text)]">{comp.name}</div>}
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
