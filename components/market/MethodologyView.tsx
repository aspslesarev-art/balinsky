// «How we calculate» — sources, definitions, the yield model, limits and the
// corrections policy behind every number on the market pages and listings.

import Link from 'next/link'
import type { Lang } from '@/lib/i18n'
import { switchLangPath } from '@/lib/i18n'
import { SRC } from '@/lib/investment-guide/data'
import { MARKET, INDICATIVE_N, marketPath, asOfLabel, dayLabel } from '@/lib/market-index'
import type { DataRow } from './DataTable'
import { MarketShell, marketMetadata, H2, P, A } from './MarketShell'

function copy(lang: Lang) {
  const when = asOfLabel(lang)
  const loc = lang === 'ru' ? 'ru-RU' : 'en-US'
  const n = (v: number) => v.toLocaleString(loc)
  const T = MARKET.totals
  const from = dayLabel(MARKET.monthly.from, lang), to = dayLabel(MARKET.monthly.to, lang)
  if (lang === 'ru') return {
    metaTitle: 'Как мы считаем: источники и метод данных о недвижимости Бали',
    description: 'Откуда Balinsky берёт цены, ставки аренды и доходность по Бали: источники, определения, модель доходности, ограничения и порядок исправления ошибок.',
    crumb: 'Как мы считаем',
    h1: 'Как мы считаем',
    lead: <>Каждая цифра на сайте — цена за м² против района, ставки аренды соседей, доходность — считается по открытому методу. Здесь описано, откуда данные, что означает каждый показатель и где у данных пределы.</>,
    updated: `Данные обновлены: ${when}`,
    sourcesH2: 'Откуда данные',
    sourceCols: ['Источник', 'Что берём', 'Объём'],
    sourceRows: [
      ['Каталог Balinsky', 'Цены предложения, площадь, спальни, срок лизхолда, статус строительства и разрешений — со слов застройщика', `${n(T.villas)} вилл, ${n(T.apartments)} апартаментов`],
      ['База посуточной аренды (estatemarket.io)', 'Ставки за ночь, тип объекта, число спален, координаты', `${n(T.rentals)} объектов у районов каталога`],
      ['Объявления о помесячной аренде', 'Цена в месяц, тип, спальни, район', `${n(MARKET.monthly.n)} объявлений, ${from} — ${to}`],
      ['Официальная статистика и законы', 'Турпоток и загрузка отелей (BPS Бали), права на землю (PP 18/2021), налоги', 'Ссылки — в каждом материале'],
    ],
    defsH2: 'Что означают показатели',
    defs: [
      ['Медиана', 'Середина ряда: у половины объектов цена ниже, у половины выше. Одна вилла за несколько миллионов её не сдвигает, поэтому мы используем медиану, а не среднее.'],
      ['Половина объектов (25–75%)', 'Диапазон, в который попадает средняя половина цен. Показывает, насколько цены в районе разные.'],
      ['Цена за м²', 'Цена предложения, делённая на жилую площадь из карточки. Земля, терраса и бассейн не входят.'],
      ['Ориентировочно (*)', `Меньше ${INDICATIVE_N} наблюдений. Такая цифра — наблюдение, а не вывод о районе.`],
      ['Район объекта аренды', 'Объект посуточной аренды относим к району ближайшего объекта каталога в радиусе 1,5 км. Дальше — не учитываем.'],
      ['Статус PBG/SLF', 'То, что указал застройщик: разрешение на строительство (PBG), на эксплуатацию (SLF), подана заявка или данных нет. Мы не сверяем номера с реестром.'],
    ],
    yieldH2: 'Как считается доходность',
    yield: [
      'Берём медианную ставку за ночь похожих вилл рядом (тот же тип и число спален).',
      'Умножаем на 365 и на загрузку. Базовый сценарий — 65%, рядом показываем 55% и 75%. Данные о фактической загрузке в базе ненадёжны (они считают закрытые даты календаря занятыми), поэтому мы используем сценарии, а не «реальную загрузку».',
      'Вычитаем расходы: комиссии площадок 15%, управление 20%, эксплуатация 6%, местный налог на размещение (PBJT) 10% — всего 51% валовой выручки. Налог на доход (10% для резидента, до 20% для нерезидента) идёт сверху — он зависит от вашего статуса.',
      'Делим на цену покупки. Результат — до амортизации лизхолда: земля в аренде, и через 25–30 лет право заканчивается.',
    ],
    yieldMore: <>Расчёт по районам — в статье <Link href={SRC.yieldRu} className={A}>доходность вилл на Бали по районам</Link>.</>,
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
      { t: 'Цены на недвижимость Бали по районам', href: marketPath('prices', lang) },
      { t: 'Сколько стоит аренда на Бали', href: marketPath('rent', lang) },
      { t: 'Инвестиции в недвижимость Бали: доходность по районам', href: switchLangPath('/ru/investicii-v-nedvizhimost-bali', lang) },
      { t: 'О Balinsky: что мы проверяем и чего нет', href: switchLangPath('/ru/o-balinsky', lang) },
    ],
    srcH2: 'Внешние источники',
    sources: [
      { label: 'estatemarket.io — данные посуточной аренды на Бали', href: SRC.estatemarket },
      { label: 'BPS Бали: турпоток и загрузка отелей', href: SRC.bpsOccupancy },
      { label: 'BPS: число иностранных туристов на Бали по годам', href: SRC.bpsArrivals },
      { label: 'Постановление правительства Индонезии № 18/2021 (права на землю)', href: SRC.pp18 },
      { label: 'PwC Worldwide Tax Summaries: Индонезия', href: SRC.pwcTax },
    ],
  }
  return {
    metaTitle: 'How We Calculate: Sources & Method Behind Our Bali Property Data',
    description: 'Where Balinsky’s Bali prices, rental rates and yields come from: sources, definitions, the yield model, limitations and how we correct errors.',
    crumb: 'How we calculate',
    h1: 'How we calculate',
    lead: <>Every number on the site — price per m² against the district, nearby rental rates, yield — is calculated by an open method. This page explains where the data comes from, what each figure means and where the data has limits.</>,
    updated: `Data updated: ${when}.`,
    sourcesH2: 'Where the data comes from',
    sourceCols: ['Source', 'What we use', 'Size'],
    sourceRows: [
      ['Balinsky catalogue', 'Asking prices, living area, bedrooms, lease term, construction and permit status — as reported by the developer', `${n(T.villas)} villas, ${n(T.apartments)} apartments`],
      ['Holiday-rental database (estatemarket.io)', 'Nightly rates, property type, bedrooms, coordinates', `${n(T.rentals)} properties near catalogue areas`],
      ['Long-term rental listings', 'Monthly rent, type, bedrooms, area', `${n(MARKET.monthly.n)} listings, ${from} — ${to}`],
      ['Official statistics and law', 'Arrivals and hotel occupancy (BPS Bali), land rights (PP 18/2021), taxes', 'Linked in each article'],
    ],
    defsH2: 'What the figures mean',
    defs: [
      ['Median', 'The middle of the range: half the properties are cheaper, half dearer. One multi-million villa does not move it, which is why we use medians rather than averages.'],
      ['Middle half (25th–75th percentile)', 'The range holding the middle half of prices. It shows how varied prices are in an area.'],
      ['Price per m²', 'Asking price divided by the living area on the listing. Land, terraces and pool are not included.'],
      ['Indicative (*)', `Fewer than ${INDICATIVE_N} observations. Such a figure is an observation, not a finding about the area.`],
      ['Area of a rental', 'A holiday rental is assigned to the area of the nearest catalogue listing within 1.5 km. Anything further away is left out.'],
      ['PBG/SLF status', 'What the developer reports: building permit (PBG), certificate of occupancy (SLF), application filed, or no data. We do not check the numbers against the registry.'],
    ],
    yieldH2: 'How yield is calculated',
    yield: [
      'Take the median nightly rate of similar villas nearby (same type and bedroom count).',
      'Multiply by 365 and by occupancy. The base case is 65%, with 55% and 75% shown alongside. The occupancy figures in the database are unreliable (they count blocked calendar dates as booked), so we use scenarios instead of an “actual occupancy”.',
      'Subtract costs: platform fees 15%, management 20%, running costs 6%, local accommodation tax (PBJT) 10% — 51% of gross revenue in total. Income tax (10% for a resident, up to 20% for a non-resident) comes on top, as it depends on your status.',
      'Divide by the purchase price. The result is before leasehold amortisation: the land is leased, and the right ends after 25–30 years.',
    ],
    yieldMore: <>Area-by-area results: <Link href={SRC.yieldEn} className={A}>Bali villa rental yield by area</Link>.</>,
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
      { t: 'Bali property prices by area', href: marketPath('prices', lang) },
      { t: 'How much is rent in Bali', href: marketPath('rent', lang) },
      { t: 'Bali property investment: yield by area', href: switchLangPath('/ru/investicii-v-nedvizhimost-bali', lang) },
      { t: 'About Balinsky: what we check and what we don’t', href: switchLangPath('/ru/o-balinsky', lang) },
    ],
    srcH2: 'External sources',
    sources: [
      { label: 'estatemarket.io — Bali holiday-rental data', href: SRC.estatemarket },
      { label: 'BPS Bali: arrivals and hotel occupancy', href: SRC.bpsOccupancy },
      { label: 'BPS: foreign arrivals to Bali by year', href: SRC.bpsArrivals },
      { label: 'Indonesian Government Regulation No. 18/2021 (land rights)', href: SRC.pp18 },
      { label: 'PwC Worldwide Tax Summaries: Indonesia', href: SRC.pwcTax },
    ],
  }
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
              <div className="text-[16px] font-semibold text-[#111827]">{r.label}</div>
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
              <dt className="text-[16px] font-semibold text-[#111827]">{t}</dt>
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
