'use client'

import { useCurrency } from '../CurrencyContext'
import type { Lang } from '@/lib/i18n'
import { MONTHS_RENTED } from '@/lib/investment/monthly'
import type { Snapshot } from './types'
import { fmtMoney, pluralRu } from './utils'

// Годы с десятыми: «23,8 года». Запятая везде, кроме английского и китайского.
const one = (n: number, comma = true) => {
  const s = (Math.round(n * 10) / 10).toString()
  return comma ? s.replace('.', ',') : s
}
// Польский и украинский: дробные — родительный падеж единственного числа.
const plYears = (n: number) => `${one(n)} ${!Number.isInteger(n) ? 'roku' : n === 1 ? 'rok' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'lata' : 'lat'}`

const RU = {
  locale: 'ru-RU',
  years: (n: number) => `${one(n)} ${Number.isInteger(n) ? pluralRu(n, ['год', 'года', 'лет']) : 'года'}`,
  vsRate: (x: string) => `Себестоимость в ${x} раза ниже вашей ставки`,
  aboveRate: 'Себестоимость выше вашей ставки',
  noLoad: 'Без загрузки себестоимость не считается',
  detailed: 'Подробный расчёт доходности',
  calcRate: 'Ваша ставка',
  calcRateSub: 'Из калькулятора ниже',
  eyebrow: 'Себестоимость',
  note: (price: string, lease: string, build: string, total: string, nights: string) =>
    `Примерно. Цена ${price}, лизхолд ${lease}${build}${total} = ${nights} ночей. В конце срока объект возвращается владельцу земли. Расходы на управление не учтены.`,
  buildPart: (b: string) => `, из них ${b} стройка`,
  marketBar: (v: string) => `Рынок ${v}`,
  own: 'Владение',
  market: 'Сдают рядом',
  daily: {
    title: 'Сколько стоит вам одна ночь',
    per: ' / ночь',
    ownSub: (other: string) => `${other} в месяц. Цена ÷ ночи лизхолда`,
    sold: 'Проданная ночь',
    soldSub: (occ: number) => `При загрузке ${occ}%. Ниже этой цены сдавать в минус`,
    marketSub: 'Похожие объявления рядом, обычная цена',
    marketOwn: 'Цена этого комплекса сейчас',
    yours: (v: string) => `Ваша ночь ${v}`,
    cheaper: (x: string) => `Ночь обходится в ${x} раза дешевле, чем сдают рядом`,
    pricier: 'Ночь обходится дороже, чем сдают рядом',
  },
  monthly: {
    title: 'Сколько стоит вам один месяц',
    per: ' / мес',
    ownSub: (other: string) => `${other} за ночь. Цена ÷ месяцы лизхолда`,
    sold: 'Сданный месяц',
    soldSub: (months: number) => `Сдаётся ${months} месяцев из 12. Ниже этой цены сдавать в минус`,
    marketSub: 'Похожие объявления рядом, помесячно',
    marketOwn: '',
    yours: (v: string) => `Ваш месяц ${v}`,
    cheaper: (x: string) => `Месяц обходится в ${x} раза дешевле, чем сдают рядом`,
    pricier: 'Месяц обходится дороже, чем сдают рядом',
  },
}
type Copy = typeof RU

const ID: Copy = {
  locale: 'id-ID',
  years: (n: number) => `${one(n)} tahun`,
  vsRate: (x) => `Biaya pokok ${x}× lebih rendah dari tarif Anda`,
  aboveRate: 'Biaya pokok lebih tinggi dari tarif Anda',
  noLoad: 'Tanpa okupansi biaya pokok tidak bisa dihitung',
  detailed: 'Perhitungan imbal hasil terperinci',
  calcRate: 'Tarif Anda',
  calcRateSub: 'Dari kalkulator di bawah',
  eyebrow: 'Biaya pokok',
  note: (price, lease, build, total, nights) =>
    `Perkiraan. Harga ${price}, leasehold ${lease}${build}${total} = ${nights} malam. Di akhir masa sewa properti kembali ke pemilik tanah. Biaya pengelolaan tidak termasuk.`,
  buildPart: (b) => `, termasuk ${b} pembangunan`,
  marketBar: (v) => `Pasar ${v}`,
  own: 'Kepemilikan',
  market: 'Disewakan di sekitar',
  daily: {
    title: 'Berapa biaya satu malam bagi Anda',
    per: ' / malam',
    ownSub: (o) => `${o} per bulan. Harga ÷ malam leasehold`,
    sold: 'Malam terjual',
    soldSub: (occ) => `Dengan okupansi ${occ}%. Di bawah tarif ini Anda menyewakan dengan rugi`,
    marketSub: 'Listing serupa di sekitar, tarif biasa',
    marketOwn: 'Tarif kompleks ini saat ini',
    yours: (v) => `Malam Anda ${v}`,
    cheaper: (x) => `Satu malam ${x}× lebih murah dari tarif sewa di sekitar`,
    pricier: 'Satu malam lebih mahal dari tarif sewa di sekitar',
  },
  monthly: {
    title: 'Berapa biaya satu bulan bagi Anda',
    per: ' / bln',
    ownSub: (o) => `${o} per malam. Harga ÷ bulan leasehold`,
    sold: 'Bulan tersewa',
    soldSub: (m) => `Tersewa ${m} dari 12 bulan. Di bawah tarif ini Anda menyewakan dengan rugi`,
    marketSub: 'Listing serupa di sekitar, bulanan',
    marketOwn: '',
    yours: (v) => `Bulan Anda ${v}`,
    cheaper: (x) => `Satu bulan ${x}× lebih murah dari tarif sewa di sekitar`,
    pricier: 'Satu bulan lebih mahal dari tarif sewa di sekitar',
  },
}

// Переводы на 8 языков — 18.10.2026, по ок владельца на русский текст.
const COPY: Record<Lang, Copy> = {
  ru: RU,
  en: {
    locale: 'en-US',
    years: (n) => `${one(n, false)} yrs`,
    vsRate: (x) => `Cost price is ${x}× below your rate`,
    aboveRate: 'Cost price is above your rate',
    noLoad: 'With zero occupancy there is no cost price',
    detailed: 'Detailed yield calculation',
    calcRate: 'Your rate',
    calcRateSub: 'From the calculator below',
    eyebrow: 'Cost price',
    note: (price, lease, build, total, nights) =>
      `Approximate. Price ${price}, leasehold ${lease}${build}${total} = ${nights} nights. At the end of the term the property returns to the landowner. Management costs not included.`,
    buildPart: (b) => `, of which ${b} construction`,
    marketBar: (v) => `Market ${v}`,
    own: 'Ownership',
    market: 'Rented nearby',
    daily: {
      title: 'What one night costs you',
      per: ' / night',
      ownSub: (o) => `${o} a month. Price ÷ leasehold nights`,
      sold: 'Booked night',
      soldSub: (occ) => `At ${occ}% occupancy. Below this rate you rent at a loss`,
      marketSub: 'Similar listings nearby, typical rate',
      marketOwn: 'This complex’s current rate',
      yours: (v) => `Your night ${v}`,
      cheaper: (x) => `A night costs you ${x}× less than rentals nearby charge`,
      pricier: 'A night costs you more than rentals nearby charge',
    },
    monthly: {
      title: 'What one month costs you',
      per: ' / mo',
      ownSub: (o) => `${o} a night. Price ÷ leasehold months`,
      sold: 'Rented month',
      soldSub: (m) => `Rented ${m} months out of 12. Below this rate you rent at a loss`,
      marketSub: 'Similar listings nearby, monthly',
      marketOwn: '',
      yours: (v) => `Your month ${v}`,
      cheaper: (x) => `A month costs you ${x}× less than rentals nearby charge`,
      pricier: 'A month costs you more than rentals nearby charge',
    },
  },
  id: ID,
  // Балийский на сайте написан по-индонезийски — как и остальной калькулятор.
  ban: ID,
  fr: {
    locale: 'fr-FR',
    years: (n) => `${one(n)} ans`,
    vsRate: (x) => `Le prix de revient est ${x} fois inférieur à votre tarif`,
    aboveRate: 'Le prix de revient dépasse votre tarif',
    noLoad: 'Sans occupation, pas de prix de revient',
    detailed: 'Calcul détaillé du rendement',
    calcRate: 'Votre tarif',
    calcRateSub: 'Depuis le calculateur ci-dessous',
    eyebrow: 'Prix de revient',
    note: (price, lease, build, total, nights) =>
      `Approximatif. Prix ${price}, leasehold ${lease}${build}${total} = ${nights} nuits. À la fin du bail, le bien revient au propriétaire du terrain. Frais de gestion non inclus.`,
    buildPart: (b) => `, dont ${b} de construction`,
    marketBar: (v) => `Marché ${v}`,
    own: 'Possession',
    market: 'Loué à proximité',
    daily: {
      title: 'Combien vous coûte une nuit',
      per: ' / nuit',
      ownSub: (o) => `${o} par mois. Prix ÷ nuits du leasehold`,
      sold: 'Nuit louée',
      soldSub: (occ) => `À ${occ} % d’occupation. En dessous de ce tarif, vous louez à perte`,
      marketSub: 'Annonces similaires à proximité, tarif habituel',
      marketOwn: 'Tarif actuel de ce complexe',
      yours: (v) => `Votre nuit ${v}`,
      cheaper: (x) => `Une nuit vous coûte ${x} fois moins que les locations voisines`,
      pricier: 'Une nuit vous coûte plus cher que les locations voisines',
    },
    monthly: {
      title: 'Combien vous coûte un mois',
      per: ' / mois',
      ownSub: (o) => `${o} par nuit. Prix ÷ mois du leasehold`,
      sold: 'Mois loué',
      soldSub: (m) => `Loué ${m} mois sur 12. En dessous de ce tarif, vous louez à perte`,
      marketSub: 'Annonces similaires à proximité, au mois',
      marketOwn: '',
      yours: (v) => `Votre mois ${v}`,
      cheaper: (x) => `Un mois vous coûte ${x} fois moins que les locations voisines`,
      pricier: 'Un mois vous coûte plus cher que les locations voisines',
    },
  },
  de: {
    locale: 'de-DE',
    years: (n) => `${one(n)} Jahre`,
    vsRate: (x) => `Die Selbstkosten liegen ${x}-mal unter Ihrem Preis`,
    aboveRate: 'Die Selbstkosten liegen über Ihrem Preis',
    noLoad: 'Ohne Auslastung keine Selbstkosten',
    detailed: 'Detaillierte Renditeberechnung',
    calcRate: 'Ihr Preis',
    calcRateSub: 'Aus dem Rechner unten',
    eyebrow: 'Selbstkosten',
    note: (price, lease, build, total, nights) =>
      `Ungefähr. Preis ${price}, Leasehold ${lease}${build}${total} = ${nights} Nächte. Am Ende der Laufzeit geht die Immobilie an den Grundeigentümer zurück. Verwaltungskosten nicht enthalten.`,
    buildPart: (b) => `, davon ${b} Bauzeit`,
    marketBar: (v) => `Markt ${v}`,
    own: 'Besitz',
    market: 'Vermietet in der Nähe',
    daily: {
      title: 'Was Sie eine Nacht kostet',
      per: ' / Nacht',
      ownSub: (o) => `${o} pro Monat. Preis ÷ Nächte des Leasehold`,
      sold: 'Vermietete Nacht',
      soldSub: (occ) => `Bei ${occ} % Auslastung. Darunter vermieten Sie mit Verlust`,
      marketSub: 'Ähnliche Angebote in der Nähe, üblicher Preis',
      marketOwn: 'Aktueller Preis dieser Anlage',
      yours: (v) => `Ihre Nacht ${v}`,
      cheaper: (x) => `Eine Nacht kostet Sie ${x}-mal weniger als Vermietungen in der Nähe`,
      pricier: 'Eine Nacht kostet Sie mehr als Vermietungen in der Nähe',
    },
    monthly: {
      title: 'Was Sie ein Monat kostet',
      per: ' / Monat',
      ownSub: (o) => `${o} pro Nacht. Preis ÷ Monate des Leasehold`,
      sold: 'Vermieteter Monat',
      soldSub: (m) => `${m} von 12 Monaten vermietet. Darunter vermieten Sie mit Verlust`,
      marketSub: 'Ähnliche Angebote in der Nähe, monatlich',
      marketOwn: '',
      yours: (v) => `Ihr Monat ${v}`,
      cheaper: (x) => `Ein Monat kostet Sie ${x}-mal weniger als Vermietungen in der Nähe`,
      pricier: 'Ein Monat kostet Sie mehr als Vermietungen in der Nähe',
    },
  },
  zh: {
    locale: 'zh-CN',
    years: (n) => `${one(n, false)} 年`,
    vsRate: (x) => `成本比您的价格低 ${x} 倍`,
    aboveRate: '成本高于您的价格',
    noLoad: '入住率为零时无法计算成本',
    detailed: '详细收益计算',
    calcRate: '您的价格',
    calcRateSub: '来自下方计算器',
    eyebrow: '成本价',
    note: (price, lease, build, total, nights) =>
      `估算。价格 ${price}，租赁期 ${lease}${build}${total} = ${nights} 晚。租期结束后物业归还土地所有者。未计入管理费用。`,
    buildPart: (b) => `，其中建设期 ${b}`,
    marketBar: (v) => `市场 ${v}`,
    own: '持有成本',
    market: '附近租金',
    daily: {
      title: '每晚成本是多少',
      per: ' / 晚',
      ownSub: (o) => `每月 ${o}。价格 ÷ 租赁期晚数`,
      sold: '已售出的一晚',
      soldSub: (occ) => `入住率 ${occ}%。低于此价格出租即亏损`,
      marketSub: '附近同类房源，常见价格',
      marketOwn: '本项目当前价格',
      yours: (v) => `您的一晚 ${v}`,
      cheaper: (x) => `每晚成本比附近租金低 ${x} 倍`,
      pricier: '每晚成本高于附近租金',
    },
    monthly: {
      title: '每月成本是多少',
      per: ' / 月',
      ownSub: (o) => `每晚 ${o}。价格 ÷ 租赁期月数`,
      sold: '已出租的一个月',
      soldSub: (m) => `每年出租 ${m} 个月。低于此价格出租即亏损`,
      marketSub: '附近同类房源，按月',
      marketOwn: '',
      yours: (v) => `您的一个月 ${v}`,
      cheaper: (x) => `每月成本比附近租金低 ${x} 倍`,
      pricier: '每月成本高于附近租金',
    },
  },
  nl: {
    locale: 'nl-NL',
    years: (n) => `${one(n)} jaar`,
    vsRate: (x) => `De kostprijs ligt ${x}× onder uw tarief`,
    aboveRate: 'De kostprijs ligt boven uw tarief',
    noLoad: 'Zonder bezetting geen kostprijs',
    detailed: 'Gedetailleerde rendementsberekening',
    calcRate: 'Uw tarief',
    calcRateSub: 'Uit de calculator hieronder',
    eyebrow: 'Kostprijs',
    note: (price, lease, build, total, nights) =>
      `Bij benadering. Prijs ${price}, leasehold ${lease}${build}${total} = ${nights} nachten. Aan het einde van de looptijd gaat het object terug naar de grondeigenaar. Beheerkosten niet inbegrepen.`,
    buildPart: (b) => `, waarvan ${b} bouw`,
    marketBar: (v) => `Markt ${v}`,
    own: 'Bezit',
    market: 'Verhuurd in de buurt',
    daily: {
      title: 'Wat één nacht u kost',
      per: ' / nacht',
      ownSub: (o) => `${o} per maand. Prijs ÷ nachten leasehold`,
      sold: 'Verhuurde nacht',
      soldSub: (occ) => `Bij ${occ}% bezetting. Onder dit tarief verhuurt u met verlies`,
      marketSub: 'Vergelijkbare aanbiedingen in de buurt, gangbaar tarief',
      marketOwn: 'Huidig tarief van dit complex',
      yours: (v) => `Uw nacht ${v}`,
      cheaper: (x) => `Een nacht kost u ${x}× minder dan verhuur in de buurt vraagt`,
      pricier: 'Een nacht kost u meer dan verhuur in de buurt vraagt',
    },
    monthly: {
      title: 'Wat één maand u kost',
      per: ' / mnd',
      ownSub: (o) => `${o} per nacht. Prijs ÷ maanden leasehold`,
      sold: 'Verhuurde maand',
      soldSub: (m) => `${m} van de 12 maanden verhuurd. Onder dit tarief verhuurt u met verlies`,
      marketSub: 'Vergelijkbare aanbiedingen in de buurt, per maand',
      marketOwn: '',
      yours: (v) => `Uw maand ${v}`,
      cheaper: (x) => `Een maand kost u ${x}× minder dan verhuur in de buurt vraagt`,
      pricier: 'Een maand kost u meer dan verhuur in de buurt vraagt',
    },
  },
  pl: {
    locale: 'pl-PL',
    years: plYears,
    vsRate: (x) => `Koszt własny jest ${x} razy niższy od Twojej stawki`,
    aboveRate: 'Koszt własny jest wyższy od Twojej stawki',
    noLoad: 'Bez obłożenia nie da się policzyć kosztu',
    detailed: 'Szczegółowe obliczenie rentowności',
    calcRate: 'Twoja stawka',
    calcRateSub: 'Z kalkulatora poniżej',
    eyebrow: 'Koszt własny',
    note: (price, lease, build, total, nights) =>
      `W przybliżeniu. Cena ${price}, leasehold ${lease}${build}${total} = ${nights} nocy. Po zakończeniu okresu nieruchomość wraca do właściciela gruntu. Koszty zarządzania nie są uwzględnione.`,
    buildPart: (b) => `, w tym ${b} budowy`,
    marketBar: (v) => `Rynek ${v}`,
    own: 'Posiadanie',
    market: 'Wynajmują w pobliżu',
    daily: {
      title: 'Ile kosztuje Cię jedna noc',
      per: ' / noc',
      ownSub: (o) => `${o} miesięcznie. Cena ÷ noce leasehold`,
      sold: 'Sprzedana noc',
      soldSub: (occ) => `Przy obłożeniu ${occ}%. Poniżej tej ceny wynajmujesz ze stratą`,
      marketSub: 'Podobne oferty w pobliżu, zwykła cena',
      marketOwn: 'Obecna cena tego kompleksu',
      yours: (v) => `Twoja noc ${v}`,
      cheaper: (x) => `Noc kosztuje Cię ${x} razy mniej, niż biorą za wynajem w pobliżu`,
      pricier: 'Noc kosztuje Cię więcej, niż biorą za wynajem w pobliżu',
    },
    monthly: {
      title: 'Ile kosztuje Cię jeden miesiąc',
      per: ' / mies.',
      ownSub: (o) => `${o} za noc. Cena ÷ miesiące leasehold`,
      sold: 'Wynajęty miesiąc',
      soldSub: (m) => `Wynajem przez ${m} z 12 miesięcy. Poniżej tej ceny wynajmujesz ze stratą`,
      marketSub: 'Podobne oferty w pobliżu, miesięcznie',
      marketOwn: '',
      yours: (v) => `Twój miesiąc ${v}`,
      cheaper: (x) => `Miesiąc kosztuje Cię ${x} razy mniej, niż biorą za wynajem w pobliżu`,
      pricier: 'Miesiąc kosztuje Cię więcej, niż biorą za wynajem w pobliżu',
    },
  },
  uk: {
    locale: 'uk-UA',
    years: (n) => `${one(n)} ${Number.isInteger(n) ? pluralRu(n, ['рік', 'роки', 'років']) : 'року'}`,
    vsRate: (x) => `Собівартість у ${x} раза нижча за вашу ставку`,
    aboveRate: 'Собівартість вища за вашу ставку',
    noLoad: 'Без завантаження собівартість не рахується',
    detailed: 'Детальний розрахунок дохідності',
    calcRate: 'Ваша ставка',
    calcRateSub: 'З калькулятора нижче',
    eyebrow: 'Собівартість',
    note: (price, lease, build, total, nights) =>
      `Приблизно. Ціна ${price}, лізхолд ${lease}${build}${total} = ${nights} ночей. Наприкінці терміну об’єкт повертається власнику землі. Витрати на управління не враховано.`,
    buildPart: (b) => `, з них ${b} будівництво`,
    marketBar: (v) => `Ринок ${v}`,
    own: 'Володіння',
    market: 'Здають поруч',
    daily: {
      title: 'Скільки коштує вам одна ніч',
      per: ' / ніч',
      ownSub: (o) => `${o} на місяць. Ціна ÷ ночі лізхолду`,
      sold: 'Продана ніч',
      soldSub: (occ) => `При завантаженні ${occ}%. Нижче цієї ціни здавати в мінус`,
      marketSub: 'Схожі оголошення поруч, звичайна ціна',
      marketOwn: 'Ціна цього комплексу зараз',
      yours: (v) => `Ваша ніч ${v}`,
      cheaper: (x) => `Ніч обходиться в ${x} раза дешевше, ніж здають поруч`,
      pricier: 'Ніч обходиться дорожче, ніж здають поруч',
    },
    monthly: {
      title: 'Скільки коштує вам один місяць',
      per: ' / міс',
      ownSub: (o) => `${o} за ніч. Ціна ÷ місяці лізхолду`,
      sold: 'Зданий місяць',
      soldSub: (m) => `Здається ${m} місяців із 12. Нижче цієї ціни здавати в мінус`,
      marketSub: 'Схожі оголошення поруч, помісячно',
      marketOwn: '',
      yours: (v) => `Ваш місяць ${v}`,
      cheaper: (x) => `Місяць обходиться в ${x} раза дешевше, ніж здають поруч`,
      pricier: 'Місяць обходиться дорожче, ніж здають поруч',
    },
  },
}

/** Текущие значения ползунков калькулятора: цена объекта, ставка (за ночь или
 *  за месяц) и загрузка (доля 0..1 посуточно, число месяцев помесячно). */
export type NightCostLive = { price: number; rate: number; load: number }

/** embedded — шаг внутри карточки калькулятора: без своей рамки, с чертой снизу. */
export function NightCost({ snap, lang, mode = 'daily', live, embedded = false }: { snap: Snapshot; lang: Lang; mode?: 'daily' | 'monthly'; live?: NightCostLive; embedded?: boolean }) {
  const c = COPY[lang] ?? COPY.en
  const t = c[mode]
  const { currency } = useCurrency()
  const price = live?.price ?? snap.villa.askingPrice
  const lease = snap.villa.leaseholdYearsLeft
  const build = Math.min(snap.villa.buildYearsLeft ?? 0, lease ?? 0)
  if (price == null || !(price > 0) || lease == null || !(lease - build > 0)) return null

  const years = lease - build
  const nights = Math.round(years * 365)
  const perNight = price / nights
  const perMonth = perNight * 365 / 12

  // Те же стартовые цифры, что у калькулятора ниже. Посуточно: свой Booking
  // комплекса, иначе соседи. Помесячно: медиана соседей и 11 месяцев из 12.
  let unit: number, sold: number, market: number, soldSub: string, marketOwn = false, custom = false
  if (mode === 'monthly') {
    if (!snap.monthly) return null
    const months = live?.load ?? MONTHS_RENTED.median
    unit = perMonth
    sold = months > 0 ? perMonth * 12 / months : Infinity
    market = live?.rate ?? snap.monthly.p50
    custom = market !== snap.monthly.p50
    soldSub = c.monthly.soldSub(months)
  } else {
    const sc = snap.scenarios
    if (!sc) return null
    const own = snap.ownBooking
    const defRate = own?.adr ?? sc.median.adrAsking
    const occ = live ? Math.round(live.load * 100) : Math.round((own?.occupancy ?? snap.region.occupancyByScenario.median) * 100)
    market = live?.rate ?? defRate
    custom = market !== defRate
    marketOwn = !custom && own?.adr != null
    unit = perNight
    sold = occ > 0 ? perNight / (occ / 100) : Infinity
    soldSub = c.daily.soldSub(occ)
  }

  const ratio = market / sold
  const money = (n: number) => Number.isFinite(n) ? fmtMoney(Math.round(n), currency) : '—'
  const ratioText = (Math.round(ratio * 10) / 10).toLocaleString(c.locale)

  return (
    <>
    <section className={embedded ? 'mb-8 border-b border-[var(--color-border)] pb-8' : 'mt-5 rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-8'} aria-labelledby={`night-cost-title-${mode}`}>
      <div className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{c.eyebrow}</div>
      <h3 id={`night-cost-title-${mode}`} className="mt-1 text-[18px] font-semibold tracking-tight text-[var(--color-text)]">{t.title}</h3>

      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--color-surface-alt)] p-4">
          <div className="text-[14px] text-[var(--color-text-muted)]">{c.own}</div>
          <div className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--color-text)] tabular-nums">
            {money(unit)}<span className="whitespace-nowrap text-[14px] font-normal text-[var(--color-text-muted)]">{t.per}</span>
          </div>
          <div className="text-[13px] leading-snug text-[var(--color-text-muted)]">{t.ownSub(money(mode === 'monthly' ? perNight : perMonth))}</div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--color-primary-soft)] p-4 text-[var(--color-primary-pressed)]">
          <div className="text-[14px]">{t.sold}</div>
          <div className="text-[28px] font-semibold leading-tight tracking-tight tabular-nums">
            {money(sold)}<span className="whitespace-nowrap text-[14px] font-normal">{t.per}</span>
          </div>
          <div className="text-[13px] leading-snug">{soldSub}</div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--color-surface-alt)] p-4">
          <div className="text-[14px] text-[var(--color-text-muted)]">{custom ? c.calcRate : marketOwn ? t.marketOwn : c.market}</div>
          <div className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--color-text)] tabular-nums">
            {money(market)}<span className="whitespace-nowrap text-[14px] font-normal text-[var(--color-text-muted)]">{t.per}</span>
          </div>
          <div className="text-[13px] leading-snug text-[var(--color-text-muted)]">{custom ? c.calcRateSub : marketOwn ? 'Booking.com' : t.marketSub}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {/* Шкала до большего из двух: дороже рынка — оранжевая полоса и отметка рынка. */}
        <div className="relative h-3 rounded-full bg-[var(--color-primary-soft)]" aria-hidden="true">
          <div className={`absolute inset-y-0 left-0 rounded-full ${ratio < 1 ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-primary)]'}`} style={{ width: `${Math.max(4, Math.min(1, 1 / ratio) * 100)}%` }} />
          {ratio < 1 && <div className="absolute -inset-y-1 w-0.5 rounded-full bg-[var(--color-text)]" style={{ left: `${ratio * 100}%` }} />}
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[14px] text-[var(--color-text-muted)] tabular-nums">
          <span className="whitespace-nowrap">{t.yours(money(sold))}</span>
          <span className="whitespace-nowrap">{custom ? `${c.calcRate} ${money(market)}` : c.marketBar(money(market))}</span>
        </div>
        <div className="text-[16px] font-semibold text-[var(--color-text)]">
          {!Number.isFinite(sold) ? c.noLoad
            : custom ? (ratio > 1.05 ? c.vsRate(ratioText) : c.aboveRate)
            : ratio > 1.05 ? t.cheaper(ratioText) : t.pricier}
        </div>
      </div>

      <div className={embedded ? 'mt-4' : 'mt-6 border-t border-[var(--color-border)] pt-4'}>
        <p className="max-w-[68ch] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          {c.note(
            money(price),
            c.years(lease),
            build > 0 ? c.buildPart(c.years(build)) : '',
            build > 0 ? ` → ${c.years(years)}` : '',
            nights.toLocaleString(c.locale),
          )}
        </p>
      </div>
    </section>
    {/* Граница шагов: выше себестоимость, ниже — ползунки и доходность. */}
    {embedded && <h3 className="mb-6 text-[18px] font-semibold tracking-tight text-[var(--color-text)]">{c.detailed}</h3>}
    </>
  )
}
