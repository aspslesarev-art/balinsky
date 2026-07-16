import Link from 'next/link'
import type { VillaFilterState } from '@/app/ru/villy/_lib'
import { STATUS_TO_SLUG } from '@/lib/villa-seo-routes'
import { DISTRICT_TO_SLUG, BEDROOM_TO_SLUG } from '@/lib/seo-routes'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const POPULAR_DISTRICTS = ['Berawa', 'Sanur', 'Ubud', 'Uluwatu', 'Pererenan', 'Pandawa', 'Batu Bolong', 'Cemagi']

type Variant = 'list' | 'map'

const COPY = {
  ru: {
    introWhereDistrict: (d: string) => `района ${d}`,
    introWhereDistricts: (d: string[]) => `районов ${d.join(', ')}`,
    introWhereBali: 'Бали',
    introBeds1: (n: string) => ` с ${n} спальней`,
    introBedsN: (a: string[]) => ` с ${a.join('/')} спальнями`,
    introMap: (where: string, beds: string) => `На странице — виллы и дома${beds} в пределах ${where} с отметками на карте.`,
    introList: (where: string, beds: string) => `На странице — виллы и дома${beds} в пределах ${where}.`,
    introTail: ' Смотрите фото, площадь дома и участка, цены и характеристики.',
    ctxUbud: 'В Убуде — виллы среди джунглей и рисовых террас. Подходит тем, кто ищет приватность и природу подальше от пляжа.',
    ctxCanggu: (d: string) => `${d} — Чангу: виллы для жизни на сёрфе, удалённой работы и сдачи в посуточную аренду.`,
    ctxBukit: (d: string) => `${d} — Букит: видовые виллы на утёсах, премиальный сегмент с высоким спросом на аренду.`,
    ctxSanur: 'Санур — виллы для семейного формата и долгосрочного переезда, спокойный восточный берег.',
    ctxDefault: 'Виллы на Бали покупают для жизни, для аренды и под перепродажу. Самые ликвидные локации — Чангу (Berawa, Batu Bolong, Pererenan), Букит (Uluwatu, Pandawa) и Убуд. Большинство сделок — лизхолд от 25 до 80 лет, формат собственности через нотариуса PPAT.',
    titleAdj: (n: string) => `${n}-комнатные`,
    titleNoun: 'виллы и дома',
    titleNounCap: 'Виллы и дома',
    titleInDistrict: (d: string) => ` в районе ${d}`,
    titleMapTail: ' на карте Бали',
    titleListTail: ' на Бали — каталог',
    districtsHeading: 'Виллы по районам',
    bedsStatusHeading: 'По спальням и статусу',
    bedroomsLabel: (n: string) => `${n}-комнатные`,
    statusBuilding: 'Строящиеся',
    statusBuilt: 'Готовые',
    villasInComplexes: 'Виллы в комплексах',
    faqHeading: 'Часто задаваемые вопросы',
    faq: [
      { q: 'Чем отличается вилла от апартамента?', a: 'Вилла — отдельно стоящий дом с участком, бассейном и приватным двором. Апартамент — юнит в общем комплексе с инфраструктурой и обычно без своей земли.' },
      { q: 'Сколько стоит вилла на Бали?',         a: '1-bedroom виллы стартуют от 150–250 тыс. $, 2–3-bedroom в Чангу/Букит — от 350 тыс. $. Премиальные видовые виллы доходят до 1.5–3 млн $.' },
      { q: 'Можно ли иностранцу купить виллу на Бали?', a: 'Да — через лизхолд (долгосрочная аренда земли, обычно 25–80 лет) или через юр. лицо PT PMA. Сделка оформляется у нотариуса PPAT.' },
      { q: 'Какая доходность у виллы под аренду?', a: 'В Чангу и на Буките — 8–12% годовых при загрузке 70–80% через управляющую компанию. Сезонность сильно влияет: декабрь–март и июль–август — пик.' },
      { q: 'Что важно проверить перед покупкой?', a: 'Срок лизхолда и условия продления, разрешения PBG / SLF, назначение земли (зонирование), подключение к воде/электричеству, наличие управляющей компании и путь к собственности (нотариус PPAT).' },
    ],
  },
  en: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (d: string[]) => `${d.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` with ${n} bedroom`,
    introBedsN: (a: string[]) => ` with ${a.join('/')} bedrooms`,
    introMap: (where: string, beds: string) => `Villas and houses${beds} in ${where}, marked on a map.`,
    introList: (where: string, beds: string) => `Villas and houses${beds} in ${where}.`,
    introTail: ' See photos, plot and house size, prices and details.',
    ctxUbud: 'Ubud — villas among jungle and rice terraces. Best for buyers wanting privacy and nature away from the beach.',
    ctxCanggu: (d: string) => `${d} — Canggu: villas for surfing, remote work and short-term rentals.`,
    ctxBukit: (d: string) => `${d} — Bukit: clifftop view villas, premium segment with strong rental demand.`,
    ctxSanur: 'Sanur — family-friendly villas for long-term relocation on the calm east coast.',
    ctxDefault: 'Bali villas are bought to live in, to rent out and to flip. The most liquid locations are Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa) and Ubud. Most deals are 25–80 year leaseholds closed at a PPAT notary.',
    titleAdj: (n: string) => `${n}-bedroom`,
    titleNoun: 'villas and houses',
    titleNounCap: 'Villas and houses',
    titleInDistrict: (d: string) => ` in ${d}`,
    titleMapTail: ' on the Bali map',
    titleListTail: ' in Bali — catalogue',
    districtsHeading: 'Villas by district',
    bedsStatusHeading: 'By bedrooms and status',
    bedroomsLabel: (n: string) => `${n}-bedroom`,
    statusBuilding: 'Under construction',
    statusBuilt: 'Completed',
    villasInComplexes: 'Villas in complexes',
    faqHeading: 'Frequently asked questions',
    faq: [
      { q: 'How does a villa differ from an apartment?', a: 'A villa is a standalone house on its own plot with a pool and private garden. An apartment is a unit inside a shared complex, usually without its own land.' },
      { q: 'How much does a Bali villa cost?',           a: '1-bedroom villas start at $150–250k. 2–3-bedroom villas in Canggu/Bukit start at $350k. Premium view villas reach $1.5–3M.' },
      { q: 'Can a foreigner buy a Bali villa?',          a: 'Yes — via leasehold (typically 25–80 years) or through a PT PMA company. The deal is closed at a PPAT notary.' },
      { q: 'What yield do rental villas earn?',          a: 'In Canggu and Bukit — 8–12% per year at 70–80% occupancy with a management company. Seasonality matters: Dec–Mar and Jul–Aug are peak.' },
      { q: 'What should I check before buying?',         a: 'Leasehold term and extension, PBG / SLF permits, land zoning, water/electricity connection, management company in place, and the ownership path (PPAT notary).' },
    ],
  },
  id: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (d: string[]) => `${d.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` dengan ${n} kamar tidur`,
    introBedsN: (a: string[]) => ` dengan ${a.join('/')} kamar tidur`,
    introMap: (where: string, beds: string) => `Vila dan rumah${beds} di ${where}, ditandai pada peta.`,
    introList: (where: string, beds: string) => `Vila dan rumah${beds} di ${where}.`,
    introTail: ' Lihat foto, luas tanah dan bangunan, harga, dan detailnya.',
    ctxUbud: 'Ubud — vila di antara hutan dan sawah terasering. Cocok bagi pembeli yang menginginkan privasi dan alam jauh dari pantai.',
    ctxCanggu: (d: string) => `${d} — Canggu: vila untuk berselancar, kerja jarak jauh, dan sewa jangka pendek.`,
    ctxBukit: (d: string) => `${d} — Bukit: vila dengan pemandangan di atas tebing, segmen premium dengan permintaan sewa yang kuat.`,
    ctxSanur: 'Sanur — vila ramah keluarga untuk relokasi jangka panjang di pantai timur yang tenang.',
    ctxDefault: 'Vila di Bali dibeli untuk ditinggali, disewakan, dan dijual kembali. Lokasi paling likuid adalah Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa), dan Ubud. Sebagian besar transaksi adalah hak sewa 25–80 tahun yang ditutup di notaris PPAT.',
    titleAdj: (n: string) => `${n} kamar tidur`,
    titleNoun: 'vila dan rumah',
    titleNounCap: 'Vila dan rumah',
    titleInDistrict: (d: string) => ` di ${d}`,
    titleMapTail: ' di peta Bali',
    titleListTail: ' di Bali — katalog',
    districtsHeading: 'Vila berdasarkan kawasan',
    bedsStatusHeading: 'Berdasarkan kamar tidur dan status',
    bedroomsLabel: (n: string) => `${n} kamar tidur`,
    statusBuilding: 'Dalam pembangunan',
    statusBuilt: 'Selesai',
    villasInComplexes: 'Vila di dalam kompleks',
    faqHeading: 'Pertanyaan yang sering diajukan',
    faq: [
      { q: 'Apa beda vila dan apartemen?', a: 'Vila adalah rumah berdiri sendiri di atas lahannya sendiri dengan kolam renang dan taman pribadi. Apartemen adalah unit di dalam kompleks bersama, biasanya tanpa lahan sendiri.' },
      { q: 'Berapa harga vila di Bali?',           a: 'Vila 1 kamar tidur mulai dari $150–250 rb. Vila 2–3 kamar tidur di Canggu/Bukit mulai dari $350 rb. Vila premium dengan pemandangan mencapai $1,5–3 jt.' },
      { q: 'Bisakah orang asing membeli vila di Bali?',          a: 'Ya — melalui hak sewa (biasanya 25–80 tahun) atau melalui perusahaan PT PMA. Transaksi ditutup di notaris PPAT.' },
      { q: 'Berapa imbal hasil vila sewa?',          a: 'Di Canggu dan Bukit — 8–12% per tahun pada okupansi 70–80% dengan perusahaan pengelola. Musim berpengaruh: Des–Mar dan Jul–Agu adalah puncaknya.' },
      { q: 'Apa yang perlu diperiksa sebelum membeli?',         a: 'Masa hak sewa dan perpanjangan, izin PBG / SLF, zonasi tanah, sambungan air/listrik, adanya perusahaan pengelola, dan jalur kepemilikan (notaris PPAT).' },
    ],
  },
  fr: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (d: string[]) => `${d.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` avec ${n} chambre`,
    introBedsN: (a: string[]) => ` avec ${a.join('/')} chambres`,
    introMap: (where: string, beds: string) => `Villas et maisons${beds} à ${where}, indiquées sur une carte.`,
    introList: (where: string, beds: string) => `Villas et maisons${beds} à ${where}.`,
    introTail: ' Voir les photos, la surface du terrain et de la maison, les prix et les détails.',
    ctxUbud: 'Ubud — des villas au cœur de la jungle et des rizières en terrasses. Idéal pour les acheteurs recherchant intimité et nature loin de la plage.',
    ctxCanggu: (d: string) => `${d} — Canggu : villas pour le surf, le télétravail et la location courte durée.`,
    ctxBukit: (d: string) => `${d} — Bukit : villas vue mer en haut des falaises, segment premium avec une forte demande locative.`,
    ctxSanur: 'Sanur — villas familiales pour une installation longue durée sur la côte est paisible.',
    ctxDefault: "Les villas de Bali s'achètent pour y vivre, pour les louer et pour les revendre. Les emplacements les plus liquides sont Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa) et Ubud. La plupart des transactions sont des baux de 25 à 80 ans conclus chez un notaire PPAT.",
    titleAdj: (n: string) => `${n} chambres`,
    titleNoun: 'villas et maisons',
    titleNounCap: 'Villas et maisons',
    titleInDistrict: (d: string) => ` à ${d}`,
    titleMapTail: ' sur la carte de Bali',
    titleListTail: ' à Bali — catalogue',
    districtsHeading: 'Villas par quartier',
    bedsStatusHeading: 'Par chambres et statut',
    bedroomsLabel: (n: string) => `${n} chambres`,
    statusBuilding: 'En construction',
    statusBuilt: 'Livrées',
    villasInComplexes: 'Villas en résidence',
    faqHeading: 'Questions fréquentes',
    faq: [
      { q: "Quelle différence entre une villa et un appartement ?", a: "Une villa est une maison individuelle sur son propre terrain, avec piscine et jardin privé. Un appartement est un logement au sein d'une résidence partagée, généralement sans terrain propre." },
      { q: 'Combien coûte une villa à Bali ?',           a: 'Les villas 1 chambre démarrent à 150–250 k$. Les villas 2–3 chambres à Canggu/Bukit démarrent à 350 k$. Les villas vue mer premium atteignent 1,5–3 M$.' },
      { q: 'Un étranger peut-il acheter une villa à Bali ?',          a: "Oui — via un bail (généralement 25–80 ans) ou via une société PT PMA. La transaction est conclue chez un notaire PPAT." },
      { q: 'Quel rendement offrent les villas en location ?',          a: 'À Canggu et Bukit — 8–12% par an avec un taux d\'occupation de 70–80% et une société de gestion. La saisonnalité compte : déc.–mars et juil.–août sont les pics.' },
      { q: 'Que faut-il vérifier avant d\'acheter ?',         a: "La durée du bail et son renouvellement, les permis PBG / SLF, le zonage du terrain, le raccordement eau/électricité, la présence d'une société de gestion et le parcours de propriété (notaire PPAT)." },
    ],
  },
} as const

function intro(f: VillaFilterState, variant: Variant, lang: Lang): string {
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

function context(f: VillaFilterState, lang: Lang): string {
  const C = pickCopy(COPY, lang)
  const dist = f.district[0]
  if (dist === 'Ubud') return C.ctxUbud
  if (dist === 'Berawa' || dist === 'Batu Bolong' || dist === 'Pererenan') return C.ctxCanggu(dist)
  if (dist === 'Uluwatu' || dist === 'Pandawa' || dist === 'Melasti') return C.ctxBukit(dist)
  if (dist === 'Sanur') return C.ctxSanur
  return C.ctxDefault
}

function buildSeoTitle(f: VillaFilterState, variant: Variant, lang: Lang): string {
  const C = pickCopy(COPY, lang)
  const adj: string[] = []
  if (f.bedrooms.length === 1) adj.push(C.titleAdj(f.bedrooms[0]))
  let s = adj.length ? `${adj.join(' ')} ${C.titleNoun}` : C.titleNounCap
  if (f.district.length === 1) s += C.titleInDistrict(f.district[0])
  s += variant === 'map' ? C.titleMapTail : C.titleListTail
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function VillasSeoContent({
  filters,
  variant = 'list',
  lang = 'ru',
}: {
  filters: VillaFilterState
  variant?: Variant
  lang?: Lang
}) {
  const C = pickCopy(COPY, lang)
  const h2 = buildSeoTitle(filters, variant, lang)
  const currentDistrict = filters.district[0]
  const districts = POPULAR_DISTRICTS.filter(d => d !== currentDistrict).slice(0, 6)
    .map(d => ({ name: d, slug: DISTRICT_TO_SLUG[d] })).filter(x => x.slug)
  const villasRoot = switchLangPath('/ru/villy', lang)
  const complexesVillasRoot = switchLangPath('/ru/zhilye-kompleksy/villy', lang)

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
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{C.districtsHeading}</h3>
          <ul className="flex flex-wrap gap-2">
            {districts.map(d => (
              <li key={d.slug}>
                <Link
                  href={`${villasRoot}/${d.slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3">{C.bedsStatusHeading}</h3>
          <ul className="flex flex-wrap gap-2">
            {Object.entries(BEDROOM_TO_SLUG).map(([n, slug]) => (
              <li key={slug}>
                <Link
                  href={`${villasRoot}/${slug}`}
                  className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {C.bedroomsLabel(n)}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`${villasRoot}/${STATUS_TO_SLUG.building}`}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {C.statusBuilding}
              </Link>
            </li>
            <li>
              <Link
                href={`${villasRoot}/${STATUS_TO_SLUG.built}`}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {C.statusBuilt}
              </Link>
            </li>
            <li>
              <Link
                href={complexesVillasRoot}
                className="inline-block px-3 py-1.5 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {C.villasInComplexes}
              </Link>
            </li>
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
