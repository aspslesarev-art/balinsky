// Shared home-page body, rendered by both /ru/page.tsx and
// /en/page.tsx. All copy lives in COPY[lang]; data loads happen
// inside this server component so the wrappers stay tiny and only
// pass the lang prop. Internal links are built off route-prefix
// tables that mirror app/ru/* ↔ app/en/* directory naming.

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { Home as HomeIcon, Building, Building2, HardHat, ArrowRight, Calendar, Sparkles, Newspaper, BookOpen } from 'lucide-react'
import { Header } from '@/components/Header'
import { BalinaHero } from '@/components/BalinaHero'
import { PageContainer } from '@/components/PageContainer'
import { VillaCard, type VillaCardData } from '@/components/VillaCard'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { HomeSeoBlocks } from './HomeSeoBlocks'
import { loadAll as loadAllVillas, buildAllCards as buildAllVillaCards, type VillaFilterState } from '@/app/ru/villy/_lib'
import { loadLatestYouTubeVideos } from '@/lib/youtube'
import { YouTubeBlock } from '@/components/YouTubeBlock'
import { loadAllVillaScores } from '@/lib/investment/batch-scores'
import { loadAllNews } from '@/lib/news'
import { loadAllPromo } from '@/lib/promo'
import { loadAllEvents } from '@/lib/events'
import { pickCopy, type Lang } from '@/lib/i18n'
import { cdnBucketBase, cdnManifestUrl } from '@/lib/photo-cdn'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

const POPULAR_DISTRICTS = ['Berawa', 'Pererenan', 'Ubud', 'Uluwatu', 'Pandawa', 'Sanur', 'Batu Bolong', 'Cemagi']

// Per-section route prefix per language. Keep in lockstep with the
// directory layout under app/ru/* and app/en/*.
const ROUTES = {
  ru: {
    home:        '/ru',
    villas:      '/ru/villy',
    apartments:  '/ru/apartamenty',
    complexes:   '/ru/zhilye-kompleksy',
    developers:  '/ru/zastrojshhiki',
    news:        '/ru/novosti',
    promo:       '/ru/akcii',
    events:      '/ru/meropriyatiya',
    knowledge:   '/ru/znaniya',
  },
  en: {
    home:        '/en',
    villas:      '/en/villas',
    apartments:  '/en/apartments',
    complexes:   '/en/complexes',
    developers:  '/en/developers',
    news:        '/en/news',
    promo:       '/en/promo',
    events:      '/en/events',
    knowledge:   '/en/knowledge',
  },
} as const

const COPY = {
  ru: {
    locale: 'ru-RU',
    h2: 'Недвижимость на Бали — без посредников и красивых обещаний',
    intro: (totalUnits: number, complexes: number, developers: number) =>
      `Каталог из ${totalUnits} объектов и ${complexes} жилых комплексов от ${developers} застройщиков. Прозрачные данные о разрешениях и управляющих компаниях, свежие акции, новости и мероприятия.`,
    sectionVillas:     { title: 'Виллы и дома',    tagline: 'Отдельные дома с участком, бассейном и приватной территорией', countLabel: 'объектов' },
    sectionApartments: { title: 'Апартаменты',     tagline: 'Юниты в современных комплексах с управляющей компанией',        countLabel: 'объектов' },
    sectionComplexes:  { title: 'Жилые комплексы', tagline: 'Закрытые комплексы с инфраструктурой и сервисом',               countLabel: 'комплексов' },
    sectionDevelopers: { title: 'Застройщики',     tagline: 'Рейтинги, сданные проекты, юридическая чистота',                 countLabel: 'компаний' },
    topVillasTitle:   'Виллы с лучшим инвест-потенциалом',
    topVillasLink:    'Все виллы',
    activePromoTitle: 'Акции от застройщиков',
    activePromoLink:  'Все акции',
    eventsTitle:      'Ближайшие мероприятия',
    eventsLink:       'Все мероприятия',
    complexesTitle:   'Жилые комплексы',
    complexesLink:    'Все комплексы',
    newsTitle:        'Свежие новости',
    newsLink:         'Все новости',
    districtsTitle:   'Популярные районы',
    districtsIntro:   'Чангу (Berawa, Pererenan, Batu Bolong) — для сёрфинга и аренды; Букит (Uluwatu, Pandawa) — для премиальных видов; Убуд — для жизни в природе; Санур — для семейного формата.',
    knowledgeBadge:   'База знаний',
    knowledgeTitle:   'Лизхолд, налоги, ВНЖ и жизнь на Бали — статьи из практики',
    knowledgeCta:     'Открыть базу знаний',
    seoH2:            'Недвижимость на Бали — что важно знать',
    seoP1:            'Бали — один из самых динамичных рынков недвижимости Юго-Восточной Азии. Ежемесячно вводятся новые жилые комплексы, активные застройщики работают сразу в нескольких районах. Доходность от посуточной аренды в высокий сезон в среднем 8–12% годовых через управляющую компанию.',
    seoP2:            'Большинство сделок оформляется по схеме лизхолд (25–80 лет с возможностью продления), реже — через индонезийское юрлицо PT PMA. Документы на стройку: PBG (разрешение) и SLF (сертификат пригодности). Без SLF юнит не может легально сдаваться в аренду — это важный чек перед покупкой готового объекта.',
    faqTitle:         'Часто задаваемые вопросы',
    faq: [
      { q: 'С чего начать выбор недвижимости на Бали?', a: 'С формата: для жизни — виллы и таунхаусы в Чангу, Сануре или Убуде; под аренду — апартаменты в строящихся комплексах с управляющей компанией; под перепродажу — премиальные виды на Буките.' },
      { q: 'Можно ли иностранцу купить недвижимость на Бали?', a: 'Да, через лизхолд (долгосрочная аренда земли, обычно 25–80 лет) или через индонезийское юр. лицо PT PMA. Сделка оформляется у нотариуса PPAT.' },
      { q: 'Какая доходность от сдачи в аренду?', a: 'В Чангу и на Буките — 8–12% годовых при загрузке 70–80% через управляющую компанию. Зависит от района, типа объекта и сезонности.' },
      { q: 'Что такое PBG и SLF?', a: 'PBG — разрешение на строительство (без него стройка нелегальна). SLF — сертификат пригодности к эксплуатации (без него юнит не может официально сдаваться в аренду).' },
    ],
    until:            (d: string) => `До ${d}`,
    unitsSuffix:      'юнитов',
    orgDescription:   'Каталог недвижимости на Бали: виллы, апартаменты, жилые комплексы и проверенные застройщики.',
  },
  en: {
    locale: 'en-GB',
    h2: 'Bali real estate — no middlemen, no fluff',
    intro: (totalUnits: number, complexes: number, developers: number) =>
      `${totalUnits} listings and ${complexes} residential complexes from ${developers} developers. Transparent data on permits and management companies, fresh promotions, news and events.`,
    sectionVillas:     { title: 'Villas & houses',           tagline: 'Standalone houses with land, pool, and private grounds',  countLabel: 'listings' },
    sectionApartments: { title: 'Apartments',                tagline: 'Units in modern complexes with a management company',     countLabel: 'listings' },
    sectionComplexes:  { title: 'Residential complexes',     tagline: 'Gated complexes with infrastructure and service',          countLabel: 'complexes' },
    sectionDevelopers: { title: 'Developers',                tagline: 'Ratings, delivered projects, legal track record',          countLabel: 'companies' },
    topVillasTitle:   'Villas with top investment potential',
    topVillasLink:    'All villas',
    activePromoTitle: 'Developer promotions',
    activePromoLink:  'All promotions',
    eventsTitle:      'Upcoming events',
    eventsLink:       'All events',
    complexesTitle:   'Residential complexes',
    complexesLink:    'All complexes',
    newsTitle:        'Latest news',
    newsLink:         'All news',
    districtsTitle:   'Popular districts',
    districtsIntro:   'Canggu (Berawa, Pererenan, Batu Bolong) — surf and rentals; Bukit (Uluwatu, Pandawa) — premium views; Ubud — nature living; Sanur — family format.',
    knowledgeBadge:   'Knowledge base',
    knowledgeTitle:   'Leasehold, taxes, residency and Bali living — practical guides',
    knowledgeCta:     'Open knowledge base',
    seoH2:            'Bali real estate — what to know',
    seoP1:            'Bali is one of the most dynamic real-estate markets in South-East Asia. New residential complexes break ground every month, active developers run multiple sites at once. Daily-rental yields through a management company average 8–12% per year in the high season.',
    seoP2:            'Most deals close as leasehold (25–80 years with extensions), occasionally through an Indonesian PT PMA legal entity. Construction paperwork: PBG (build permit) and SLF (certificate of fitness). Without SLF a unit cannot legally be rented out — a key check before buying a delivered property.',
    faqTitle:         'Frequently asked questions',
    faq: [
      { q: 'How do I start picking Bali real estate?', a: 'Pick the format first: villas and townhouses in Canggu, Sanur or Ubud for living; apartments in under-construction complexes with a management company for rental income; premium-view Bukit units for resale.' },
      { q: 'Can a foreigner buy property in Bali?', a: 'Yes — via leasehold (long-term land lease, typically 25–80 years) or through an Indonesian PT PMA company. The deal is closed at a PPAT notary.' },
      { q: 'What rental yield can I expect?', a: 'Canggu and Bukit see 8–12% annual yield at 70–80% occupancy through a management company. Depends on district, property type and seasonality.' },
      { q: 'What are PBG and SLF?', a: 'PBG is the build permit — without it construction is illegal. SLF is the certificate of fitness — without it the unit cannot officially be rented out.' },
    ],
    until:            (d: string) => `Until ${d}`,
    unitsSuffix:      'units',
    orgDescription:   'Bali real-estate catalog: villas, apartments, residential complexes and verified developers.',
  },
  id: {
    locale: 'id-ID',
    h2: 'Properti Bali — tanpa perantara, tanpa basa-basi',
    intro: (totalUnits: number, complexes: number, developers: number) =>
      `${totalUnits} listing dan ${complexes} kompleks hunian dari ${developers} pengembang. Data transparan tentang izin dan perusahaan pengelola, promo terbaru, berita, dan acara.`,
    sectionVillas:     { title: 'Vila & rumah',       tagline: 'Rumah mandiri dengan tanah, kolam, dan lahan pribadi',   countLabel: 'listing' },
    sectionApartments: { title: 'Apartemen',          tagline: 'Unit di kompleks modern dengan perusahaan pengelola',    countLabel: 'listing' },
    sectionComplexes:  { title: 'Kompleks hunian',    tagline: 'Kompleks tertutup dengan infrastruktur dan layanan',     countLabel: 'kompleks' },
    sectionDevelopers: { title: 'Pengembang',         tagline: 'Peringkat, proyek yang telah selesai, rekam jejak legal', countLabel: 'perusahaan' },
    topVillasTitle:   'Vila dengan potensi investasi terbaik',
    topVillasLink:    'Semua vila',
    activePromoTitle: 'Promo dari pengembang',
    activePromoLink:  'Semua promo',
    eventsTitle:      'Acara mendatang',
    eventsLink:       'Semua acara',
    complexesTitle:   'Kompleks hunian',
    complexesLink:    'Semua kompleks',
    newsTitle:        'Berita terbaru',
    newsLink:         'Semua berita',
    districtsTitle:   'Kawasan populer',
    districtsIntro:   'Canggu (Berawa, Pererenan, Batu Bolong) — selancar dan sewa; Bukit (Uluwatu, Pandawa) — pemandangan premium; Ubud — hidup di alam; Sanur — format keluarga.',
    knowledgeBadge:   'Basis pengetahuan',
    knowledgeTitle:   'Leasehold, pajak, izin tinggal, dan hidup di Bali — panduan praktis',
    knowledgeCta:     'Buka basis pengetahuan',
    seoH2:            'Properti Bali — yang perlu diketahui',
    seoP1:            'Bali adalah salah satu pasar properti paling dinamis di Asia Tenggara. Kompleks hunian baru mulai dibangun setiap bulan, pengembang aktif menggarap beberapa lokasi sekaligus. Imbal hasil sewa harian melalui perusahaan pengelola rata-rata 8–12% per tahun pada musim ramai.',
    seoP2:            'Sebagian besar transaksi ditutup sebagai leasehold (25–80 tahun dengan perpanjangan), kadang melalui badan hukum Indonesia PT PMA. Dokumen konstruksi: PBG (izin bangun) dan SLF (sertifikat laik fungsi). Tanpa SLF sebuah unit tidak bisa disewakan secara legal — pemeriksaan penting sebelum membeli properti yang sudah selesai.',
    faqTitle:         'Pertanyaan yang sering diajukan',
    faq: [
      { q: 'Bagaimana memulai memilih properti Bali?', a: 'Tentukan format dulu: vila dan rumah bandar di Canggu, Sanur, atau Ubud untuk tinggal; apartemen di kompleks dalam pembangunan dengan perusahaan pengelola untuk pendapatan sewa; unit Bukit dengan pemandangan premium untuk dijual kembali.' },
      { q: 'Bisakah orang asing membeli properti di Bali?', a: 'Ya — melalui leasehold (sewa tanah jangka panjang, biasanya 25–80 tahun) atau melalui perusahaan Indonesia PT PMA. Transaksi ditutup di hadapan notaris PPAT.' },
      { q: 'Berapa imbal hasil sewa yang bisa diharapkan?', a: 'Canggu dan Bukit mencatat imbal hasil tahunan 8–12% pada okupansi 70–80% melalui perusahaan pengelola. Bergantung pada kawasan, tipe properti, dan musim.' },
      { q: 'Apa itu PBG dan SLF?', a: 'PBG adalah izin bangun — tanpanya konstruksi ilegal. SLF adalah sertifikat laik fungsi — tanpanya unit tidak bisa disewakan secara resmi.' },
    ],
    until:            (d: string) => `Sampai ${d}`,
    unitsSuffix:      'unit',
    orgDescription:   'Katalog properti Bali: vila, apartemen, kompleks hunian, dan pengembang terverifikasi.',
  },
  fr: {
    locale: 'fr-FR',
    h2: 'Immobilier à Bali — sans intermédiaires, sans blabla',
    intro: (totalUnits: number, complexes: number, developers: number) =>
      `${totalUnits} annonces et ${complexes} résidences de ${developers} promoteurs. Données transparentes sur les permis et les sociétés de gestion, promotions récentes, actualités et événements.`,
    sectionVillas:     { title: 'Villas & maisons',   tagline: 'Maisons individuelles avec terrain, piscine et espace privé', countLabel: 'annonces' },
    sectionApartments: { title: 'Appartements',       tagline: 'Unités dans des résidences modernes avec société de gestion', countLabel: 'annonces' },
    sectionComplexes:  { title: 'Résidences',         tagline: 'Résidences sécurisées avec infrastructures et services',       countLabel: 'résidences' },
    sectionDevelopers: { title: 'Promoteurs',         tagline: 'Notes, projets livrés, antécédents juridiques',                 countLabel: 'sociétés' },
    topVillasTitle:   'Villas au meilleur potentiel d\'investissement',
    topVillasLink:    'Toutes les villas',
    activePromoTitle: 'Promotions des promoteurs',
    activePromoLink:  'Toutes les promotions',
    eventsTitle:      'Événements à venir',
    eventsLink:       'Tous les événements',
    complexesTitle:   'Résidences',
    complexesLink:    'Toutes les résidences',
    newsTitle:        'Dernières actualités',
    newsLink:         'Toutes les actualités',
    districtsTitle:   'Quartiers populaires',
    districtsIntro:   'Canggu (Berawa, Pererenan, Batu Bolong) — surf et location ; Bukit (Uluwatu, Pandawa) — vues premium ; Ubud — vie au naturel ; Sanur — format familial.',
    knowledgeBadge:   'Base de connaissances',
    knowledgeTitle:   'Leasehold, fiscalité, résidence et vie à Bali — guides pratiques',
    knowledgeCta:     'Ouvrir la base de connaissances',
    seoH2:            'Immobilier à Bali — ce qu\'il faut savoir',
    seoP1:            'Bali est l\'un des marchés immobiliers les plus dynamiques d\'Asie du Sud-Est. De nouvelles résidences sortent de terre chaque mois, les promoteurs actifs gèrent plusieurs chantiers à la fois. Les rendements en location journalière via une société de gestion atteignent en moyenne 8–12 % par an en haute saison.',
    seoP2:            'La plupart des transactions se concluent en leasehold (25–80 ans renouvelables), parfois via une société indonésienne PT PMA. Documents de construction : PBG (permis de construire) et SLF (certificat de conformité). Sans SLF, une unité ne peut pas être louée légalement — une vérification clé avant d\'acheter un bien livré.',
    faqTitle:         'Questions fréquentes',
    faq: [
      { q: 'Comment commencer à choisir un bien à Bali ?', a: 'Choisissez d\'abord le format : villas et maisons de ville à Canggu, Sanur ou Ubud pour y vivre ; appartements dans des résidences en construction avec société de gestion pour un revenu locatif ; unités Bukit avec vue premium pour la revente.' },
      { q: 'Un étranger peut-il acheter un bien à Bali ?', a: 'Oui — via un leasehold (bail foncier longue durée, généralement 25–80 ans) ou via une société indonésienne PT PMA. La transaction se conclut chez un notaire PPAT.' },
      { q: 'Quel rendement locatif puis-je espérer ?', a: 'Canggu et Bukit affichent un rendement annuel de 8–12 % à un taux d\'occupation de 70–80 % via une société de gestion. Cela dépend du quartier, du type de bien et de la saisonnalité.' },
      { q: 'Que sont le PBG et le SLF ?', a: 'Le PBG est le permis de construire — sans lui, la construction est illégale. Le SLF est le certificat de conformité — sans lui, l\'unité ne peut pas être louée officiellement.' },
    ],
    until:            (d: string) => `Jusqu'au ${d}`,
    unitsSuffix:      'unités',
    orgDescription:   'Catalogue immobilier de Bali : villas, appartements, résidences et promoteurs vérifiés.',
  },
  de: {
    locale: 'de-DE',
    h2: 'Immobilien auf Bali — ohne Zwischenhändler, ohne Geschwätz',
    intro: (totalUnits: number, complexes: number, developers: number) =>
      `${totalUnits} Angebote und ${complexes} Wohnanlagen von ${developers} Bauträgern. Transparente Daten zu Genehmigungen und Hausverwaltungen, aktuelle Aktionen, News und Events.`,
    sectionVillas:     { title: 'Villen & Häuser',      tagline: 'Freistehende Häuser mit Grundstück, Pool und Privatgelände', countLabel: 'Angebote' },
    sectionApartments: { title: 'Apartments',           tagline: 'Einheiten in modernen Anlagen mit Hausverwaltung',         countLabel: 'Angebote' },
    sectionComplexes:  { title: 'Wohnanlagen',           tagline: 'Geschlossene Anlagen mit Infrastruktur und Service',       countLabel: 'Anlagen' },
    sectionDevelopers: { title: 'Bauträger',             tagline: 'Bewertungen, fertiggestellte Projekte, Rechtssicherheit',  countLabel: 'Unternehmen' },
    topVillasTitle:   'Villen mit dem besten Investitionspotenzial',
    topVillasLink:    'Alle Villen',
    activePromoTitle: 'Aktionen der Bauträger',
    activePromoLink:  'Alle Aktionen',
    eventsTitle:      'Kommende Events',
    eventsLink:       'Alle Events',
    complexesTitle:   'Wohnanlagen',
    complexesLink:    'Alle Anlagen',
    newsTitle:        'Aktuelle News',
    newsLink:         'Alle News',
    districtsTitle:   'Beliebte Regionen',
    districtsIntro:   'Canggu (Berawa, Pererenan, Batu Bolong) — Surfen und Vermietung; Bukit (Uluwatu, Pandawa) — erstklassige Ausblicke; Ubud — Leben in der Natur; Sanur — Familienformat.',
    knowledgeBadge:   'Wissensdatenbank',
    knowledgeTitle:   'Leasehold, Steuern, Aufenthalt und Leben auf Bali — Praxis-Guides',
    knowledgeCta:     'Wissensdatenbank öffnen',
    seoH2:            'Immobilien auf Bali — was man wissen sollte',
    seoP1:            'Bali ist einer der dynamischsten Immobilienmärkte Südostasiens. Jeden Monat entstehen neue Wohnanlagen, aktive Bauträger betreiben mehrere Baustellen gleichzeitig. Renditen aus Tagesvermietung über eine Hausverwaltung liegen in der Hochsaison im Schnitt bei 8–12 % pro Jahr.',
    seoP2:            'Die meisten Deals werden als Leasehold abgeschlossen (25–80 Jahre mit Verlängerung), gelegentlich über eine indonesische Rechtsperson PT PMA. Baupapiere: PBG (Baugenehmigung) und SLF (Eignungszertifikat). Ohne SLF darf eine Einheit nicht legal vermietet werden — eine wichtige Prüfung vor dem Kauf eines fertiggestellten Objekts.',
    faqTitle:         'Häufig gestellte Fragen',
    faq: [
      { q: 'Wie beginne ich die Auswahl einer Bali-Immobilie?', a: 'Zuerst das Format: Villen und Stadthäuser in Canggu, Sanur oder Ubud zum Wohnen; Apartments in im Bau befindlichen Anlagen mit Hausverwaltung für Mieteinnahmen; Bukit-Einheiten mit Premium-Blick zum Wiederverkauf.' },
      { q: 'Kann ein Ausländer auf Bali Immobilien kaufen?', a: 'Ja — über Leasehold (langfristige Landpacht, üblicherweise 25–80 Jahre) oder über eine indonesische PT PMA. Der Deal wird bei einem PPAT-Notar abgeschlossen.' },
      { q: 'Welche Mietrendite kann ich erwarten?', a: 'In Canggu und Bukit 8–12 % Jahresrendite bei 70–80 % Auslastung über eine Hausverwaltung. Abhängig von Region, Objekttyp und Saison.' },
      { q: 'Was sind PBG und SLF?', a: 'PBG ist die Baugenehmigung — ohne sie ist der Bau illegal. SLF ist das Eignungszertifikat — ohne es kann die Einheit nicht offiziell vermietet werden.' },
    ],
    until:            (d: string) => `Bis ${d}`,
    unitsSuffix:      'Einheiten',
    orgDescription:   'Bali-Immobilienkatalog: Villen, Apartments, Wohnanlagen und geprüfte Bauträger.',
  },
  zh: {
    locale: 'zh-CN',
    h2: '巴厘岛房产——没有中间商，没有空话',
    intro: (totalUnits: number, complexes: number, developers: number) =>
      `${totalUnits} 套房源、${complexes} 个住宅区，来自 ${developers} 家开发商。关于许可与物业管理公司的透明数据，以及最新优惠、新闻和活动。`,
    sectionVillas:     { title: '别墅与住宅',   tagline: '带土地、泳池和私人庭院的独栋住宅',     countLabel: '套房源' },
    sectionApartments: { title: '公寓',         tagline: '现代住宅区中配物业管理公司的单元',     countLabel: '套房源' },
    sectionComplexes:  { title: '住宅区',       tagline: '配备基础设施与服务的封闭式社区',       countLabel: '个住宅区' },
    sectionDevelopers: { title: '开发商',       tagline: '评级、已交付项目、法律信誉记录',       countLabel: '家公司' },
    topVillasTitle:   '最具投资潜力的别墅',
    topVillasLink:    '全部别墅',
    activePromoTitle: '开发商优惠',
    activePromoLink:  '全部优惠',
    eventsTitle:      '近期活动',
    eventsLink:       '全部活动',
    complexesTitle:   '住宅区',
    complexesLink:    '全部住宅区',
    newsTitle:        '最新新闻',
    newsLink:         '全部新闻',
    districtsTitle:   '热门区域',
    districtsIntro:   'Canggu（Berawa、Pererenan、Batu Bolong）——冲浪与出租；Bukit（Uluwatu、Pandawa）——顶级海景；Ubud——亲近自然的生活；Sanur——适合家庭。',
    knowledgeBadge:   '知识库',
    knowledgeTitle:   '租赁产权、税费、居留与巴厘岛生活——实用指南',
    knowledgeCta:     '打开知识库',
    seoH2:            '巴厘岛房产——需要了解什么',
    seoP1:            '巴厘岛是东南亚最具活力的房地产市场之一。每月都有新的住宅区破土动工，活跃的开发商同时运作多个项目。旺季通过物业管理公司进行日租，平均年收益率为8–12%。',
    seoP2:            '大多数交易以租赁产权方式完成（25–80年，可续期），少数通过印尼法人实体PT PMA。施工文件：PBG（施工许可）和SLF（适用证书）。没有SLF，单元无法合法出租——这是购买已交付房产前的重要核查。',
    faqTitle:         '常见问题',
    faq: [
      { q: '如何开始挑选巴厘岛房产？', a: '先确定用途：Canggu、Sanur或Ubud的别墅和联排住宅用于居住；配物业管理公司的在建住宅区公寓用于租金收入；Bukit的顶级海景单元用于转售。' },
      { q: '外国人能在巴厘岛买房吗？', a: '可以——通过租赁产权（长期土地租约，通常25–80年）或通过印尼PT PMA公司。交易在PPAT公证人处完成。' },
      { q: '能有多少租金收益？', a: 'Canggu和Bukit通过物业管理公司在70–80%入住率下可达8–12%的年收益。取决于区域、房产类型和季节性。' },
      { q: 'PBG和SLF是什么？', a: 'PBG是施工许可——没有它施工即为非法。SLF是适用证书——没有它单元无法正式出租。' },
    ],
    until:            (d: string) => `截至 ${d}`,
    unitsSuffix:      '套',
    orgDescription:   '巴厘岛房产目录：别墅、公寓、住宅区及经核实的开发商。',
  },
  nl: {
    locale: 'nl-NL',
    h2: 'Vastgoed op Bali — zonder tussenpersonen, zonder gebakken lucht',
    intro: (totalUnits: number, complexes: number, developers: number) =>
      `${totalUnits} advertenties en ${complexes} wooncomplexen van ${developers} ontwikkelaars. Transparante data over vergunningen en beheermaatschappijen, actuele acties, nieuws en evenementen.`,
    sectionVillas:     { title: "Villa's & huizen",     tagline: 'Vrijstaande huizen met grond, zwembad en privéterrein',  countLabel: 'advertenties' },
    sectionApartments: { title: 'Appartementen',        tagline: 'Units in moderne complexen met een beheermaatschappij',   countLabel: 'advertenties' },
    sectionComplexes:  { title: 'Wooncomplexen',        tagline: 'Afgesloten complexen met infrastructuur en service',      countLabel: 'complexen' },
    sectionDevelopers: { title: 'Ontwikkelaars',        tagline: 'Beoordelingen, opgeleverde projecten, juridische staat',  countLabel: 'bedrijven' },
    topVillasTitle:   'Villa\'s met het beste investeringspotentieel',
    topVillasLink:    "Alle villa's",
    activePromoTitle: 'Acties van ontwikkelaars',
    activePromoLink:  'Alle acties',
    eventsTitle:      'Aankomende evenementen',
    eventsLink:       'Alle evenementen',
    complexesTitle:   'Wooncomplexen',
    complexesLink:    'Alle complexen',
    newsTitle:        'Laatste nieuws',
    newsLink:         'Alle nieuws',
    districtsTitle:   'Populaire regio\'s',
    districtsIntro:   'Canggu (Berawa, Pererenan, Batu Bolong) — surfen en verhuur; Bukit (Uluwatu, Pandawa) — premium uitzichten; Ubud — wonen in de natuur; Sanur — gezinsformaat.',
    knowledgeBadge:   'Kennisbank',
    knowledgeTitle:   'Leasehold, belastingen, verblijf en leven op Bali — praktische gidsen',
    knowledgeCta:     'Kennisbank openen',
    seoH2:            'Vastgoed op Bali — wat je moet weten',
    seoP1:            'Bali is een van de meest dynamische vastgoedmarkten in Zuidoost-Azië. Elke maand starten nieuwe wooncomplexen, actieve ontwikkelaars draaien meerdere locaties tegelijk. Rendementen uit dagverhuur via een beheermaatschappij liggen in het hoogseizoen gemiddeld op 8–12% per jaar.',
    seoP2:            'De meeste deals worden als leasehold gesloten (25–80 jaar met verlenging), soms via een Indonesische rechtspersoon PT PMA. Bouwpapieren: PBG (bouwvergunning) en SLF (geschiktheidscertificaat). Zonder SLF mag een unit niet legaal worden verhuurd — een belangrijke controle voordat je een opgeleverd object koopt.',
    faqTitle:         'Veelgestelde vragen',
    faq: [
      { q: 'Hoe begin ik met het kiezen van Bali-vastgoed?', a: "Kies eerst het format: villa's en herenhuizen in Canggu, Sanur of Ubud om te wonen; appartementen in wooncomplexen in aanbouw met een beheermaatschappij voor huurinkomen; Bukit-units met premium uitzicht voor doorverkoop." },
      { q: 'Kan een buitenlander vastgoed kopen op Bali?', a: 'Ja — via leasehold (langlopende grondpacht, meestal 25–80 jaar) of via een Indonesisch PT PMA-bedrijf. De deal wordt gesloten bij een PPAT-notaris.' },
      { q: 'Welk huurrendement kan ik verwachten?', a: 'Canggu en Bukit halen 8–12% jaarrendement bij 70–80% bezetting via een beheermaatschappij. Afhankelijk van regio, objecttype en seizoen.' },
      { q: 'Wat zijn PBG en SLF?', a: 'PBG is de bouwvergunning — zonder deze is de bouw illegaal. SLF is het geschiktheidscertificaat — zonder deze mag de unit niet officieel worden verhuurd.' },
    ],
    until:            (d: string) => `Tot ${d}`,
    unitsSuffix:      'units',
    orgDescription:   "Bali-vastgoedcatalogus: villa's, appartementen, wooncomplexen en geverifieerde ontwikkelaars.",
  },
  ban: {
    locale: 'id-ID',
    h2: 'Properti Bali — tanpa perantara, tanpa omong kosong',
    intro: (totalUnits: number, complexes: number, developers: number) =>
      `${totalUnits} listing lan ${complexes} kompleks hunian saking ${developers} pangwangun. Data terang indik izin lan perusahaan pangelola, promo anyar, gatra, lan acara.`,
    sectionVillas:     { title: 'Vila & umah',      tagline: 'Umah mandiri sareng tanah, kolam, lan pakarangan pribadi',  countLabel: 'listing' },
    sectionApartments: { title: 'Apartemen',        tagline: 'Unit ring kompleks modern sareng perusahaan pangelola',    countLabel: 'listing' },
    sectionComplexes:  { title: 'Kompleks hunian',  tagline: 'Kompleks katutup sareng infrastruktur lan layanan',        countLabel: 'kompleks' },
    sectionDevelopers: { title: 'Pangwangun',       tagline: 'Peringkat, proyek sane sampun puput, rekam jejak legal',   countLabel: 'perusahaan' },
    topVillasTitle:   'Vila sareng potensi investasi pinih becik',
    topVillasLink:    'Sami vila',
    activePromoTitle: 'Promo saking pangwangun',
    activePromoLink:  'Sami promo',
    eventsTitle:      'Acara sane jagi rauh',
    eventsLink:       'Sami acara',
    complexesTitle:   'Kompleks hunian',
    complexesLink:    'Sami kompleks',
    newsTitle:        'Gatra anyar',
    newsLink:         'Sami gatra',
    districtsTitle:   'Wewidangan kaloktah',
    districtsIntro:   'Canggu (Berawa, Pererenan, Batu Bolong) — selancar lan sewa; Bukit (Uluwatu, Pandawa) — pemandangan premium; Ubud — urip ring alam; Sanur — format kulawarga.',
    knowledgeBadge:   'Basis kawruhan',
    knowledgeTitle:   'Leasehold, pajak, izin magenah, lan urip ring Bali — panduan praktis',
    knowledgeCta:     'Ngampakang basis kawruhan',
    seoH2:            'Properti Bali — sane patut kauningin',
    seoP1:            'Bali silih tunggil pasar properti sane pinih dinamis ring Asia Tenggara. Nyabran bulan wenten kompleks hunian anyar kawangun, pangwangun aktif ngarap makudang-kudang genah sinarengan. Hasil sewa harian lewat perusahaan pangelola rata-rata 8–12% nyabran warsa ring musim ramé.',
    seoP2:            'Akéhan transaksi kaputus dados leasehold (25–80 warsa sareng perpanjangan), sané-sané lewat badan hukum Indonesia PT PMA. Dokumen konstruksi: PBG (izin wangun) lan SLF (sertifikat laik fungsi). Tanpa SLF unit nénten dados kasewaang sacara legal — pamariksan penting sadurung numbas properti sane sampun puput.',
    faqTitle:         'Patakon sane sering katakenang',
    faq: [
      { q: 'Sapunapi ngawitin milih properti Bali?', a: 'Tentuang format dumun: vila lan umah kota ring Canggu, Sanur, utawi Ubud anggen magenah; apartemen ring kompleks sane kantun kawangun sareng perusahaan pangelola anggen pikolih sewa; unit Bukit sareng pemandangan premium anggen kaadol malih.' },
      { q: 'Dados anak jaba numbas properti ring Bali?', a: 'Dados — lewat leasehold (sewa tanah jangka panjang, biasane 25–80 warsa) utawi lewat perusahaan Indonesia PT PMA. Transaksi kaputus ring ajeng notaris PPAT.' },
      { q: 'Sapunapi hasil sewa sane dados kaajap?', a: 'Canggu lan Bukit ngicen hasil warsan 8–12% ring okupansi 70–80% lewat perusahaan pangelola. Gumantung ring wewidangan, tipe properti, lan musim.' },
      { q: 'Napi PBG lan SLF punika?', a: 'PBG inggih punika izin wangun — tanpa punika konstruksi ilegal. SLF inggih punika sertifikat laik fungsi — tanpa punika unit nénten dados kasewaang sacara resmi.' },
    ],
    until:            (d: string) => `Kantos ${d}`,
    unitsSuffix:      'unit',
    orgDescription:   'Katalog properti Bali: vila, apartemen, kompleks hunian, lan pangwangun sane sampun kacek.',
  },
} as const

async function loadCounts() {
  const [v, a, c, d] = await Promise.all([
    sb.from('raw_villas').select('*', { count: 'exact', head: true }).eq('data->>Опубликовать', 'true' as unknown as string),
    sb.from('raw_apartments').select('*', { count: 'exact', head: true }).eq('data->>Опубликовать', 'true' as unknown as string),
    sb.from('raw_complexes').select('*', { count: 'exact', head: true }),
    sb.from('raw_developers').select('*', { count: 'exact', head: true }).eq('data->>Публикация', 'true' as unknown as string),
  ])
  return { villas: v.count ?? 0, apartments: a.count ?? 0, complexes: c.count ?? 0, developers: d.count ?? 0 }
}

async function loadFirstThumb(manifestUrl: string): Promise<string | null> {
  try {
    const r = await fetch(manifestUrl, { next: { revalidate: 600 } })
    if (!r.ok) return null
    const j = (await r.json()) as Record<string, string[]>
    const firstKey = Object.keys(j).find(k => Array.isArray(j[k]) && j[k].length > 0)
    return firstKey ? j[firstKey][0] : null
  } catch { return null }
}

async function loadTopVillas(): Promise<VillaCardData[]> {
  try {
    const [{ enriched, manifest }, scores] = await Promise.all([
      loadAllVillas(),
      loadAllVillaScores().catch(() => undefined),
    ])
    const emptyFilters: VillaFilterState = {
      q: '', priceMin: null, priceMax: null,
      district: [], bedrooms: [], status: [], permit: [], year: [], developer: [], style: [], features: [], goal: null, dealType: [],
    }
    const cards = buildAllVillaCards(enriched, manifest, emptyFilters, scores, 'investment-desc')
    return cards.slice(0, 6)
  } catch { return [] }
}

type ComplexHomeCard = {
  slug: string
  title: string
  district: string | null
  cover: string | null
  units: number | null
  status: string | null
  yearOfCompletion: string | null
}

const loadTopComplexes = unstable_cache(async (): Promise<ComplexHomeCard[]> => {
  try {
    // Slim projection — was select('airtable_id, data, slug, cover_url') (~8MB
    // of full JSONB for 500 rows). `->` returns raw JSON values, so the
    // reconstructed `data` below is byte-identical to the old full read.
    const { data } = await sb.from('raw_complexes').select(`
      airtable_id, slug, cover_url,
      project:data->Project,
      status:data->"Статус",
      district:data->"Location 2",
      district_alt:data->Location,
      units:data->"Total quantity of units",
      year:data->"Year of completion ",
      year_alt:data->"Year of completion"
    `).limit(500)
    // Real photos live in the complex-photos manifest. cover_url and the
    // complex-covers/<id>.jpg bucket both 404, so they are last-resort only.
    let manifest: Record<string, string[]> = {}
    try {
      const mr = await fetch(cdnManifestUrl(`${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`, 600), { next: { revalidate: 600 } })
      if (mr.ok) manifest = await mr.json()
    } catch { /* fall back below */ }
    const items: ComplexHomeCard[] = []
    const COVER_BUCKET = cdnBucketBase('complex-covers')
    type ProjRow = { airtable_id: string; slug: string | null; cover_url: string | null; project: unknown; status: unknown; district: unknown; district_alt: unknown; units: unknown; year: unknown; year_alt: unknown }
    for (const raw of (data ?? []) as ProjRow[]) {
      const r = { airtable_id: raw.airtable_id, slug: raw.slug, cover_url: raw.cover_url, data: {
        'Project': raw.project, 'Статус': raw.status, 'Location 2': raw.district, 'Location': raw.district_alt,
        'Total quantity of units': raw.units, 'Year of completion ': raw.year, 'Year of completion': raw.year_alt,
      } as Record<string, unknown> }
      const slug = r.slug
      const name = typeof r.data['Project'] === 'string' ? (r.data['Project'] as string) : null
      if (!slug || !name) continue
      const status = (typeof r.data['Статус'] === 'string' ? r.data['Статус'] as string : null) ?? null
      const district = (typeof r.data['Location 2'] === 'string' ? r.data['Location 2'] as string : null) ?? (typeof r.data['Location'] === 'string' ? r.data['Location'] as string : null)
      const units = typeof r.data['Total quantity of units'] === 'number' ? (r.data['Total quantity of units'] as number) : null
      const yearOfCompletion = (typeof r.data['Year of completion '] === 'string' ? r.data['Year of completion '] as string : null) ?? (typeof r.data['Year of completion'] === 'string' ? r.data['Year of completion'] as string : null)
      items.push({
        slug, title: name, district, status, units, yearOfCompletion,
        cover: manifest[r.airtable_id]?.[0] ?? r.cover_url ?? `${COVER_BUCKET}/${r.airtable_id}.jpg`,
      })
    }
    items.sort((a, b) => {
      const aBuilt = (a.status ?? '').toLowerCase().includes('строит')
      const bBuilt = (b.status ?? '').toLowerCase().includes('строит')
      if (aBuilt !== bBuilt) return aBuilt ? -1 : 1
      return (b.units ?? 0) - (a.units ?? 0)
    })
    return items.slice(0, 4)
  } catch { return [] }
}, ['home-page-top-complexes-v1'], { revalidate: 3600 })

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

function fmtDate(iso: string | null, locale: string): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) } catch { return iso }
}
function fmtDateTime(iso: string | null, locale: string): string | null {
  if (!iso) return null
  try { return new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}
function isPast(iso: string | null): boolean {
  if (!iso) return false
  try { return new Date(iso).getTime() < Date.now() } catch { return false }
}

export async function HomePageContent({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const r = pickCopy(ROUTES, lang)

  const [counts, villaThumb, apartmentThumb, complexThumb, topVillas, topComplexes, allNews, allPromo, allEvents, ytVideos] = await Promise.all([
    loadCounts(),
    loadFirstThumb(`${SUPABASE_URL}/storage/v1/object/public/villa-photos/_manifest.json`),
    loadFirstThumb(`${SUPABASE_URL}/storage/v1/object/public/apartment-photos/_manifest.json`),
    loadFirstThumb(`${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`),
    loadTopVillas(),
    loadTopComplexes(),
    loadAllNews().catch(() => []),
    loadAllPromo().catch(() => []),
    loadAllEvents().catch(() => []),
    loadLatestYouTubeVideos(6).catch(() => []),
  ])

  const latestNews = allNews.slice(0, 3)
  const activePromo = allPromo.filter(p => !isPast(p.expiresAt)).slice(0, 3)
  const upcomingEvents = allEvents.filter(e => !isPast(e.startsAt)).slice(0, 3)

  const sections = [
    { key: 'villas',     href: r.villas,     ...c.sectionVillas,     count: counts.villas,     cover: villaThumb,     Icon: HomeIcon },
    { key: 'apartments', href: r.apartments, ...c.sectionApartments, count: counts.apartments, cover: apartmentThumb, Icon: Building },
    { key: 'complexes',  href: r.complexes,  ...c.sectionComplexes,  count: counts.complexes,  cover: complexThumb,   Icon: Building2 },
    { key: 'developers', href: r.developers, ...c.sectionDevelopers, count: counts.developers, cover: null,           Icon: HardHat },
  ]

  // Popular districts: same Bali names in both languages, but the
  // route prefix differs (/ru/apartamenty vs /en/apartments) so we
  // resolve from r.apartments. Slug map is shared.
  const districts = POPULAR_DISTRICTS.map(d => ({ name: d, slug: DISTRICT_TO_SLUG[d] })).filter(x => x.slug)

  // Organization JSON-LD: stable identity for Google's Knowledge Panel.
  // Per-locale URL because each locale page is its own canonical.
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Balinsky',
    url: `${SITE_BASE}${r.home}`,
    logo: `${SITE_BASE}/logo.svg`,
    description: c.orgDescription,
    sameAs: ['https://www.youtube.com/@balinsky_info', 'https://t.me/BalinskyBot'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['ru', 'en'],
      url: 'https://t.me/BalinskyBot',
    },
  }
  // WebSite + SearchAction enables a Google sitelinks-searchbox in the
  // SERP when the site is recognised — the search target points at our
  // /search route, which surfaces the AI-broker «Балина» as the answer
  // engine for that query.
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Balinsky',
    url: `${SITE_BASE}${r.home}`,
    inLanguage: lang === 'ru' ? 'ru' : 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_BASE}${r.home}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.map(item => ({
      '@type': 'Question', name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <>
      <Header />

      <PageContainer>
        <BalinaHero />

        <section className="pb-6">
          <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[#111827] leading-snug max-w-3xl">
            {c.h2}
          </h2>
          <p className="mt-3 text-[15px] md:text-[16px] text-[var(--color-text-muted)] leading-relaxed max-w-2xl">
            {c.intro(counts.villas + counts.apartments, counts.complexes, counts.developers)}
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {sections.map(({ key, href, title, tagline, count, countLabel, cover, Icon }, idx) => (
            <Link key={key} href={href} className="group block bg-white rounded-3xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors">
              <div className="relative h-[220px] md:h-[260px] bg-[var(--color-search-bg)] overflow-hidden">
                {cover ? (
                  <Image
                    src={cover}
                    alt={title}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    priority={idx < 2}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--color-primary-soft)]">
                    <Icon size={56} strokeWidth={1.5} className="text-[var(--color-primary-pressed)]" />
                  </div>
                )}
                <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 text-[13px] font-medium text-[var(--color-text)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
                  <Icon size={15} strokeWidth={2} />
                  {title}
                </div>
              </div>
              <div className="p-6 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[22px] md:text-[24px] font-semibold text-[#111827] mb-1.5">{title}</div>
                  <div className="text-[14px] text-[var(--color-text-muted)] leading-snug max-w-md">{tagline}</div>
                  <div className="mt-3 text-[13px] text-[var(--color-primary-pressed)] font-medium">{count} {countLabel}</div>
                </div>
                <ArrowRight size={22} strokeWidth={2} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </section>

        {topVillas.length > 0 && (
          <section className="mb-16">
            <SectionHeader title={c.topVillasTitle} href={r.villas} linkText={c.topVillasLink} Icon={Sparkles} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topVillas.map(v => <VillaCard key={v.slug} a={v} lang={lang} />)}
            </div>
          </section>
        )}

        <YouTubeBlock videos={ytVideos} />

        {activePromo.length > 0 && (
          <section className="mb-16">
            <SectionHeader title={c.activePromoTitle} href={r.promo} linkText={c.activePromoLink} Icon={Sparkles} />
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activePromo.map(p => (
                <li key={p.id}>
                  <Link href={`${r.promo}/${p.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                    <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)] overflow-hidden">
                      {p.photo ? (
                        <Image src={p.photo} alt={p.title} fill sizes="(min-width: 768px) 33vw, 100vw" loading="lazy" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🎁</div>
                      )}
                    </div>
                    <div className="p-4">
                      {p.developers[0]?.name && (
                        <div className="text-[11px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium mb-1">{p.developers[0].name}</div>
                      )}
                      <div className="text-[15px] font-semibold leading-snug line-clamp-2 mb-1.5">{p.title}</div>
                      {p.expiresAt && (
                        <div className="text-[12px] text-[var(--color-text-muted)]">{c.until(fmtDate(p.expiresAt, c.locale) ?? '')}</div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {upcomingEvents.length > 0 && (
          <section className="mb-16">
            <SectionHeader title={c.eventsTitle} href={r.events} linkText={c.eventsLink} Icon={Calendar} />
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {upcomingEvents.map(e => (
                <li key={e.id}>
                  <Link href={`${r.events}/${e.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                    <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)] overflow-hidden">
                      {e.photo ? (
                        <Image src={e.photo} alt={e.title} fill sizes="(min-width: 768px) 33vw, 100vw" loading="lazy" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🎟️</div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        {e.developers[0]?.name && (
                          <span className="text-[11px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium">{e.developers[0].name}</span>
                        )}
                        {e.format && (
                          <span className="text-[10px] uppercase tracking-wide bg-[#E5E7EB] text-[#374151] px-1.5 py-0.5 rounded">{e.format}</span>
                        )}
                      </div>
                      <div className="text-[15px] font-semibold leading-snug line-clamp-2 mb-1.5">{e.title}</div>
                      {e.startsAt && (
                        <div className="text-[12px] text-[var(--color-text-muted)]">{fmtDateTime(e.startsAt, c.locale)}</div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {topComplexes.length > 0 && (
          <section className="mb-16">
            <SectionHeader title={c.complexesTitle} href={r.complexes} linkText={c.complexesLink} Icon={Building2} />
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {topComplexes.map(item => (
                <li key={item.slug}>
                  <Link href={`${r.complexes}/o/${item.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                    <div className="relative w-full aspect-[4/3] bg-[var(--color-search-bg)] overflow-hidden">
                      {item.cover ? (
                        <Image src={item.cover} alt={item.title} fill sizes="(min-width: 768px) 33vw, 100vw" loading="lazy" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🏗️</div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="text-[15px] font-semibold leading-snug line-clamp-2 mb-1">{item.title}</div>
                      <div className="text-[12px] text-[var(--color-text-muted)]">
                        {item.district && <span>{item.district}</span>}
                        {item.units != null && <span> · {item.units} {c.unitsSuffix}</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {latestNews.length > 0 && (
          <section className="mb-16">
            <SectionHeader title={c.newsTitle} href={r.news} linkText={c.newsLink} Icon={Newspaper} />
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {latestNews.map(n => (
                <li key={n.id}>
                  <Link href={`${r.news}/${n.slug}`} className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline text-[#111827] hover:border-[var(--color-primary)] transition-colors">
                    <div className="relative w-full aspect-[16/9] bg-[var(--color-search-bg)] overflow-hidden">
                      {n.photo ? (
                        <Image src={n.photo} alt={n.title} fill sizes="(min-width: 768px) 33vw, 100vw" loading="lazy" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">📰</div>
                      )}
                    </div>
                    <div className="p-4">
                      {n.developers[0]?.name && (
                        <div className="text-[11px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium mb-1">{n.developers[0].name}</div>
                      )}
                      <div className="text-[15px] font-semibold leading-snug line-clamp-3 mb-1.5">{n.title}</div>
                      {n.date && (
                        <div className="text-[12px] text-[var(--color-text-muted)]">{fmtDate(n.date, c.locale)}</div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mb-16">
          <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-3">
            {c.districtsTitle}
          </h2>
          <p className="text-[14px] text-[var(--color-text-muted)] mb-5 max-w-3xl">
            {c.districtsIntro}
          </p>
          <ul className="flex flex-wrap gap-2">
            {districts.map(d => (
              <li key={d.slug}>
                <Link
                  href={lang === 'ru' ? `${r.apartments}/${d.slug}` : `${r.apartments}?district=${encodeURIComponent(d.name)}`}
                  className="inline-block px-4 py-2 rounded-full bg-white border border-[var(--color-border)] text-[14px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-16 rounded-3xl border border-[var(--color-border)] bg-[var(--color-primary-soft)] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[13px] uppercase tracking-wide text-[var(--color-primary-pressed)] font-medium mb-1">
              <BookOpen size={14} /> {c.knowledgeBadge}
            </div>
            <h3 className="text-[20px] md:text-[24px] font-semibold text-[#111827] leading-snug max-w-xl">
              {c.knowledgeTitle}
            </h3>
          </div>
          <Link href={r.knowledge} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-[14px] font-medium no-underline hover:bg-[var(--color-primary-hover)] shrink-0">
            {c.knowledgeCta} <ArrowRight size={16} />
          </Link>
        </section>

        <section className="border-t border-[var(--color-border)] pt-10 mb-12">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-4">
            {c.seoH2}
          </h2>
          <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-[var(--color-text)]">
            <p>{c.seoP1}</p>
            <p className="text-[var(--color-text-muted)]">{c.seoP2}</p>
          </div>

          <HomeSeoBlocks lang={lang} />

          <h3 className="text-[18px] font-semibold text-[#111827] mt-10 mb-4">{c.faqTitle}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10 border-t border-b border-[var(--color-border)]">
            {c.faq.map((item, i) => (
              <details
                key={i}
                className="group py-4 border-[var(--color-border)] border-b lg:border-b-0 lg:[&:not(:nth-last-child(-n+2))]:border-b last:border-b-0"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-[15px] font-medium text-[#111827]">
                  {item.q}
                  <span className="text-[var(--color-text-muted)] text-[20px] leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}

function SectionHeader({ title, href, linkText, Icon }: { title: string; href: string; linkText: string; Icon: typeof Sparkles }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] inline-flex items-center gap-2">
        <Icon size={22} className="text-[var(--color-primary)]" />
        {title}
      </h2>
      <Link href={href} className="inline-flex items-center gap-1 text-[13px] text-[var(--color-primary-pressed)] hover:text-[var(--color-primary)] no-underline shrink-0">
        {linkText} <ArrowRight size={14} />
      </Link>
    </div>
  )
}
