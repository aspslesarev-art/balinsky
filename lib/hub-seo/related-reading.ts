import type { Lang } from '@/lib/i18n'
import { marketPath, knowledgePath } from '@/lib/market-index'

// Contextual hub → knowledge links.
//
// The 70 knowledge articles pull real impressions but sat in their own silo:
// nothing on the catalog hubs pointed at them, and their authority never
// flowed back to the pages that have to rank for «купить виллу на Бали».
// These links close that loop.
//
// Every locale gets the block; labels for the other eight languages are in
// INTL below, keyed by the article's RU slug.

export type ReadingKind = 'villas' | 'apartments' | 'rental'

export type ReadingLink = {
  href: string
  label: string
}

type Article = {
  /** RU slug — the key the EN slug map is built on. */
  slug: string
  ru: string
  en: string
}

type IntlLang = Exclude<Lang, 'ru' | 'en' | 'ban'>

const HEADING: Record<Exclude<Lang, 'ban'>, string> = {
  ru: 'Полезное по теме',
  en: 'Worth reading next',
  id: 'Bacaan berikutnya',
  fr: 'À lire ensuite',
  de: 'Weiterlesen',
  zh: '延伸阅读',
  nl: 'Verder lezen',
  pl: 'Warto przeczytać',
  uk: 'Корисне на тему',
}

const ARTICLES: Record<ReadingKind, Article[]> = {
  villas: [
    {
      slug: 'skolko-stoit-villa-na-bali-tseny-po-rayonam-v-2026-godu',
      ru: 'Сколько стоит вилла на Бали: цены по районам',
      en: 'How much a Bali villa costs: prices by area',
    },
    {
      slug: 'leasehold-ili-freehold-na-bali-chto-dostupno-inostrantsu-v-2026',
      ru: 'Leasehold или freehold: что доступно иностранцу',
      en: 'Leasehold or freehold: what a foreigner can hold',
    },
    {
      slug: 'mozhno-li-rossiyaninu-kupit-nedvizhimost-na-bali-i-kak-eto-sdelat-zakonno-v-2026',
      ru: 'Можно ли россиянину купить недвижимость на Бали',
      en: 'Can foreigners buy property in Bali, and how',
    },
    {
      slug: 'nalogi-na-nedvizhimost-na-bali-pokupka-vladenie-arenda-prodazha-2026',
      ru: 'Налоги: покупка, владение, аренда, продажа',
      en: 'Taxes: buying, owning, renting out, selling',
    },
    {
      slug: 'zony-zemli-na-bali-tsveta-kody-rdtr-chto-nuzhno-znat-investoru',
      ru: 'Зоны земли: цвета, коды и RDTR',
      en: 'Land zones: colours, codes and RDTR',
    },
  ],
  apartments: [
    {
      slug: 'dohodnost-arendy-na-bali-chto-realno-pokazyvayut-dannye-2026',
      ru: 'Доходность аренды: что показывают данные',
      en: 'Rental yield: what the data actually shows',
    },
    {
      slug: 'changu-dlya-investora-oversupplay-1621-apartament-k-2025-i-chto-s-etim-delat',
      ru: 'Чангу: оверсупплай апартаментов и что с ним делать',
      en: 'Canggu: the apartment oversupply and what it means',
    },
    {
      slug: 'off-plan-ili-gotovaya-nedvizhimost-na-bali-gde-dohodnost-gde-riski',
      ru: 'Off-plan или готовое: где доходность, где риски',
      en: 'Off-plan or completed: returns versus risk',
    },
    {
      slug: 'leasehold-ili-freehold-na-bali-chto-dostupno-inostrantsu-v-2026',
      ru: 'Leasehold или freehold: что доступно иностранцу',
      en: 'Leasehold or freehold: what a foreigner can hold',
    },
    {
      slug: 'nalogi-na-nedvizhimost-na-bali-pokupka-vladenie-arenda-prodazha-2026',
      ru: 'Налоги: покупка, владение, аренда, продажа',
      en: 'Taxes: buying, owning, renting out, selling',
    },
  ],
  rental: [
    {
      slug: 'sezonnost-arendy-na-bali-kogda-pik-a-kogda-prostoy-dannye-bps',
      ru: 'Сезонность аренды: когда пик, а когда простой',
      en: 'Rental seasonality: when it peaks and when it sits',
    },
    {
      slug: 'apoa-novye-pravila-ucheta-arendatorov-na-bali-s-aprelya-2025-chto-eto-znachit-dl',
      ru: 'APOA: учёт арендаторов с апреля 2025',
      en: 'APOA: tenant registration rules since April 2025',
    },
    {
      slug: 'kak-pereehat-na-bali-iz-rossii-v-2026-vizy-zhile-dengi-poshagovo',
      ru: 'Как переехать на Бали: визы, жильё, деньги',
      en: 'Moving to Bali: visas, housing, money',
    },
    {
      slug: 'dohodnost-arendy-na-bali-chto-realno-pokazyvayut-dannye-2026',
      ru: 'Доходность аренды: что показывают данные',
      en: 'Rental yield: what the data actually shows',
    },
  ],
}

// Article labels in the other languages, keyed by RU slug.
const INTL: Record<string, Record<IntlLang, string>> = {
  'skolko-stoit-villa-na-bali-tseny-po-rayonam-v-2026-godu': {
    id: 'Berapa harga vila di Bali: harga per kawasan', fr: 'Combien coûte une villa à Bali : prix par quartier', de: 'Was eine Villa auf Bali kostet: Preise nach Gegend', zh: '巴厘岛别墅多少钱：各区域价格', nl: 'Wat een villa op Bali kost: prijzen per gebied', pl: 'Ile kosztuje willa na Bali: ceny według rejonów', uk: 'Скільки коштує вілла на Балі: ціни за районами',
  },
  'leasehold-ili-freehold-na-bali-chto-dostupno-inostrantsu-v-2026': {
    id: 'Leasehold atau freehold: apa yang bisa dimiliki warga asing', fr: 'Leasehold ou freehold : ce qu’un étranger peut détenir', de: 'Leasehold oder Freehold: was Ausländer besitzen dürfen', zh: '租赁产权还是永久产权：外国人能持有什么', nl: 'Leasehold of freehold: wat een buitenlander mag bezitten', pl: 'Leasehold czy freehold: co może posiadać cudzoziemiec', uk: 'Лізхолд чи фрихолд: що доступно іноземцю',
  },
  'mozhno-li-rossiyaninu-kupit-nedvizhimost-na-bali-i-kak-eto-sdelat-zakonno-v-2026': {
    id: 'Bisakah warga asing membeli properti di Bali, dan caranya', fr: 'Un étranger peut-il acheter à Bali, et comment', de: 'Können Ausländer auf Bali Immobilien kaufen, und wie', zh: '外国人能否在巴厘岛买房，以及如何合法购买', nl: 'Kunnen buitenlanders vastgoed kopen op Bali, en hoe', pl: 'Czy cudzoziemiec może kupić nieruchomość na Bali i jak', uk: 'Чи може іноземець купити нерухомість на Балі і як',
  },
  'nalogi-na-nedvizhimost-na-bali-pokupka-vladenie-arenda-prodazha-2026': {
    id: 'Pajak: membeli, memiliki, menyewakan, menjual', fr: 'Impôts : achat, détention, location, vente', de: 'Steuern: Kauf, Besitz, Vermietung, Verkauf', zh: '税费：购买、持有、出租、出售', nl: 'Belastingen: kopen, bezitten, verhuren, verkopen', pl: 'Podatki: zakup, posiadanie, wynajem, sprzedaż', uk: 'Податки: купівля, володіння, оренда, продаж',
  },
  'zony-zemli-na-bali-tsveta-kody-rdtr-chto-nuzhno-znat-investoru': {
    id: 'Zona tanah: warna, kode, dan RDTR', fr: 'Zones foncières : couleurs, codes et RDTR', de: 'Landzonen: Farben, Codes und RDTR', zh: '土地分区：颜色、代码和RDTR', nl: 'Grondzones: kleuren, codes en RDTR', pl: 'Strefy gruntów: kolory, kody i RDTR', uk: 'Зони землі: кольори, коди і RDTR',
  },
  'dohodnost-arendy-na-bali-chto-realno-pokazyvayut-dannye-2026': {
    id: 'Imbal hasil sewa: apa yang ditunjukkan data', fr: 'Rendement locatif : ce que montrent vraiment les données', de: 'Mietrendite: was die Daten wirklich zeigen', zh: '租金收益率：数据真正说明了什么', nl: 'Huurrendement: wat de data echt laat zien', pl: 'Rentowność najmu: co naprawdę pokazują dane', uk: 'Дохідність оренди: що показують дані',
  },
  'changu-dlya-investora-oversupplay-1621-apartament-k-2025-i-chto-s-etim-delat': {
    id: 'Canggu: kelebihan pasokan apartemen dan artinya', fr: 'Canggu : l’offre excédentaire d’appartements et ce qu’elle implique', de: 'Canggu: das Überangebot an Wohnungen und was es bedeutet', zh: '仓古：公寓供应过剩意味着什么', nl: 'Canggu: het overaanbod aan appartementen en wat het betekent', pl: 'Canggu: nadpodaż apartamentów i co z niej wynika', uk: 'Чангу: надлишок апартаментів і що з ним робити',
  },
  'off-plan-ili-gotovaya-nedvizhimost-na-bali-gde-dohodnost-gde-riski': {
    id: 'Off-plan atau siap huni: imbal hasil versus risiko', fr: 'Sur plan ou achevé : rendement contre risque', de: 'Off-Plan oder fertig: Rendite gegen Risiko', zh: '期房还是现房：收益与风险', nl: 'Off-plan of opgeleverd: rendement tegenover risico', pl: 'Off-plan czy gotowe: rentowność a ryzyko', uk: 'Off-plan чи готове: де дохідність, де ризики',
  },
  'sezonnost-arendy-na-bali-kogda-pik-a-kogda-prostoy-dannye-bps': {
    id: 'Musim sewa: kapan ramai dan kapan sepi', fr: 'Saisonnalité locative : pics et creux', de: 'Saisonalität der Vermietung: Hoch- und Nebensaison', zh: '租赁季节性：旺季与淡季', nl: 'Seizoenen in de verhuur: pieken en dalen', pl: 'Sezonowość najmu: kiedy szczyt, a kiedy przestój', uk: 'Сезонність оренди: коли пік, а коли простій',
  },
  'apoa-novye-pravila-ucheta-arendatorov-na-bali-s-aprelya-2025-chto-eto-znachit-dl': {
    id: 'APOA: aturan pendataan penyewa sejak April 2025', fr: 'APOA : l’enregistrement des locataires depuis avril 2025', de: 'APOA: Mieterregistrierung seit April 2025', zh: 'APOA：2025年4月起的租客登记规定', nl: 'APOA: registratie van huurders sinds april 2025', pl: 'APOA: rejestracja najemców od kwietnia 2025', uk: 'APOA: облік орендарів із квітня 2025 року',
  },
  'kak-pereehat-na-bali-iz-rossii-v-2026-vizy-zhile-dengi-poshagovo': {
    id: 'Pindah ke Bali: visa, tempat tinggal, uang', fr: 'S’installer à Bali : visas, logement, argent', de: 'Nach Bali ziehen: Visa, Wohnen, Geld', zh: '移居巴厘岛：签证、住房、资金', nl: 'Verhuizen naar Bali: visa, wonen, geld', pl: 'Przeprowadzka na Bali: wizy, mieszkanie, pieniądze', uk: 'Як переїхати на Балі: візи, житло, гроші',
  },
}

const MARKET_LINK: Record<ReadingKind, Record<Exclude<Lang, 'ban'>, string>> = {
  villas: {
    ru: 'Цены на недвижимость Бали по районам — таблицы', en: 'Bali property prices by area — the data',
    id: 'Harga properti di Bali per kawasan — datanya', fr: 'Prix de l’immobilier à Bali par quartier — les données', de: 'Immobilienpreise auf Bali nach Gegend — die Daten', zh: '巴厘岛各区域房产价格——数据', nl: 'Vastgoedprijzen op Bali per gebied — de data', pl: 'Ceny nieruchomości na Bali według rejonów — dane', uk: 'Ціни на нерухомість Балі за районами — таблиці',
  },
  apartments: {
    ru: 'Цены на апартаменты и виллы по районам — таблицы', en: 'Bali apartment and villa prices by area — the data',
    id: 'Harga apartemen dan vila di Bali per kawasan — datanya', fr: 'Prix des appartements et villas à Bali par quartier — les données', de: 'Wohnungs- und Villenpreise auf Bali nach Gegend — die Daten', zh: '巴厘岛各区域公寓和别墅价格——数据', nl: 'Prijzen van appartementen en villa’s op Bali per gebied — de data', pl: 'Ceny apartamentów i willi na Bali według rejonów — dane', uk: 'Ціни на апартаменти й вілли за районами — таблиці',
  },
  rental: {
    ru: 'Сколько стоит аренда на Бали: в месяц и за ночь по районам', en: 'How much is rent in Bali: monthly and nightly, by area',
    id: 'Berapa harga sewa di Bali: per bulan dan per malam, per kawasan', fr: 'Combien coûte un loyer à Bali : au mois et à la nuit, par quartier', de: 'Was Miete auf Bali kostet: pro Monat und pro Nacht, nach Gegend', zh: '巴厘岛租房多少钱：各区域月租和每晚价格', nl: 'Wat huren op Bali kost: per maand en per nacht, per gebied', pl: 'Ile kosztuje najem na Bali: miesięcznie i za noc, według rejonów', uk: 'Скільки коштує оренда на Балі: за місяць і за ніч за районами',
  },
}

export function getRelatedReading(
  kind: ReadingKind,
  lang: Lang,
): { heading: string; links: ReadingLink[] } | null {
  // Balinese pages read the Indonesian copy, as elsewhere on the site.
  const l = lang === 'ban' ? 'id' : lang
  const label = (a: Article) => (l === 'ru' ? a.ru : l === 'en' ? a.en : INTL[a.slug]?.[l] ?? a.en)
  return {
    heading: HEADING[l],
    // The market-data page for this hub leads: it answers the hub's own
    // question («how much?») with the full table.
    links: [
      { href: marketPath(kind === 'rental' ? 'rent' : 'prices', lang), label: MARKET_LINK[kind][l] },
      ...ARTICLES[kind].map(a => ({ href: knowledgePath(a.slug, lang), label: label(a) })),
    ],
  }
}
