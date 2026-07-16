import Link from 'next/link'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

// Bottom-of-page editorial copy for the shortlist / comparison route.
// Two jobs:
//   1. Give Google something concrete to index — the page is otherwise
//      driven by per-visitor localStorage and looks empty to a crawler.
//   2. Fill the lower half of the viewport with useful copy when the
//      visitor only has 2-3 saved listings, so the comparison table
//      doesn't sit alone on a 1280px-wide page.

const COPY = {
  ru: {
    h2What: 'Сравнение объектов недвижимости на Бали',
    pWhat: 'Страница собирает все ваши сохранённые виллы, апартаменты и жилые комплексы в одну таблицу — рядом видно цену, цену за квадратный метр, спальни, площадь, оставшийся срок лизхолда, разрешения, заявленную доходность и тип сделки. Виллы и апартаменты сравниваются между собой; жилые комплексы выводятся отдельным списком, потому что у них фазы, очереди и диапазоны цен.',
    h2What2: 'Почему именно эти параметры',
    pWhat2: 'При выборе недвижимости на Бали иностранец смотрит не только на спальни и площадь. Прежде всего важна юридическая структура — на каком основании владеет объект, сколько лет лизхолда осталось, какое разрешение на строительство (PBG / SLF), допускает ли зонирование туристическую сдачу. Дальше — экономика: цена за метр относительно района, заявленная застройщиком доходность, тип сделки (от застройщика или перепродажа). Эти восемь полей закрывают 80% решений на этапе шорт-листа.',
    h2Lease: 'Лизхолд и сроки',
    pLease: 'Иностранец не может оформить freehold (Hak Milik) — землю на Бали нерезидент держит в лизхолде или через PT PMA. Стандартный срок — 25, 30, 50 или 80 лет. Важно смотреть остаток срока на момент покупки и условие продления (extension). Лизхолд с возможностью extension считается ликвидным; без extension — окно выхода равно остатку лизхолда минус 5–7 лет на удобную перепродажу.',
    h2Permit: 'PBG, SLF и Pondok Wisata',
    pPermit: 'PBG (Persetujuan Bangunan Gedung) — разрешение на строительство, без него легально строить нельзя. SLF (Sertifikat Laik Fungsi) — сертификат пригодности к эксплуатации, выдаётся после сдачи. Pondok Wisata — лицензия на легальную краткосрочную сдачу (Airbnb, Booking) для частных вилл и небольших объектов. Если планируете STR-доход, наличие или возможность получить Pondok Wisata критично.',
    h2Roi: 'Заявленная доходность',
    pRoi: 'Цифры доходности в таблице — то, что декларирует застройщик или продавец. Реальная доходность зависит от района, сезонности и управляющей компании. В Чангу (Berawa, Batu Bolong, Pererenan) при загрузке 70–80% обычно выходит 8–12% net годовых, в Букит (Uluwatu, Pandawa) — 9–14%, в Убуде — 6–9% из-за сезонности. Цифры выше 15% в декларации заслуживают отдельной проверки модели.',
    faqHeading: 'Часто задаваемые вопросы',
    faq: [
      { q: 'Как добавить объект в сравнение?',
        a: 'Откройте карточку виллы, апартамента или комплекса и нажмите на сердце в правом верхнем углу галереи. Объект появится здесь.' },
      { q: 'Где хранится мой шортлист?',
        a: 'Только в браузере (localStorage). Между разными устройствами он не синхронизируется — что удобно с точки зрения приватности, но требует пересохранять список с другого устройства.' },
      { q: 'Можно ли отправить шортлист менеджеру?',
        a: 'Да, кнопка «Отправить в Telegram» сверху справа открывает Telegram с готовым сообщением — все ссылки на ваши сохранённые объекты в одном чате.' },
      { q: 'Почему жилые комплексы не сравниваются с виллами?',
        a: 'У комплекса нет одной цены и одной планировки — он состоит из десятков юнитов с разными площадями и ценами. Сравнивать проект с готовой виллой по строке «спальни» бессмысленно. Поэтому комплексы вынесены в отдельную секцию-список.' },
    ],
    ctaHeading: 'Дальше',
    ctaText: 'Шортлист пуст или хочется добавить ещё объектов?',
    ctaVillas: 'Каталог вилл',
    ctaApartments: 'Каталог апартаментов',
    ctaComplexes: 'Жилые комплексы',
    ctaDevelopers: 'Все застройщики',
  },
  en: {
    h2What: 'Compare properties in Bali',
    pWhat: 'This page lines up every saved villa, apartment and residential complex in one comparison table — price, price per square metre, bedrooms, area, remaining leasehold, permits, claimed yield and deal type all sit side by side. Villas and apartments compare against each other; complexes get their own list section because they sell phases and unit ranges, not single units.',
    h2What2: 'Why these fields',
    pWhat2: 'A foreign buyer in Bali looks at far more than bedrooms and area. The legal structure comes first — ownership type, leasehold years left, building permit (PBG / SLF), whether zoning allows short-term tourism. Then the economics — price per square metre against the district, the developer-claimed yield, deal type (off-plan vs resale). These eight fields cover 80% of the shortlist decision.',
    h2Lease: 'Leasehold and terms',
    pLease: 'Foreigners cannot hold freehold (Hak Milik) on Bali — non-residents own through a leasehold or a PT PMA company. Typical leases are 25, 30, 50 or 80 years. The remaining term at the date of purchase matters, and so does the renewal clause (extension). A leasehold with a usable extension is considered liquid; without one, your exit window is the leasehold remainder minus the 5–7 years it usually takes to resell smoothly.',
    h2Permit: 'PBG, SLF and Pondok Wisata',
    pPermit: 'PBG (Persetujuan Bangunan Gedung) is the building permit — no legal construction without it. SLF (Sertifikat Laik Fungsi) is the certificate of fitness for use, issued at handover. Pondok Wisata is the short-term-rental licence (Airbnb, Booking) for private villas and small objects. If you are planning to run STR income, having or being eligible for a Pondok Wisata permit is critical.',
    h2Roi: 'Claimed yield',
    pRoi: 'The yield figure in the table is what the developer or seller declares. The real number depends on the district, seasonality and the management company. In Canggu (Berawa, Batu Bolong, Pererenan) at 70–80% occupancy you typically see 8–12% net per year; in Bukit (Uluwatu, Pandawa) — 9–14%; in Ubud — 6–9% because of seasonality. Anything above 15% claimed deserves a separate look at the underlying model.',
    faqHeading: 'Frequently asked questions',
    faq: [
      { q: 'How do I add a listing to the comparison?',
        a: 'Open a villa, apartment or complex page and tap the heart in the top-right corner of the photo gallery. It will appear here.' },
      { q: 'Where is my shortlist stored?',
        a: 'Only in your browser (localStorage). It does not sync across devices — good for privacy, but you have to re-add listings from a second device.' },
      { q: 'Can I send the shortlist to a manager?',
        a: 'Yes — the "Send to Telegram" button in the top-right opens Telegram with a pre-filled message that contains every saved URL.' },
      { q: 'Why are residential complexes not compared with villas?',
        a: 'A complex does not have one price or one layout — it is dozens of units across different sizes. Comparing a project with a finished villa on a "bedrooms" row is meaningless, so complexes get their own list section.' },
    ],
    ctaHeading: 'What next',
    ctaText: 'Shortlist empty, or want to add more?',
    ctaVillas: 'Villas catalogue',
    ctaApartments: 'Apartments catalogue',
    ctaComplexes: 'Residential complexes',
    ctaDevelopers: 'All developers',
  },
  id: {
    h2What: 'Bandingkan properti di Bali',
    pWhat: 'Halaman ini menjajarkan setiap vila, apartemen, dan kompleks hunian yang Anda simpan dalam satu tabel perbandingan — harga, harga per meter persegi, kamar tidur, luas, sisa leasehold, izin, imbal hasil klaim, dan jenis transaksi semuanya berdampingan. Vila dan apartemen dibandingkan satu sama lain; kompleks hunian mendapat bagian daftar tersendiri karena mereka menjual fase dan rentang unit, bukan unit tunggal.',
    h2What2: 'Mengapa parameter-parameter ini',
    pWhat2: 'Pembeli asing di Bali melihat jauh lebih dari sekadar kamar tidur dan luas. Struktur hukum yang utama — jenis kepemilikan, sisa tahun leasehold, izin bangunan (PBG / SLF), apakah zonasi mengizinkan pariwisata jangka pendek. Lalu ekonominya — harga per meter persegi terhadap area, imbal hasil yang diklaim pengembang, jenis transaksi (inden atau jual kembali). Delapan bidang ini mencakup 80% keputusan pada tahap daftar pilihan.',
    h2Lease: 'Leasehold dan jangka waktu',
    pLease: 'Orang asing tidak bisa memegang freehold (Hak Milik) di Bali — non-residen memiliki melalui leasehold atau perusahaan PT PMA. Jangka waktu tipikal 25, 30, 50, atau 80 tahun. Sisa jangka waktu pada tanggal pembelian itu penting, begitu pula klausul perpanjangan (extension). Leasehold dengan extension yang bisa dipakai dianggap likuid; tanpa itu, jendela keluar Anda adalah sisa leasehold dikurangi 5–7 tahun yang biasanya dibutuhkan untuk menjual kembali dengan mulus.',
    h2Permit: 'PBG, SLF, dan Pondok Wisata',
    pPermit: 'PBG (Persetujuan Bangunan Gedung) adalah izin bangunan — tidak ada konstruksi legal tanpanya. SLF (Sertifikat Laik Fungsi) adalah sertifikat kelaikan fungsi, diterbitkan saat serah terima. Pondok Wisata adalah lisensi sewa jangka pendek (Airbnb, Booking) untuk vila pribadi dan objek kecil. Jika Anda berencana memperoleh penghasilan STR, memiliki atau memenuhi syarat untuk izin Pondok Wisata sangatlah penting.',
    h2Roi: 'Imbal hasil klaim',
    pRoi: 'Angka imbal hasil dalam tabel adalah yang dideklarasikan pengembang atau penjual. Angka sebenarnya bergantung pada area, musim, dan perusahaan pengelola. Di Canggu (Berawa, Batu Bolong, Pererenan) pada hunian 70–80% biasanya terlihat 8–12% net per tahun; di Bukit (Uluwatu, Pandawa) — 9–14%; di Ubud — 6–9% karena musim. Klaim di atas 15% layak ditinjau ulang modelnya secara terpisah.',
    faqHeading: 'Pertanyaan yang sering diajukan',
    faq: [
      { q: 'Bagaimana cara menambahkan objek ke perbandingan?',
        a: 'Buka halaman vila, apartemen, atau kompleks dan tekan ikon hati di pojok kanan atas galeri foto. Objek akan muncul di sini.' },
      { q: 'Di mana daftar pilihan saya disimpan?',
        a: 'Hanya di peramban Anda (localStorage). Daftar ini tidak tersinkron antar-perangkat — baik untuk privasi, tetapi Anda harus menambahkan ulang objek dari perangkat kedua.' },
      { q: 'Bisakah saya mengirim daftar pilihan ke manajer?',
        a: 'Ya — tombol «Kirim ke Telegram» di pojok kanan atas membuka Telegram dengan pesan siap kirim yang berisi setiap URL tersimpan.' },
      { q: 'Mengapa kompleks hunian tidak dibandingkan dengan vila?',
        a: 'Kompleks tidak memiliki satu harga atau satu tata letak — ia terdiri dari puluhan unit dengan ukuran berbeda. Membandingkan sebuah proyek dengan vila jadi pada baris «kamar tidur» tidak berarti, jadi kompleks mendapat bagian daftar tersendiri.' },
    ],
    ctaHeading: 'Selanjutnya',
    ctaText: 'Daftar pilihan kosong, atau ingin menambah lagi?',
    ctaVillas: 'Katalog vila',
    ctaApartments: 'Katalog apartemen',
    ctaComplexes: 'Kompleks hunian',
    ctaDevelopers: 'Semua pengembang',
  },
  fr: {
    h2What: 'Comparer les biens à Bali',
    pWhat: 'Cette page aligne chaque villa, appartement et résidence enregistrés dans un seul tableau de comparaison — prix, prix au mètre carré, chambres, surface, leasehold restant, permis, rendement annoncé et type de transaction, tous côte à côte. Villas et appartements se comparent entre eux ; les résidences ont leur propre section de liste car elles vendent des phases et des gammes d’unités, pas des unités uniques.',
    h2What2: 'Pourquoi ces critères',
    pWhat2: 'Un acheteur étranger à Bali regarde bien plus que les chambres et la surface. La structure juridique vient en premier — type de propriété, années de leasehold restantes, permis de construire (PBG / SLF), zonage autorisant le tourisme de courte durée. Puis l’économie — prix au mètre carré face au quartier, rendement annoncé par le promoteur, type de transaction (sur plan ou revente). Ces huit critères couvrent 80% de la décision de présélection.',
    h2Lease: 'Leasehold et durées',
    pLease: 'Les étrangers ne peuvent pas détenir de freehold (Hak Milik) à Bali — les non-résidents possèdent via un leasehold ou une société PT PMA. Les baux typiques sont de 25, 30, 50 ou 80 ans. La durée restante à la date d’achat compte, tout comme la clause de renouvellement (extension). Un leasehold avec une extension exploitable est considéré comme liquide ; sans elle, votre fenêtre de sortie correspond au reste du leasehold moins les 5–7 ans généralement nécessaires pour revendre sans heurt.',
    h2Permit: 'PBG, SLF et Pondok Wisata',
    pPermit: 'Le PBG (Persetujuan Bangunan Gedung) est le permis de construire — pas de construction légale sans lui. Le SLF (Sertifikat Laik Fungsi) est le certificat d’aptitude à l’usage, délivré à la livraison. Le Pondok Wisata est la licence de location de courte durée (Airbnb, Booking) pour les villas privées et petits biens. Si vous prévoyez des revenus STR, disposer d’un permis Pondok Wisata ou y être éligible est essentiel.',
    h2Roi: 'Rendement annoncé',
    pRoi: 'Le chiffre de rendement du tableau est celui que déclare le promoteur ou le vendeur. Le chiffre réel dépend du quartier, de la saisonnalité et de la société de gestion. À Canggu (Berawa, Batu Bolong, Pererenan) à 70–80% d’occupation, on voit généralement 8–12% net par an ; à Bukit (Uluwatu, Pandawa) — 9–14% ; à Ubud — 6–9% en raison de la saisonnalité. Tout chiffre annoncé au-delà de 15% mérite un examen distinct du modèle sous-jacent.',
    faqHeading: 'Questions fréquentes',
    faq: [
      { q: 'Comment ajouter un bien à la comparaison ?',
        a: 'Ouvrez la page d’une villa, d’un appartement ou d’une résidence et appuyez sur le cœur en haut à droite de la galerie photo. Il apparaîtra ici.' },
      { q: 'Où ma sélection est-elle enregistrée ?',
        a: 'Uniquement dans votre navigateur (localStorage). Elle ne se synchronise pas entre appareils — bon pour la confidentialité, mais vous devez ré-ajouter les biens depuis un second appareil.' },
      { q: 'Puis-je envoyer la sélection à un manager ?',
        a: 'Oui — le bouton « Envoyer sur Telegram » en haut à droite ouvre Telegram avec un message pré-rempli contenant chaque URL enregistrée.' },
      { q: 'Pourquoi les résidences ne sont-elles pas comparées aux villas ?',
        a: 'Une résidence n’a pas un seul prix ni une seule configuration — elle compte des dizaines d’unités de tailles différentes. Comparer un projet à une villa achevée sur une ligne « chambres » n’a pas de sens, les résidences ont donc leur propre section de liste.' },
    ],
    ctaHeading: 'Et ensuite',
    ctaText: 'Sélection vide, ou envie d’en ajouter d’autres ?',
    ctaVillas: 'Catalogue de villas',
    ctaApartments: 'Catalogue d’appartements',
    ctaComplexes: 'Résidences',
    ctaDevelopers: 'Tous les promoteurs',
  },
} as const

export function ShortlistSeoContent({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const link = (path: string, label: string) => (
    <Link
      key={label}
      href={path}
      className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[13px] no-underline text-[var(--color-text)] bg-white"
    >
      {label}
    </Link>
  )
  const villasHref     = switchLangPath('/ru/villy', lang)
  const apartmentsHref = switchLangPath('/ru/apartamenty', lang)
  const complexesHref  = switchLangPath('/ru/zhilye-kompleksy', lang)
  const developersHref = switchLangPath('/ru/zastrojshhiki', lang)

  // FAQ JSON-LD lets Google render rich Q&A snippets in search even
  // though the rest of the page is per-visitor data.
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <section className="mt-12 max-w-[760px] text-[15px] leading-[1.7] text-[var(--color-text)]">
      <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2What}</h2>
      <p className="mb-6">{c.pWhat}</p>

      <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2What2}</h2>
      <p className="mb-6">{c.pWhat2}</p>

      <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2Lease}</h2>
      <p className="mb-6">{c.pLease}</p>

      <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2Permit}</h2>
      <p className="mb-6">{c.pPermit}</p>

      <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2Roi}</h2>
      <p className="mb-8">{c.pRoi}</p>

      <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] mb-4">{c.faqHeading}</h2>
      <ul className="mb-8 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {c.faq.map(f => (
          <li key={f.q} className="py-4">
            <h3 className="text-[16px] font-semibold mb-1 text-[#111827]">{f.q}</h3>
            <p className="text-[14px] text-[var(--color-text-muted)]">{f.a}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <h2 className="text-[18px] font-semibold mb-3 text-[#111827]">{c.ctaHeading}</h2>
        <p className="text-[14px] text-[var(--color-text-muted)] mb-3">{c.ctaText}</p>
        <div className="flex flex-wrap gap-2">
          {link(villasHref,     c.ctaVillas)}
          {link(apartmentsHref, c.ctaApartments)}
          {link(complexesHref,  c.ctaComplexes)}
          {link(developersHref, c.ctaDevelopers)}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </section>
  )
}
