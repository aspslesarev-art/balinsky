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

  const byLang: Record<Lang, Record<CategoryKind, CategoryMeta>> = { ru, en, id, fr }
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
