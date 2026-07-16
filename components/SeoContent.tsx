import Link from 'next/link'
import type { FilterState } from '@/components/filters/FiltersBar'
import {
  DISTRICT_TO_SLUG,
  BEDROOM_TO_SLUG,
  STATUS_TO_SLUG,
  PRICE_SEGMENTS,
} from '@/lib/seo-routes'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const POPULAR_DISTRICTS = ['Berawa', 'Sanur', 'Ubud', 'Uluwatu', 'Pererenan', 'Pandawa', 'Batu Bolong', 'Cemagi']

type Variant = 'list' | 'map'

const COPY = {
  ru: {
    introWhereDistrict: (d: string) => `района ${d}`,
    introWhereDistricts: (a: string[]) => `районов ${a.join(', ')}`,
    introWhereBali: 'Бали',
    introBeds1: (n: string) => ` с ${n} спальней`,
    introBedsN: (a: string[]) => ` с ${a.join('/')} спальнями`,
    introMap: (where: string, beds: string) => `На этой странице — апартаменты${beds} в пределах ${where} с отметками на карте.`,
    introList: (where: string, beds: string) => `На этой странице — каталог апартаментов${beds} в пределах ${where}.`,
    introTail: ' Можно сравнить расположение, цены и характеристики, посмотреть фото и выбрать подходящий вариант для жизни или инвестиций.',
    ctxUbud: 'Убуд — культурный центр острова, окружён рисовыми террасами и джунглями. Подходит тем, кто ищет спокойную жизнь вдали от пляжной суеты.',
    ctxCanggu: (d: string) => `${d} — часть Чангу, района сёрферов и диджитал-номадов: пляжные клубы, кафе, минут 10 до пляжа, активный рынок аренды.`,
    ctxBukit: (d: string) => `${d} — южная часть полуострова Букит, известная видовыми утёсами, премиальными виллами и точками для сёрфинга мирового уровня.`,
    ctxSanur: 'Санур — спокойный восточный берег с лагуной и набережной, популярен у семей и тех, кто переезжает на длительный срок.',
    ctxDefault: 'Бали — один из самых динамичных рынков апартаментов в Юго-Восточной Азии: новые комплексы вводятся ежемесячно, доходность от посуточной аренды в высокий сезон в среднем превышает 8–12% годовых. Основные локации: Чангу (Berawa, Batu Bolong, Pererenan) для сёрфинга и удалённой работы, Убуд для жизни в природе, Букит (Uluwatu, Pandawa) для премиальных видов на океан, Санур и Нуса-Дуа для семейного формата.',
    titleAdj: (n: string) => `${n}-комнатные`,
    titleNoun: 'апартаменты',
    titleNounCap: 'Апартаменты и квартиры',
    titleInDistrict: (d: string) => ` в районе ${d}`,
    titleInDistricts: (a: string[]) => ` в районах ${a.join(', ')}`,
    titleMapTail: ' на карте Бали',
    titleListTail: ' на Бали — каталог',
    popularHeading: 'Популярные районы',
    availableHeading: 'Что доступно',
    bedroomsLabel: (n: string) => `${n}-комнатные`,
    statusLabel: (k: string) => k === 'building' ? 'строящиеся' : 'готовые',
    faqHeading: 'Часто задаваемые вопросы',
    faq: [
      { q: 'Где лучше купить апартаменты на Бали?',
        a: 'Зависит от цели. Под аренду — Чангу (Berawa, Batu Bolong, Pererenan), там стабильный спрос круглый год. Для жизни — Убуд или Санур. Для премиальных видов на океан — Букит (Uluwatu, Pandawa).' },
      { q: 'Какие районы ближе к океану?',
        a: 'Прямой выход к пляжу есть у комплексов в Berawa, Batu Bolong, Pandawa, Melasti, Nusa Dua, Sanur. В Убуде до океана 30–40 минут на байке.' },
      { q: 'Сколько стоят апартаменты на Бали?',
        a: 'Студии стартуют от 80–100 тыс. $, 1-комнатные апартаменты в Чангу — от 150 тыс. $, видовые 2-комнатные на Буките — от 250 тыс. $. Премиальные пентхаусы доходят до 1 млн $ и выше.' },
      { q: 'Можно ли купить апартаменты иностранцу?',
        a: 'Да, по схеме лизхолд (долгосрочной аренды) — от 25 до 99 лет. Сделка оформляется у нотариуса (PPAT), большинство застройщиков работают с международными покупателями.' },
      { q: 'Какую доходность приносит сдача в аренду?',
        a: 'В популярных районах Чангу и Букит чистая годовая доходность от посуточной аренды через управляющую компанию обычно 8–12% при загрузке 70–80%.' },
    ],
  },
  en: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (a: string[]) => `${a.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` with ${n} bedroom`,
    introBedsN: (a: string[]) => ` with ${a.join('/')} bedrooms`,
    introMap: (where: string, beds: string) => `Apartments${beds} in ${where} marked on a map.`,
    introList: (where: string, beds: string) => `Apartment catalogue${beds} in ${where}.`,
    introTail: ' Compare location, prices and specs, browse photos and pick a property to live in or invest in.',
    ctxUbud: 'Ubud is the cultural heart of the island, surrounded by rice terraces and jungle. A good fit for buyers wanting a quiet life away from beach crowds.',
    ctxCanggu: (d: string) => `${d} is part of Canggu — the surfer / digital-nomad district: beach clubs, cafés, ~10 min to the beach, active rental market.`,
    ctxBukit: (d: string) => `${d} sits on the southern Bukit peninsula — clifftop views, premium villas, world-class surf breaks.`,
    ctxSanur: 'Sanur is the calm east coast — lagoon, boardwalk, popular with families and long-term relocators.',
    ctxDefault: 'Bali is one of the most dynamic apartment markets in South-East Asia: new complexes deliver monthly, short-term rental yields in high season typically average 8–12% per year. Key areas: Canggu (Berawa, Batu Bolong, Pererenan) for surf and remote work, Ubud for life in nature, Bukit (Uluwatu, Pandawa) for premium ocean views, Sanur and Nusa Dua for family-friendly stays.',
    titleAdj: (n: string) => `${n}-bedroom`,
    titleNoun: 'apartments',
    titleNounCap: 'Apartments and condos',
    titleInDistrict: (d: string) => ` in ${d}`,
    titleInDistricts: (a: string[]) => ` in ${a.join(', ')}`,
    titleMapTail: ' on the Bali map',
    titleListTail: ' in Bali — catalogue',
    popularHeading: 'Popular districts',
    availableHeading: 'What is available',
    bedroomsLabel: (n: string) => `${n}-bedroom`,
    statusLabel: (k: string) => k === 'building' ? 'under construction' : 'completed',
    faqHeading: 'Frequently asked questions',
    faq: [
      { q: 'Where is best to buy apartments in Bali?',
        a: 'Depends on the goal. For rental — Canggu (Berawa, Batu Bolong, Pererenan), with steady year-round demand. For living — Ubud or Sanur. For premium ocean views — Bukit (Uluwatu, Pandawa).' },
      { q: 'Which districts are closer to the ocean?',
        a: 'Direct beach access is available in Berawa, Batu Bolong, Pandawa, Melasti, Nusa Dua, Sanur. From Ubud the ocean is 30–40 min by scooter.' },
      { q: 'How much do Bali apartments cost?',
        a: 'Studios start at $80–100k, 1-bedroom in Canggu — from $150k, 2-bedroom view units on Bukit — from $250k. Premium penthouses reach $1M and above.' },
      { q: 'Can a foreigner buy apartments in Bali?',
        a: 'Yes, through leasehold (long-term lease) — 25 to 99 years. The deal is closed at a PPAT notary; most developers work with international buyers.' },
      { q: 'What rental yield can be expected?',
        a: 'In popular Canggu and Bukit areas, net annual yield from short-term rental via a management company is typically 8–12% at 70–80% occupancy.' },
    ],
  },
  id: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (a: string[]) => `${a.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` dengan ${n} kamar tidur`,
    introBedsN: (a: string[]) => ` dengan ${a.join('/')} kamar tidur`,
    introMap: (where: string, beds: string) => `Apartemen${beds} di ${where} ditandai pada peta.`,
    introList: (where: string, beds: string) => `Katalog apartemen${beds} di ${where}.`,
    introTail: ' Bandingkan lokasi, harga, dan spesifikasi, lihat foto, dan pilih properti untuk dihuni atau diinvestasikan.',
    ctxUbud: 'Ubud adalah jantung budaya pulau ini, dikelilingi terasering sawah dan hutan. Cocok bagi pembeli yang mencari kehidupan tenang jauh dari keramaian pantai.',
    ctxCanggu: (d: string) => `${d} adalah bagian dari Canggu — kawasan peselancar dan digital nomad: beach club, kafe, ~10 menit ke pantai, pasar sewa yang aktif.`,
    ctxBukit: (d: string) => `${d} berada di semenanjung Bukit selatan — pemandangan tebing, vila premium, dan ombak selancar kelas dunia.`,
    ctxSanur: 'Sanur adalah pesisir timur yang tenang — laguna, boardwalk, populer di kalangan keluarga dan mereka yang pindah untuk jangka panjang.',
    ctxDefault: 'Bali adalah salah satu pasar apartemen paling dinamis di Asia Tenggara: kompleks baru diserahkan setiap bulan, imbal hasil sewa jangka pendek di musim ramai biasanya rata-rata 8–12% per tahun. Kawasan utama: Canggu (Berawa, Batu Bolong, Pererenan) untuk selancar dan kerja jarak jauh, Ubud untuk hidup di alam, Bukit (Uluwatu, Pandawa) untuk pemandangan laut premium, Sanur dan Nusa Dua untuk suasana ramah keluarga.',
    titleAdj: (n: string) => `${n} kamar tidur`,
    titleNoun: 'apartemen',
    titleNounCap: 'Apartemen dan kondominium',
    titleInDistrict: (d: string) => ` di ${d}`,
    titleInDistricts: (a: string[]) => ` di ${a.join(', ')}`,
    titleMapTail: ' di peta Bali',
    titleListTail: ' di Bali — katalog',
    popularHeading: 'Area populer',
    availableHeading: 'Yang tersedia',
    bedroomsLabel: (n: string) => `${n} kamar tidur`,
    statusLabel: (k: string) => k === 'building' ? 'dalam pembangunan' : 'selesai dibangun',
    faqHeading: 'Pertanyaan yang sering diajukan',
    faq: [
      { q: 'Di mana lokasi terbaik untuk membeli apartemen di Bali?',
        a: 'Tergantung tujuan. Untuk disewakan — Canggu (Berawa, Batu Bolong, Pererenan), dengan permintaan stabil sepanjang tahun. Untuk dihuni — Ubud atau Sanur. Untuk pemandangan laut premium — Bukit (Uluwatu, Pandawa).' },
      { q: 'Area mana yang lebih dekat ke laut?',
        a: 'Akses pantai langsung tersedia di Berawa, Batu Bolong, Pandawa, Melasti, Nusa Dua, Sanur. Dari Ubud, laut berjarak 30–40 menit dengan motor.' },
      { q: 'Berapa harga apartemen di Bali?',
        a: 'Studio mulai dari $80–100k, 1 kamar tidur di Canggu — mulai $150k, unit 2 kamar tidur dengan pemandangan di Bukit — mulai $250k. Penthouse premium mencapai $1 juta ke atas.' },
      { q: 'Bisakah orang asing membeli apartemen di Bali?',
        a: 'Ya, melalui leasehold (sewa jangka panjang) — 25 hingga 99 tahun. Transaksi diselesaikan di notaris PPAT; sebagian besar pengembang bekerja dengan pembeli internasional.' },
      { q: 'Berapa imbal hasil sewa yang bisa diharapkan?',
        a: 'Di kawasan populer Canggu dan Bukit, imbal hasil bersih tahunan dari sewa jangka pendek melalui perusahaan pengelola biasanya 8–12% pada tingkat hunian 70–80%.' },
    ],
  },
  fr: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (a: string[]) => `${a.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` avec ${n} chambre`,
    introBedsN: (a: string[]) => ` avec ${a.join('/')} chambres`,
    introMap: (where: string, beds: string) => `Appartements${beds} à ${where} indiqués sur une carte.`,
    introList: (where: string, beds: string) => `Catalogue d’appartements${beds} à ${where}.`,
    introTail: ' Comparez l’emplacement, les prix et les caractéristiques, parcourez les photos et choisissez un bien pour y vivre ou investir.',
    ctxUbud: 'Ubud est le cœur culturel de l’île, entouré de rizières en terrasses et de jungle. Un bon choix pour les acheteurs recherchant une vie tranquille loin de la foule des plages.',
    ctxCanggu: (d: string) => `${d} fait partie de Canggu — le quartier des surfeurs et des nomades numériques : beach clubs, cafés, ~10 min de la plage, marché locatif actif.`,
    ctxBukit: (d: string) => `${d} se situe sur la péninsule sud de Bukit — vues sur falaises, villas premium, spots de surf de classe mondiale.`,
    ctxSanur: 'Sanur est la côte est paisible — lagon, promenade, prisée des familles et des personnes qui s’installent sur le long terme.',
    ctxDefault: 'Bali est l’un des marchés d’appartements les plus dynamiques d’Asie du Sud-Est : de nouvelles résidences sont livrées chaque mois, les rendements locatifs de courte durée en haute saison atteignent en moyenne 8–12 % par an. Zones clés : Canggu (Berawa, Batu Bolong, Pererenan) pour le surf et le travail à distance, Ubud pour la vie au cœur de la nature, Bukit (Uluwatu, Pandawa) pour les vues premium sur l’océan, Sanur et Nusa Dua pour les séjours en famille.',
    titleAdj: (n: string) => `${n} chambres`,
    titleNoun: 'appartements',
    titleNounCap: 'Appartements et condos',
    titleInDistrict: (d: string) => ` à ${d}`,
    titleInDistricts: (a: string[]) => ` à ${a.join(', ')}`,
    titleMapTail: ' sur la carte de Bali',
    titleListTail: ' à Bali — catalogue',
    popularHeading: 'Quartiers populaires',
    availableHeading: 'Ce qui est disponible',
    bedroomsLabel: (n: string) => `${n} chambres`,
    statusLabel: (k: string) => k === 'building' ? 'en construction' : 'livrés',
    faqHeading: 'Questions fréquentes',
    faq: [
      { q: 'Où vaut-il mieux acheter un appartement à Bali ?',
        a: 'Cela dépend de l’objectif. Pour la location — Canggu (Berawa, Batu Bolong, Pererenan), avec une demande stable toute l’année. Pour y vivre — Ubud ou Sanur. Pour des vues premium sur l’océan — Bukit (Uluwatu, Pandawa).' },
      { q: 'Quels quartiers sont plus proches de l’océan ?',
        a: 'Un accès direct à la plage est possible à Berawa, Batu Bolong, Pandawa, Melasti, Nusa Dua, Sanur. Depuis Ubud, l’océan est à 30–40 min en scooter.' },
      { q: 'Combien coûtent les appartements à Bali ?',
        a: 'Les studios démarrent à 80–100k $, un 1 chambre à Canggu — à partir de 150k $, un 2 chambres avec vue à Bukit — à partir de 250k $. Les penthouses premium atteignent 1 M$ et plus.' },
      { q: 'Un étranger peut-il acheter un appartement à Bali ?',
        a: 'Oui, via le leasehold (bail longue durée) — de 25 à 99 ans. La transaction est conclue chez un notaire PPAT ; la plupart des promoteurs travaillent avec des acheteurs internationaux.' },
      { q: 'Quel rendement locatif peut-on espérer ?',
        a: 'Dans les zones prisées de Canggu et Bukit, le rendement net annuel de la location de courte durée via une société de gestion est généralement de 8–12 % à un taux d’occupation de 70–80 %.' },
    ],
  },
} as const

function intro(f: FilterState, variant: Variant, lang: Lang): string {
  const C = pickCopy(COPY, lang)
  const where =
    f.district.length === 1 ? C.introWhereDistrict(f.district[0]) :
    f.district.length > 1 ? C.introWhereDistricts(f.district) :
    C.introWhereBali
  const beds = f.bedrooms.length === 1 ? C.introBeds1(f.bedrooms[0])
    : f.bedrooms.length > 1 ? C.introBedsN(f.bedrooms) : ''
  const lead = variant === 'map' ? C.introMap(where, beds) : C.introList(where, beds)
  return lead + C.introTail
}

function context(f: FilterState, lang: Lang): string {
  const C = pickCopy(COPY, lang)
  const dist = f.district[0]
  if (dist === 'Ubud') return C.ctxUbud
  if (dist === 'Berawa' || dist === 'Batu Bolong' || dist === 'Pererenan') return C.ctxCanggu(dist)
  if (dist === 'Uluwatu' || dist === 'Pandawa' || dist === 'Melasti') return C.ctxBukit(dist)
  if (dist === 'Sanur') return C.ctxSanur
  return C.ctxDefault
}

function buildSeoTitle(f: FilterState, variant: Variant, lang: Lang): string {
  const C = pickCopy(COPY, lang)
  const adj: string[] = []
  if (f.bedrooms.length === 1) adj.push(C.titleAdj(f.bedrooms[0]))
  let s = adj.length ? `${adj.join(' ')} ${C.titleNoun}` : C.titleNounCap
  if (f.district.length === 1) s += C.titleInDistrict(f.district[0])
  else if (f.district.length > 1) s += C.titleInDistricts(f.district)
  s += variant === 'map' ? C.titleMapTail : C.titleListTail
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function SeoContent({
  filters,
  variant = 'list',
  lang = 'ru',
}: {
  filters: FilterState
  variant?: Variant
  lang?: Lang
}) {
  const C = pickCopy(COPY, lang)
  const h2 = buildSeoTitle(filters, variant, lang)
  const currentDistrict = filters.district[0]
  const districts = POPULAR_DISTRICTS.filter(d => d !== currentDistrict)
    .slice(0, 6)
    .map(d => ({ name: d, slug: DISTRICT_TO_SLUG[d] }))
    .filter(x => x.slug)
  const aptRoot = switchLangPath('/ru/apartamenty', lang)

  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: C.faq.map(item => ({
      '@type': 'Question', name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <section className="mt-12 pt-10 border-t border-[var(--color-border)]">
      <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[var(--color-text)] mb-4">{h2}</h2>

      <div className="prose-balinsky max-w-3xl space-y-3 text-[15px] leading-relaxed text-[var(--color-text)]">
        <p>{intro(filters, variant, lang)}</p>
        <p className="text-[var(--color-text-muted)]">{context(filters, lang)}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{C.popularHeading}</h3>
          <ul className="flex flex-wrap gap-2">
            {districts.map(d => (
              <li key={d.slug}>
                <Link
                  href={`${aptRoot}/${d.slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{C.availableHeading}</h3>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(BEDROOM_TO_SLUG).map(([n, slug]) => (
              <li key={slug}>
                <Link
                  href={`${aptRoot}/${slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                >
                  {C.bedroomsLabel(n)}
                </Link>
              </li>
            ))}
            {Object.entries(STATUS_TO_SLUG).map(([key, slug]) => (
              <li key={slug}>
                <Link
                  href={`${aptRoot}/${slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                >
                  {C.statusLabel(key)}
                </Link>
              </li>
            ))}
            {PRICE_SEGMENTS.slice(0, 3).map(seg => (
              <li key={seg.slug}>
                <Link
                  href={`${aptRoot}/${seg.slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors"
                >
                  {seg.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-12">
        <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-4">{C.faqHeading}</h3>
        <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
          {C.faq.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-medium text-[var(--color-text)]">
                {item.q}
                <span className="text-[var(--color-text-muted)] text-[20px] leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </section>
  )
}
