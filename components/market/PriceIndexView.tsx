// «Bali property prices by area» — asking-price index from the catalogue.
// Every number on the page is read from lib/market-index.json, so a monthly
// rebuild of that file updates the page without touching the copy.

import Link from 'next/link'
import { switchLangPath, type Lang } from '@/lib/i18n'
import { SRC } from '@/lib/investment-guide/data'
import {
  MARKET, INDICATIVE_N, marketPath, knowledgePath, districtName, districtHub, usd, range, asOfLabel,
  type SaleStats,
} from '@/lib/market-index'
import { isRuEnOnlyKnowledge } from '@/lib/knowledge-locales'
import { DataTable, type DataRow } from './DataTable'
import { MarketShell, marketMetadata, H2, P, NOTE, A, type Faq } from './MarketShell'
import { PRICES_INTL } from './copy/prices-intl'
import { intlLang } from './copy/types'

const I = MARKET.island
const V = I.villas

const byDensity = Object.entries(MARKET.villaDistricts)
  .filter(([, d]) => d.n >= INDICATIVE_N && d.perM2)
  .sort((a, b) => (a[1].perM2 ?? 0) - (b[1].perM2 ?? 0))
const cheapest = byDensity[0]
const dearest = byDensity[byDensity.length - 1]

export type PriceCtx = ReturnType<typeof ctxFor>

function ctxFor(lang: Lang) {
  const kb = (ruSlug: string) => knowledgePath(ruSlug, lang)
  return {
    lang,
    $: (n: number | null | undefined) => usd(n, lang),
    nm: (d: string) => districtName(d, lang),
    when: asOfLabel(lang),
    V, I, cheapest, dearest, N: INDICATIVE_N,
    /** True when the linked guides exist only in English for this language. */
    guidesInEnglish: lang !== 'ru' && lang !== 'en' && isRuEnOnlyKnowledge(YIELD),
    href: {
      rent: marketPath('rent', lang),
      method: marketPath('method', lang),
      catalog: switchLangPath('/ru/villy', lang),
      yield: kb(YIELD),
      zoning: kb('zonirovanie-i-razresheniya-vill-na-bali-v-tsifrah'),
      lease: kb('sroki-lizholda-na-bali-v-tsifrah-tsena-za-god'),
      pp18: SRC.pp18,
    },
  }
}

const YIELD = 'dohodnost-vill-na-bali-po-rayonam-dannye'

function ruCopy(c: PriceCtx) {
  return {
    title: `Цены на недвижимость на Бали по районам — ${c.when}`,
    metaTitle: 'Цены на виллы и апартаменты на Бали по районам (данные)',
    description: `Медианная цена виллы на Бали — ${c.$(c.V.median)} (${c.V.n} объектов), апартаментов — ${c.$(c.I.apartments.median)}. Цены за м², разброс, сроки лизхолда и статус разрешений по районам. Обновлено: ${c.when}.`,
    crumb: 'Цены на недвижимость',
    h1: 'Цены на недвижимость на Бали по районам',
    lead: <>Медианная цена виллы в нашем каталоге — <strong>{c.$(c.V.median)}</strong>, половина вилл стоит от {c.$(c.V.p25)} до {c.$(c.V.p75)}. Апартаменты — <strong>{c.$(c.I.apartments.median)}</strong>. Ниже — цена за м², разброс и условия владения по районам. Это цены предложения {c.V.n} вилл и {c.I.apartments.n} апартаментов, а не цены сделок.</>,
    updated: `Данные за ${c.when} — пересчитываются раз в месяц`,
    takeawaysH2: 'Главное в цифрах',
    takeaways: [
      `Вилла с 2 спальнями — медиана ${c.$(c.I.villaByBeds['2'].median)} (${c.I.villaByBeds['2'].n} объектов), с 3 спальнями — ${c.$(c.I.villaByBeds['3'].median)}.`,
      c.cheapest && c.dearest ? `Из районов, где больше ${c.N} вилл, самый доступный по цене за м² — ${c.nm(c.cheapest[0])} (${c.$(c.cheapest[1].perM2)}/м²), самый дорогой — ${c.nm(c.dearest[0])} (${c.$(c.dearest[1].perM2)}/м²). В среднем по острову — ${c.$(c.V.perM2)}/м².` : '',
      `${c.V.offPlanShare}% вилл в каталоге ещё строятся: вы покупаете проект, а не готовый дом.`,
      `Разрешение PBG или SLF указано у ${c.V.permitShare}% вилл. У остальных — «нет данных» или «подана заявка».`,
      c.V.leaseYears ? `Типичный срок лизхолда — ${c.V.leaseYears} лет. Сравнивайте цены с учётом срока: 30 лет стоят дороже 25.` : '',
    ].filter(Boolean),
    bedsH2: 'Сколько стоит вилла по числу спален',
    bedsCols: ['Спальни', 'Объектов', 'Медиана', 'Половина вилл', 'За м²'],
    bedLabel: (b: string) => (b === '4+' ? '4 и больше' : b),
    villasH2: 'Виллы: цены по районам',
    villasCols: ['Район', 'Объектов', 'Медиана', 'Половина вилл', 'За м²', '2 спальни', 'Лизхолд', 'Строятся', 'PBG/SLF'],
    years: (n: number) => `${n} лет`,
    aptsH2: 'Апартаменты: цены по районам',
    aptsCols: ['Район', 'Объектов', 'Медиана', 'Половина', 'За м²'],
    browse: 'Смотреть',
    indicative: `* Меньше ${c.N} объектов — цифра ориентировочная, а не вывод о районе.`,
    columnsNote: '«Половина вилл» — от 25-го до 75-го перцентиля: в этот диапазон попадает средняя половина цен. «Лизхолд» — медианный срок аренды земли. «PBG/SLF» — доля вилл, у которых застройщик указал разрешение на строительство (PBG) или на эксплуатацию (SLF).',
    readH2: 'Как читать эти цифры',
    read: [
      'Это цены предложения, а не сделок. Реальную цену продажи на Бали никто не публикует; торг обычно возможен, особенно на готовые объекты.',
      'Каталог — не весь рынок. В нём объекты застройщиков, которые публикуются у нас; вторичный рынок и частные продажи сюда почти не попадают.',
      'Медиана устойчивее среднего: одна вилла за несколько миллионов не сдвигает её.',
      'Цена за м² считается по жилой площади из карточки. Земля и бассейн в неё не входят, поэтому виллы на больших участках выглядят дороже.',
    ],
    moreRead: <>Сколько эти дома приносят в аренде — на странице <Link href={c.href.rent} className={A}>цены аренды на Бали</Link>. Как считается доходность — в <Link href={c.href.yield} className={A}>разборе доходности по районам</Link>.</>,
    faqH2: 'Частые вопросы',
    faq: [
      { q: 'Сколько стоит вилла на Бали в 2026 году?', a: `Медианная цена предложения — ${c.$(c.V.median)} по ${c.V.n} виллам нашего каталога. Половина вилл стоит от ${c.$(c.V.p25)} до ${c.$(c.V.p75)}. Вилла с 2 спальнями — около ${c.$(c.I.villaByBeds['2'].median)}, с 3 спальнями — около ${c.$(c.I.villaByBeds['3'].median)}.` },
      c.cheapest ? { q: 'Где на Бали недвижимость дешевле?', a: `Из районов с достаточной выборкой виллы дешевле всего за м² в районе ${c.nm(c.cheapest[0])} — ${c.$(c.cheapest[1].perM2)}/м² (${c.cheapest[1].n} объектов). Апартаменты заметно дешевле вилл: медиана ${c.$(c.I.apartments.median)} за объект.` } : null,
      { q: 'Это реальные цены продаж?', a: 'Нет, это цены, которые застройщики указывают в предложении. Цены сделок на Бали не публикуются. Используйте эти цифры как ориентир для торга и сравнения, а не как оценку.' },
      { q: 'Лизхолд или фрихолд?', a: `Почти все виллы в каталоге продаются в лизхолд — долгосрочную аренду земли. Медианный срок — ${c.V.leaseYears ?? '—'} лет. Иностранец не может владеть землёй в фрихолд напрямую.` },
    ].filter(Boolean) as Faq[],
    sourcesH2: 'Источники и метод',
    sources: [
      { label: `Каталог Balinsky: ${c.V.n} вилл и ${c.I.apartments.n} апартаментов в продаже, цены предложения, ${c.when}`, href: c.href.catalog },
      { label: 'Как мы считаем: источники, определения, ограничения', href: c.href.method },
      { label: 'Сроки лизхолда на Бали в цифрах', href: c.href.lease },
      { label: 'Зонирование и разрешения вилл на Бали в цифрах', href: c.href.zoning },
      { label: 'Постановление правительства Индонезии № 18/2021 (права на землю)', href: c.href.pp18 },
    ],
    datasetName: 'Цены предложения на виллы и апартаменты на Бали по районам',
  }
}

function enCopy(c: PriceCtx) {
  return {
    title: `Bali property prices by area — ${c.when}`,
    metaTitle: 'Bali Villa & Apartment Prices by Area (2026 Data)',
    description: `Median Bali villa asking price: ${c.$(c.V.median)} (${c.V.n} listings); apartments: ${c.$(c.I.apartments.median)}. Price per m², spread, lease terms and permit status by area. Updated ${c.when}.`,
    crumb: 'Property prices',
    h1: 'Bali property prices by area',
    lead: <>The median villa in our catalogue is listed at <strong>{c.$(c.V.median)}</strong>; half of all villas sit between {c.$(c.V.p25)} and {c.$(c.V.p75)}. Apartments: <strong>{c.$(c.I.apartments.median)}</strong>. Below are price per m², spread and ownership terms by area. These are asking prices for {c.V.n} villas and {c.I.apartments.n} apartments, not transaction prices.</>,
    updated: `Data: ${c.when}. Recalculated monthly.`,
    takeawaysH2: 'Key numbers',
    takeaways: [
      `A 2-bedroom villa has a median asking price of ${c.$(c.I.villaByBeds['2'].median)} (${c.I.villaByBeds['2'].n} listings); a 3-bedroom, ${c.$(c.I.villaByBeds['3'].median)}.`,
      c.cheapest && c.dearest ? `Among areas with more than ${c.N} villas, the most affordable per m² is ${c.nm(c.cheapest[0])} (${c.$(c.cheapest[1].perM2)}/m²), the most expensive ${c.nm(c.dearest[0])} (${c.$(c.dearest[1].perM2)}/m²). The island median is ${c.$(c.V.perM2)}/m².` : '',
      `${c.V.offPlanShare}% of villas in the catalogue are still under construction: you are buying a project, not a finished house.`,
      `${c.V.permitShare}% of villas list a PBG or SLF permit. The rest show no permit data or an application in progress.`,
      c.V.leaseYears ? `The typical lease term is ${c.V.leaseYears} years. Compare prices with the term in mind: 30 years are worth more than 25.` : '',
    ].filter(Boolean),
    bedsH2: 'Villa prices by number of bedrooms',
    bedsCols: ['Bedrooms', 'Listings', 'Median', 'Middle half', 'Per m²'],
    bedLabel: (b: string) => b,
    villasH2: 'Villas: prices by area',
    villasCols: ['Area', 'Listings', 'Median', 'Middle half', 'Per m²', '2-bedroom', 'Lease', 'Off-plan', 'PBG/SLF'],
    years: (n: number) => `${n} yrs`,
    aptsH2: 'Apartments: prices by area',
    aptsCols: ['Area', 'Listings', 'Median', 'Middle half', 'Per m²'],
    browse: 'Browse',
    indicative: `* Fewer than ${c.N} listings — an indicative figure, not a finding about the area.`,
    columnsNote: '“Middle half” is the 25th to 75th percentile: the middle half of prices falls in this range. “Lease” is the median remaining land lease. “PBG/SLF” is the share of villas whose developer lists a building permit (PBG) or a certificate of occupancy (SLF).',
    readH2: 'How to read these numbers',
    read: [
      'These are asking prices, not sale prices. Nobody publishes actual transaction prices in Bali, and there is usually room to negotiate, especially on finished homes.',
      'The catalogue is not the whole market. It covers developers who list with us; resales and private sales are mostly missing.',
      'Medians are more robust than averages: a single multi-million villa does not move them.',
      'Price per m² uses the living area on the listing. Land and pool are not included, so villas on large plots look more expensive.',
    ],
    moreRead: <>What these homes earn as rentals is on the <Link href={c.href.rent} className={A}>Bali rent prices</Link> page. How yield is calculated: <Link href={c.href.yield} className={A}>rental yield by area</Link>.</>,
    faqH2: 'Frequently asked questions',
    faq: [
      { q: 'How much does a villa cost in Bali in 2026?', a: `The median asking price is ${c.$(c.V.median)} across ${c.V.n} villas in our catalogue. Half of them are listed between ${c.$(c.V.p25)} and ${c.$(c.V.p75)}. A 2-bedroom villa is around ${c.$(c.I.villaByBeds['2'].median)}, a 3-bedroom around ${c.$(c.I.villaByBeds['3'].median)}.` },
      c.cheapest ? { q: 'Where is property cheapest in Bali?', a: `Among areas with enough listings, villas are cheapest per m² in ${c.nm(c.cheapest[0])} at ${c.$(c.cheapest[1].perM2)}/m² (${c.cheapest[1].n} listings). Apartments cost much less than villas: a median of ${c.$(c.I.apartments.median)} per unit.` } : null,
      { q: 'Are these actual sale prices?', a: 'No. They are the prices developers ask. Transaction prices are not published in Bali. Use these figures as a benchmark for comparing and negotiating, not as a valuation.' },
      { q: 'Leasehold or freehold?', a: `Almost every villa in the catalogue is sold leasehold — a long-term lease on the land. The median term is ${c.V.leaseYears ?? '—'} years. Foreigners cannot hold freehold land directly.` },
    ].filter(Boolean) as Faq[],
    sourcesH2: 'Sources and method',
    sources: [
      { label: `Balinsky catalogue: ${c.V.n} villas and ${c.I.apartments.n} apartments for sale, asking prices, ${c.when}`, href: c.href.catalog },
      { label: 'How we calculate: sources, definitions, limitations', href: c.href.method },
      { label: 'Bali leasehold terms in numbers', href: c.href.lease },
      { label: 'Bali zoning and permits for villas, in numbers', href: c.href.zoning },
      { label: 'Indonesian Government Regulation No. 18/2021 (land rights)', href: c.href.pp18 },
    ],
    datasetName: 'Bali villa and apartment asking prices by area',
  }
}

export type PriceCopy = ReturnType<typeof enCopy>

function copy(lang: Lang): PriceCopy {
  const c = ctxFor(lang)
  if (lang === 'ru') return ruCopy(c)
  if (lang === 'en') return enCopy(c)
  return PRICES_INTL[intlLang(lang)](c)
}

export function priceIndexMetadata(lang: Lang) {
  const c = copy(lang)
  return marketMetadata('prices', lang, c.metaTitle, c.description)
}

function saleCells(s: SaleStats, lang: Lang) {
  return [s.n, usd(s.median, lang), range(s, lang), s.perM2 ? usd(s.perM2, lang) : '—']
}

export function PriceIndexView({ lang }: { lang: Lang }) {
  const c = copy(lang)
  const villaRows: DataRow[] = Object.entries(MARKET.villaDistricts)
    .sort((a, b) => b[1].n - a[1].n)
    .map(([d, s]) => ({
      key: d,
      label: districtName(d, lang),
      indicative: s.n < INDICATIVE_N,
      href: districtHub(d, 'villy', lang),
      cells: [
        ...saleCells(s, lang),
        s.n2br >= 3 ? usd(s.median2br, lang) : '—',
        s.leaseYears && s.leaseN >= 3 ? c.years(s.leaseYears) : '—',
        `${s.offPlanShare}%`,
        `${s.permitShare}%`,
      ],
    }))
  const aptRows: DataRow[] = Object.entries(MARKET.aptDistricts)
    .sort((a, b) => b[1].n - a[1].n)
    .map(([d, s]) => ({ key: d, label: districtName(d, lang), indicative: s.n < INDICATIVE_N, href: districtHub(d, 'apartamenty', lang), cells: saleCells(s, lang) }))
  const bedRows: DataRow[] = (['1', '2', '3', '4+'] as const).map(b => ({
    key: b, label: c.bedLabel(b), indicative: I.villaByBeds[b].n < INDICATIVE_N, cells: saleCells(I.villaByBeds[b], lang),
  }))

  return (
    <MarketShell
      pageKey="prices" lang={lang} crumb={c.crumb} h1={c.h1} lead={c.lead} updated={c.updated}
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
        <h2 className={H2}>{c.bedsH2}</h2>
        <DataTable columns={c.bedsCols} rows={bedRows} />
      </section>

      <section className="mb-12">
        <h2 className={H2}>{c.villasH2}</h2>
        <DataTable columns={c.villasCols} rows={villaRows} linkLabel={c.browse} />
        <p className={NOTE}>{c.indicative}</p>
        <p className={NOTE}>{c.columnsNote}</p>
      </section>

      <section className="mb-12">
        <h2 className={H2}>{c.aptsH2}</h2>
        <DataTable columns={c.aptsCols} rows={aptRows} linkLabel={c.browse} />
        <p className={NOTE}>{c.indicative}</p>
      </section>

      <section className="mb-12">
        <h2 className={H2}>{c.readH2}</h2>
        <ul className="space-y-2.5 list-disc pl-5 text-[16px] leading-[1.65] text-[#1f2937] max-w-[68ch] mb-4">
          {c.read.map(t => <li key={t}>{t}</li>)}
        </ul>
        <p className={P}>{c.moreRead}</p>
      </section>
    </MarketShell>
  )
}
