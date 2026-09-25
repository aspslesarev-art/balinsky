// «How much is rent in Bali» — monthly asking rents (long-term listings) and
// nightly rates (holiday rentals) by area. Numbers from lib/market-index.json.

import Link from 'next/link'
import type { Lang } from '@/lib/i18n'
import { switchLangPath } from '@/lib/i18n'
import { SRC } from '@/lib/investment-guide/data'
import {
  MARKET, INDICATIVE_N, marketPath, districtName, usd, range, asOfLabel, dayLabel,
  type RentStats,
} from '@/lib/market-index'
import { DataTable, type DataRow } from './DataTable'
import { MarketShell, marketMetadata, H2, P, NOTE, A, type Faq } from './MarketShell'

const M = MARKET.monthly
const R = MARKET.island.villaRent
const monthlyBig = Object.entries(M.districts).filter(([, d]) => d.n >= INDICATIVE_N).sort((a, b) => (a[1].all.median ?? 0) - (b[1].all.median ?? 0))
const cheapM = monthlyBig[0]
const dearM = monthlyBig[monthlyBig.length - 1]

function copy(lang: Lang) {
  const $ = (n: number | null | undefined) => usd(n, lang)
  const nm = (d: string) => districtName(d, lang)
  const when = asOfLabel(lang)
  const from = dayLabel(M.from, lang), to = dayLabel(M.to, lang)
  const two = M.island.villa2br
  const monthEq = R['2br'].median ? R['2br'].median * 30 : null
  if (lang === 'ru') return {
    metaTitle: 'Сколько стоит аренда на Бали: цены в месяц и за ночь по районам',
    description: `Аренда виллы с 2 спальнями на Бали — медиана ${$(two.median)} в месяц (${two.n} объявлений), за ночь — ${$(R['2br'].median)}. Цены по районам и числу спален, данные ${when}.`,
    crumb: 'Цены аренды',
    h1: 'Сколько стоит аренда на Бали',
    lead: <>Вилла с 2 спальнями в долгосрочную аренду — медиана <strong>{$(two.median)} в месяц</strong>, половина объявлений от {$(two.p25)} до {$(two.p75)}. Посуточно такая вилла стоит около <strong>{$(R['2br'].median)} за ночь</strong>. Ниже — цены по районам и числу спален.</>,
    updated: `Помесячная аренда — ${M.n} объявлений с ${from} по ${to}; посуточная — ${MARKET.totals.villaRentals.toLocaleString('ru-RU')} вилл, данные за ${when}`,
    takeawaysH2: 'Главное в цифрах',
    takeaways: [
      `Вилла с 1 спальней — около ${$(M.island.villa1br.median)} в месяц, с 3 спальнями — ${$(M.island.villa3br.median)}. Апартаменты — ${$(M.island.apartment.median)}.`,
      cheapM && dearM ? `Из районов, где объявлений больше ${INDICATIVE_N}, дешевле всего ${nm(cheapM[0])} (медиана ${$(cheapM[1].all.median)} в месяц), дороже всего ${nm(dearM[0])} (${$(dearM[1].all.median)}).` : '',
      monthEq ? `30 ночей посуточно по медианной ставке — ${$(monthEq)}, это в ${(monthEq / (two.median ?? monthEq)).toFixed(1).replace('.', ',')} раза больше месячной цены. Но посуточная вилла не занята каждый день, а владелец платит комиссии и управление.` : '',
    ].filter(Boolean),
    monthlyH2: 'Помесячная аренда по числу спален',
    monthlyCols: ['Тип', 'Объявлений', 'Медиана в месяц', 'Половина объявлений'],
    types: { apartment: 'Апартаменты', villa1br: 'Вилла, 1 спальня', villa2br: 'Вилла, 2 спальни', villa3br: 'Вилла, 3 спальни', villa4br: 'Вилла, 4+ спальни' },
    monthlyDistrictH2: 'Помесячная аренда по районам',
    monthlyDistrictCols: ['Район', 'Объявлений', 'Медиана', 'Половина объявлений', 'Вилла 1 сп.', 'Вилла 2 сп.', 'Вилла 3 сп.'],
    nightlyH2: 'Посуточная аренда по районам',
    nightlyCols: ['Район', 'Вилл в аренде', 'Вилла 1 сп.', 'Вилла 2 сп.', 'Вилла 3 сп.', 'Вилла 4+ сп.', 'Апартаменты'],
    nightlyNote: 'Цены за ночь — медианы ставок, которые объекты выставляют на площадках бронирования. Это цена предложения: реальная выручка зависит от загрузки, а надёжных данных о загрузке нет, поэтому мы её не показываем.',
    indicative: `* Меньше ${INDICATIVE_N} объявлений — цифра ориентировочная. Прочерк — меньше 5 объявлений.`,
    monthlyNote: `Помесячные цены — это цены из объявлений о долгосрочной аренде, опубликованных с ${from} по ${to}; старше 180 дней в расчёт не попадают. Коммунальные платежи и уборка обычно оплачиваются отдельно — уточняйте у арендодателя.`,
    moreH2: 'Если вы покупаете под аренду',
    more: <>Ставки выше — это то, с чем будет конкурировать ваша вилла. Как из них получается доходность и сколько съедают расходы, разобрано в статье <Link href={SRC.yieldRu} className={A}>доходность вилл на Бали по районам</Link>. Цены покупки по тем же районам — на странице <Link href={marketPath('prices', lang)} className={A}>цены на недвижимость Бали</Link>.</>,
    catalogue: <>Свежие объявления о помесячной аренде — в <Link href={switchLangPath('/ru/arenda', lang)} className={A}>каталоге аренды</Link>.</>,
    faqH2: 'Частые вопросы',
    faq: [
      { q: 'Сколько стоит аренда на Бали в месяц?', a: `Вилла с 2 спальнями — медиана ${$(two.median)} в месяц, с 1 спальней — ${$(M.island.villa1br.median)}, с 3 спальнями — ${$(M.island.villa3br.median)}. Апартаменты — около ${$(M.island.apartment.median)}. Это цены из ${M.n} объявлений с ${from} по ${to}.` },
      { q: 'Сколько стоит вилла на Бали за ночь?', a: `Медианная ставка виллы с 2 спальнями — ${$(R['2br'].median)} за ночь, с 1 спальней — ${$(R['1br'].median)}, с 3 спальнями — ${$(R['3br'].median)}. Данные по ${MARKET.totals.villaRentals.toLocaleString('ru-RU')} виллам на площадках бронирования.` },
      cheapM ? { q: 'Где на Бали аренда дешевле?', a: `Из районов с достаточным числом объявлений дешевле всего ${nm(cheapM[0])}: медиана ${$(cheapM[1].all.median)} в месяц. В районах у океана на юго-западе (Чангу, Берава, Переренан) аренда заметно дороже.` } : null,
      { q: 'Выгоднее снимать помесячно или посуточно?', a: `Помесячно. 30 ночей по медианной посуточной ставке виллы с 2 спальнями — около ${monthEq ? $(monthEq) : '—'}, а месячная аренда такой виллы — ${$(two.median)}.` },
    ].filter(Boolean) as Faq[],
    sourcesH2: 'Источники и метод',
    sources: [
      { label: `Каталог аренды Balinsky: ${M.n} объявлений о помесячной аренде, ${from} — ${to}`, href: switchLangPath('/ru/arenda', lang) },
      { label: `База посуточной аренды Balinsky: ${MARKET.totals.rentals.toLocaleString('ru-RU')} объектов, источник — estatemarket.io`, href: SRC.estatemarket },
      { label: 'Как мы считаем: источники, определения, ограничения', href: marketPath('method', lang) },
      { label: 'Ставки аренды вилл на Бали по районам', href: '/ru/znaniya/stavki-arendy-vill-na-bali-po-rayonam-2026' },
      { label: 'Статистика туризма Бали (BPS)', href: SRC.bpsOccupancy },
    ],
    datasetName: 'Цены аренды на Бали: помесячно и посуточно по районам',
  }
  return {
    metaTitle: 'How Much Is Rent in Bali? Monthly & Nightly Prices by Area',
    description: `Renting a 2-bedroom villa in Bali: median ${$(two.median)} a month (${two.n} listings) or ${$(R['2br'].median)} a night. Prices by area and bedrooms, data for ${when}.`,
    crumb: 'Rent prices',
    h1: 'How much is rent in Bali?',
    lead: <>A 2-bedroom villa on a long-term lease has a median rent of <strong>{$(two.median)} a month</strong>; half of all listings sit between {$(two.p25)} and {$(two.p75)}. As a holiday rental, the same villa goes for about <strong>{$(R['2br'].median)} a night</strong>. Prices by area and bedroom count are below.</>,
    updated: `Monthly: ${M.n} listings from ${from} to ${to}. Nightly: ${MARKET.totals.villaRentals.toLocaleString('en-US')} villas, ${when}.`,
    takeawaysH2: 'Key numbers',
    takeaways: [
      `A 1-bedroom villa rents for about ${$(M.island.villa1br.median)} a month, a 3-bedroom for ${$(M.island.villa3br.median)}. Apartments: ${$(M.island.apartment.median)}.`,
      cheapM && dearM ? `Among areas with more than ${INDICATIVE_N} listings, ${nm(cheapM[0])} is the cheapest (median ${$(cheapM[1].all.median)} a month) and ${nm(dearM[0])} the most expensive (${$(dearM[1].all.median)}).` : '',
      monthEq ? `Thirty nights at the median nightly rate come to ${$(monthEq)}, ${(monthEq / (two.median ?? monthEq)).toFixed(1)} times the monthly rent. But a holiday villa is not booked every night, and the owner pays platform fees and management.` : '',
    ].filter(Boolean),
    monthlyH2: 'Monthly rent by bedrooms',
    monthlyCols: ['Type', 'Listings', 'Median per month', 'Middle half'],
    types: { apartment: 'Apartment', villa1br: 'Villa, 1 bedroom', villa2br: 'Villa, 2 bedrooms', villa3br: 'Villa, 3 bedrooms', villa4br: 'Villa, 4+ bedrooms' },
    monthlyDistrictH2: 'Monthly rent by area',
    monthlyDistrictCols: ['Area', 'Listings', 'Median', 'Middle half', '1-bed villa', '2-bed villa', '3-bed villa'],
    nightlyH2: 'Nightly rates by area',
    nightlyCols: ['Area', 'Villas for rent', '1-bed villa', '2-bed villa', '3-bed villa', '4+ bed villa', 'Apartment'],
    nightlyNote: 'Nightly figures are median listed rates on booking platforms. They are asking rates: actual revenue depends on occupancy, and reliable occupancy data does not exist, so we do not show it.',
    indicative: `* Fewer than ${INDICATIVE_N} listings — indicative. A dash means fewer than 5 listings.`,
    monthlyNote: `Monthly figures are asking rents from long-term rental listings posted between ${from} and ${to}. Anything older than 180 days is excluded. Utilities and cleaning are usually extra — check with the landlord.`,
    moreH2: 'If you are buying to rent out',
    more: <>The rates above are what your villa will compete with. How they turn into yield, and how much costs take, is in <Link href={SRC.yieldEn} className={A}>Bali villa rental yield by area</Link>. Purchase prices for the same areas are on <Link href={marketPath('prices', lang)} className={A}>Bali property prices</Link>.</>,
    catalogue: <>Current monthly rental listings are in the <Link href={switchLangPath('/ru/arenda', lang)} className={A}>rental catalogue</Link>.</>,
    faqH2: 'Frequently asked questions',
    faq: [
      { q: 'How much is rent in Bali per month?', a: `A 2-bedroom villa has a median rent of ${$(two.median)} a month; a 1-bedroom ${$(M.island.villa1br.median)}; a 3-bedroom ${$(M.island.villa3br.median)}. Apartments are around ${$(M.island.apartment.median)}. Based on ${M.n} listings from ${from} to ${to}.` },
      { q: 'How much is a villa in Bali per night?', a: `The median nightly rate is ${$(R['2br'].median)} for a 2-bedroom villa, ${$(R['1br'].median)} for a 1-bedroom and ${$(R['3br'].median)} for a 3-bedroom, across ${MARKET.totals.villaRentals.toLocaleString('en-US')} villas on booking platforms.` },
      cheapM ? { q: 'Where is rent cheapest in Bali?', a: `Among areas with enough listings, ${nm(cheapM[0])} is the cheapest at a median of ${$(cheapM[1].all.median)} a month. The south-west coast (Canggu, Berawa, Pererenan) is noticeably more expensive.` } : null,
      { q: 'Is it cheaper to rent monthly or nightly?', a: `Monthly. Thirty nights at the median nightly rate for a 2-bedroom villa come to about ${monthEq ? $(monthEq) : '—'}, while the same villa rents for ${$(two.median)} a month.` },
    ].filter(Boolean) as Faq[],
    sourcesH2: 'Sources and method',
    sources: [
      { label: `Balinsky rental catalogue: ${M.n} long-term rental listings, ${from} — ${to}`, href: switchLangPath('/ru/arenda', lang) },
      { label: `Balinsky holiday-rental database: ${MARKET.totals.rentals.toLocaleString('en-US')} properties, sourced from estatemarket.io`, href: SRC.estatemarket },
      { label: 'How we calculate: sources, definitions, limitations', href: marketPath('method', lang) },
      { label: 'Bali villa rental rates by area', href: '/en/knowledge/bali-villa-rental-rates-by-area-2026' },
      { label: 'Bali tourism statistics (BPS)', href: SRC.bpsOccupancy },
    ],
    datasetName: 'Bali rent prices: monthly and nightly, by area',
  }
}

export function rentIndexMetadata(lang: Lang) {
  const c = copy(lang)
  return marketMetadata('rent', lang, c.metaTitle, c.description)
}

const cell = (s: RentStats | undefined, lang: Lang) => (s && s.n >= 5 ? usd(s.median, lang) : '—')

export function RentIndexView({ lang }: { lang: Lang }) {
  const c = copy(lang)
  const typeRows: DataRow[] = (['villa1br', 'villa2br', 'villa3br', 'villa4br', 'apartment'] as const).map(k => {
    const s = M.island[k]
    return { key: k, label: c.types[k], indicative: s.n < INDICATIVE_N, cells: [s.n, usd(s.median, lang), range(s, lang)] }
  })
  const monthlyRows: DataRow[] = Object.entries(M.districts)
    .sort((a, b) => b[1].n - a[1].n)
    .map(([d, s]) => ({
      key: d, label: districtName(d, lang), indicative: s.n < INDICATIVE_N,
      cells: [s.n, usd(s.all.median, lang), range(s.all, lang), cell(s.villa1br, lang), cell(s.villa2br, lang), cell(s.villa3br, lang)],
    }))
  const nightlyRows: DataRow[] = Object.entries(MARKET.rentDistricts)
    .filter(([, s]) => s.villas >= 50)
    .sort((a, b) => b[1].villas - a[1].villas)
    .map(([d, s]) => ({
      key: d, label: districtName(d, lang), indicative: s.villas < INDICATIVE_N,
      cells: [s.villas.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US'), cell(s.villa1br, lang), cell(s.villa2br, lang), cell(s.villa3br, lang), cell(s.villa4br, lang), cell(s.apartment, lang)],
    }))

  return (
    <MarketShell
      pageKey="rent" lang={lang} crumb={c.crumb} h1={c.h1} lead={c.lead} updated={c.updated}
      sources={c.sources} sourcesTitle={c.sourcesH2} faq={c.faq} faqTitle={c.faqH2}
      dataset={{ name: c.datasetName, description: c.description }}
    >
      <section className="mb-12">
        <h2 className={H2}>{c.takeawaysH2}</h2>
        <ul className="space-y-2.5 list-disc pl-5 text-[16px] leading-[1.65] text-[#1f2937] max-w-[68ch]">
          {c.takeaways.map(t => <li key={t}>{t}</li>)}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className={H2}>{c.monthlyH2}</h2>
        <DataTable columns={c.monthlyCols} rows={typeRows} />
        <p className={NOTE}>{c.monthlyNote}</p>
      </section>

      <section className="mb-12">
        <h2 className={H2}>{c.monthlyDistrictH2}</h2>
        <DataTable columns={c.monthlyDistrictCols} rows={monthlyRows} />
        <p className={NOTE}>{c.indicative}</p>
        <p className={`${NOTE} mt-2`}>{c.catalogue}</p>
      </section>

      <section className="mb-12">
        <h2 className={H2}>{c.nightlyH2}</h2>
        <DataTable columns={c.nightlyCols} rows={nightlyRows} />
        <p className={NOTE}>{c.nightlyNote}</p>
      </section>

      <section className="mb-12">
        <h2 className={H2}>{c.moreH2}</h2>
        <p className={P}>{c.more}</p>
      </section>
    </MarketShell>
  )
}
