// Category-page meta (TASK-13c). Rewrites the generic /villy, /apartamenty,
// /zhilye-kompleksy, /zastrojshhiki, /arenda titles & descriptions to the
// "number + price anchor + USP + feature" formula, so the SERP snippet earns
// clicks. Pure function — the section root pages pass live stats (count, price
// range in $K, developer count) computed from their loaders.
import type { Lang } from './i18n'

export type CategoryKind = 'villas' | 'apartments' | 'complexes' | 'developers' | 'rental'

export type CategoryStats = {
  count: number
  minPriceK?: number | null // min listing price, thousands USD
  maxPriceK?: number | null // max listing price, thousands USD
  devCount?: number | null
}

export type CategoryMeta = { title: string; description: string }

const nf = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n))

// Falls back gracefully when a stat is missing so we never render "$undefinedK".
function build(kind: CategoryKind, lang: Lang, s: CategoryStats): CategoryMeta {
  const n = s.count > 0 ? nf(s.count) : ''
  const dev = s.devCount && s.devCount > 0 ? nf(s.devCount) : ''
  const from = s.minPriceK && s.minPriceK > 0 ? `$${nf(s.minPriceK)}K` : ''
  const to = s.maxPriceK && s.maxPriceK > 0 ? `$${nf(s.maxPriceK)}K` : ''

  const ru: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} вилл на Бали${from ? ` от ${from}` : ''} с проверкой PBG/SLF | Balinsky`,
      description: `${n} вилл на Бали${from && to ? ` от ${from} до ${to}` : from ? ` от ${from}` : ''}${dev ? ` от ${dev} застройщиков` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Видео с земли, прямые контакты.`,
    },
    apartments: {
      title: `${n} апартаментов на Бали${from ? ` от ${from}` : ''} | Balinsky`,
      description: `${n} апартаментов в проверенных ЖК. Berawa, Pererenan, Pandawa. Управляющие компании, доходность 8–15%, акции и рассрочки.`,
    },
    complexes: {
      title: `${n} жилых комплексов на Бали с проверкой PBG/SLF | Balinsky`,
      description: `${n} ЖК на Бали с инфраструктурой. Проверка PBG/SLF/RDTR, реальные сроки сдачи${dev ? `, акции от ${dev} застройщиков` : ''}.`,
    },
    developers: {
      title: `${n} застройщиков на Бали с рейтингом | Balinsky`,
      description: `${n} застройщиков Бали с рейтингом по 4 критериям: качество, опыт, техника, УК. Сданные проекты, активные стройки, акции.`,
    },
    rental: {
      title: `Аренда на Бали: ${n} объектов помесячно и посуточно | Balinsky`,
      description: `${n} вариантов аренды на Бали. Виллы, апартаменты, дома. Помесячно и посуточно. Прямые контакты собственников.`,
    },
  }

  const en: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} villas in Bali${from ? ` from ${from}` : ''} with PBG/SLF checks | Balinsky`,
      description: `${n} villas in Bali${from && to ? ` from ${from} to ${to}` : from ? ` from ${from}` : ''}${dev ? ` from ${dev} verified developers` : ''}. Pererenan, Uluwatu, Ubud, Sanur. On-site video, direct contacts.`,
    },
    apartments: {
      title: `${n} apartments in Bali${from ? ` from ${from}` : ''} | Balinsky`,
      description: `${n} apartments in verified complexes. Berawa, Pererenan, Pandawa. Management companies, rental yield 8–15%, deals and instalments.`,
    },
    complexes: {
      title: `${n} residential complexes in Bali with PBG/SLF checks | Balinsky`,
      description: `${n} Bali complexes with infrastructure. PBG/SLF/RDTR checks, real handover dates${dev ? `, deals from ${dev} developers` : ''}.`,
    },
    developers: {
      title: `${n} Bali developers with ratings | Balinsky`,
      description: `${n} Bali developers rated on 4 criteria: quality, experience, engineering, management. Completed projects, active builds, deals.`,
    },
    rental: {
      title: `Rental in Bali: ${n} monthly & daily listings | Balinsky`,
      description: `${n} rental options in Bali. Villas, apartments, houses. Monthly and daily. Direct owner contacts.`,
    },
  }

  const id: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} vila di Bali${from ? ` mulai ${from}` : ''} dengan cek PBG/SLF | Balinsky`,
      description: `${n} vila di Bali${from && to ? ` dari ${from} hingga ${to}` : from ? ` mulai ${from}` : ''}${dev ? ` dari ${dev} pengembang tepercaya` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Video langsung dari lokasi, kontak langsung.`,
    },
    apartments: {
      title: `${n} apartemen di Bali${from ? ` mulai ${from}` : ''} | Balinsky`,
      description: `${n} apartemen di kompleks tepercaya. Berawa, Pererenan, Pandawa. Perusahaan pengelola, imbal hasil sewa 8–15%, promo dan cicilan.`,
    },
    complexes: {
      title: `${n} kompleks hunian di Bali dengan cek PBG/SLF | Balinsky`,
      description: `${n} kompleks di Bali dengan infrastruktur. Cek PBG/SLF/RDTR, tanggal serah terima nyata${dev ? `, promo dari ${dev} pengembang` : ''}.`,
    },
    developers: {
      title: `${n} pengembang di Bali dengan peringkat | Balinsky`,
      description: `${n} pengembang Bali dengan peringkat 4 kriteria: kualitas, pengalaman, teknik, pengelolaan. Proyek selesai, pembangunan aktif, promo.`,
    },
    rental: {
      title: `Sewa di Bali: ${n} properti bulanan & harian | Balinsky`,
      description: `${n} pilihan sewa di Bali. Vila, apartemen, rumah. Bulanan dan harian. Kontak langsung pemilik.`,
    },
  }

  const fr: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} villas à Bali${from ? ` à partir de ${from}` : ''} avec vérification PBG/SLF | Balinsky`,
      description: `${n} villas à Bali${from && to ? ` de ${from} à ${to}` : from ? ` à partir de ${from}` : ''}${dev ? ` de ${dev} promoteurs vérifiés` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Vidéo sur place, contacts directs.`,
    },
    apartments: {
      title: `${n} appartements à Bali${from ? ` à partir de ${from}` : ''} | Balinsky`,
      description: `${n} appartements dans des résidences vérifiées. Berawa, Pererenan, Pandawa. Sociétés de gestion, rendement locatif 8–15%, offres et paiements échelonnés.`,
    },
    complexes: {
      title: `${n} résidences à Bali avec vérification PBG/SLF | Balinsky`,
      description: `${n} résidences à Bali avec infrastructures. Vérification PBG/SLF/RDTR, dates de livraison réelles${dev ? `, offres de ${dev} promoteurs` : ''}.`,
    },
    developers: {
      title: `${n} promoteurs à Bali avec notation | Balinsky`,
      description: `${n} promoteurs de Bali notés sur 4 critères : qualité, expérience, ingénierie, gestion. Projets livrés, chantiers actifs, offres.`,
    },
    rental: {
      title: `Location à Bali : ${n} biens au mois et à la journée | Balinsky`,
      description: `${n} options de location à Bali. Villas, appartements, maisons. Au mois et à la journée. Contacts directs des propriétaires.`,
    },
  }

  const de: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} Villen auf Bali${from ? ` ab ${from}` : ''} mit PBG/SLF-Prüfung | Balinsky`,
      description: `${n} Villen auf Bali${from && to ? ` von ${from} bis ${to}` : from ? ` ab ${from}` : ''}${dev ? ` von ${dev} geprüften Bauträgern` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Video vor Ort, direkte Kontakte.`,
    },
    apartments: {
      title: `${n} Apartments auf Bali${from ? ` ab ${from}` : ''} | Balinsky`,
      description: `${n} Apartments in geprüften Anlagen. Berawa, Pererenan, Pandawa. Hausverwaltungen, Mietrendite 8–15%, Angebote und Ratenzahlung.`,
    },
    complexes: {
      title: `${n} Wohnanlagen auf Bali mit PBG/SLF-Prüfung | Balinsky`,
      description: `${n} Bali-Anlagen mit Infrastruktur. PBG/SLF/RDTR-Prüfung, echte Übergabetermine${dev ? `, Angebote von ${dev} Bauträgern` : ''}.`,
    },
    developers: {
      title: `${n} Bali-Bauträger mit Bewertung | Balinsky`,
      description: `${n} Bali-Bauträger bewertet nach 4 Kriterien: Qualität, Erfahrung, Technik, Verwaltung. Fertige Projekte, aktive Bauten, Angebote.`,
    },
    rental: {
      title: `Miete auf Bali: ${n} Monats- & Tagesangebote | Balinsky`,
      description: `${n} Mietoptionen auf Bali. Villen, Apartments, Häuser. Monatlich und täglich. Direkte Eigentümerkontakte.`,
    },
  }

  const zh: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} 套巴厘岛别墅${from ? `，${from} 起` : ''}，含 PBG/SLF 核验 | Balinsky`,
      description: `${n} 套巴厘岛别墅${from && to ? `，${from} 至 ${to}` : from ? `，${from} 起` : ''}${dev ? `，来自 ${dev} 家已核验开发商` : ''}。Pererenan、Uluwatu、Ubud、Sanur。实地视频，直接联系。`,
    },
    apartments: {
      title: `${n} 套巴厘岛公寓${from ? `，${from} 起` : ''} | Balinsky`,
      description: `${n} 套已核验社区公寓。Berawa、Pererenan、Pandawa。物业管理公司，租金收益 8–15%，优惠与分期。`,
    },
    complexes: {
      title: `${n} 个巴厘岛住宅区，含 PBG/SLF 核验 | Balinsky`,
      description: `${n} 个配套齐全的巴厘岛住宅区。PBG/SLF/RDTR 核验，真实交房日期${dev ? `，${dev} 家开发商优惠` : ''}。`,
    },
    developers: {
      title: `${n} 家巴厘岛开发商及评级 | Balinsky`,
      description: `${n} 家巴厘岛开发商，按 4 项标准评级：质量、经验、工程、管理。已完工项目、在建工程、优惠。`,
    },
    rental: {
      title: `巴厘岛租赁：${n} 套月租与日租房源 | Balinsky`,
      description: `${n} 套巴厘岛租赁选择。别墅、公寓、住宅。月租与日租。业主直接联系。`,
    },
  }

  const nl: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} villa's op Bali${from ? ` vanaf ${from}` : ''} met PBG/SLF-controle | Balinsky`,
      description: `${n} villa's op Bali${from && to ? ` van ${from} tot ${to}` : from ? ` vanaf ${from}` : ''}${dev ? ` van ${dev} geverifieerde ontwikkelaars` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Video ter plaatse, directe contacten.`,
    },
    apartments: {
      title: `${n} appartementen op Bali${from ? ` vanaf ${from}` : ''} | Balinsky`,
      description: `${n} appartementen in geverifieerde complexen. Berawa, Pererenan, Pandawa. Beheermaatschappijen, huurrendement 8–15%, aanbiedingen en termijnbetaling.`,
    },
    complexes: {
      title: `${n} wooncomplexen op Bali met PBG/SLF-controle | Balinsky`,
      description: `${n} Bali-complexen met voorzieningen. PBG/SLF/RDTR-controle, echte opleverdata${dev ? `, aanbiedingen van ${dev} ontwikkelaars` : ''}.`,
    },
    developers: {
      title: `${n} Bali-ontwikkelaars met beoordeling | Balinsky`,
      description: `${n} Bali-ontwikkelaars beoordeeld op 4 criteria: kwaliteit, ervaring, techniek, beheer. Voltooide projecten, actieve bouw, aanbiedingen.`,
    },
    rental: {
      title: `Huur op Bali: ${n} maand- & dagverhuur | Balinsky`,
      description: `${n} huuropties op Bali. Villa's, appartementen, huizen. Per maand en per dag. Directe contacten met eigenaren.`,
    },
  }

  // Balinese — best-effort; content otherwise falls back to en/ru.
  const ban: Record<CategoryKind, CategoryMeta> = {
    villas: {
      title: `${n} vila ring Bali${from ? ` saking ${from}` : ''} sareng cek PBG/SLF | Balinsky`,
      description: `${n} vila ring Bali${from && to ? ` saking ${from} kantos ${to}` : from ? ` saking ${from}` : ''}${dev ? ` saking ${dev} pangwangun sané kacihnayang` : ''}. Pererenan, Uluwatu, Ubud, Sanur. Video ring genah, kontak langsung.`,
    },
    apartments: {
      title: `${n} apartemen ring Bali${from ? ` saking ${from}` : ''} | Balinsky`,
      description: `${n} apartemen ring kompleks sané kacihnayang. Berawa, Pererenan, Pandawa. Perusahaan pangelola, asil sewa 8–15%, promo miwah cicilan.`,
    },
    complexes: {
      title: `${n} kompleks umah ring Bali sareng cek PBG/SLF | Balinsky`,
      description: `${n} kompleks ring Bali sareng infrastruktur. Cek PBG/SLF/RDTR, tanggal serah terima sujati${dev ? `, promo saking ${dev} pangwangun` : ''}.`,
    },
    developers: {
      title: `${n} pangwangun ring Bali sareng peringkat | Balinsky`,
      description: `${n} pangwangun Bali sareng peringkat 4 kriteria: kualitas, pengalaman, teknik, pangelolaan. Proyék sané puput, wangunan sané kantun mamargi, promo.`,
    },
    rental: {
      title: `Sewa ring Bali: ${n} umah sewa bulanan miwah harian | Balinsky`,
      description: `${n} pilihan sewa ring Bali. Vila, apartemen, umah. Bulanan miwah harian. Kontak langsung sang nuénang.`,
    },
  }

  const byLang: Record<Lang, Record<CategoryKind, CategoryMeta>> = { ru, en, id, fr, de, zh, nl, ban }
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
