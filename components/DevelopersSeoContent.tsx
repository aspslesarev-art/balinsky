import Link from 'next/link'
import {
  DISTRICT_TO_SLUG,
  BEDROOM_TO_SLUG,
  STATUS_TO_SLUG,
} from '@/lib/seo-routes'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

const POPULAR_DISTRICTS = [
  'Berawa',
  'Sanur',
  'Ubud',
  'Uluwatu',
  'Pererenan',
  'Pandawa',
  'Batu Bolong',
  'Cemagi',
]

type FaqItem = { q: string; a: string }
const FAQ_ITEMS: Record<Lang, FaqItem[]> = {
  ru: [
    { q: 'Какие застройщики работают на Бали?',
      a: 'На острове активно более 80 застройщиков. Среди заметных — Alex Villas, Magnum Estate, BREIG, Bali Capital Group, Anta Group, Taryan Group, Oceaniq, Sunny Development. Большинство специализируется на 1–2 районах Бали.' },
    { q: 'Как проверить надёжность застройщика?',
      a: 'Стандартные сигналы: количество сданных проектов, наличие управляющей компании, действующее разрешение PBG/SLF на текущей стройке, прозрачная схема владения (лизхолд / freehold), отзывы прошлых покупателей. На карточке каждого застройщика мы агрегируем эти параметры.' },
    { q: 'Где больше новых проектов?',
      a: 'Самые активные локации по числу строящихся комплексов сейчас — Чангу (Berawa, Batu Bolong, Pererenan), Букит (Uluwatu, Pandawa, Melasti) и Убуд. На востоке набирает Санур, на севере полуострова — Cemagi и Seseh.' },
    { q: 'Можно ли купить объект напрямую у застройщика?',
      a: 'Да. Большинство застройщиков на Бали продают свои объекты напрямую без посредников. Сделка оформляется у нотариуса PPAT, оплата идёт по графику, привязанному к этапам строительства.' },
    { q: 'Какая комиссия агента?',
      a: 'Если выходить через агента, ставка обычно 3–5% от стоимости объекта. Многие застройщики дают эту скидку покупателю, если тот приходит напрямую.' },
  ],
  en: [
    { q: 'Which developers are active in Bali?',
      a: 'There are 80+ active developers on the island. Notable names: Alex Villas, Magnum Estate, BREIG, Bali Capital Group, Anta Group, Taryan Group, Oceaniq, Sunny Development. Most specialise in 1–2 districts.' },
    { q: 'How do I verify a developer is reliable?',
      a: 'Standard signals: number of completed projects, presence of a real management company, an active PBG/SLF permit on the current build, transparent ownership (leasehold / freehold), and reviews from past buyers. We aggregate these on each developer card.' },
    { q: 'Where are most new projects being built?',
      a: 'The most active areas right now are Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa, Melasti) and Ubud. Sanur is growing on the east coast, and Cemagi / Seseh on the north of the peninsula.' },
    { q: 'Can I buy a property directly from the developer?',
      a: 'Yes. Most Bali developers sell directly without intermediaries. The deal is closed at a PPAT notary, payment runs on a schedule tied to construction milestones.' },
    { q: 'What is the agent commission?',
      a: 'When buying through an agent, expect 3–5% of the property price. Many developers will pass this saving to a buyer who comes directly.' },
  ],
  id: [
    { q: 'Pengembang mana saja yang aktif di Bali?',
      a: 'Ada 80+ pengembang aktif di pulau ini. Nama-nama terkemuka: Alex Villas, Magnum Estate, BREIG, Bali Capital Group, Anta Group, Taryan Group, Oceaniq, Sunny Development. Sebagian besar berfokus pada 1–2 wilayah.' },
    { q: 'Bagaimana cara memverifikasi keandalan pengembang?',
      a: 'Sinyal standar: jumlah proyek yang telah selesai, keberadaan perusahaan pengelola yang nyata, izin PBG/SLF yang aktif pada pembangunan saat ini, kepemilikan yang transparan (leasehold / freehold), dan ulasan dari pembeli sebelumnya. Kami mengagregasi semua ini pada setiap kartu pengembang.' },
    { q: 'Di mana sebagian besar proyek baru dibangun?',
      a: 'Kawasan paling aktif saat ini adalah Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa, Melasti), dan Ubud. Sanur berkembang di pesisir timur, dan Cemagi / Seseh di utara semenanjung.' },
    { q: 'Bisakah saya membeli properti langsung dari pengembang?',
      a: 'Ya. Sebagian besar pengembang Bali menjual langsung tanpa perantara. Transaksi diselesaikan di hadapan notaris PPAT, pembayaran mengikuti jadwal yang terkait dengan tahapan konstruksi.' },
    { q: 'Berapa komisi agen?',
      a: 'Saat membeli melalui agen, perkirakan 3–5% dari harga properti. Banyak pengembang akan memberikan penghematan ini kepada pembeli yang datang langsung.' },
  ],
  fr: [
    { q: 'Quels promoteurs sont actifs à Bali ?',
      a: 'Il y a plus de 80 promoteurs actifs sur l’île. Noms notables : Alex Villas, Magnum Estate, BREIG, Bali Capital Group, Anta Group, Taryan Group, Oceaniq, Sunny Development. La plupart se spécialisent dans 1 à 2 quartiers.' },
    { q: 'Comment vérifier qu’un promoteur est fiable ?',
      a: 'Signaux standards : nombre de projets livrés, présence d’une véritable société de gestion, permis PBG/SLF actif sur le chantier en cours, propriété transparente (leasehold / freehold) et avis d’anciens acheteurs. Nous agrégeons ces éléments sur chaque fiche promoteur.' },
    { q: 'Où se construisent la plupart des nouveaux projets ?',
      a: 'Les zones les plus actives en ce moment sont Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa, Melasti) et Ubud. Sanur se développe sur la côte est, et Cemagi / Seseh au nord de la péninsule.' },
    { q: 'Puis-je acheter un bien directement auprès du promoteur ?',
      a: 'Oui. La plupart des promoteurs balinais vendent directement sans intermédiaires. La transaction est conclue chez un notaire PPAT, le paiement suit un calendrier lié aux étapes de construction.' },
    { q: 'Quelle est la commission de l’agent ?',
      a: 'En achetant via un agent, comptez 3 à 5 % du prix du bien. De nombreux promoteurs répercutent cette économie sur l’acheteur qui vient en direct.' },
  ],
  de: [
    { q: 'Welche Bauträger sind auf Bali aktiv?',
      a: 'Auf der Insel sind über 80 Bauträger aktiv. Bekannte Namen: Alex Villas, Magnum Estate, BREIG, Bali Capital Group, Anta Group, Taryan Group, Oceaniq, Sunny Development. Die meisten sind auf 1–2 Lagen spezialisiert.' },
    { q: 'Wie prüfe ich die Zuverlässigkeit eines Bauträgers?',
      a: 'Übliche Signale: Anzahl fertiggestellter Projekte, Vorhandensein einer echten Verwaltungsgesellschaft, eine gültige PBG/SLF-Genehmigung für den laufenden Bau, transparente Eigentumsform (Leasehold / Freehold) und Bewertungen früherer Käufer. Diese Angaben bündeln wir auf jeder Bauträger-Karte.' },
    { q: 'Wo werden die meisten neuen Projekte gebaut?',
      a: 'Die aktivsten Gebiete sind derzeit Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa, Melasti) und Ubud. An der Ostküste wächst Sanur, im Norden der Halbinsel Cemagi / Seseh.' },
    { q: 'Kann ich eine Immobilie direkt beim Bauträger kaufen?',
      a: 'Ja. Die meisten Bauträger auf Bali verkaufen direkt ohne Vermittler. Der Kauf wird bei einem PPAT-Notar abgeschlossen, die Zahlung erfolgt nach einem an die Baufortschritte gekoppelten Zeitplan.' },
    { q: 'Wie hoch ist die Maklerprovision?',
      a: 'Beim Kauf über einen Makler sind 3–5 % des Immobilienpreises üblich. Viele Bauträger geben diese Ersparnis an Käufer weiter, die direkt kommen.' },
  ],
  zh: [
    { q: '哪些开发商在巴厘岛活跃?',
      a: '岛上有 80 多家活跃的开发商。知名的有:Alex Villas、Magnum Estate、BREIG、Bali Capital Group、Anta Group、Taryan Group、Oceaniq、Sunny Development。大多数专注于 1–2 个区域。' },
    { q: '如何核实开发商是否可靠?',
      a: '常规信号:已完工项目的数量、是否有真正的管理公司、当前工程上有效的 PBG/SLF 许可、透明的产权结构(租赁产权 / 永久产权),以及过往买家的评价。我们在每张开发商卡片上汇总这些信息。' },
    { q: '大多数新项目建在哪里?',
      a: '目前最活跃的区域是 Canggu(Berawa、Batu Bolong、Pererenan)、Bukit(Uluwatu、Pandawa、Melasti)和 Ubud。东海岸的 Sanur 正在发展,半岛北部则是 Cemagi / Seseh。' },
    { q: '我可以直接从开发商购买房产吗?',
      a: '可以。大多数巴厘岛开发商直接销售,无需中介。交易在 PPAT 公证人处完成,付款按照与施工进度挂钩的时间表进行。' },
    { q: '中介佣金是多少?',
      a: '通过中介购买时,通常为房产价格的 3–5%。许多开发商会把这笔节省让给直接前来的买家。' },
  ],
  nl: [
    { q: 'Welke ontwikkelaars zijn actief op Bali?',
      a: 'Er zijn meer dan 80 actieve ontwikkelaars op het eiland. Bekende namen: Alex Villas, Magnum Estate, BREIG, Bali Capital Group, Anta Group, Taryan Group, Oceaniq, Sunny Development. De meeste zijn gespecialiseerd in 1–2 wijken.' },
    { q: 'Hoe controleer ik of een ontwikkelaar betrouwbaar is?',
      a: 'Standaardsignalen: aantal opgeleverde projecten, aanwezigheid van een echte beheermaatschappij, een geldige PBG/SLF-vergunning voor de huidige bouw, transparant eigendom (leasehold / freehold) en beoordelingen van eerdere kopers. Wij bundelen deze op elke ontwikkelaarskaart.' },
    { q: 'Waar worden de meeste nieuwe projecten gebouwd?',
      a: 'De meest actieve gebieden zijn momenteel Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa, Melasti) en Ubud. Sanur groeit aan de oostkust en Cemagi / Seseh in het noorden van het schiereiland.' },
    { q: 'Kan ik een woning rechtstreeks bij de ontwikkelaar kopen?',
      a: 'Ja. De meeste ontwikkelaars op Bali verkopen rechtstreeks zonder tussenpersonen. De transactie wordt afgesloten bij een PPAT-notaris, de betaling verloopt volgens een schema dat gekoppeld is aan de bouwfasen.' },
    { q: 'Wat is de courtage van de makelaar?',
      a: 'Bij aankoop via een makelaar rekent u op 3–5% van de woningprijs. Veel ontwikkelaars geven deze besparing door aan een koper die rechtstreeks komt.' },
  ],
  ban: [
    { q: 'Pangwangun sane encen sane aktif ring Bali?',
      a: 'Ring pulo puniki wenten langkung saking 80 pangwangun sane aktif. Wasta sane kaloktah: Alex Villas, Magnum Estate, BREIG, Bali Capital Group, Anta Group, Taryan Group, Oceaniq, Sunny Development. Akehan mespesialisasi ring 1–2 wewidangan.' },
    { q: 'Sapunapi carane ngecek kapercayan pangwangun?',
      a: 'Tanda-tanda umum: akeh proyek sane sampun puput, wentennyane perusahaan pangelola sane nyata, izin PBG/SLF sane kantun aktif ring wewangunan mangkin, kepemilikan sane terang (leasehold / freehold), miwah ulasan saking sane numbas dumun. Puniki kaagregasi ring soang-soang kartu pangwangun.' },
    { q: 'Ring dija akehan proyek anyar kawangun?',
      a: 'Wewidangan sane pinih aktif mangkin inggih punika Canggu (Berawa, Batu Bolong, Pererenan), Bukit (Uluwatu, Pandawa, Melasti), miwah Ubud. Sanur nedeng nglimbak ring pesisi kangin, miwah Cemagi / Seseh ring kaler semenanjung.' },
    { q: 'Punapi tiang prasida numbas properti langsung saking pangwangun?',
      a: 'Inggih. Akehan pangwangun ring Bali ngadol langsung tanpa perantara. Transaksi kapuputang ring ajeng notaris PPAT, pambayaran manut jadwal sane kaiket ring tahapan wewangunan.' },
    { q: 'Sapunapi komisi agen?',
      a: 'Yening numbas nganggen agen, kira-kira 3–5% saking aji properti. Akeh pangwangun maicayang penghematan puniki ring sane numbas langsung.' },
  ],
}

const COPY = {
  ru: {
    chooseHeading: 'Как выбрать застройщика на Бали',
    chooseP1: 'Главные критерии — сданные проекты, прозрачная юридическая схема и управляющая компания после ввода. Сданные проекты показывают, что застройщик умеет довести стройку до конца и соблюдает обещанное качество. Юридическая схема (лизхолд или freehold, действующее разрешение PBG / SLF) гарантирует, что вы получите оформленную собственность. Управляющая компания — критично, если апартамент покупается под аренду: без неё доходность 8–12% годовых превращается в полноценную самозанятость владельца.',
    chooseP2: 'В каждой карточке мы агрегируем рейтинги по 4 направлениям: строительство и недвижимость, репутация и опыт, техника и производство, управляющая компания. Это помогает быстро сравнить десятки игроков и не зависеть от одного отзыва.',
    districtsHeading: 'Застройщики по районам Бали',
    districtsLead: 'Большинство новых проектов сосредоточено в районах Чангу (Berawa, Batu Bolong, Pererenan), на Буките (Uluwatu, Pandawa) и в Убуде. Здесь работают самые активные застройщики с апартаментами, виллами и инвестиционными комплексами.',
    devsIn: (n: string) => `Застройщики в ${n}`,
    newIn: (n: string) => `Новостройки в ${n}`,
    allComplexes: 'Жилые комплексы Бали',
    relatedHeading: 'По теме',
    related: [
      { href: '/ru/zhilye-kompleksy', label: 'Жилые комплексы на Бали' },
      { href: '/ru/apartamenty', label: 'Апартаменты от застройщиков' },
      { href: '/ru/villy', label: 'Виллы и дома' },
      { href: `/ru/apartamenty/${BEDROOM_TO_SLUG['1']}`, label: '1-комнатные апартаменты' },
      { href: `/ru/apartamenty/${BEDROOM_TO_SLUG['2']}`, label: '2-комнатные апартаменты' },
      { href: `/ru/apartamenty/${STATUS_TO_SLUG.building}`, label: 'Строящиеся апартаменты' },
      { href: `/ru/apartamenty/${STATUS_TO_SLUG.built}`, label: 'Готовые апартаменты' },
      { href: '/ru/apartamenty/100000-200000', label: 'Апартаменты 100–200 тыс. $' },
    ],
    faqHeading: 'Часто задаваемые вопросы',
  },
  en: {
    chooseHeading: 'How to choose a Bali developer',
    chooseP1: 'The main criteria are completed projects, a transparent legal structure, and a management company after handover. Completed projects show the developer can finish a build and meet the promised quality. The legal structure (leasehold or freehold, an active PBG / SLF permit) guarantees you receive properly registered ownership. The management company is critical if you buy an apartment to rent — without one, the 8–12% annual yield turns into a full-time self-employment job for the owner.',
    chooseP2: 'On every card we aggregate scores across four dimensions: construction & real estate, reputation & experience, equipment & production, and management company. This lets you quickly compare dozens of players without relying on a single review.',
    districtsHeading: 'Developers by Bali district',
    districtsLead: 'Most new projects are clustered in Canggu (Berawa, Batu Bolong, Pererenan), on Bukit (Uluwatu, Pandawa) and in Ubud. These districts host the most active developers with apartments, villas and investment complexes.',
    devsIn: (n: string) => `Developers in ${n}`,
    newIn: (n: string) => `New builds in ${n}`,
    allComplexes: 'Bali residential complexes',
    relatedHeading: 'Related',
    related: [
      { href: '/en/complexes', label: 'Bali residential complexes' },
      { href: '/en/apartments', label: 'Apartments from developers' },
      { href: '/en/villas', label: 'Villas and houses' },
      { href: `/en/apartments/${BEDROOM_TO_SLUG['1']}`, label: '1-bedroom apartments' },
      { href: `/en/apartments/${BEDROOM_TO_SLUG['2']}`, label: '2-bedroom apartments' },
      { href: `/en/apartments/${STATUS_TO_SLUG.building}`, label: 'Apartments under construction' },
      { href: `/en/apartments/${STATUS_TO_SLUG.built}`, label: 'Completed apartments' },
      { href: '/en/apartments/100000-200000', label: 'Apartments $100k–200k' },
    ],
    faqHeading: 'Frequently asked questions',
  },
  id: {
    chooseHeading: 'Cara memilih pengembang di Bali',
    chooseP1: 'Kriteria utamanya adalah proyek yang telah selesai, struktur hukum yang transparan, dan perusahaan pengelola setelah serah terima. Proyek yang selesai menunjukkan bahwa pengembang mampu menuntaskan pembangunan dan memenuhi kualitas yang dijanjikan. Struktur hukum (leasehold atau freehold, izin PBG / SLF yang aktif) menjamin Anda menerima kepemilikan yang terdaftar dengan benar. Perusahaan pengelola sangat penting jika Anda membeli apartemen untuk disewakan — tanpanya, imbal hasil 8–12% per tahun berubah menjadi pekerjaan penuh waktu bagi pemilik.',
    chooseP2: 'Pada setiap kartu kami mengagregasi skor di empat dimensi: konstruksi & properti, reputasi & pengalaman, peralatan & produksi, dan perusahaan pengelola. Ini memungkinkan Anda membandingkan puluhan pemain dengan cepat tanpa bergantung pada satu ulasan saja.',
    districtsHeading: 'Pengembang berdasarkan wilayah Bali',
    districtsLead: 'Sebagian besar proyek baru terkonsentrasi di Canggu (Berawa, Batu Bolong, Pererenan), di Bukit (Uluwatu, Pandawa), dan di Ubud. Wilayah-wilayah ini menampung pengembang paling aktif dengan apartemen, vila, dan kompleks investasi.',
    devsIn: (n: string) => `Pengembang di ${n}`,
    newIn: (n: string) => `Proyek baru di ${n}`,
    allComplexes: 'Kompleks hunian Bali',
    relatedHeading: 'Terkait',
    related: [
      { href: '/id/kompleks', label: 'Kompleks hunian Bali' },
      { href: '/id/apartemen', label: 'Apartemen dari pengembang' },
      { href: '/id/vila', label: 'Vila dan rumah' },
      { href: `/id/apartemen/${BEDROOM_TO_SLUG['1']}`, label: 'Apartemen 1 kamar tidur' },
      { href: `/id/apartemen/${BEDROOM_TO_SLUG['2']}`, label: 'Apartemen 2 kamar tidur' },
      { href: `/id/apartemen/${STATUS_TO_SLUG.building}`, label: 'Apartemen dalam pembangunan' },
      { href: `/id/apartemen/${STATUS_TO_SLUG.built}`, label: 'Apartemen selesai' },
      { href: '/id/apartemen/100000-200000', label: 'Apartemen $100k–200k' },
    ],
    faqHeading: 'Pertanyaan yang sering diajukan',
  },
  fr: {
    chooseHeading: 'Comment choisir un promoteur à Bali',
    chooseP1: 'Les critères principaux sont les projets livrés, une structure juridique transparente et une société de gestion après la livraison. Les projets livrés montrent que le promoteur sait mener un chantier à terme et tenir la qualité promise. La structure juridique (leasehold ou freehold, un permis PBG / SLF actif) garantit que vous recevez une propriété correctement enregistrée. La société de gestion est cruciale si vous achetez un appartement pour le louer — sans elle, le rendement annuel de 8 à 12 % se transforme en emploi à plein temps pour le propriétaire.',
    chooseP2: 'Sur chaque fiche, nous agrégeons des scores selon quatre dimensions : construction & immobilier, réputation & expérience, équipement & production, et société de gestion. Cela permet de comparer rapidement des dizaines d’acteurs sans dépendre d’un seul avis.',
    districtsHeading: 'Promoteurs par quartier de Bali',
    districtsLead: 'La plupart des nouveaux projets se concentrent à Canggu (Berawa, Batu Bolong, Pererenan), sur Bukit (Uluwatu, Pandawa) et à Ubud. Ces quartiers accueillent les promoteurs les plus actifs avec appartements, villas et résidences d’investissement.',
    devsIn: (n: string) => `Promoteurs à ${n}`,
    newIn: (n: string) => `Programmes neufs à ${n}`,
    allComplexes: 'Résidences de Bali',
    relatedHeading: 'Sur le même thème',
    related: [
      { href: '/fr/residences', label: 'Résidences de Bali' },
      { href: '/fr/appartements', label: 'Appartements de promoteurs' },
      { href: '/fr/villas', label: 'Villas et maisons' },
      { href: `/fr/appartements/${BEDROOM_TO_SLUG['1']}`, label: 'Appartements 1 chambre' },
      { href: `/fr/appartements/${BEDROOM_TO_SLUG['2']}`, label: 'Appartements 2 chambres' },
      { href: `/fr/appartements/${STATUS_TO_SLUG.building}`, label: 'Appartements en construction' },
      { href: `/fr/appartements/${STATUS_TO_SLUG.built}`, label: 'Appartements livrés' },
      { href: '/fr/appartements/100000-200000', label: 'Appartements $100k–200k' },
    ],
    faqHeading: 'Questions fréquentes',
  },
  de: {
    chooseHeading: 'So wählen Sie einen Bauträger auf Bali',
    chooseP1: 'Die wichtigsten Kriterien sind fertiggestellte Projekte, eine transparente Rechtsstruktur und eine Verwaltungsgesellschaft nach der Übergabe. Fertiggestellte Projekte zeigen, dass der Bauträger einen Bau zu Ende führen und die versprochene Qualität einhalten kann. Die Rechtsstruktur (Leasehold oder Freehold, eine gültige PBG-/SLF-Genehmigung) garantiert, dass Sie ordnungsgemäß registriertes Eigentum erhalten. Die Verwaltungsgesellschaft ist entscheidend, wenn Sie ein Apartment zur Vermietung kaufen — ohne sie wird aus der Jahresrendite von 8–12 % ein Vollzeitjob für den Eigentümer.',
    chooseP2: 'Auf jeder Karte bündeln wir Bewertungen in vier Dimensionen: Bau & Immobilien, Reputation & Erfahrung, Technik & Produktion und Verwaltungsgesellschaft. So vergleichen Sie schnell Dutzende Anbieter, ohne sich auf eine einzelne Bewertung zu verlassen.',
    districtsHeading: 'Bauträger nach Lage auf Bali',
    districtsLead: 'Die meisten neuen Projekte konzentrieren sich auf Canggu (Berawa, Batu Bolong, Pererenan), auf Bukit (Uluwatu, Pandawa) und in Ubud. In diesen Lagen sind die aktivsten Bauträger mit Apartments, Villen und Investitionsanlagen tätig.',
    devsIn: (n: string) => `Bauträger in ${n}`,
    newIn: (n: string) => `Neubauten in ${n}`,
    allComplexes: 'Wohnanlagen auf Bali',
    relatedHeading: 'Passend dazu',
    related: [
      { href: '/de/complexes', label: 'Wohnanlagen auf Bali' },
      { href: '/de/apartments', label: 'Apartments von Bauträgern' },
      { href: '/de/villas', label: 'Villen und Häuser' },
      { href: `/de/apartments/${BEDROOM_TO_SLUG['1']}`, label: 'Apartments mit 1 Schlafzimmer' },
      { href: `/de/apartments/${BEDROOM_TO_SLUG['2']}`, label: 'Apartments mit 2 Schlafzimmern' },
      { href: `/de/apartments/${STATUS_TO_SLUG.building}`, label: 'Apartments im Bau' },
      { href: `/de/apartments/${STATUS_TO_SLUG.built}`, label: 'Fertiggestellte Apartments' },
      { href: '/de/apartments/100000-200000', label: 'Apartments $100k–200k' },
    ],
    faqHeading: 'Häufig gestellte Fragen',
  },
  zh: {
    chooseHeading: '如何选择巴厘岛开发商',
    chooseP1: '主要标准是已完工的项目、透明的法律结构以及交付后的管理公司。已完工的项目表明开发商能够完成工程并达到承诺的质量。法律结构(租赁产权或永久产权、有效的 PBG / SLF 许可)保证您获得正式登记的产权。如果您购买公寓用于出租,管理公司至关重要——没有它,8–12% 的年收益就会变成业主的全职工作。',
    chooseP2: '在每张卡片上,我们从四个维度汇总评分:建设与房产、信誉与经验、设备与生产,以及管理公司。这让您能够快速比较数十家开发商,而无需依赖单一评价。',
    districtsHeading: '按巴厘岛区域划分的开发商',
    districtsLead: '大多数新项目集中在 Canggu(Berawa、Batu Bolong、Pererenan)、Bukit(Uluwatu、Pandawa)和 Ubud。这些区域聚集了最活跃的开发商,提供公寓、别墅和投资住宅区。',
    devsIn: (n: string) => `${n}的开发商`,
    newIn: (n: string) => `${n}的新建项目`,
    allComplexes: '巴厘岛住宅区',
    relatedHeading: '相关内容',
    related: [
      { href: '/zh/complexes', label: '巴厘岛住宅区' },
      { href: '/zh/apartments', label: '开发商公寓' },
      { href: '/zh/villas', label: '别墅和住宅' },
      { href: `/zh/apartments/${BEDROOM_TO_SLUG['1']}`, label: '一居室公寓' },
      { href: `/zh/apartments/${BEDROOM_TO_SLUG['2']}`, label: '两居室公寓' },
      { href: `/zh/apartments/${STATUS_TO_SLUG.building}`, label: '在建公寓' },
      { href: `/zh/apartments/${STATUS_TO_SLUG.built}`, label: '现房公寓' },
      { href: '/zh/apartments/100000-200000', label: '10万–20万美元公寓' },
    ],
    faqHeading: '常见问题',
  },
  nl: {
    chooseHeading: 'Hoe kies je een ontwikkelaar op Bali',
    chooseP1: 'De belangrijkste criteria zijn opgeleverde projecten, een transparante juridische structuur en een beheermaatschappij na oplevering. Opgeleverde projecten laten zien dat de ontwikkelaar een bouw kan afronden en de beloofde kwaliteit haalt. De juridische structuur (leasehold of freehold, een geldige PBG-/SLF-vergunning) garandeert dat u correct geregistreerd eigendom ontvangt. De beheermaatschappij is cruciaal als u een appartement koopt om te verhuren — zonder deze verandert het jaarrendement van 8–12% in een fulltimebaan voor de eigenaar.',
    chooseP2: 'Op elke kaart bundelen we scores op vier dimensies: bouw & vastgoed, reputatie & ervaring, materieel & productie, en beheermaatschappij. Zo vergelijkt u snel tientallen partijen zonder af te gaan op één beoordeling.',
    districtsHeading: 'Ontwikkelaars per wijk op Bali',
    districtsLead: 'De meeste nieuwe projecten zijn geconcentreerd in Canggu (Berawa, Batu Bolong, Pererenan), op Bukit (Uluwatu, Pandawa) en in Ubud. In deze wijken zijn de meest actieve ontwikkelaars gevestigd met appartementen, villa\'s en investeringscomplexen.',
    devsIn: (n: string) => `Ontwikkelaars in ${n}`,
    newIn: (n: string) => `Nieuwbouw in ${n}`,
    allComplexes: 'Wooncomplexen op Bali',
    relatedHeading: 'Gerelateerd',
    related: [
      { href: '/nl/complexes', label: 'Wooncomplexen op Bali' },
      { href: '/nl/apartments', label: 'Appartementen van ontwikkelaars' },
      { href: '/nl/villas', label: 'Villa\'s en huizen' },
      { href: `/nl/apartments/${BEDROOM_TO_SLUG['1']}`, label: 'Appartementen met 1 slaapkamer' },
      { href: `/nl/apartments/${BEDROOM_TO_SLUG['2']}`, label: 'Appartementen met 2 slaapkamers' },
      { href: `/nl/apartments/${STATUS_TO_SLUG.building}`, label: 'Appartementen in aanbouw' },
      { href: `/nl/apartments/${STATUS_TO_SLUG.built}`, label: 'Opgeleverde appartementen' },
      { href: '/nl/apartments/100000-200000', label: 'Appartementen $100k–200k' },
    ],
    faqHeading: 'Veelgestelde vragen',
  },
  ban: {
    chooseHeading: 'Sapunapi milih pangwangun ring Bali',
    chooseP1: 'Kriteria utama inggih punika proyek sane sampun puput, struktur hukum sane terang, miwah perusahaan pangelola sasampun serah terima. Proyek sane sampun puput nyihnayang pangwangun mrasidayang muputang wewangunan miwah nyaga kualitas sane kajanjiang. Struktur hukum (leasehold utawi freehold, izin PBG / SLF sane kantun aktif) ngajamin Ida Dane polih kepemilikan sane katunas becik. Perusahaan pangelola pinih mabuat yening Ida Dane numbas apartemen anggen kasewaang — yening nenten wenten, hasil 8–12% sabilang warsa dados pakaryan penuh anggen sang madue.',
    chooseP2: 'Ring soang-soang kartu tiang ngagregasi skor ring petang dimensi: wewangunan & properti, reputasi & pangalaman, piranti & produksi, miwah perusahaan pangelola. Puniki ngwantu Ida Dane digelis mabanding puluhan pamain tanpa ngandelang asiki ulasan.',
    districtsHeading: 'Pangwangun manut wewidangan Bali',
    districtsLead: 'Akehan proyek anyar mapunduh ring Canggu (Berawa, Batu Bolong, Pererenan), ring Bukit (Uluwatu, Pandawa), miwah ring Ubud. Wewidangan puniki dados genah pangwangun sane pinih aktif sareng apartemen, vila, miwah kompleks investasi.',
    devsIn: (n: string) => `Pangwangun ring ${n}`,
    newIn: (n: string) => `Wewangunan anyar ring ${n}`,
    allComplexes: 'Kompleks hunian Bali',
    relatedHeading: 'Sane matehan',
    related: [
      { href: '/ban/complexes', label: 'Kompleks hunian Bali' },
      { href: '/ban/apartments', label: 'Apartemen saking pangwangun' },
      { href: '/ban/villas', label: 'Vila miwah umah' },
      { href: `/ban/apartments/${BEDROOM_TO_SLUG['1']}`, label: 'Apartemen 1 kamar' },
      { href: `/ban/apartments/${BEDROOM_TO_SLUG['2']}`, label: 'Apartemen 2 kamar' },
      { href: `/ban/apartments/${STATUS_TO_SLUG.building}`, label: 'Apartemen kantun kawangun' },
      { href: `/ban/apartments/${STATUS_TO_SLUG.built}`, label: 'Apartemen sampun puput' },
      { href: '/ban/apartments/100000-200000', label: 'Apartemen $100k–200k' },
    ],
    faqHeading: 'Patakon sane sering katakenang',
  },
} as const

export function DevelopersSeoContent({ lang = 'ru' }: { lang?: Lang }) {
  const c = pickCopy(COPY, lang)
  const items = pickCopy(FAQ_ITEMS, lang)
  const districtRoot = switchLangPath('/ru/apartamenty', lang)

  const districtLinks = POPULAR_DISTRICTS.map(d => ({
    name: d,
    slug: DISTRICT_TO_SLUG[d],
  })).filter(x => x.slug)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <section className="mt-12 pt-10 border-t border-[var(--color-border)]">
      <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[var(--color-text)] mb-4">
        {c.chooseHeading}
      </h2>
      <div className="prose-balinsky max-w-3xl space-y-3 text-[15px] leading-relaxed text-[var(--color-text)]">
        <p>{c.chooseP1}</p>
        <p className="text-[var(--color-text-muted)]">{c.chooseP2}</p>
      </div>

      <div className="mt-10">
        <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[var(--color-text)] mb-3">
          {c.districtsHeading}
        </h2>
        <p className="max-w-3xl text-[14px] leading-relaxed text-[var(--color-text-muted)] mb-5">
          {c.districtsLead}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {districtLinks.flatMap(d => [
            {
              key: `dev-${d.slug}`,
              href: `${districtRoot}/${d.slug}`,
              label: c.devsIn(d.name),
              accent: true,
            },
            {
              key: `new-${d.slug}`,
              href: `${districtRoot}/${d.slug}/${STATUS_TO_SLUG.building}`,
              label: c.newIn(d.name),
              accent: false,
            },
          ]).map(chip => (
            <li key={chip.key}>
              <Link
                href={chip.href}
                className={`inline-block px-3 py-1.5 rounded-full border text-[13px] transition-colors ${
                  chip.accent
                    ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary-soft)] text-[var(--color-primary-pressed)] hover:border-[var(--color-primary)]'
                    : 'bg-[var(--color-card-bg)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
                }`}
              >
                {chip.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={switchLangPath('/ru/zhilye-kompleksy', lang)}
              className="inline-block px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[13px] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors"
            >
              {c.allComplexes}
            </Link>
          </li>
        </ul>
      </div>

      <div className="mt-10">
        <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[var(--color-text)] mb-4">
          {c.relatedHeading}
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 max-w-3xl">
          {c.related.map(l => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex items-center gap-2 text-[14px] text-[var(--color-text)] hover:text-[var(--color-primary-pressed)] transition-colors"
              >
                <span className="text-[var(--color-primary)]">→</span> {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12">
        <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight text-[var(--color-text)] mb-4">
          {c.faqHeading}
        </h2>
        <div className="max-w-3xl divide-y divide-[var(--color-border)] border-t border-b border-[var(--color-border)]">
          {items.map((item, i) => (
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
