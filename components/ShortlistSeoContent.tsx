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
  de: {
    h2What: 'Immobilien auf Bali vergleichen',
    pWhat: 'Diese Seite stellt jede gespeicherte Villa, jedes Apartment und jede Wohnanlage in einer Vergleichstabelle nebeneinander — Preis, Preis pro Quadratmeter, Schlafzimmer, Fläche, verbleibendes Leasehold, Genehmigungen, angegebene Rendite und Transaktionsart stehen alle nebeneinander. Villen und Apartments werden untereinander verglichen; Wohnanlagen erhalten einen eigenen Listenabschnitt, da sie Phasen und Einheitenbereiche verkaufen, keine einzelnen Einheiten.',
    h2What2: 'Warum diese Felder',
    pWhat2: 'Ein ausländischer Käufer auf Bali achtet auf weit mehr als Schlafzimmer und Fläche. Die rechtliche Struktur kommt zuerst — Eigentumsart, verbleibende Leasehold-Jahre, Baugenehmigung (PBG / SLF), ob die Zonierung kurzfristigen Tourismus erlaubt. Dann die Wirtschaftlichkeit — Preis pro Quadratmeter im Verhältnis zum Gebiet, die vom Bauträger angegebene Rendite, die Transaktionsart (Off-Plan oder Wiederverkauf). Diese acht Felder decken 80% der Vorauswahl-Entscheidung ab.',
    h2Lease: 'Leasehold und Laufzeiten',
    pLease: 'Ausländer können auf Bali kein Freehold (Hak Milik) halten — Nichtansässige besitzen über ein Leasehold oder eine PT-PMA-Gesellschaft. Übliche Laufzeiten sind 25, 30, 50 oder 80 Jahre. Die verbleibende Laufzeit zum Kaufdatum ist wichtig, ebenso die Verlängerungsklausel (Extension). Ein Leasehold mit nutzbarer Verlängerung gilt als liquide; ohne eine solche entspricht Ihr Ausstiegsfenster dem verbleibenden Leasehold minus der 5–7 Jahre, die ein reibungsloser Weiterverkauf üblicherweise braucht.',
    h2Permit: 'PBG, SLF und Pondok Wisata',
    pPermit: 'PBG (Persetujuan Bangunan Gedung) ist die Baugenehmigung — ohne sie kein legaler Bau. SLF (Sertifikat Laik Fungsi) ist das Nutzungstauglichkeitszertifikat, das bei der Übergabe ausgestellt wird. Pondok Wisata ist die Lizenz für Kurzzeitvermietung (Airbnb, Booking) für private Villen und kleine Objekte. Wenn Sie STR-Einnahmen planen, ist der Besitz oder die Berechtigung für eine Pondok-Wisata-Genehmigung entscheidend.',
    h2Roi: 'Angegebene Rendite',
    pRoi: 'Die Renditezahl in der Tabelle ist das, was der Bauträger oder Verkäufer angibt. Die tatsächliche Zahl hängt vom Gebiet, der Saisonalität und der Verwaltungsgesellschaft ab. In Canggu (Berawa, Batu Bolong, Pererenan) sehen Sie bei 70–80% Auslastung typischerweise 8–12% netto pro Jahr; in Bukit (Uluwatu, Pandawa) — 9–14%; in Ubud — 6–9% wegen der Saisonalität. Alles über 15% angegeben verdient einen gesonderten Blick auf das zugrunde liegende Modell.',
    faqHeading: 'Häufige Fragen',
    faq: [
      { q: 'Wie füge ich ein Angebot zum Vergleich hinzu?',
        a: 'Öffnen Sie die Seite einer Villa, eines Apartments oder einer Wohnanlage und tippen Sie auf das Herz oben rechts in der Fotogalerie. Es erscheint dann hier.' },
      { q: 'Wo wird meine Merkliste gespeichert?',
        a: 'Nur in Ihrem Browser (localStorage). Sie synchronisiert nicht über Geräte hinweg — gut für die Privatsphäre, aber Sie müssen Angebote auf einem zweiten Gerät erneut hinzufügen.' },
      { q: 'Kann ich die Merkliste an einen Manager senden?',
        a: 'Ja — die Schaltfläche „An Telegram senden“ oben rechts öffnet Telegram mit einer vorausgefüllten Nachricht, die jede gespeicherte URL enthält.' },
      { q: 'Warum werden Wohnanlagen nicht mit Villen verglichen?',
        a: 'Eine Wohnanlage hat nicht einen Preis oder einen Grundriss — sie besteht aus Dutzenden Einheiten unterschiedlicher Größe. Ein Projekt mit einer fertigen Villa in einer „Schlafzimmer“-Zeile zu vergleichen ist sinnlos, daher erhalten Wohnanlagen einen eigenen Listenabschnitt.' },
    ],
    ctaHeading: 'Wie weiter',
    ctaText: 'Merkliste leer oder möchten Sie mehr hinzufügen?',
    ctaVillas: 'Villen-Katalog',
    ctaApartments: 'Apartment-Katalog',
    ctaComplexes: 'Wohnanlagen',
    ctaDevelopers: 'Alle Bauträger',
  },
  zh: {
    h2What: '在巴厘岛比较房产',
    pWhat: '本页将您保存的每一套别墅、公寓和住宅区并列在一张比较表中——价格、每平方米单价、卧室、面积、剩余 leasehold、许可、宣称收益率和交易类型全部并排显示。别墅与公寓互相比较；住宅区单独列出，因为它们出售的是分期与户型区间，而非单套房源。',
    h2What2: '为什么是这些参数',
    pWhat2: '在巴厘岛，外国买家关注的远不止卧室和面积。法律结构最重要——所有权类型、剩余 leasehold 年限、建筑许可（PBG / SLF）、分区是否允许短期旅游。其次是经济性——相对于区域的每平方米单价、开发商宣称的收益率、交易类型（期房还是转售）。这八个字段涵盖了 80% 的初选决策。',
    h2Lease: 'Leasehold 与期限',
    pLease: '外国人不能在巴厘岛持有 freehold（Hak Milik）——非居民通过 leasehold 或 PT PMA 公司持有。典型期限为 25、30、50 或 80 年。购买当日的剩余期限很重要，续期条款（extension）同样重要。带有可用续期的 leasehold 被视为具流动性；没有续期时，您的退出窗口等于剩余 leasehold 减去顺利转售通常所需的 5–7 年。',
    h2Permit: 'PBG、SLF 与 Pondok Wisata',
    pPermit: 'PBG（Persetujuan Bangunan Gedung）是建筑许可——没有它就不能合法建造。SLF（Sertifikat Laik Fungsi）是使用适宜性证书，在交付时签发。Pondok Wisata 是面向私人别墅和小型物业的短租许可（Airbnb、Booking）。若您计划获得短租（STR）收入，持有或有资格获得 Pondok Wisata 许可至关重要。',
    h2Roi: '宣称收益率',
    pRoi: '表格中的收益率数字是开发商或卖家所声明的。实际数字取决于区域、季节性和管理公司。在 Canggu（Berawa、Batu Bolong、Pererenan），入住率 70–80% 时通常为每年 8–12% 净收益；在 Bukit（Uluwatu、Pandawa）——9–14%；在 Ubud——因季节性为 6–9%。任何宣称高于 15% 的数字都值得单独审视其底层模型。',
    faqHeading: '常见问题',
    faq: [
      { q: '如何将房源加入比较？',
        a: '打开别墅、公寓或住宅区页面，点击照片库右上角的心形图标。它就会出现在这里。' },
      { q: '我的收藏清单保存在哪里？',
        a: '仅保存在您的浏览器中（localStorage）。它不会跨设备同步——有利于隐私，但您需要在第二台设备上重新添加房源。' },
      { q: '我可以把收藏清单发送给经理吗？',
        a: '可以——右上角的“发送到 Telegram”按钮会打开 Telegram，并预填一条包含所有已保存网址的消息。' },
      { q: '为什么住宅区不与别墅比较？',
        a: '住宅区没有单一价格或单一户型——它由数十个不同面积的单元组成。在“卧室”一行上把一个项目与一套建好的别墅相比毫无意义，因此住宅区单独列出。' },
    ],
    ctaHeading: '接下来',
    ctaText: '收藏清单为空，或想添加更多？',
    ctaVillas: '别墅目录',
    ctaApartments: '公寓目录',
    ctaComplexes: '住宅区',
    ctaDevelopers: '所有开发商',
  },
  nl: {
    h2What: 'Vastgoed op Bali vergelijken',
    pWhat: 'Deze pagina zet elke opgeslagen villa, appartement en wooncomplex naast elkaar in één vergelijkingstabel — prijs, prijs per vierkante meter, slaapkamers, oppervlakte, resterende leasehold, vergunningen, geclaimd rendement en transactietype staan allemaal naast elkaar. Villa’s en appartementen worden onderling vergeleken; wooncomplexen krijgen hun eigen lijstsectie omdat ze fasen en unitreeksen verkopen, geen losse units.',
    h2What2: 'Waarom deze velden',
    pWhat2: 'Een buitenlandse koper op Bali kijkt naar veel meer dan slaapkamers en oppervlakte. De juridische structuur komt eerst — eigendomstype, resterende leasehold-jaren, bouwvergunning (PBG / SLF), of de bestemming kortdurend toerisme toestaat. Daarna de economie — prijs per vierkante meter ten opzichte van het gebied, het door de ontwikkelaar geclaimde rendement, transactietype (off-plan of doorverkoop). Deze acht velden dekken 80% van de shortlist-beslissing.',
    h2Lease: 'Leasehold en looptijden',
    pLease: 'Buitenlanders kunnen op Bali geen freehold (Hak Milik) bezitten — niet-ingezetenen bezitten via een leasehold of een PT PMA-vennootschap. Gebruikelijke looptijden zijn 25, 30, 50 of 80 jaar. De resterende looptijd op de aankoopdatum telt, evenals de verlengingsclausule (extension). Een leasehold met een bruikbare verlenging geldt als liquide; zonder die verlenging is uw uitstapvenster de resterende leasehold minus de 5–7 jaar die een soepele doorverkoop doorgaans kost.',
    h2Permit: 'PBG, SLF en Pondok Wisata',
    pPermit: 'PBG (Persetujuan Bangunan Gedung) is de bouwvergunning — geen legale bouw zonder. SLF (Sertifikat Laik Fungsi) is het certificaat van gebruiksgeschiktheid, afgegeven bij oplevering. Pondok Wisata is de vergunning voor kortdurende verhuur (Airbnb, Booking) voor particuliere villa’s en kleine objecten. Als u STR-inkomsten wilt, is het bezitten van of in aanmerking komen voor een Pondok Wisata-vergunning cruciaal.',
    h2Roi: 'Geclaimd rendement',
    pRoi: 'Het rendementscijfer in de tabel is wat de ontwikkelaar of verkoper opgeeft. Het werkelijke cijfer hangt af van het gebied, de seizoensinvloeden en de beheermaatschappij. In Canggu (Berawa, Batu Bolong, Pererenan) ziet u bij 70–80% bezetting doorgaans 8–12% netto per jaar; in Bukit (Uluwatu, Pandawa) — 9–14%; in Ubud — 6–9% vanwege de seizoensinvloeden. Alles boven de 15% dat wordt geclaimd verdient een aparte blik op het onderliggende model.',
    faqHeading: 'Veelgestelde vragen',
    faq: [
      { q: 'Hoe voeg ik een object toe aan de vergelijking?',
        a: 'Open de pagina van een villa, appartement of complex en tik op het hartje rechtsboven in de fotogalerij. Het verschijnt dan hier.' },
      { q: 'Waar wordt mijn shortlist opgeslagen?',
        a: 'Alleen in uw browser (localStorage). Hij synchroniseert niet tussen apparaten — goed voor de privacy, maar u moet objecten op een tweede apparaat opnieuw toevoegen.' },
      { q: 'Kan ik de shortlist naar een manager sturen?',
        a: 'Ja — de knop „Naar Telegram sturen“ rechtsboven opent Telegram met een vooraf ingevuld bericht dat elke opgeslagen URL bevat.' },
      { q: 'Waarom worden wooncomplexen niet met villa’s vergeleken?',
        a: 'Een complex heeft niet één prijs of één indeling — het bestaat uit tientallen units van verschillende groottes. Een project op een „slaapkamers“-rij met een afgewerkte villa vergelijken is zinloos, dus wooncomplexen krijgen hun eigen lijstsectie.' },
    ],
    ctaHeading: 'Wat nu',
    ctaText: 'Shortlist leeg, of wilt u er meer toevoegen?',
    ctaVillas: 'Villacatalogus',
    ctaApartments: 'Appartementencatalogus',
    ctaComplexes: 'Wooncomplexen',
    ctaDevelopers: 'Alle ontwikkelaars',
  },
  ban: {
    h2What: 'Bandingang properti ring Bali',
    pWhat: 'Kaca puniki nyejerang sami vila, apartemen, lan kompleks hunian sane kasimpen ring asiki tabel perbandingan — aji, aji nyabran meter persegi, kamar, luas, sisa leasehold, ijin, asil sane kaklaim, lan jenis transaksi sami masanding. Vila lan apartemen kabandingang saling silih; kompleks hunian polih bagian daftar niri santukan ipun ngadol fase lan rentang unit, boya unit tunggal.',
    h2What2: 'Napi awinan parameter puniki',
    pWhat2: 'Pembeli asing ring Bali nyingakin doh langkungan saking wantah kamar lan luas. Struktur hukum sane utama — jenis kepemilikan, sisa warsa leasehold, ijin wangunan (PBG / SLF), punapi zonasi ngwehin pariwisata jangka bawak. Salanturnyane ekonominnyane — aji nyabran meter persegi marep wewengkon, asil sane kaklaim pangwangun, jenis transaksi (inden utawi adol malih). Kutus bidang puniki nyakup 80% kaputusan ring tahap daftar pilihan.',
    h2Lease: 'Leasehold lan jangka galah',
    pLease: 'Anak asing nenten prasida ngamel freehold (Hak Milik) ring Bali — non-residen ngamel malarapan leasehold utawi perusahaan PT PMA. Jangka galah lumrah 25, 30, 50, utawi 80 warsa. Sisa jangka galah ring tanggal tumbasan punika mabuat, kadi asapunika taler klausul perpanjangan (extension). Leasehold madaging extension sane prasida kanggen kaanggep likuid; tanpa punika, jendela pesu Ragane inggih punika sisa leasehold kakirangin 5–7 warsa sane biasane kabuatang antuk ngadol malih sane lancar.',
    h2Permit: 'PBG, SLF, lan Pondok Wisata',
    pPermit: 'PBG (Persetujuan Bangunan Gedung) inggih punika ijin wangunan — nenten wenten konstruksi legal tanpa ipun. SLF (Sertifikat Laik Fungsi) inggih punika sertifikat kelaikan fungsi, kaicen rikala serah terima. Pondok Wisata inggih punika lisensi sewa jangka bawak (Airbnb, Booking) antuk vila pribadi lan objek alit. Yening Ragane ngrencanayang polih pikolih STR, ngamel utawi memenuhi syarat antuk ijin Pondok Wisata punika kalintang mabuat.',
    h2Roi: 'Asil sane kaklaim',
    pRoi: 'Angka asil ring tabel inggih punika sane kaklaim olih pangwangun utawi sang adol. Angka sujati gumantung ring wewengkon, musim, lan perusahaan pengelola. Ring Canggu (Berawa, Batu Bolong, Pererenan) ring hunian 70–80% biasane kacingak 8–12% net nyabran warsa; ring Bukit (Uluwatu, Pandawa) — 9–14%; ring Ubud — 6–9% santukan musim. Sane luwih saking 15% sane kaklaim patut katinjau malih modelnyane secara niri.',
    faqHeading: 'Patakon sane sering katakenang',
    faq: [
      { q: 'Sapunapi carane nambahin objek ka perbandingan?',
        a: 'Bukak kaca vila, apartemen, utawi kompleks tur cotot ikon ati ring pojok kanan duur galeri foto. Objek jagi metu iriki.' },
      { q: 'Ring dija daftar pilihan tiang kasimpen?',
        a: 'Wantah ring peramban Ragane (localStorage). Daftar puniki nenten tersinkron antar-perangkat — becik antuk privasi, nanging Ragane patut nambahin malih objek saking perangkat kaping kalih.' },
      { q: 'Punapi tiang prasida ngirim daftar pilihan ka manajer?',
        a: 'Inggih — tombol „Kirim ka Telegram“ ring pojok kanan duur mukak Telegram madaging pesan sane sampun kaisi madaging sami URL sane kasimpen.' },
      { q: 'Napi awinan kompleks hunian nenten kabandingang sareng vila?',
        a: 'Kompleks nenten madue asiki aji utawi asiki tata letak — ipun kawangun antuk puluhan unit sane malianan ukurannyane. Mbandingang proyek sareng vila sane sampun puput ring baris „kamar“ nenten maarti, kenten kompleks polih bagian daftar niri.' },
    ],
    ctaHeading: 'Salanturnyane',
    ctaText: 'Daftar pilihan kosong, utawi meled nambahin malih?',
    ctaVillas: 'Katalog vila',
    ctaApartments: 'Katalog apartemen',
    ctaComplexes: 'Kompleks hunian',
    ctaDevelopers: 'Sami pangwangun',
  },
  pl: {
    h2What: 'Porównaj nieruchomości na Bali',
    pWhat: 'Ta strona zestawia każdą zapisaną willę, apartament i kompleks mieszkaniowy w jednej tabeli porównawczej — cena, cena za metr kwadratowy, sypialnie, powierzchnia, pozostały leasehold, pozwolenia, deklarowana rentowność i typ transakcji stoją obok siebie. Wille i apartamenty porównują się między sobą; kompleksy mają własną sekcję listy, ponieważ sprzedają fazy i zakresy jednostek, a nie pojedyncze lokale.',
    h2What2: 'Dlaczego akurat te parametry',
    pWhat2: 'Zagraniczny nabywca na Bali patrzy na znacznie więcej niż sypialnie i powierzchnię. Najpierw liczy się struktura prawna — rodzaj własności, pozostałe lata leasehold, pozwolenie na budowę (PBG / SLF), czy zonowanie dopuszcza turystykę krótkoterminową. Potem ekonomia — cena za metr kwadratowy względem rejonu, deklarowana przez dewelopera rentowność, typ transakcji (z rynku pierwotnego czy odsprzedaż). Te osiem pól pokrywa 80% decyzji na etapie krótkiej listy.',
    h2Lease: 'Leasehold i terminy',
    pLease: 'Obcokrajowcy nie mogą posiadać freehold (Hak Milik) na Bali — nierezydenci są właścicielami poprzez leasehold lub spółkę PT PMA. Typowe okresy to 25, 30, 50 lub 80 lat. Pozostały okres w dniu zakupu ma znaczenie, podobnie jak klauzula przedłużenia (extension). Leasehold z użyteczną opcją przedłużenia uchodzi za płynny; bez niej Twoje okno wyjścia to reszta leasehold minus 5–7 lat, które zwykle zajmuje sprawna odsprzedaż.',
    h2Permit: 'PBG, SLF i Pondok Wisata',
    pPermit: 'PBG (Persetujuan Bangunan Gedung) to pozwolenie na budowę — bez niego nie ma legalnej budowy. SLF (Sertifikat Laik Fungsi) to certyfikat zdatności do użytku, wydawany przy odbiorze. Pondok Wisata to licencja na najem krótkoterminowy (Airbnb, Booking) dla prywatnych willi i małych obiektów. Jeśli planujesz dochód z najmu krótkoterminowego (STR), posiadanie lub kwalifikowanie się do pozwolenia Pondok Wisata jest kluczowe.',
    h2Roi: 'Deklarowana rentowność',
    pRoi: 'Liczba rentowności w tabeli to to, co deklaruje deweloper lub sprzedający. Rzeczywista wartość zależy od rejonu, sezonowości i firmy zarządzającej. W Canggu (Berawa, Batu Bolong, Pererenan) przy obłożeniu 70–80% zwykle widać 8–12% netto rocznie; w Bukit (Uluwatu, Pandawa) — 9–14%; w Ubud — 6–9% z powodu sezonowości. Wszystko powyżej 15% deklarowanych zasługuje na osobne przyjrzenie się modelowi.',
    faqHeading: 'Najczęściej zadawane pytania',
    faq: [
      { q: 'Jak dodać obiekt do porównania?',
        a: 'Otwórz stronę willi, apartamentu lub kompleksu i dotknij serca w prawym górnym rogu galerii zdjęć. Obiekt pojawi się tutaj.' },
      { q: 'Gdzie przechowywana jest moja krótka lista?',
        a: 'Wyłącznie w Twojej przeglądarce (localStorage). Nie synchronizuje się między urządzeniami — dobre dla prywatności, ale musisz ponownie dodać obiekty na drugim urządzeniu.' },
      { q: 'Czy mogę wysłać krótką listę do menedżera?',
        a: 'Tak — przycisk „Wyślij na Telegram” w prawym górnym rogu otwiera Telegram z gotową wiadomością zawierającą każdy zapisany adres URL.' },
      { q: 'Dlaczego kompleksy mieszkaniowe nie są porównywane z willami?',
        a: 'Kompleks nie ma jednej ceny ani jednego układu — składa się z dziesiątek jednostek o różnych powierzchniach. Porównywanie projektu z gotową willą w wierszu „sypialnie” nie ma sensu, dlatego kompleksy mają własną sekcję listy.' },
    ],
    ctaHeading: 'Co dalej',
    ctaText: 'Krótka lista pusta lub chcesz dodać więcej?',
    ctaVillas: 'Katalog willi',
    ctaApartments: 'Katalog apartamentów',
    ctaComplexes: 'Kompleksy mieszkaniowe',
    ctaDevelopers: 'Wszyscy deweloperzy',
  },
  uk: {
    h2What: 'Порівняння нерухомості на Балі',
    pWhat: 'Сторінка збирає всі ваші збережені вілли, апартаменти та житлові комплекси в одну таблицю — поруч видно ціну, ціну за квадратний метр, спальні, площу, залишок строку лізхолду, дозволи, заявлену дохідність і тип угоди. Вілли й апартаменти порівнюються між собою; житлові комплекси виводяться окремим списком, бо в них фази, черги та діапазони цін.',
    h2What2: 'Чому саме ці параметри',
    pWhat2: 'Обираючи нерухомість на Балі, іноземець дивиться не лише на спальні та площу. Насамперед важлива юридична структура — на якій підставі володіє об’єктом, скільки років лізхолду залишилося, який дозвіл на будівництво (PBG / SLF), чи допускає зонування туристичне здавання. Далі — економіка: ціна за метр відносно району, заявлена забудовником дохідність, тип угоди (від забудовника чи перепродаж). Ці вісім полів закривають 80% рішень на етапі шортлиста.',
    h2Lease: 'Лізхолд і строки',
    pLease: 'Іноземець не може оформити freehold (Hak Milik) — землю на Балі нерезидент тримає в лізхолді або через PT PMA. Стандартний строк — 25, 30, 50 або 80 років. Важливо дивитися залишок строку на момент купівлі та умову продовження (extension). Лізхолд із можливістю extension вважається ліквідним; без extension вікно виходу дорівнює залишку лізхолду мінус 5–7 років на зручний перепродаж.',
    h2Permit: 'PBG, SLF і Pondok Wisata',
    pPermit: 'PBG (Persetujuan Bangunan Gedung) — дозвіл на будівництво, без нього легально будувати не можна. SLF (Sertifikat Laik Fungsi) — сертифікат придатності до експлуатації, видається після здачі. Pondok Wisata — ліцензія на легальне подобове здавання (Airbnb, Booking) для приватних вілл і невеликих об’єктів. Якщо плануєте дохід від подобової оренди (STR), наявність або можливість отримати Pondok Wisata критична.',
    h2Roi: 'Заявлена дохідність',
    pRoi: 'Цифри дохідності в таблиці — те, що декларує забудовник або продавець. Реальна дохідність залежить від району, сезонності та керуючої компанії. У Чангу (Berawa, Batu Bolong, Pererenan) за завантаження 70–80% зазвичай виходить 8–12% net річних, у Букіті (Uluwatu, Pandawa) — 9–14%, в Убуді — 6–9% через сезонність. Цифри вище 15% у декларації заслуговують на окрему перевірку моделі.',
    faqHeading: 'Часті запитання',
    faq: [
      { q: 'Як додати об’єкт до порівняння?',
        a: 'Відкрийте картку вілли, апартаментів чи комплексу й натисніть на серце у правому верхньому куті галереї. Об’єкт з’явиться тут.' },
      { q: 'Де зберігається мій шортлист?',
        a: 'Лише в браузері (localStorage). Між різними пристроями він не синхронізується — це зручно з точки зору приватності, але вимагає пересохраняти список з іншого пристрою.' },
      { q: 'Чи можна надіслати шортлист менеджеру?',
        a: 'Так, кнопка «Надіслати в Telegram» вгорі праворуч відкриває Telegram з готовим повідомленням — усі посилання на ваші збережені об’єкти в одному чаті.' },
      { q: 'Чому житлові комплекси не порівнюються з віллами?',
        a: 'У комплексу немає однієї ціни та одного планування — він складається з десятків юнітів із різними площами й цінами. Порівнювати проєкт із готовою віллою за рядком «спальні» безглуздо. Тому комплекси винесено в окрему секцію-список.' },
    ],
    ctaHeading: 'Далі',
    ctaText: 'Шортлист порожній або хочеться додати ще об’єктів?',
    ctaVillas: 'Каталог вілл',
    ctaApartments: 'Каталог апартаментів',
    ctaComplexes: 'Житлові комплекси',
    ctaDevelopers: 'Усі забудовники',
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
