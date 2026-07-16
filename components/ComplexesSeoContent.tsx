import Link from 'next/link'
import type { ComplexFilterState } from '@/app/ru/zhilye-kompleksy/_lib'
import {
  TYPE_TO_SLUG,
  STATUS_TO_SLUG,
} from '@/lib/complex-seo-routes'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const POPULAR_DISTRICTS = ['Berawa', 'Sanur', 'Ubud', 'Uluwatu', 'Pererenan', 'Pandawa', 'Batu Bolong', 'Cemagi']

type Variant = 'list' | 'map'

const T = {
  ru: {
    where: (one?: string, many?: string[]) =>
      one ? `района ${one}` : many && many.length ? `районов ${many.join(', ')}` : 'Бали',
    leadList: (where: string) => `На этой странице — жилые комплексы в пределах ${where}.`,
    leadMap: (where: string) => `На этой странице — жилые комплексы в пределах ${where} с отметками на карте.`,
    tail: ' По каждому проекту видны фото, район, типы юнитов, статус и сроки сдачи. Это удобно, чтобы быстро сравнить десятки строек и выбрать тот, что подходит вам.',
    titleBase: 'Жилые комплексы',
    titleInDistrict: (d: string) => ` в районе ${d}`,
    titleMapSuffix: ' на карте Бали',
    titleListSuffix: ' на Бали — каталог',
    h3Districts: 'Комплексы по районам',
    h3Type: 'По типу и статусу',
    chipBuilding: 'Строящиеся',
    chipBuilt: 'Готовые',
    chipDevelopers: 'Все застройщики',
    faqTitle: 'Часто задаваемые вопросы',
    contextUbud: 'В Убуде — низкоэтажные проекты в окружении джунглей и рисовых террас. Подходит тем, кто ищет спокойную атмосферу подальше от пляжной туристы.',
    contextCanggu: (d: string) => `${d} — часть Чангу, район сёрферов и диджитал-номадов. Здесь активнее всего идёт строительство, плотный рынок аренды и живая инфраструктура.`,
    contextBukit: (d: string) => `${d} — Букит. Видовые проекты на утёсах, премиальные комплексы для рынка инвестиций и сдачи в аренду.`,
    contextSanur: 'Санур — спокойный восточный берег с лагуной. Популярен у семей и долгосрочных переездов.',
    contextDefault: 'Жилых комплексов на Бали — несколько сотен. Самые активные локации: Чангу (Berawa, Batu Bolong, Pererenan), Букит (Uluwatu, Pandawa, Melasti), Убуд, Санур, Нуса-Дуа. Большая часть проектов — лизхолд 25–80 лет, сдача через 1–3 года, типы юнитов: апартаменты, виллы, таунхаусы.',
    faq: [
      {
        q: 'Что такое жилой комплекс на Бали?',
        a: 'Это огороженная территория с группой зданий — апартаментов, вилл, таунхаусов — общим управлением, охраной, обычно с бассейном, фитнесом и ресепшеном. На Бали комплексы делятся на инвестиционные (под аренду) и резидентские (для жизни).',
      },
      {
        q: 'Чем отличается строящийся комплекс от готового?',
        a: 'Строящийся продаётся дешевле (до 30%), но риски выше: сроки могут сдвигаться, качество финиша непонятно. Готовый можно посмотреть и сразу сдавать в аренду, но цена выше.',
      },
      {
        q: 'Какое разрешение должно быть у комплекса?',
        a: 'Главные документы — PBG (разрешение на строительство) и SLF (сертификат пригодности). Без PBG строить вообще нельзя; без SLF юнит не может официально сдаваться в аренду.',
      },
      {
        q: 'На сколько лет оформляется лизхолд?',
        a: 'Стандартно 25–30 лет с возможностью продления. Премиальные проекты предлагают 50–80 лет первого периода. Чем длиннее лизхолд — тем выше ликвидность.',
      },
      {
        q: 'Можно ли купить юнит до начала строительства?',
        a: 'Да, через предпродажи. Цены ниже на 15–25%, но нужно проверить надёжность застройщика и наличие PBG. Оплата по графику строительства.',
      },
    ],
  },
  en: {
    where: (one?: string, many?: string[]) =>
      one ? `${one} district` : many && many.length ? `${many.join(', ')} districts` : 'Bali',
    leadList: (where: string) => `This page lists residential complexes within ${where}.`,
    leadMap: (where: string) => `This page lists residential complexes within ${where} pinned on the map.`,
    tail: ' Each project shows photos, district, unit types, build status and handover timeline — so you can compare dozens of developments side by side and pick the one that fits.',
    titleBase: 'Residential complexes',
    titleInDistrict: (d: string) => ` in ${d}`,
    titleMapSuffix: ' on the Bali map',
    titleListSuffix: ' in Bali — catalog',
    h3Districts: 'Complexes by district',
    h3Type: 'By type and status',
    chipBuilding: 'Under construction',
    chipBuilt: 'Completed',
    chipDevelopers: 'All developers',
    faqTitle: 'Frequently asked questions',
    contextUbud: 'Ubud is low-rise projects surrounded by jungle and rice terraces — for buyers chasing a calmer atmosphere away from the beach crowds.',
    contextCanggu: (d: string) => `${d} is part of Canggu, the surfer and digital-nomad belt — the most active construction pipeline on Bali, a dense rental market and lively day-to-day infrastructure.`,
    contextBukit: (d: string) => `${d} is the Bukit peninsula — cliffside view projects and premium complexes built for the investment and short-term rental market.`,
    contextSanur: 'Sanur is the calmer east coast with its lagoon — popular with families and long-term relocations.',
    contextDefault: 'There are several hundred residential complexes on Bali. The most active areas are Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa, Melasti), Ubud, Sanur and Nusa Dua. Most projects are 25–80 year leasehold with handover in 1–3 years; unit types include apartments, villas and townhouses.',
    faq: [
      {
        q: 'What is a residential complex in Bali?',
        a: 'A gated property with a group of buildings — apartments, villas or townhouses — under a single management, with security and usually a pool, gym and reception. Complexes here fall into two camps: investment (built for rental) and residential (built for living).',
      },
      {
        q: 'How does a complex under construction differ from a completed one?',
        a: 'Under-construction units sell at up to 30% lower prices, but the risk is higher: handover can slip and finish quality is unknown. A completed complex you can walk through and rent out immediately, but the price is higher.',
      },
      {
        q: 'What permits should a complex hold?',
        a: 'The two key documents are PBG (building permit) and SLF (occupancy certificate). Without PBG construction is not legal; without SLF a unit cannot officially be rented out.',
      },
      {
        q: 'How long is a typical leasehold?',
        a: 'Standard leases run 25–30 years with the option to extend. Premium projects offer 50–80 years in the first period. The longer the lease, the higher the resale liquidity.',
      },
      {
        q: 'Can I buy a unit before construction starts?',
        a: 'Yes — through pre-sales. Prices sit 15–25% below post-handover levels, but you need to verify the developer and confirm PBG is in place. Payment follows the construction schedule.',
      },
    ],
  },
  id: {
    where: (one?: string, many?: string[]) =>
      one ? `wilayah ${one}` : many && many.length ? `wilayah ${many.join(', ')}` : 'Bali',
    leadList: (where: string) => `Halaman ini menampilkan kompleks hunian di ${where}.`,
    leadMap: (where: string) => `Halaman ini menampilkan kompleks hunian di ${where} yang ditandai di peta.`,
    tail: ' Setiap proyek menampilkan foto, wilayah, tipe unit, status pembangunan, dan jadwal serah terima — sehingga Anda dapat membandingkan puluhan proyek secara berdampingan dan memilih yang paling sesuai.',
    titleBase: 'Kompleks hunian',
    titleInDistrict: (d: string) => ` di ${d}`,
    titleMapSuffix: ' di peta Bali',
    titleListSuffix: ' di Bali — katalog',
    h3Districts: 'Kompleks berdasarkan wilayah',
    h3Type: 'Berdasarkan tipe dan status',
    chipBuilding: 'Dalam pembangunan',
    chipBuilt: 'Selesai',
    chipDevelopers: 'Semua pengembang',
    faqTitle: 'Pertanyaan yang sering diajukan',
    contextUbud: 'Ubud adalah proyek bertingkat rendah yang dikelilingi hutan dan terasering sawah — untuk pembeli yang mencari suasana lebih tenang jauh dari keramaian pantai.',
    contextCanggu: (d: string) => `${d} adalah bagian dari Canggu, kawasan peselancar dan digital nomad — pipeline pembangunan paling aktif di Bali, pasar sewa yang padat, dan infrastruktur harian yang hidup.`,
    contextBukit: (d: string) => `${d} adalah semenanjung Bukit — proyek dengan pemandangan tebing dan kompleks premium yang dibangun untuk pasar investasi dan sewa jangka pendek.`,
    contextSanur: 'Sanur adalah pesisir timur yang lebih tenang dengan lagunanya — populer di kalangan keluarga dan mereka yang pindah jangka panjang.',
    contextDefault: 'Ada beberapa ratus kompleks hunian di Bali. Kawasan paling aktif adalah Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa, Melasti), Ubud, Sanur, dan Nusa Dua. Sebagian besar proyek berupa leasehold 25–80 tahun dengan serah terima dalam 1–3 tahun; tipe unit mencakup apartemen, vila, dan rumah bandar.',
    faq: [
      {
        q: 'Apa itu kompleks hunian di Bali?',
        a: 'Sebuah properti berpagar dengan sekelompok bangunan — apartemen, vila, atau rumah bandar — di bawah satu pengelolaan, dengan keamanan dan biasanya kolam renang, gym, serta resepsionis. Kompleks di sini terbagi dua: investasi (dibangun untuk disewakan) dan hunian (dibangun untuk ditinggali).',
      },
      {
        q: 'Apa perbedaan kompleks yang masih dibangun dengan yang sudah selesai?',
        a: 'Unit yang masih dibangun dijual hingga 30% lebih murah, tetapi risikonya lebih tinggi: serah terima bisa mundur dan kualitas finishing belum diketahui. Kompleks yang sudah selesai bisa Anda lihat langsung dan segera disewakan, tetapi harganya lebih tinggi.',
      },
      {
        q: 'Izin apa yang harus dimiliki sebuah kompleks?',
        a: 'Dua dokumen utama adalah PBG (izin mendirikan bangunan) dan SLF (sertifikat laik fungsi). Tanpa PBG, pembangunan tidak legal; tanpa SLF, sebuah unit tidak dapat disewakan secara resmi.',
      },
      {
        q: 'Berapa lama leasehold pada umumnya?',
        a: 'Sewa standar berlangsung 25–30 tahun dengan opsi perpanjangan. Proyek premium menawarkan 50–80 tahun pada periode pertama. Semakin panjang masa sewa, semakin tinggi likuiditas penjualan kembali.',
      },
      {
        q: 'Bisakah saya membeli unit sebelum konstruksi dimulai?',
        a: 'Ya — melalui pra-penjualan. Harganya 15–25% di bawah level pasca serah terima, tetapi Anda perlu memverifikasi pengembang dan memastikan PBG sudah ada. Pembayaran mengikuti jadwal konstruksi.',
      },
    ],
  },
  fr: {
    where: (one?: string, many?: string[]) =>
      one ? `quartier de ${one}` : many && many.length ? `quartiers de ${many.join(', ')}` : 'Bali',
    leadList: (where: string) => `Cette page répertorie les résidences dans ${where}.`,
    leadMap: (where: string) => `Cette page répertorie les résidences dans ${where} localisées sur la carte.`,
    tail: ' Chaque projet affiche les photos, le quartier, les types d’unités, l’état de construction et le calendrier de livraison — pour comparer des dizaines de projets côte à côte et choisir celui qui vous convient.',
    titleBase: 'Résidences',
    titleInDistrict: (d: string) => ` à ${d}`,
    titleMapSuffix: ' sur la carte de Bali',
    titleListSuffix: ' à Bali — catalogue',
    h3Districts: 'Résidences par quartier',
    h3Type: 'Par type et statut',
    chipBuilding: 'En construction',
    chipBuilt: 'Livrées',
    chipDevelopers: 'Tous les promoteurs',
    faqTitle: 'Questions fréquentes',
    contextUbud: 'Ubud, ce sont des projets de faible hauteur entourés de jungle et de rizières en terrasses — pour les acheteurs en quête d’une atmosphère plus calme, loin de la foule des plages.',
    contextCanggu: (d: string) => `${d} fait partie de Canggu, le fief des surfeurs et des nomades numériques — le pipeline de construction le plus actif de Bali, un marché locatif dense et une infrastructure quotidienne animée.`,
    contextBukit: (d: string) => `${d}, c’est la péninsule de Bukit — des projets avec vue sur les falaises et des résidences premium conçus pour le marché de l’investissement et de la location courte durée.`,
    contextSanur: 'Sanur, c’est la côte est plus tranquille avec son lagon — prisée des familles et des installations de longue durée.',
    contextDefault: 'Il existe plusieurs centaines de résidences à Bali. Les zones les plus actives sont Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa, Melasti), Ubud, Sanur et Nusa Dua. La plupart des projets sont en leasehold de 25 à 80 ans avec livraison sous 1 à 3 ans ; les types d’unités incluent appartements, villas et maisons de ville.',
    faq: [
      {
        q: 'Qu’est-ce qu’une résidence à Bali ?',
        a: 'Une propriété clôturée regroupant plusieurs bâtiments — appartements, villas ou maisons de ville — sous une gestion unique, avec sécurité et généralement piscine, salle de sport et réception. Les résidences se répartissent en deux catégories : investissement (construites pour la location) et résidentielle (construites pour y vivre).',
      },
      {
        q: 'Quelle différence entre une résidence en construction et une résidence livrée ?',
        a: 'Les unités en construction se vendent jusqu’à 30 % moins cher, mais le risque est plus élevé : la livraison peut glisser et la qualité des finitions reste inconnue. Une résidence livrée, vous pouvez la visiter et la louer immédiatement, mais le prix est plus élevé.',
      },
      {
        q: 'Quels permis une résidence doit-elle détenir ?',
        a: 'Les deux documents clés sont le PBG (permis de construire) et le SLF (certificat d’occupation). Sans PBG, la construction n’est pas légale ; sans SLF, une unité ne peut pas être louée officiellement.',
      },
      {
        q: 'Quelle est la durée typique d’un leasehold ?',
        a: 'Les baux standard durent 25 à 30 ans avec option de prolongation. Les projets premium offrent 50 à 80 ans sur la première période. Plus le bail est long, plus la liquidité à la revente est élevée.',
      },
      {
        q: 'Puis-je acheter une unité avant le début de la construction ?',
        a: 'Oui — via la prévente. Les prix sont 15 à 25 % en dessous des niveaux post-livraison, mais vous devez vérifier le promoteur et confirmer que le PBG est en place. Le paiement suit le calendrier de construction.',
      },
    ],
  },
} as const

function intro(f: ComplexFilterState, variant: Variant, lang: Lang): string {
  const t = pickCopy(T, lang)
  const where = t.where(f.district.length === 1 ? f.district[0] : undefined, f.district.length > 1 ? f.district : undefined)
  const lead = variant === 'map' ? t.leadMap(where) : t.leadList(where)
  return lead + t.tail
}

function context(f: ComplexFilterState, lang: Lang): string {
  const t = pickCopy(T, lang)
  const dist = f.district[0]
  if (dist === 'Ubud') return t.contextUbud
  if (dist === 'Berawa' || dist === 'Batu Bolong' || dist === 'Pererenan') return t.contextCanggu(dist)
  if (dist === 'Uluwatu' || dist === 'Pandawa' || dist === 'Melasti') return t.contextBukit(dist)
  if (dist === 'Sanur') return t.contextSanur
  return t.contextDefault
}

function buildSeoTitle(f: ComplexFilterState, variant: Variant, lang: Lang): string {
  const t = pickCopy(T, lang)
  const adj: string[] = []
  if (f.types.length === 1) adj.push(f.types[0])
  let s = adj.length ? adj.join(' ') + ' ' + t.titleBase.toLowerCase() : t.titleBase
  if (f.district.length === 1) s += t.titleInDistrict(f.district[0])
  s += variant === 'map' ? t.titleMapSuffix : t.titleListSuffix
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function ComplexesSeoContent({
  filters,
  variant = 'list',
  lang = 'ru',
}: {
  filters: ComplexFilterState
  variant?: Variant
  lang?: Lang
}) {
  const t = pickCopy(T, lang)
  const h2 = buildSeoTitle(filters, variant, lang)
  const currentDistrict = filters.district[0]
  const districts = POPULAR_DISTRICTS.filter(d => d !== currentDistrict)
    .slice(0, 6)
    .map(d => ({ name: d, slug: DISTRICT_TO_SLUG[d] }))
    .filter(x => x.slug)

  const sectionRoot = switchLangPath('/ru/zhilye-kompleksy', lang)
  const developersRoot = switchLangPath('/ru/zastrojshhiki', lang)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <section className="mt-12 pt-10 border-t border-[var(--color-border)]">
      <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[var(--color-text)] mb-4">
        {h2}
      </h2>

      <div className="prose-balinsky max-w-3xl space-y-3 text-[15px] leading-relaxed text-[var(--color-text)]">
        <p>{intro(filters, variant, lang)}</p>
        <p className="text-[var(--color-text-muted)]">{context(filters, lang)}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{t.h3Districts}</h3>
          <ul className="flex flex-wrap gap-2">
            {districts.map(d => (
              <li key={d.slug}>
                <Link
                  href={`${sectionRoot}/${d.slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{t.h3Type}</h3>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(TYPE_TO_SLUG).slice(0, 5).map(([name, slug]) => (
              <li key={slug}>
                <Link
                  href={`${sectionRoot}/${slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`${sectionRoot}/${STATUS_TO_SLUG.building}`}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {t.chipBuilding}
              </Link>
            </li>
            <li>
              <Link
                href={`${sectionRoot}/${STATUS_TO_SLUG.built}`}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {t.chipBuilt}
              </Link>
            </li>
            <li>
              <Link
                href={developersRoot}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {t.chipDevelopers}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12">
        <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-4">
          {t.faqTitle}
        </h3>
        <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
          {t.faq.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-medium text-[var(--color-text)]">
                {item.q}
                <span className="text-[var(--color-text-muted)] text-[20px] leading-none transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </section>
  )
}
