// Category-page meta (TASK-13c). Rewrites the generic /villy, /apartamenty,
// /zhilye-kompleksy, /zastrojshhiki, /arenda titles & descriptions to the
// "number + price anchor + USP + feature" formula, so the SERP snippet earns
// clicks. Pure function — the section root pages pass live stats (count, price
// range in $K, developer count) computed from their loaders.
import type { Lang } from './i18n'
import { pluralRu } from './plural-ru'

export type CategoryKind = 'villas' | 'apartments' | 'complexes' | 'developers' | 'rental'

export type CategoryStats = {
  count: number
  minPriceK?: number | null // min listing price, thousands USD
  maxPriceK?: number | null // max listing price, thousands USD
  medPriceK?: number | null // median listing price, thousands USD
  devCount?: number | null
  fromMonthUsd?: number | null // rental: 5th-percentile monthly rent, USD
  medMonthUsd?: number | null // rental: median monthly rent, USD
}

export type CategoryMeta = { title: string; description: string }

const nf = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n))

// Цена в тысячах: до миллиона читается как $850K, дальше «$6,500K» перестаёт
// читаться вообще — переключаемся на $6.5M. Формат общий для всех локалей.
const usdK = (k: number) => (k >= 1000
  ? `$${(k / 1000).toFixed(k % 1000 === 0 ? 0 : 1)}M`
  : `$${nf(k)}K`)

// Falls back gracefully when a stat is missing so we never render "$undefinedK".
function build(kind: CategoryKind, lang: Lang, s: CategoryStats): CategoryMeta {
  const n = s.count > 0 ? nf(s.count) : ''
  const dev = s.devCount && s.devCount > 0 ? nf(s.devCount) : ''
  const from = s.minPriceK && s.minPriceK > 0 ? usdK(s.minPriceK) : ''
  const to = s.maxPriceK && s.maxPriceK > 0 ? usdK(s.maxPriceK) : ''
  const med = s.medPriceK && s.medPriceK > 0 ? usdK(s.medPriceK) : ''
  const moFrom = s.fromMonthUsd && s.fromMonthUsd > 0 ? `$${nf(s.fromMonthUsd)}` : ''
  const moMed = s.medMonthUsd && s.medMonthUsd > 0 ? `$${nf(s.medMonthUsd)}` : ''

  // Русские счётные формы: `n` отформатирован через Intl и для склонения не
  // годится, форму выбираем по сырому числу. Без этого в выдаче висело
  // «344 вилл» и «250 жилых комплексов» вместо «344 виллы» / «250 комплексов».
  const ruVilla = pluralRu(s.count, ['вилла', 'виллы', 'вилл'])
  const ruComplex = pluralRu(s.count, ['жилой комплекс', 'жилых комплекса', 'жилых комплексов'])
  const ruDev = pluralRu(s.devCount ?? 0, ['застройщика', 'застройщиков', 'застройщиков'])
  // Каталог одного района может схлопнуться до одной цены — «диапазон
  // $250K – $250K» в сниппете выглядит как баг. Показываем диапазон только
  // когда он действительно диапазон.
  const ruRange = from && to && from !== to
    ? `, диапазон ${from} – ${to}`
    : from ? `, от ${from}` : ''

  // Спрос в RU транзакционный и villa-first, и делится на два кластера:
  // «купить виллу на Бали» (по Wordstat крупнее) и ценовой — «виллы на Бали
  // цены» / «сколько стоит вилла на Бали». Оба стояли на 14–35 позиции при
  // нулевом CTR, потому что заголовок вёл счётом и аудитом разрешений.
  // Заголовок теперь несёт оба: транзакционный глагол первым, слово «цены» —
  // сразу за ним. Описание отвечает на «сколько стоит» медианой: среднее
  // задирают особняки за 6,5 млн $, медиана — та цифра, которую человек
  // действительно увидит в каталоге.
  const ru: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `Купить виллу на Бали — цены${from ? ` от ${from}` : ''}, ${n} ${ruVilla}, лизхолд | Balinsky`,
      description: `Виллы на Бали для иностранцев, всё в лизхолде${med ? `: медиана ${med}` : ''}${ruRange}. ${n} ${ruVilla}${dev ? ` от ${dev} ${ruDev}` : ''}: срок аренды земли, статус PBG/SLF, доход по данным аренды соседей.`,
    },
    apartments: {
      title: `Купить апартаменты на Бали — цены${from ? ` от ${from}` : ''}, ${n} шт., лизхолд | Balinsky`,
      description: `Апартаменты на Бали для иностранцев, всё в лизхолде${med ? `: медиана ${med}` : ''}${ruRange}. ${n} лотов в ЖК: срок аренды земли, управляющая компания, рассрочки.`,
    },
    complexes: {
      title: `${n} ${ruComplex} на Бали — цены и сроки сдачи, лизхолд | Balinsky`,
      description: `${n} ${ruComplex} на Бали для покупателей без индонезийского паспорта. Срок лизхолда, статус PBG/SLF и зона земли, сроки сдачи${dev ? `, ${dev} застройщиков` : ''}.`,
    },
    developers: {
      title: `${n} застройщиков на Бали — проекты и сданные объекты | Balinsky`,
      description: `${n} застройщиков Бали: сданные проекты, активные стройки, количество юнитов, управляющие компании, акции.`,
    },
    rental: {
      title: `Аренда на Бали помесячно${moFrom ? ` от ${moFrom}/мес` : ''}${n ? ` — ${n} ${pluralRu(s.count, ['объект', 'объекта', 'объектов'])}` : ''} | Balinsky`,
      description: `${n ? `${n} вариантов аренды` : 'Аренда'} на Бали: виллы, апартаменты, дома.${moMed ? ` Медиана ${moMed} в месяц.` : ''} Помесячно и посуточно, фильтр по району, спальням и цене.`,
    },
  }

  const en: Record<CategoryKind, CategoryMeta> = {
    villas: {
      // Leads with «bali villas for sale» — the phrase English buyers type;
      // the old «341 villas in Bali from …» never said «for sale».
      title: `Bali Villas for Sale — ${n} Leasehold Listings${from ? ` from ${from}` : ''} | Balinsky`,
      description: `${n} leasehold villas for sale in Bali for foreign buyers${from && to ? ` from ${from} to ${to}` : from ? ` from ${from}` : ''}${dev ? ` from ${dev} developers` : ''}. Land-lease term, PBG/SLF permit status and real rental data for every villa.`,
    },
    apartments: {
      title: `Bali Apartments for Sale — ${n} Leasehold Listings${from ? ` from ${from}` : ''} | Balinsky`,
      description: `${n} leasehold apartments for sale in Bali for foreign buyers${from && to ? ` from ${from} to ${to}` : from ? ` from ${from}` : ''}. Land-lease term, management company, instalments.`,
    },
    complexes: {
      title: `${n} New Developments in Bali — Prices & Handover Dates, Leasehold | Balinsky`,
      description: `${n} Bali complexes for buyers without an Indonesian passport. Leasehold term, PBG/SLF status and land zone, handover dates${dev ? `, ${dev} developers` : ''}.`,
    },
    developers: {
      // «bali property developer(s)» landed on a random developer's page —
      // the index should own that phrase. Ratings are hidden on the page, so
      // the title no longer promises them.
      title: `Bali Property Developers — ${n} Developers, Projects & Track Records | Balinsky`,
      description: `${n} property developers in Bali: completed and active projects, handover dates, unit counts and permit status for each. Profiles built from listing data, not developer pitches.`,
    },
    rental: {
      // GSC 09.2026: the page ranks for «rent in bali per month», «bali monthly
      // rent», «bali rent» — the old «Rental in Bali: N monthly & daily
      // listings» said neither «monthly rent» nor a price.
      title: `Bali Monthly Rentals${moFrom ? ` from ${moFrom}/month` : ''}${n ? ` — ${n} Villas & Apartments` : ''} | Balinsky`,
      description: `${n ? `${n} villas, apartments and houses` : 'Villas, apartments and houses'} for rent in Bali per month or per day.${moMed ? ` Median rent ${moMed}/month.` : ''} Filter by area, bedrooms and price.`,
    },
  }

  const id: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `Vila dijual di Bali — ${n} listing leasehold${from ? ` mulai ${from}` : ''} | Balinsky`,
      description: `${n} vila leasehold di Bali untuk pembeli asing${from && to ? ` dari ${from} hingga ${to}` : from ? ` mulai ${from}` : ''}${dev ? ` dari ${dev} pengembang` : ''}. Masa sewa tanah, status PBG/SLF, data sewa nyata.`,
    },
    apartments: {
      title: `Apartemen dijual di Bali — ${n} listing leasehold${from ? ` mulai ${from}` : ''} | Balinsky`,
      description: `${n} apartemen leasehold di Bali untuk pembeli asing${from && to ? ` dari ${from} hingga ${to}` : from ? ` mulai ${from}` : ''}. Masa sewa tanah, perusahaan pengelola, cicilan.`,
    },
    complexes: {
      title: `${n} proyek baru di Bali — harga dan serah terima, leasehold | Balinsky`,
      description: `${n} kompleks di Bali untuk pembeli tanpa paspor Indonesia. Masa leasehold, status PBG/SLF dan zona tanah, tanggal serah terima${dev ? `, ${dev} pengembang` : ''}.`,
    },
    developers: {
      title: `${n} pengembang properti di Bali — proyek dan rekam jejak | Balinsky`,
      description: `${n} pengembang properti Bali: proyek selesai, pembangunan aktif, jumlah unit, perusahaan pengelola, promo.`,
    },
    rental: {
      title: `Sewa bulanan di Bali${moFrom ? ` mulai ${moFrom}/bulan` : ''}${n ? ` — ${n} vila & apartemen` : ''} | Balinsky`,
      description: `${n ? `${n} pilihan sewa` : 'Pilihan sewa'} di Bali. Vila, apartemen, rumah. Bulanan dan harian. Kontak langsung pemilik.`,
    },
  }

  const fr: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `Villa à vendre à Bali — ${n} annonces en leasehold${from ? ` dès ${from}` : ''} | Balinsky`,
      description: `${n} villas à vendre à Bali en leasehold pour acheteurs étrangers${from && to ? ` de ${from} à ${to}` : from ? ` à partir de ${from}` : ''}${dev ? ` de ${dev} promoteurs` : ''}. Durée du bail foncier, statut PBG/SLF, données locatives réelles.`,
    },
    apartments: {
      title: `Appartement à vendre à Bali — ${n} annonces en leasehold${from ? ` dès ${from}` : ''} | Balinsky`,
      description: `${n} appartements à vendre à Bali en leasehold pour acheteurs étrangers${from && to ? ` de ${from} à ${to}` : from ? ` à partir de ${from}` : ''}. Durée du bail foncier, société de gestion, paiements échelonnés.`,
    },
    complexes: {
      title: `${n} programmes neufs à Bali — prix et livraison, leasehold | Balinsky`,
      description: `${n} résidences à Bali pour acheteurs sans passeport indonésien. Durée du leasehold, statut PBG/SLF et zone du terrain, dates de livraison${dev ? `, ${dev} promoteurs` : ''}.`,
    },
    developers: {
      title: `Promoteur immobilier à Bali : ${n} promoteurs, projets et historique | Balinsky`,
      description: `${n} promoteurs immobiliers à Bali : projets livrés, chantiers actifs, nombre d’unités, sociétés de gestion, offres.`,
    },
    rental: {
      title: `Location au mois à Bali${moFrom ? ` dès ${moFrom}/mois` : ''}${n ? ` — ${n} villas et appartements` : ''} | Balinsky`,
      description: `${n ? `${n} options de location` : 'Options de location'} à Bali. Villas, appartements, maisons. Au mois et à la journée. Contacts directs des propriétaires.`,
    },
  }

  const de: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `Villa auf Bali kaufen — ${n} Angebote${from ? ` ab ${from}` : ''}, Leasehold | Balinsky`,
      description: `${n} Leasehold-Villen auf Bali für ausländische Käufer${from && to ? ` von ${from} bis ${to}` : from ? ` ab ${from}` : ''}${dev ? ` von ${dev} Bauträgern` : ''}. Laufzeit der Landpacht, PBG/SLF-Status, echte Mietdaten.`,
    },
    apartments: {
      title: `Apartment auf Bali kaufen — ${n} Angebote${from ? ` ab ${from}` : ''}, Leasehold | Balinsky`,
      description: `${n} Leasehold-Apartments auf Bali für ausländische Käufer${from && to ? ` von ${from} bis ${to}` : from ? ` ab ${from}` : ''}. Laufzeit der Landpacht, Hausverwaltung, Ratenzahlung.`,
    },
    complexes: {
      title: `${n} Neubauprojekte auf Bali — Preise und Übergabe, Leasehold | Balinsky`,
      description: `${n} Bali-Anlagen für Käufer ohne indonesischen Pass. Leasehold-Laufzeit, PBG/SLF-Status und Grundstückszone, Übergabetermine${dev ? `, ${dev} Bauträger` : ''}.`,
    },
    developers: {
      title: `${n} Bali-Bauträger — Projekte und Referenzen | Balinsky`,
      description: `${n} Bali-Bauträger: fertige Projekte, aktive Bauten, Anzahl der Einheiten, Verwaltungsgesellschaften, Angebote.`,
    },
    rental: {
      title: `Bali Langzeitmiete${moFrom ? ` ab ${moFrom}/Monat` : ''}${n ? ` — ${n} Villen & Apartments` : ''} | Balinsky`,
      description: `${n ? `${n} Mietoptionen` : 'Mietoptionen'} auf Bali. Villen, Apartments, Häuser. Monatlich und täglich. Direkte Eigentümerkontakte.`,
    },
  }

  const zh: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `巴厘岛别墅出售 — ${n} 套${from ? `，${from} 起` : ''}，租赁产权 | Balinsky`,
      description: `${n} 套面向外国买家的巴厘岛租赁产权（leasehold）别墅${from && to ? `，${from} 至 ${to}` : from ? `，${from} 起` : ''}${dev ? `，来自 ${dev} 家开发商` : ''}。土地租期、PBG/SLF 状态、真实租金数据。`,
    },
    apartments: {
      title: `巴厘岛公寓出售 — ${n} 套${from ? `，${from} 起` : ''}，租赁产权 | Balinsky`,
      description: `${n} 套面向外国买家的巴厘岛租赁产权（leasehold）公寓${from && to ? `，${from} 至 ${to}` : from ? `，${from} 起` : ''}。土地租期、物业管理公司、分期付款。`,
    },
    complexes: {
      title: `${n} 个巴厘岛新楼盘 — 价格与交房日期，租赁产权 | Balinsky`,
      description: `${n} 个巴厘岛住宅区，适合没有印尼护照的买家。租赁产权期限、PBG/SLF 状态与土地分区、交房日期${dev ? `，${dev} 家开发商` : ''}。`,
    },
    developers: {
      title: `${n} 家巴厘岛开发商 — 项目与业绩 | Balinsky`,
      description: `${n} 家巴厘岛开发商：已完工项目、在建工程、单元数量、管理公司、优惠。`,
    },
    rental: {
      title: `巴厘岛租赁：${n ? `${n} 套` : ''}月租与日租房源 | Balinsky`,
      description: `${n ? `${n} 套巴厘岛租赁选择` : '巴厘岛租赁选择'}。别墅、公寓、住宅。月租与日租。业主直接联系。`,
    },
  }

  const nl: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `Villa kopen op Bali — ${n} leasehold-aanbiedingen${from ? ` vanaf ${from}` : ''} | Balinsky`,
      description: `${n} leasehold-villa's te koop op Bali voor buitenlandse kopers${from && to ? ` van ${from} tot ${to}` : from ? ` vanaf ${from}` : ''}${dev ? ` van ${dev} ontwikkelaars` : ''}. Looptijd grondhuur, PBG/SLF-status, echte huurdata.`,
    },
    apartments: {
      title: `Appartement kopen op Bali — ${n} leasehold-aanbiedingen${from ? ` vanaf ${from}` : ''} | Balinsky`,
      description: `${n} leasehold-appartementen te koop op Bali voor buitenlandse kopers${from && to ? ` van ${from} tot ${to}` : from ? ` vanaf ${from}` : ''}. Looptijd grondhuur, beheermaatschappij, termijnbetaling.`,
    },
    complexes: {
      title: `${n} nieuwbouwprojecten op Bali — prijzen en oplevering, leasehold | Balinsky`,
      description: `${n} Bali-complexen voor kopers zonder Indonesisch paspoort. Leasehold-looptijd, PBG/SLF-status en grondzone, opleverdata${dev ? `, ${dev} ontwikkelaars` : ''}.`,
    },
    developers: {
      title: `${n} vastgoedontwikkelaars op Bali — projecten en trackrecord | Balinsky`,
      description: `${n} vastgoedontwikkelaars op Bali: voltooide projecten, actieve bouw, aantal units, beheermaatschappijen, aanbiedingen.`,
    },
    rental: {
      title: `Huur op Bali: ${n ? `${n} ` : ''}maand- & dagverhuur | Balinsky`,
      description: `${n ? `${n} huuropties` : 'Huuropties'} op Bali. Villa's, appartementen, huizen. Per maand en per dag. Directe contacten met eigenaren.`,
    },
  }

  // Balinese — best-effort; content otherwise falls back to en/ru.
  const ban: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `Vila kaadol ring Bali — ${n} listing leasehold${from ? ` saking ${from}` : ''} | Balinsky`,
      description: `${n} vila leasehold ring Bali antuk pembeli asing${from && to ? ` saking ${from} kantos ${to}` : from ? ` saking ${from}` : ''}${dev ? ` saking ${dev} pangwangun` : ''}. Masa sewa tanah, status PBG/SLF, data sewa.`,
    },
    apartments: {
      title: `Apartemen kaadol ring Bali — ${n} listing leasehold${from ? ` saking ${from}` : ''} | Balinsky`,
      description: `${n} apartemen leasehold ring Bali antuk pembeli asing${from && to ? ` saking ${from} kantos ${to}` : from ? ` saking ${from}` : ''}. Masa sewa tanah, perusahaan pangelola, cicilan.`,
    },
    complexes: {
      title: `${n} proyek anyar ring Bali — aji lan serah terima, leasehold | Balinsky`,
      description: `${n} kompleks ring Bali antuk pembeli asing. Masa leasehold, status PBG/SLF lan zona tanah, tanggal serah terima${dev ? `, ${dev} pangwangun` : ''}.`,
    },
    developers: {
      title: `${n} pangwangun ring Bali — proyek lan pengalaman | Balinsky`,
      description: `${n} pangwangun Bali: proyék sané puput, wangunan sané kantun mamargi, akeh unit, perusahaan pangelola, promo.`,
    },
    rental: {
      title: `Sewa ring Bali: ${n ? `${n} ` : ''}umah sewa bulanan miwah harian | Balinsky`,
      description: `${n ? `${n} pilihan sewa` : 'Pilihan sewa'} ring Bali. Vila, apartemen, umah. Bulanan miwah harian. Kontak langsung sang nuénang.`,
    },
  }

  const pl: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `Willa na sprzedaż na Bali — ${n} ofert leasehold${from ? ` od ${from}` : ''} | Balinsky`,
      description: `${n} willi na sprzedaż na Bali w leasehold dla kupujących z zagranicy${from && to ? ` od ${from} do ${to}` : from ? ` od ${from}` : ''}${dev ? ` od ${dev} deweloperów` : ''}. Okres dzierżawy gruntu, status PBG/SLF, prawdziwe dane najmu.`,
    },
    apartments: {
      title: `Apartament na sprzedaż na Bali — ${n} ofert leasehold${from ? ` od ${from}` : ''} | Balinsky`,
      description: `${n} apartamentów na sprzedaż na Bali w leasehold dla kupujących z zagranicy${from && to ? ` od ${from} do ${to}` : from ? ` od ${from}` : ''}. Okres dzierżawy gruntu, firma zarządzająca, raty.`,
    },
    complexes: {
      title: `${n} nowych inwestycji na Bali — ceny i terminy, leasehold | Balinsky`,
      description: `${n} kompleksów na Bali dla kupujących bez indonezyjskiego paszportu. Okres leasehold, status PBG/SLF i strefa gruntu, terminy oddania${dev ? `, ${dev} deweloperów` : ''}.`,
    },
    developers: {
      title: `${n} deweloperów na Bali — inwestycje i realizacje | Balinsky`,
      description: `${n} deweloperów na Bali: ukończone projekty, aktywne budowy, liczba lokali, firmy zarządzające, promocje.`,
    },
    rental: {
      title: `Wynajem na Bali: ${n ? `${n} ofert` : 'oferty'} miesięcznych i dobowych | Balinsky`,
      description: `${n ? `${n} opcji wynajmu` : 'Opcje wynajmu'} na Bali. Wille, apartamenty, domy. Miesięcznie i na doby. Bezpośredni kontakt z właścicielami.`,
    },
  }

  const uk: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `Купити віллу на Балі — ціни${from ? ` від ${from}` : ''}, ${n} вілл, лізхолд | Balinsky`,
      description: `${n} вілл на Балі для іноземців, усе в лізхолді${from && to ? ` від ${from} до ${to}` : from ? ` від ${from}` : ''}${dev ? ` від ${dev} забудовників` : ''}. Термін оренди землі, статус PBG/SLF, дохід за даними оренди.`,
    },
    apartments: {
      title: `Купити апартаменти на Балі — ціни${from ? ` від ${from}` : ''}, ${n} шт., лізхолд | Balinsky`,
      description: `${n} апартаментів на Балі для іноземців, усе в лізхолді${from && to ? ` від ${from} до ${to}` : from ? ` від ${from}` : ''}. Термін оренди землі, керуюча компанія, розстрочки.`,
    },
    complexes: {
      title: `${n} житлових комплексів на Балі — ціни та терміни здачі, лізхолд | Balinsky`,
      description: `${n} комплексів на Балі для покупців без індонезійського паспорта. Термін лізхолду, статус PBG/SLF і зона землі, терміни здачі${dev ? `, ${dev} забудовників` : ''}.`,
    },
    developers: {
      title: `${n} забудовників на Балі — проєкти та здані об’єкти | Balinsky`,
      description: `${n} забудовників Балі: здані проєкти, активні будівництва, кількість юнітів, керуючі компанії, акції.`,
    },
    rental: {
      title: `Оренда на Балі${n ? `: ${n} об'єктів` : ''} помісячно та подобово | Balinsky`,
      description: `${n ? `${n} варіантів оренди` : 'Оренда'} на Балі. Вілли, апартаменти, будинки. Помісячно та подобово. Прямі контакти власників.`,
    },
  }

  const byLang: Record<Lang, Record<CategoryKind, CategoryMeta>> = { ru, en, id, fr, de, zh, nl, ban, pl, uk }
  const m = byLang[lang][kind]
  // Collapse any double spaces left when an optional stat was empty.
  return {
    title: m.title.replace(/\s{2,}/g, ' ').replace(/\s+\|/, ' |').trim(),
    description: m.description.replace(/\s{2,}/g, ' ').replace(/\s+\./g, '.').trim(),
  }
}

export function generateCategoryMeta(
  args: { category: CategoryKind; locale: Lang } & CategoryStats,
): CategoryMeta {
  const { category, locale, ...stats } = args
  return build(category, locale, stats)
}

// Rental price hooks for titles. The manifest carries junk prices ($0.001,
// $2.67 — parser leftovers), so «from» is the 5th percentile of the real
// ones rounded down to $50: a price real listings sit at, not an outlier.
export function rentalPriceStats(items: { priceMonthUsd: number }[]): Pick<CategoryStats, 'fromMonthUsd' | 'medMonthUsd'> {
  const p = items.map(r => r.priceMonthUsd).filter(n => Number.isFinite(n) && n >= 100).sort((a, b) => a - b)
  if (p.length < 10) return {}
  return {
    fromMonthUsd: Math.floor(p[Math.floor(p.length * 0.05)] / 50) * 50,
    medMonthUsd: Math.round(p[Math.floor(p.length / 2)] / 50) * 50,
  }
}

// Meta description from free text. A hard .slice(0, 160) ended snippets
// mid-word («…Kementerian Agraria Indonesia, lah»). Prefer the last full
// sentence that fits; otherwise the last whole word plus an ellipsis.
export function metaSnippet(text: string | null | undefined, max = 160): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), cut.lastIndexOf('。'))
  if (sentenceEnd >= max * 0.55) return cut.slice(0, sentenceEnd + 1).trim()
  const space = cut.slice(0, max - 1).lastIndexOf(' ')
  return (space > max * 0.5 ? cut.slice(0, space) : cut.slice(0, max - 1)).replace(/[\s,;:—–-]+$/, '') + '…'
}
