// «How we calculate» — sources, definitions, the yield model, limits and the
// corrections policy behind every number on the market pages and listings.

import Link from 'next/link'
import type { Lang } from '@/lib/i18n'
import { switchLangPath } from '@/lib/i18n'
import { SRC } from '@/lib/investment-guide/data'
import { MARKET, INDICATIVE_N, marketPath, knowledgePath, num, asOfLabel, dayLabel } from '@/lib/market-index'
import { isRuEnOnlyKnowledge } from '@/lib/knowledge-locales'
import type { DataRow } from './DataTable'
import { MarketShell, marketMetadata, H2, P, A } from './MarketShell'
import { METHOD_INTL } from './copy/method-intl'
import { intlLang } from './copy/types'
import { pluralRu } from '@/lib/plural-ru'

const YIELD = 'dohodnost-vill-na-bali-po-rayonam-dannye'

export type MethodCtx = ReturnType<typeof ctxFor>

function ctxFor(lang: Lang) {
  return {
    lang,
    n: (v: number) => num(v, lang),
    when: asOfLabel(lang),
    from: dayLabel(MARKET.monthly.from, lang),
    to: dayLabel(MARKET.monthly.to, lang),
    T: MARKET.totals, M: MARKET.monthly, N: INDICATIVE_N,
    guidesInEnglish: lang !== 'ru' && lang !== 'en' && isRuEnOnlyKnowledge(YIELD),
    href: {
      prices: marketPath('prices', lang),
      rent: marketPath('rent', lang),
      yield: knowledgePath(YIELD, lang),
      invest: switchLangPath('/ru/investicii-v-nedvizhimost-bali', lang),
      about: switchLangPath('/ru/o-balinsky', lang),
      estatemarket: SRC.estatemarket,
      bps: SRC.bpsOccupancy,
      bpsArrivals: SRC.bpsArrivals,
      pp18: SRC.pp18,
      pwcTax: SRC.pwcTax,
    },
  }
}

function ruCopy(c: MethodCtx) {
  return {
    metaTitle: 'Как мы считаем: источники и метод данных о недвижимости Бали',
    description: 'Откуда Balinsky берёт цены, ставки аренды и доходность по Бали: источники, определения, модель доходности, ограничения и порядок исправления ошибок.',
    crumb: 'Как мы считаем',
    h1: 'Как мы считаем',
    lead: <>Каждая цифра на сайте — цена за м² против района, ставки аренды соседей, доходность — считается по открытому методу. Здесь описано, откуда данные, что означает каждый показатель и где у данных пределы.</>,
    updated: `Данные обновлены: ${c.when}`,
    sourcesH2: 'Откуда данные',
    sourceCols: ['Источник', 'Что берём', 'Объём'],
    sourceRows: [
      ['Каталог Balinsky', 'Цены предложения, площадь, спальни, срок лизхолда, статус строительства и разрешений — со слов застройщика', `${c.n(c.T.villas)} вилл, ${c.n(c.T.apartments)} апартаментов`],
      ['База посуточной аренды (estatemarket.io)', 'Ставки за ночь, тип объекта, число спален, координаты', `${c.n(c.T.rentals)} ${pluralRu(Number(c.T.rentals), ['объект', 'объекта', 'объектов'])} у районов каталога`],
      ['Объявления о помесячной аренде', 'Цена в месяц, тип, спальни, район', `${c.n(c.M.n)} объявлений, ${c.from} — ${c.to}`],
      ['Официальная статистика и законы', 'Турпоток и загрузка отелей (BPS Бали), права на землю (PP 18/2021), налоги', 'Ссылки — в каждом материале'],
    ],
    defsH2: 'Что означают показатели',
    defs: [
      ['Медиана', 'Середина ряда: у половины объектов цена ниже, у половины выше. Одна вилла за несколько миллионов её не сдвигает, поэтому мы используем медиану, а не среднее.'],
      ['Половина объектов (25–75%)', 'Диапазон, в который попадает средняя половина цен. Показывает, насколько цены в районе разные.'],
      ['Цена за м²', 'Цена предложения, делённая на жилую площадь из карточки. Земля, терраса и бассейн не входят.'],
      ['Ориентировочно (*)', `Меньше ${c.N} наблюдений. Такая цифра — наблюдение, а не вывод о районе.`],
      ['Район объекта аренды', 'Объект посуточной аренды относим к району ближайшего объекта каталога в радиусе 1,5 км. Дальше — не учитываем.'],
      ['Статус PBG/SLF', 'То, что указал застройщик: разрешение на строительство (PBG), на эксплуатацию (SLF), подана заявка или данных нет. Мы не сверяем номера с реестром.'],
    ],
    yieldH2: 'Как считается доходность',
    yield: [
      'Цена ночи. Берём цены похожих объектов рядом (тот же тип и число спален) и смешиваем с ценой, которую обычно берут за объект такой стоимости. У вилл - поровну, у апартаментов цена объекта весит больше: соседи у них часто номера гостиниц. С цены на витрине снимаем 10% - скидки и акции.',
      'Загрузка. Смотрим, сколько ночей за последний год были заняты у похожих объявлений на Booking рядом: та же спальность в 1,5 км, если мало - в 3 км, потом любая спальность в 3 и 5 км. Нужно хотя бы 5 объявлений. Берём 40-й процентиль - чуть ниже середины, без перекоса в лучшие объекты. Календари, которые закрыл хозяин, а не заняли гости, не считаем. Больше 90% не ставим. Если похожих объявлений рядом нет - 60%.',
      'Если комплекс сам сдаётся на Booking - берём его загрузку и цену. Если управляющая дала отчёт о реальных бронях - считаем по нему. Такие объекты отмечены «Подтверждённая доходность».',
      'Вычитаем расходы: комиссия площадок 16%, управляющая 17%, половина местного налога на размещение (PBJT 10%) - его часть платит гость, резерв на мебель и технику 4%. Плюс содержание: $3,3 за м² в месяц, но не меньше $1 500 в год и ещё $1 400 на каждую спальню. Плюс налог на землю и здание (PBB) - 0,1% цены в год.',
      'Делим на всю сумму входа: цена, плюс 5% на оформление, плюс мебель - $80 за м². Получаем доходность до налогов. Налог с аренды - 10% для резидента и 20% для нерезидента - показываем отдельно. Срок лизхолда не вычитаем: через 25–30 лет право на землю заканчивается.',
      'Точность. Мы сверили модель с реальными цифрами: с объектами, у которых есть свои объявления на Booking, и с реальными бронями управляющей за год. Загрузка расходится в среднем на 4–5 процентных пунктов, выручка - примерно на 20% в обе стороны. Это ориентир, а не обещание.',
    ],
    yieldMore: <>Расчёт по районам — в статье <Link href={c.href.yield} className={A}>доходность вилл на Бали по районам</Link>.</>,
    limitsH2: 'Чего эти данные не показывают',
    limits: [
      'Цены сделок. На Бали их не публикуют; мы показываем цены предложения.',
      'Весь рынок. Каталог — это застройщики, которые публикуются у нас; вторичный рынок представлен слабо.',
      'Юридическую чистоту. Документы мы показываем со слов застройщика и не удостоверяем. Перед оплатой проверьте сертификат и разрешения у нотариуса PPAT или юриста.',
      'Будущее. Прошлые ставки аренды и цены не гарантируют будущих.',
    ],
    updH2: 'Обновления и исправления',
    upd: [
      'Цены и ставки пересчитываются раз в месяц; дата расчёта указана на каждой странице с данными.',
      'Все объекты считаются одинаково: застройщик не может повлиять на расчёт своего объекта.',
      'Нашли ошибку в цене, сроке или статусе разрешения? Напишите боту в Telegram — подтверждённые ошибки исправляем и обновляем дату.',
    ],
    pagesH2: 'Где эти данные на сайте',
    pages: [
      { t: 'Цены на недвижимость Бали по районам', href: c.href.prices },
      { t: 'Сколько стоит аренда на Бали', href: c.href.rent },
      { t: 'Инвестиции в недвижимость Бали: доходность по районам', href: c.href.invest },
      { t: 'О Balinsky: что мы проверяем и чего нет', href: c.href.about },
    ],
    srcH2: 'Внешние источники',
    sources: [
      { label: 'estatemarket.io — данные посуточной аренды на Бали', href: c.href.estatemarket },
      { label: 'BPS Бали: турпоток и загрузка отелей', href: c.href.bps },
      { label: 'BPS: число иностранных туристов на Бали по годам', href: c.href.bpsArrivals },
      { label: 'Постановление правительства Индонезии № 18/2021 (права на землю)', href: c.href.pp18 },
      { label: 'PwC Worldwide Tax Summaries: Индонезия', href: c.href.pwcTax },
    ],
  }
}

function enCopy(c: MethodCtx) {
  return {
    metaTitle: 'How We Calculate: Sources & Method Behind Our Bali Property Data',
    description: 'Where Balinsky’s Bali prices, rental rates and yields come from: sources, definitions, the yield model, limitations and how we correct errors.',
    crumb: 'How we calculate',
    h1: 'How we calculate',
    lead: <>Every number on the site — price per m² against the district, nearby rental rates, yield — is calculated by an open method. This page explains where the data comes from, what each figure means and where the data has limits.</>,
    updated: `Data updated: ${c.when}.`,
    sourcesH2: 'Where the data comes from',
    sourceCols: ['Source', 'What we use', 'Size'],
    sourceRows: [
      ['Balinsky catalogue', 'Asking prices, living area, bedrooms, lease term, construction and permit status — as reported by the developer', `${c.n(c.T.villas)} villas, ${c.n(c.T.apartments)} apartments`],
      ['Holiday-rental database (estatemarket.io)', 'Nightly rates, property type, bedrooms, coordinates', `${c.n(c.T.rentals)} properties near catalogue areas`],
      ['Long-term rental listings', 'Monthly rent, type, bedrooms, area', `${c.n(c.M.n)} listings, ${c.from} — ${c.to}`],
      ['Official statistics and law', 'Arrivals and hotel occupancy (BPS Bali), land rights (PP 18/2021), taxes', 'Linked in each article'],
    ],
    defsH2: 'What the figures mean',
    defs: [
      ['Median', 'The middle of the range: half the properties are cheaper, half dearer. One multi-million villa does not move it, which is why we use medians rather than averages.'],
      ['Middle half (25th–75th percentile)', 'The range holding the middle half of prices. It shows how varied prices are in an area.'],
      ['Price per m²', 'Asking price divided by the living area on the listing. Land, terraces and pool are not included.'],
      ['Indicative (*)', `Fewer than ${c.N} observations. Such a figure is an observation, not a finding about the area.`],
      ['Area of a rental', 'A holiday rental is assigned to the area of the nearest catalogue listing within 1.5 km. Anything further away is left out.'],
      ['PBG/SLF status', 'What the developer reports: building permit (PBG), certificate of occupancy (SLF), application filed, or no data. We do not check the numbers against the registry.'],
    ],
    yieldH2: 'How yield is calculated',
    yield: [
      'Nightly rate. We take the rates of similar properties nearby (same type and bedroom count) and blend them with the rate a property at this price usually gets. For villas the two weigh equally; for apartments the price-based rate weighs more, because their neighbours are often hotel rooms. We take 10% off the listed rate for discounts and promotions.',
      'Occupancy. We look at how many nights over the past year were booked at similar Booking listings nearby: same bedroom count within 1.5 km, then 3 km, then any bedroom count within 3 and 5 km. At least 5 listings are needed. We use the 40th percentile - slightly below the middle, so the best performers do not skew it. Calendars blocked by the owner rather than booked by guests are left out. We never go above 90%. With no similar listings nearby, we use 60%.',
      'If the complex itself rents on Booking, we use its own occupancy and rate. If the manager shared a report of real bookings, we use that - such properties carry the «Verified yield» badge.',
      'Subtract costs: platform commission 16%, management 17%, half of the 10% local accommodation tax (PBJT) - guests pay part of it, a 4% reserve for furniture and appliances. Plus upkeep: $3.3 per m² a month, but at least $1,500 a year plus $1,400 per bedroom. Plus land and building tax (PBB) - 0.1% of the price a year.',
      'Divide by the full entry cost: price, plus 5% closing costs, plus furnishing at $80 per m². The result is the yield before tax. Tax on rent - 10% for a resident, 20% for a non-resident - is shown separately. Leasehold amortisation is not deducted: the land right ends after 25–30 years.',
      'Accuracy. We checked the model against real figures: properties with their own Booking listings and a manager’s real bookings over a full year. Occupancy is off by 4–5 percentage points on average, revenue by about 20% either way. Treat it as a guide, not a promise.',
    ],
    yieldMore: <>Area-by-area results: <Link href={c.href.yield} className={A}>Bali villa rental yield by area</Link>.</>,
    limitsH2: 'What this data does not show',
    limits: [
      'Transaction prices. They are not published in Bali; we show asking prices.',
      'The whole market. The catalogue covers developers who list with us; resales are underrepresented.',
      'Legal title. We show documents as reported by the developer and do not certify them. Before paying, have a PPAT notary or a lawyer check the certificate and permits.',
      'The future. Past rents and prices do not guarantee future ones.',
    ],
    updH2: 'Updates and corrections',
    upd: [
      'Prices and rates are recalculated monthly; the calculation date is shown on every data page.',
      'Every listing is calculated the same way: a developer cannot influence the figures for its own property.',
      'Found an error in a price, a date or a permit status? Message the bot on Telegram — confirmed errors are fixed and the date is updated.',
    ],
    pagesH2: 'Where this data appears',
    pages: [
      { t: 'Bali property prices by area', href: c.href.prices },
      { t: 'How much is rent in Bali', href: c.href.rent },
      { t: 'Bali property investment: yield by area', href: c.href.invest },
      { t: 'About Balinsky: what we check and what we don’t', href: c.href.about },
    ],
    srcH2: 'External sources',
    sources: [
      { label: 'estatemarket.io — Bali holiday-rental data', href: c.href.estatemarket },
      { label: 'BPS Bali: arrivals and hotel occupancy', href: c.href.bps },
      { label: 'BPS: foreign arrivals to Bali by year', href: c.href.bpsArrivals },
      { label: 'Indonesian Government Regulation No. 18/2021 (land rights)', href: c.href.pp18 },
      { label: 'PwC Worldwide Tax Summaries: Indonesia', href: c.href.pwcTax },
    ],
  }
}

export type MethodCopy = ReturnType<typeof enCopy>

function copy(lang: Lang): MethodCopy {
  const c = ctxFor(lang)
  if (lang === 'ru') return ruCopy(c)
  if (lang === 'en') return enCopy(c)
  return METHOD_INTL[intlLang(lang)](c)
}

export function methodologyMetadata(lang: Lang) {
  const c = copy(lang)
  return marketMetadata('method', lang, c.metaTitle, c.description)
}

const LIST = 'space-y-2.5 list-disc pl-5 text-[16px] leading-[1.65] text-[#1f2937] max-w-[68ch]'

export function MethodologyView({ lang }: { lang: Lang }) {
  const c = copy(lang)
  const rows: DataRow[] = c.sourceRows.map(([s, what, size]) => ({ key: s, label: s, cells: [what, size] }))
  return (
    <MarketShell pageKey="method" lang={lang} crumb={c.crumb} h1={c.h1} lead={c.lead} updated={c.updated} sources={c.sources} sourcesTitle={c.srcH2}>
      <section className="mb-12">
        <h2 className={H2}>{c.sourcesH2}</h2>
        {/* Long text cells: a stacked list reads better than a table at any width. */}
        <ul className="space-y-3 max-w-[68ch]">
          {rows.map(r => (
            <li key={r.key} className="rounded-xl border border-[var(--color-border)] bg-white p-4">
              <div className="text-[16px] font-semibold text-[var(--color-text)]">{r.label}</div>
              <p className="mt-1 text-[14px] leading-[1.6] text-[#1f2937]">{r.cells[0]}</p>
              <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">{r.cells[1]}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className={H2}>{c.defsH2}</h2>
        <dl className="space-y-4 max-w-[68ch]">
          {c.defs.map(([t, d]) => (
            <div key={t}>
              <dt className="text-[16px] font-semibold text-[var(--color-text)]">{t}</dt>
              <dd className="mt-1 text-[15px] leading-[1.65] text-[#1f2937]">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-12">
        <h2 className={H2}>{c.yieldH2}</h2>
        <ol className="space-y-2.5 list-decimal pl-5 text-[16px] leading-[1.65] text-[#1f2937] max-w-[68ch] mb-4">
          {c.yield.map(t => <li key={t}>{t}</li>)}
        </ol>
        <p className={P}>{c.yieldMore}</p>
      </section>

      <section className="mb-12">
        <h2 className={H2}>{c.limitsH2}</h2>
        <ul className={LIST}>{c.limits.map(t => <li key={t}>{t}</li>)}</ul>
      </section>

      <section className="mb-12">
        <h2 className={H2}>{c.updH2}</h2>
        <ul className={LIST}>{c.upd.map(t => <li key={t}>{t}</li>)}</ul>
      </section>

      <section className="mb-12">
        <h2 className={H2}>{c.pagesH2}</h2>
        <ul className={LIST}>
          {c.pages.map(p => <li key={p.href}><Link href={p.href} className={A}>{p.t}</Link></li>)}
        </ul>
      </section>
    </MarketShell>
  )
}
