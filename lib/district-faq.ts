// Вопросы-ответы для страницы района (аудит 21.11.2026): раньше у всех ~20
// районов на 9 языках был один и тот же блок из 5 вопросов — Google считает
// такие страницы массовыми. Теперь каждый ответ собран из цифр именно этого
// района: каталог (lib/market-index.json, пересчёт раз в месяц) и наш
// ежедневный сбор загрузки Booking (lib/district-occupancy.json).
// Цифра не показывается, если наблюдений мало. Пока RU + EN; остальные языки
// получают общий блок, пока владелец не одобрит тексты.
import { MARKET } from './market-index'
import occ from './district-occupancy.json'
import type { Lang } from './i18n'
import { pluralRu } from './plural-ru'

export type FaqItem = { q: string; a: string }

// Район каталога → зона сбора Booking (центры зон — booking_zone(), миграция 062).
// Только там, где зона и район — одно место; спорные (Pandawa, Nyanyi, Batu Belig) без цифры.
const ZONE: Record<string, string> = {
  'Batu Bolong': 'Чангу — Бату-Болонг', Canggu: 'Чангу — Бату-Болонг',
  Berawa: 'Берава', Pererenan: 'Переренан', Seseh: 'Сесех — Чемаги', Cemagi: 'Сесех — Чемаги',
  Umalas: 'Умалас', Kerobokan: 'Керобокан', Uluwatu: 'Улувату — Пекату',
  Melasti: 'Унгасан — Меласти', Ungasan: 'Унгасан — Меласти', 'Nusa Dua': 'Нуса-Дуа',
  Sanur: 'Сануp', Kedungu: 'Кедунгу — Табанан', Ubud: 'Убуд',
  'Nusa Penida': 'Нуса-Пенида — Лембонган', Karanggasem: 'Чандидаса — Карангасем',
}

const MIN_SALE = 5
const MIN_RENT = 5

type OccFile = { from: string; to: string; zones: Record<string, { occupancyPct: number; villas: number }> }
const OCC = occ as OccFile

const usdEn = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
const usdRu = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ') + ' $'
const MONTHS_RU = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const dateRu = (s: string) => { const d = new Date(s); return `${d.getUTCDate()} ${MONTHS_RU[d.getUTCMonth()]}` }
const dateEn = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const year = (s: string) => new Date(s).getUTCFullYear()
const asOf = (lang: 'ru' | 'en') => {
  const d = new Date(MARKET.asOf)
  return lang === 'ru'
    ? `${['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'][d.getUTCMonth()]} ${d.getUTCFullYear()}`
    : d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/**
 * @param district латинское имя района, как в каталоге (`Uluwatu`)
 * @param name     имя для текста на языке страницы (`Улувату`)
 * @returns null — языка нет или данных на ответы не хватает (показываем общий блок)
 */
export function districtVillaFaq(district: string, name: string, lang: Lang): FaqItem[] | null {
  if (lang !== 'ru' && lang !== 'en') return null
  const ru = lang === 'ru'
  const usd = ru ? usdRu : usdEn
  const sale = MARKET.villaDistricts[district]
  const rent = MARKET.rentDistricts[district]
  const monthly = MARKET.monthly.districts[district]
  const zone = ZONE[district] ? OCC.zones[ZONE[district]] : undefined
  const items: FaqItem[] = []

  if (sale && sale.n >= MIN_SALE && sale.median) {
    const range = sale.p25 && sale.p75 ? (ru
      ? ` Половина вилл стоит от ${usd(sale.p25)} до ${usd(sale.p75)}.`
      : ` Half of them are priced between ${usd(sale.p25)} and ${usd(sale.p75)}.`) : ''
    const m2 = sale.perM2 ? (ru ? ` Квадратный метр - около ${usd(sale.perM2)}.` : ` That is about ${usd(sale.perM2)} per m².`) : ''
    const br2 = sale.median2br && sale.n2br >= MIN_SALE ? (ru
      ? ` Вилла с двумя спальнями - около ${usd(sale.median2br)}.`
      : ` A 2-bedroom villa is about ${usd(sale.median2br)}.`) : ''
    items.push(ru
      ? { q: `Сколько стоит вилла в районе ${name}?`, a: `Медианная цена виллы в районе ${name} - ${usd(sale.median)} (${sale.n} ${pluralRu(sale.n, ['вилла', 'виллы', 'вилл'])} в каталоге Balinsky, ${asOf('ru')}).${range}${m2}${br2}` }
      : { q: `How much does a villa in ${name} cost?`, a: `The median asking price of a villa in ${name} is ${usd(sale.median)} (${sale.n} villas in the Balinsky catalogue, ${asOf('en')}).${range}${m2}${br2}` })
  }

  const n2 = rent?.villa2br, n3 = rent?.villa3br, m2r = monthly?.villa2br
  if ((n2 && n2.n >= MIN_RENT && n2.median) || (m2r && m2r.n >= MIN_RENT && m2r.median)) {
    const parts: string[] = []
    if (n2 && n2.n >= MIN_RENT && n2.median) parts.push(ru
      ? `Вилла с двумя спальнями сдаётся посуточно в среднем за ${usd(n2.median)} за ночь (медиана по ${n2.n} ${pluralRu(n2.n, ['объявлению', 'объявлениям', 'объявлениям'])} на Booking)`
      : `A 2-bedroom villa rents for a median ${usd(n2.median)} a night (${n2.n} listings on Booking)`)
    if (n3 && n3.n >= MIN_RENT && n3.median) parts.push(ru
      ? `с тремя спальнями - ${usd(n3.median)}`
      : `a 3-bedroom one for ${usd(n3.median)}`)
    let a = parts.length ? parts.join(', ') + '.' : ''
    if (m2r && m2r.n >= MIN_RENT && m2r.median) a += (a ? ' ' : '') + (ru
      ? `Помесячно двуспальная вилла сдаётся примерно за ${usd(m2r.median)} в месяц (${m2r.n} ${pluralRu(m2r.n, ['объявление', 'объявления', 'объявлений'])}).`
      : `Monthly, a 2-bedroom villa lets for about ${usd(m2r.median)} (${m2r.n} listings).`)
    if (rent?.villas) a += ru
      ? ` Всего в районе ${name} на посуточной аренде около ${rent.villas.toLocaleString('ru-RU').replace(/ /g, ' ')} ${pluralRu(rent.villas, ['виллы', 'вилл', 'вилл'])}.`
      : ` In total, about ${rent.villas.toLocaleString('en-US')} villas in ${name} are let nightly.`
    items.push(ru
      ? { q: `Сколько можно зарабатывать на аренде виллы в районе ${name}?`, a }
      : { q: `How much does a villa in ${name} rent for?`, a })
  }

  if (zone) {
    const period = ru
      ? `с ${dateRu(OCC.from)} по ${dateRu(OCC.to)} ${year(OCC.to)}`
      : `from ${dateEn(OCC.from)} to ${dateEn(OCC.to)} ${year(OCC.to)}`
    items.push(ru
      ? { q: `Какая загрузка у вилл в районе ${name}?`, a: `Balinsky каждый день отслеживает свободные даты вилл на Booking. ${period[0].toUpperCase()}${period.slice(1)} виллы в районе ${name} были заняты примерно ${Math.round(zone.occupancyPct)}% ночей из тех, что были открыты для брони (около ${zone.villas} ${pluralRu(zone.villas, ['виллы', 'вилл', 'вилл'])}). Это один период, не средняя за год: декабрь - март и июль - август обычно загруженнее.` }
      : { q: `How busy are villas in ${name}?`, a: `Balinsky checks villa availability on Booking every day. ${period[0].toUpperCase()}${period.slice(1)}, villas in ${name} were taken on about ${Math.round(zone.occupancyPct)}% of the nights that had been open for booking (about ${zone.villas} villas tracked). This is one period, not a yearly average: December to March and July to August are usually busier.` })
  }

  if (sale && sale.n >= MIN_SALE) {
    const lease = sale.leaseYears && sale.leaseN >= MIN_SALE ? (ru
      ? ` Медианный срок лизхолда у вилл в районе ${name} - ${sale.leaseYears} лет (по ${sale.leaseN} ${pluralRu(sale.leaseN, ['объявлению', 'объявлениям', 'объявлениям'])} со сроком).`
      : ` The median leasehold term of villas listed in ${name} is ${sale.leaseYears} years (${sale.leaseN} listings with a stated term).`) : ''
    items.push(ru
      ? { q: `Может ли иностранец купить виллу в районе ${name}?`, a: `Да, через лизхолд - долгосрочную аренду земли и дома, оформляется у нотариуса PPAT. Всё в каталоге Balinsky продаётся в лизхолде.${lease} Продление срока стоит прописать в договоре заранее.` }
      : { q: `Can a foreigner buy a villa in ${name}?`, a: `Yes, through leasehold — a long-term lease of the land and house, signed at a PPAT notary. Everything in the Balinsky catalogue is sold leasehold.${lease} Agree the extension terms in the contract up front.` })
    items.push(ru
      ? { q: `Что проверить перед покупкой виллы в районе ${name}?`, a: `${sale.offPlanShare}% вилл в районе ${name} продаются на стадии строительства, ${sale.permitShare > 0 ? `а разрешения PBG/SLF указаны у ${sale.permitShare}%` : 'а разрешения PBG/SLF в данных не указаны ни у одной'}. Проверьте разрешения, зону земли (на жёлтой посуточно сдавать нельзя), срок лизхолда и условия продления - на каждой карточке Balinsky это вынесено отдельно.` }
      : { q: `What should I check before buying a villa in ${name}?`, a: `${sale.offPlanShare}% of villas listed in ${name} are sold off-plan, ${sale.permitShare > 0 ? `and ${sale.permitShare}% list PBG/SLF permits` : 'and none of them list PBG/SLF permits yet'}. Check the permits, the land zone (no nightly rental on yellow, residential land), the leasehold term and extension terms — every Balinsky listing shows these separately.` })
  }

  return items.length >= 3 ? items : null
}
