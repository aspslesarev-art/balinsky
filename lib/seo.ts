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
      title: `Купить виллу на Бали — цены${from ? ` от ${from}` : ''}, ${n} ${ruVilla} | Balinsky`,
      description: `Сколько стоит вилла на Бали${med ? `: медиана ${med}` : ''}${ruRange}. ${n} ${ruVilla}${dev ? ` от ${dev} ${ruDev}` : ''}, статус PBG/SLF, видео с земли, прямые контакты.`,
    },
    apartments: {
      title: `Купить апартаменты на Бали — цены${from ? ` от ${from}` : ''}, ${n} шт. | Balinsky`,
      description: `Сколько стоят апартаменты на Бали${med ? `: медиана ${med}` : ''}${ruRange}. ${n} лотов в ЖК: Berawa, Pererenan, Pandawa. Акции и рассрочки.`,
    },
    complexes: {
      title: `${n} ${ruComplex} на Бали со статусом PBG/SLF | Balinsky`,
      description: `${n} ${ruComplex} на Бали с инфраструктурой. Статус PBG/SLF и зона земли, сроки сдачи${dev ? `, акции от ${dev} застройщиков` : ''}.`,
    },
    developers: {
      title: `${n} застройщиков на Бали с рейтингом | Balinsky`,
      description: `${n} застройщиков Бали с рейтингом по 4 критериям: качество, опыт, техника, УК. Сданные проекты, активные стройки, акции.`,
    },
    rental: {
      title: `Аренда на Бали${n ? `: ${n} объектов` : ''} помесячно и посуточно | Balinsky`,
      description: `${n ? `${n} вариантов аренды` : 'Аренда'} на Бали. Виллы, апартаменты, дома. Помесячно и посуточно. Прямые контакты собственников.`,
    },
  }

  const en: Record<CategoryKind, CategoryMeta> = {
    villas: {
      // Leads with «bali villas for sale» — the phrase English buyers type;
      // the old «341 villas in Bali from …» never said «for sale».
      title: `Bali Villas for Sale — ${n} Listings${from ? ` from ${from}` : ''} | Balinsky`,
      description: `${n} villas for sale in Bali${from && to ? ` from ${from} to ${to}` : from ? ` from ${from}` : ''}${dev ? ` from ${dev} developers` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Rental data, PBG/SLF permit status, on-site video.`,
    },
    apartments: {
      title: `Bali Apartments for Sale — ${n} Listings${from ? ` from ${from}` : ''} | Balinsky`,
      description: `${n} apartments for sale in Bali complexes. Berawa, Pererenan, Pandawa. Management companies, deals and instalments.`,
    },
    complexes: {
      title: `${n} residential complexes in Bali with PBG/SLF status | Balinsky`,
      description: `${n} Bali complexes with infrastructure. PBG/SLF status and land zone, handover dates${dev ? `, deals from ${dev} developers` : ''}.`,
    },
    developers: {
      // «bali property developer(s)» landed on a random developer's page —
      // the index should own that phrase. Ratings are hidden on the page, so
      // the title no longer promises them.
      title: `Bali Property Developers — ${n} Developers, Projects & Track Records | Balinsky`,
      description: `${n} property developers in Bali: completed and active projects, handover dates, unit counts and permit status for each. Profiles built from listing data, not developer pitches.`,
    },
    rental: {
      title: `Rental in Bali${n ? `: ${n} monthly & daily listings` : ': monthly & daily listings'} | Balinsky`,
      description: `${n ? `${n} rental options` : 'Rental options'} in Bali. Villas, apartments, houses. Monthly and daily. Direct owner contacts.`,
    },
  }

  const id: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} vila di Bali${from ? ` mulai ${from}` : ''} dengan status PBG/SLF | Balinsky`,
      description: `${n} vila di Bali${from && to ? ` dari ${from} hingga ${to}` : from ? ` mulai ${from}` : ''}${dev ? ` dari ${dev} pengembang` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Video langsung dari lokasi, kontak langsung.`,
    },
    apartments: {
      title: `${n} apartemen di Bali${from ? ` mulai ${from}` : ''} | Balinsky`,
      description: `${n} apartemen di kompleks. Berawa, Pererenan, Pandawa. Perusahaan pengelola, promo dan cicilan.`,
    },
    complexes: {
      title: `${n} kompleks hunian di Bali dengan status PBG/SLF | Balinsky`,
      description: `${n} kompleks di Bali dengan infrastruktur. Status PBG/SLF dan zona tanah, tanggal serah terima${dev ? `, promo dari ${dev} pengembang` : ''}.`,
    },
    developers: {
      title: `${n} pengembang properti di Bali dengan peringkat | Balinsky`,
      description: `${n} pengembang properti Bali dengan peringkat 4 kriteria: kualitas, pengalaman, teknik, pengelolaan. Proyek selesai, pembangunan aktif, promo.`,
    },
    rental: {
      title: `Sewa di Bali: ${n ? `${n} properti` : 'properti'} bulanan & harian | Balinsky`,
      description: `${n ? `${n} pilihan sewa` : 'Pilihan sewa'} di Bali. Vila, apartemen, rumah. Bulanan dan harian. Kontak langsung pemilik.`,
    },
  }

  const fr: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} villas à Bali${from ? ` à partir de ${from}` : ''} avec statut PBG/SLF | Balinsky`,
      description: `${n} villas à Bali${from && to ? ` de ${from} à ${to}` : from ? ` à partir de ${from}` : ''}${dev ? ` de ${dev} promoteurs` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Vidéo sur place, contacts directs.`,
    },
    apartments: {
      title: `${n} appartements à Bali${from ? ` à partir de ${from}` : ''} | Balinsky`,
      description: `${n} appartements dans des résidences. Berawa, Pererenan, Pandawa. Sociétés de gestion, offres et paiements échelonnés.`,
    },
    complexes: {
      title: `${n} résidences à Bali avec statut PBG/SLF | Balinsky`,
      description: `${n} résidences à Bali avec infrastructures. Statut PBG/SLF et zone du terrain, dates de livraison${dev ? `, offres de ${dev} promoteurs` : ''}.`,
    },
    developers: {
      title: `Promoteur immobilier à Bali : ${n} promoteurs notés | Balinsky`,
      description: `${n} promoteurs immobiliers à Bali notés sur 4 critères : qualité, expérience, ingénierie, gestion. Projets livrés, chantiers actifs, offres.`,
    },
    rental: {
      title: `Location à Bali : ${n ? `${n} biens` : 'biens'} au mois et à la journée | Balinsky`,
      description: `${n ? `${n} options de location` : 'Options de location'} à Bali. Villas, appartements, maisons. Au mois et à la journée. Contacts directs des propriétaires.`,
    },
  }

  const de: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} Villen auf Bali${from ? ` ab ${from}` : ''} mit PBG/SLF-Status | Balinsky`,
      description: `${n} Villen auf Bali${from && to ? ` von ${from} bis ${to}` : from ? ` ab ${from}` : ''}${dev ? ` von ${dev} Bauträgern` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Video vor Ort, direkte Kontakte.`,
    },
    apartments: {
      title: `${n} Apartments auf Bali${from ? ` ab ${from}` : ''} | Balinsky`,
      description: `${n} Apartments in Wohnanlagen. Berawa, Pererenan, Pandawa. Hausverwaltungen, Angebote und Ratenzahlung.`,
    },
    complexes: {
      title: `${n} Wohnanlagen auf Bali mit PBG/SLF-Status | Balinsky`,
      description: `${n} Bali-Anlagen mit Infrastruktur. PBG/SLF-Status und Grundstückszone, Übergabetermine${dev ? `, Angebote von ${dev} Bauträgern` : ''}.`,
    },
    developers: {
      title: `${n} Bali-Bauträger mit Bewertung | Balinsky`,
      description: `${n} Bali-Bauträger bewertet nach 4 Kriterien: Qualität, Erfahrung, Technik, Verwaltung. Fertige Projekte, aktive Bauten, Angebote.`,
    },
    rental: {
      title: `Miete auf Bali: ${n ? `${n} ` : ''}Monats- & Tagesangebote | Balinsky`,
      description: `${n ? `${n} Mietoptionen` : 'Mietoptionen'} auf Bali. Villen, Apartments, Häuser. Monatlich und täglich. Direkte Eigentümerkontakte.`,
    },
  }

  const zh: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} 套巴厘岛别墅${from ? `，${from} 起` : ''}，附 PBG/SLF 状态 | Balinsky`,
      description: `${n} 套巴厘岛别墅${from && to ? `，${from} 至 ${to}` : from ? `，${from} 起` : ''}${dev ? `，来自 ${dev} 家开发商` : ''}。Pererenan、Uluwatu、Ubud、Sanur。实地视频，直接联系。`,
    },
    apartments: {
      title: `${n} 套巴厘岛公寓${from ? `，${from} 起` : ''} | Balinsky`,
      description: `${n} 套社区公寓。Berawa、Pererenan、Pandawa。物业管理公司，优惠与分期。`,
    },
    complexes: {
      title: `${n} 个巴厘岛住宅区，附 PBG/SLF 状态 | Balinsky`,
      description: `${n} 个配套齐全的巴厘岛住宅区。PBG/SLF 状态与土地分区，交房日期${dev ? `，${dev} 家开发商优惠` : ''}。`,
    },
    developers: {
      title: `${n} 家巴厘岛开发商及评级 | Balinsky`,
      description: `${n} 家巴厘岛开发商，按 4 项标准评级：质量、经验、工程、管理。已完工项目、在建工程、优惠。`,
    },
    rental: {
      title: `巴厘岛租赁：${n ? `${n} 套` : ''}月租与日租房源 | Balinsky`,
      description: `${n ? `${n} 套巴厘岛租赁选择` : '巴厘岛租赁选择'}。别墅、公寓、住宅。月租与日租。业主直接联系。`,
    },
  }

  const nl: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} villa's op Bali${from ? ` vanaf ${from}` : ''} met PBG/SLF-status | Balinsky`,
      description: `${n} villa's op Bali${from && to ? ` van ${from} tot ${to}` : from ? ` vanaf ${from}` : ''}${dev ? ` van ${dev} ontwikkelaars` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Video ter plaatse, directe contacten.`,
    },
    apartments: {
      title: `${n} appartementen op Bali${from ? ` vanaf ${from}` : ''} | Balinsky`,
      description: `${n} appartementen in complexen. Berawa, Pererenan, Pandawa. Beheermaatschappijen, aanbiedingen en termijnbetaling.`,
    },
    complexes: {
      title: `${n} wooncomplexen op Bali met PBG/SLF-status | Balinsky`,
      description: `${n} Bali-complexen met voorzieningen. PBG/SLF-status en grondzone, opleverdata${dev ? `, aanbiedingen van ${dev} ontwikkelaars` : ''}.`,
    },
    developers: {
      title: `${n} vastgoedontwikkelaars op Bali met beoordeling | Balinsky`,
      description: `${n} vastgoedontwikkelaars op Bali beoordeeld op 4 criteria: kwaliteit, ervaring, techniek, beheer. Voltooide projecten, actieve bouw, aanbiedingen.`,
    },
    rental: {
      title: `Huur op Bali: ${n ? `${n} ` : ''}maand- & dagverhuur | Balinsky`,
      description: `${n ? `${n} huuropties` : 'Huuropties'} op Bali. Villa's, appartementen, huizen. Per maand en per dag. Directe contacten met eigenaren.`,
    },
  }

  // Balinese — best-effort; content otherwise falls back to en/ru.
  const ban: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} vila ring Bali${from ? ` saking ${from}` : ''} sareng status PBG/SLF | Balinsky`,
      description: `${n} vila ring Bali${from && to ? ` saking ${from} kantos ${to}` : from ? ` saking ${from}` : ''}${dev ? ` saking ${dev} pangwangun` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Video ring genah, kontak langsung.`,
    },
    apartments: {
      title: `${n} apartemen ring Bali${from ? ` saking ${from}` : ''} | Balinsky`,
      description: `${n} apartemen ring kompleks. Berawa, Pererenan, Pandawa. Perusahaan pangelola, promo miwah cicilan.`,
    },
    complexes: {
      title: `${n} kompleks umah ring Bali sareng status PBG/SLF | Balinsky`,
      description: `${n} kompleks ring Bali sareng infrastruktur. Status PBG/SLF lan zona tanah, tanggal serah terima${dev ? `, promo saking ${dev} pangwangun` : ''}.`,
    },
    developers: {
      title: `${n} pangwangun ring Bali sareng peringkat | Balinsky`,
      description: `${n} pangwangun Bali sareng peringkat 4 kriteria: kualitas, pengalaman, teknik, pangelolaan. Proyék sané puput, wangunan sané kantun mamargi, promo.`,
    },
    rental: {
      title: `Sewa ring Bali: ${n ? `${n} ` : ''}umah sewa bulanan miwah harian | Balinsky`,
      description: `${n ? `${n} pilihan sewa` : 'Pilihan sewa'} ring Bali. Vila, apartemen, umah. Bulanan miwah harian. Kontak langsung sang nuénang.`,
    },
  }

  const pl: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} willi na Bali${from ? ` od ${from}` : ''} ze statusem PBG/SLF | Balinsky`,
      description: `${n} willi na Bali${from && to ? ` od ${from} do ${to}` : from ? ` od ${from}` : ''}${dev ? ` od ${dev} deweloperów` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Wideo z miejsca, bezpośredni kontakt.`,
    },
    apartments: {
      title: `${n} apartamentów na Bali${from ? ` od ${from}` : ''} | Balinsky`,
      description: `${n} apartamentów w kompleksach. Berawa, Pererenan, Pandawa. Firmy zarządzające, promocje i raty.`,
    },
    complexes: {
      title: `${n} kompleksów mieszkaniowych na Bali ze statusem PBG/SLF | Balinsky`,
      description: `${n} kompleksów na Bali z infrastrukturą. Status PBG/SLF i strefa gruntu, terminy oddania${dev ? `, promocje od ${dev} deweloperów` : ''}.`,
    },
    developers: {
      title: `${n} deweloperów na Bali z oceną | Balinsky`,
      description: `${n} deweloperów na Bali ocenianych według 4 kryteriów: jakość, doświadczenie, inżynieria, zarządzanie. Ukończone projekty, aktywne budowy, promocje.`,
    },
    rental: {
      title: `Wynajem na Bali: ${n ? `${n} ofert` : 'oferty'} miesięcznych i dobowych | Balinsky`,
      description: `${n ? `${n} opcji wynajmu` : 'Opcje wynajmu'} na Bali. Wille, apartamenty, domy. Miesięcznie i na doby. Bezpośredni kontakt z właścicielami.`,
    },
  }

  const uk: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} вілл на Балі${from ? ` від ${from}` : ''} зі статусом PBG/SLF | Balinsky`,
      description: `${n} вілл на Балі${from && to ? ` від ${from} до ${to}` : from ? ` від ${from}` : ''}${dev ? ` від ${dev} забудовників` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Відео з місця, прямі контакти.`,
    },
    apartments: {
      title: `${n} апартаментів на Балі${from ? ` від ${from}` : ''} | Balinsky`,
      description: `${n} апартаментів у комплексах. Berawa, Pererenan, Pandawa. Керуючі компанії, акції та розстрочки.`,
    },
    complexes: {
      title: `${n} житлових комплексів на Балі зі статусом PBG/SLF | Balinsky`,
      description: `${n} комплексів на Балі з інфраструктурою. Статус PBG/SLF і зона землі, терміни здачі${dev ? `, акції від ${dev} забудовників` : ''}.`,
    },
    developers: {
      title: `${n} забудовників на Балі з рейтингом | Balinsky`,
      description: `${n} забудовників Балі з рейтингом за 4 критеріями: якість, досвід, техніка, управління. Здані проєкти, активні будівництва, акції.`,
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
