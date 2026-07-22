import Link from 'next/link'
import type { FilterState } from '@/components/filters/FiltersBar'
import {
  DISTRICT_TO_SLUG,
  BEDROOM_TO_SLUG,
  STATUS_TO_SLUG,
  PRICE_SEGMENTS,
  priceSegmentLabel,
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
  de: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (a: string[]) => `${a.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` mit ${n} Schlafzimmer`,
    introBedsN: (a: string[]) => ` mit ${a.join('/')} Schlafzimmern`,
    introMap: (where: string, beds: string) => `Apartments${beds} in ${where}, auf einer Karte markiert.`,
    introList: (where: string, beds: string) => `Apartment-Katalog${beds} in ${where}.`,
    introTail: ' Vergleichen Sie Lage, Preise und Ausstattung, sehen Sie sich Fotos an und wählen Sie eine Immobilie zum Wohnen oder Investieren.',
    ctxUbud: 'Ubud ist das kulturelle Herz der Insel, umgeben von Reisterrassen und Dschungel. Gut geeignet für Käufer, die ein ruhiges Leben abseits des Strandtrubels suchen.',
    ctxCanggu: (d: string) => `${d} gehört zu Canggu — dem Surfer- und Digital-Nomaden-Viertel: Beach Clubs, Cafés, ~10 Min. zum Strand, aktiver Mietmarkt.`,
    ctxBukit: (d: string) => `${d} liegt auf der südlichen Bukit-Halbinsel — Klippenblicke, Premium-Villen, Surfspots von Weltklasse.`,
    ctxSanur: 'Sanur ist die ruhige Ostküste — Lagune, Strandpromenade, beliebt bei Familien und Langzeit-Umziehenden.',
    ctxDefault: 'Bali ist einer der dynamischsten Apartmentmärkte Südostasiens: Neue Anlagen werden monatlich fertiggestellt, Kurzzeitmietrenditen in der Hochsaison liegen im Schnitt bei 8–12% pro Jahr. Wichtige Gebiete: Canggu (Berawa, Batu Bolong, Pererenan) für Surfen und Remote-Arbeit, Ubud für das Leben in der Natur, Bukit (Uluwatu, Pandawa) für Premium-Meerblick, Sanur und Nusa Dua für familienfreundliche Aufenthalte.',
    titleAdj: (n: string) => `${n}-Schlafzimmer`,
    titleNoun: 'Apartments',
    titleNounCap: 'Apartments und Eigentumswohnungen',
    titleInDistrict: (d: string) => ` in ${d}`,
    titleInDistricts: (a: string[]) => ` in ${a.join(', ')}`,
    titleMapTail: ' auf der Bali-Karte',
    titleListTail: ' auf Bali — Katalog',
    popularHeading: 'Beliebte Gebiete',
    availableHeading: 'Was verfügbar ist',
    bedroomsLabel: (n: string) => `${n}-Schlafzimmer`,
    statusLabel: (k: string) => k === 'building' ? 'im Bau' : 'fertiggestellt',
    faqHeading: 'Häufige Fragen',
    faq: [
      { q: 'Wo kauft man in Bali am besten ein Apartment?',
        a: 'Kommt auf das Ziel an. Zur Vermietung — Canggu (Berawa, Batu Bolong, Pererenan), mit stabiler Ganzjahresnachfrage. Zum Wohnen — Ubud oder Sanur. Für Premium-Meerblick — Bukit (Uluwatu, Pandawa).' },
      { q: 'Welche Gebiete liegen näher am Meer?',
        a: 'Direkten Strandzugang gibt es in Berawa, Batu Bolong, Pandawa, Melasti, Nusa Dua, Sanur. Von Ubud ist das Meer 30–40 Min. mit dem Roller entfernt.' },
      { q: 'Was kosten Apartments auf Bali?',
        a: 'Studios beginnen bei 80.000–100.000 $, ein 1-Zimmer in Canggu — ab 150.000 $, ein 2-Zimmer mit Blick auf dem Bukit — ab 250.000 $. Premium-Penthäuser erreichen 1 Mio. $ und mehr.' },
      { q: 'Kann ein Ausländer auf Bali Apartments kaufen?',
        a: 'Ja, über Leasehold (langfristige Pacht) — 25 bis 99 Jahre. Der Abschluss erfolgt bei einem PPAT-Notar; die meisten Bauträger arbeiten mit internationalen Käufern.' },
      { q: 'Welche Mietrendite ist zu erwarten?',
        a: 'In den beliebten Gebieten Canggu und Bukit liegt die jährliche Nettorendite aus Kurzzeitvermietung über eine Verwaltungsgesellschaft typischerweise bei 8–12% bei 70–80% Auslastung.' },
    ],
  },
  zh: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (a: string[]) => `${a.join('、')}`,
    introWhereBali: '巴厘岛',
    introBeds1: (n: string) => `${n} 居`,
    introBedsN: (a: string[]) => `${a.join('/')} 居`,
    introMap: (where: string, beds: string) => `${where}的${beds}公寓，已在地图上标注。`,
    introList: (where: string, beds: string) => `${where}的${beds}公寓目录。`,
    introTail: '可比较位置、价格与配置，浏览照片，挑选适合居住或投资的房产。',
    ctxUbud: 'Ubud 是岛上的文化中心，四周环绕着稻田梯田与丛林。适合希望远离海滩喧嚣、追求宁静生活的买家。',
    ctxCanggu: (d: string) => `${d} 属于 Canggu——冲浪者与数字游民的聚集区：海滩俱乐部、咖啡馆，约 10 分钟到海滩，租赁市场活跃。`,
    ctxBukit: (d: string) => `${d} 位于南部的 Bukit 半岛——悬崖景观、高端别墅、世界级冲浪点。`,
    ctxSanur: 'Sanur 是宁静的东海岸——泻湖、海滨栈道，深受家庭与长期定居者喜爱。',
    ctxDefault: '巴厘岛是东南亚最具活力的公寓市场之一：每月都有新项目交付，旺季短租收益率通常平均为每年 8–12%。主要区域：Canggu（Berawa、Batu Bolong、Pererenan）适合冲浪与远程办公，Ubud 适合亲近自然的生活，Bukit（Uluwatu、Pandawa）拥有高端海景，Sanur 与 Nusa Dua 适合家庭出行。',
    titleAdj: (n: string) => `${n} 居`,
    titleNoun: '公寓',
    titleNounCap: '公寓与住宅',
    titleInDistrict: (d: string) => `（${d}）`,
    titleInDistricts: (a: string[]) => `（${a.join('、')}）`,
    titleMapTail: '——巴厘岛地图',
    titleListTail: '——巴厘岛目录',
    popularHeading: '热门区域',
    availableHeading: '可选项',
    bedroomsLabel: (n: string) => `${n} 居`,
    statusLabel: (k: string) => k === 'building' ? '在建' : '已建成',
    faqHeading: '常见问题',
    faq: [
      { q: '在巴厘岛哪里买公寓最好？',
        a: '取决于目标。用于出租——Canggu（Berawa、Batu Bolong、Pererenan），全年需求稳定。用于居住——Ubud 或 Sanur。追求高端海景——Bukit（Uluwatu、Pandawa）。' },
      { q: '哪些区域离海更近？',
        a: 'Berawa、Batu Bolong、Pandawa、Melasti、Nusa Dua、Sanur 可直接到达海滩。从 Ubud 骑摩托车到海边约 30–40 分钟。' },
      { q: '巴厘岛公寓多少钱？',
        a: '开间起价 8 万–10 万美元，Canggu 的 1 居公寓——15 万美元起，Bukit 带景观的 2 居——25 万美元起。高端顶层公寓可达 100 万美元以上。' },
      { q: '外国人可以在巴厘岛买公寓吗？',
        a: '可以，通过 leasehold（长期租赁）——25 至 99 年。交易在 PPAT 公证人处完成；大多数开发商与国际买家合作。' },
      { q: '可以预期多少租金收益？',
        a: '在热门的 Canggu 与 Bukit 区域，通过管理公司进行短租的年净收益通常为 8–12%，入住率 70–80%。' },
    ],
  },
  nl: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (a: string[]) => `${a.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` met ${n} slaapkamer`,
    introBedsN: (a: string[]) => ` met ${a.join('/')} slaapkamers`,
    introMap: (where: string, beds: string) => `Appartementen${beds} in ${where}, aangegeven op een kaart.`,
    introList: (where: string, beds: string) => `Appartementencatalogus${beds} in ${where}.`,
    introTail: ' Vergelijk locatie, prijzen en specificaties, bekijk foto’s en kies een object om in te wonen of te investeren.',
    ctxUbud: 'Ubud is het culturele hart van het eiland, omgeven door rijstterrassen en jungle. Een goede keuze voor kopers die een rustig leven weg van de stranddrukte zoeken.',
    ctxCanggu: (d: string) => `${d} maakt deel uit van Canggu — de surf- en digitale-nomadenwijk: beachclubs, cafés, ~10 min naar het strand, actieve huurmarkt.`,
    ctxBukit: (d: string) => `${d} ligt op het zuidelijke Bukit-schiereiland — uitzichten vanaf kliffen, premium villa’s, surfspots van wereldklasse.`,
    ctxSanur: 'Sanur is de rustige oostkust — lagune, boulevard, geliefd bij gezinnen en mensen die langdurig verhuizen.',
    ctxDefault: 'Bali is een van de meest dynamische appartementenmarkten van Zuidoost-Azië: elke maand worden nieuwe complexen opgeleverd, kortverblijfrendementen in het hoogseizoen bedragen doorgaans gemiddeld 8–12% per jaar. Belangrijke gebieden: Canggu (Berawa, Batu Bolong, Pererenan) voor surfen en werken op afstand, Ubud voor het leven in de natuur, Bukit (Uluwatu, Pandawa) voor premium zeezicht, Sanur en Nusa Dua voor gezinsvriendelijke verblijven.',
    titleAdj: (n: string) => `${n}-slaapkamer`,
    titleNoun: 'appartementen',
    titleNounCap: 'Appartementen en condo’s',
    titleInDistrict: (d: string) => ` in ${d}`,
    titleInDistricts: (a: string[]) => ` in ${a.join(', ')}`,
    titleMapTail: ' op de kaart van Bali',
    titleListTail: ' op Bali — catalogus',
    popularHeading: 'Populaire gebieden',
    availableHeading: 'Wat beschikbaar is',
    bedroomsLabel: (n: string) => `${n}-slaapkamer`,
    statusLabel: (k: string) => k === 'building' ? 'in aanbouw' : 'opgeleverd',
    faqHeading: 'Veelgestelde vragen',
    faq: [
      { q: 'Waar kun je het best een appartement kopen op Bali?',
        a: 'Hangt af van het doel. Voor verhuur — Canggu (Berawa, Batu Bolong, Pererenan), met stabiele vraag het hele jaar door. Om te wonen — Ubud of Sanur. Voor premium zeezicht — Bukit (Uluwatu, Pandawa).' },
      { q: 'Welke gebieden liggen dichter bij de oceaan?',
        a: 'Directe strandtoegang is er in Berawa, Batu Bolong, Pandawa, Melasti, Nusa Dua, Sanur. Vanuit Ubud is de oceaan 30–40 min met de scooter.' },
      { q: 'Wat kosten appartementen op Bali?',
        a: 'Studio’s beginnen bij $80–100k, een 1-slaapkamer in Canggu — vanaf $150k, een 2-slaapkamer met uitzicht op Bukit — vanaf $250k. Premium penthouses bereiken $1M en meer.' },
      { q: 'Kan een buitenlander appartementen kopen op Bali?',
        a: 'Ja, via leasehold (langlopende pacht) — 25 tot 99 jaar. De transactie wordt afgerond bij een PPAT-notaris; de meeste ontwikkelaars werken met internationale kopers.' },
      { q: 'Welk huurrendement is te verwachten?',
        a: 'In de populaire gebieden Canggu en Bukit is het netto jaarrendement uit kortverblijfverhuur via een beheermaatschappij doorgaans 8–12% bij 70–80% bezetting.' },
    ],
  },
  ban: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (a: string[]) => `${a.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` madaging ${n} kamar`,
    introBedsN: (a: string[]) => ` madaging ${a.join('/')} kamar`,
    introMap: (where: string, beds: string) => `Apartemen${beds} ring ${where} katandain ring peta.`,
    introList: (where: string, beds: string) => `Katalog apartemen${beds} ring ${where}.`,
    introTail: ' Bandingang genah, aji, lan spesifikasi, cingak foto, tur pilih properti anggen magenah utawi investasi.',
    ctxUbud: 'Ubud inggih punika pusat budaya pulo puniki, kaideran subak lan alas. Becik pisan antuk sang sane ngrereh urip sane tenang doh saking rame pasisi.',
    ctxCanggu: (d: string) => `${d} wantah bagian saking Canggu — wewengkon peselancar lan digital nomad: beach club, kafe, ~10 menit ka pasisi, pasar sewa sane aktif.`,
    ctxBukit: (d: string) => `${d} magenah ring semenanjung Bukit kelod — pemandangan tebing, vila premium, ombak selancar kelas dunia.`,
    ctxSanur: 'Sanur inggih punika pasisi kangin sane tenang — laguna, boardwalk, kasenengin olih kulawarga lan sang sane pindah antuk galah sue.',
    ctxDefault: 'Bali inggih punika silih tunggil pasar apartemen sane pinih dinamis ring Asia Tenggara: kompleks anyar kaserahang nyabran bulan, asil sewa jangka bawak ring musim rame biasane rata-rata 8–12% nyabran warsa. Wewengkon utama: Canggu (Berawa, Batu Bolong, Pererenan) antuk selancar lan makarya jarak jauh, Ubud antuk urip ring alam, Bukit (Uluwatu, Pandawa) antuk pemandangan pasih premium, Sanur lan Nusa Dua antuk suasana becik ring kulawarga.',
    titleAdj: (n: string) => `${n} kamar`,
    titleNoun: 'apartemen',
    titleNounCap: 'Apartemen lan kondominium',
    titleInDistrict: (d: string) => ` ring ${d}`,
    titleInDistricts: (a: string[]) => ` ring ${a.join(', ')}`,
    titleMapTail: ' ring peta Bali',
    titleListTail: ' ring Bali — katalog',
    popularHeading: 'Wewengkon kasub',
    availableHeading: 'Sane wenten',
    bedroomsLabel: (n: string) => `${n} kamar`,
    statusLabel: (k: string) => k === 'building' ? 'kantun kawangun' : 'sampun puput',
    faqHeading: 'Patakon sane sering katakenang',
    faq: [
      { q: 'Ring dija genah pinih becik numbas apartemen ring Bali?',
        a: 'Manut tetujon. Anggen kasewaang — Canggu (Berawa, Batu Bolong, Pererenan), madaging pamundut stabil sawarsa. Anggen magenah — Ubud utawi Sanur. Anggen pemandangan pasih premium — Bukit (Uluwatu, Pandawa).' },
      { q: 'Wewengkon encen sane paek ring pasih?',
        a: 'Akses pasisi langsung wenten ring Berawa, Batu Bolong, Pandawa, Melasti, Nusa Dua, Sanur. Saking Ubud, pasih doh 30–40 menit nganggen motor.' },
      { q: 'Sapunapi aji apartemen ring Bali?',
        a: 'Studio ngawit saking $80–100k, 1 kamar ring Canggu — ngawit $150k, unit 2 kamar madaging pemandangan ring Bukit — ngawit $250k. Penthouse premium ngantos $1 yuta menekan.' },
      { q: 'Punapi anak asing prasida numbas apartemen ring Bali?',
        a: 'Prasida, malarapan leasehold (sewa jangka sue) — 25 ngantos 99 warsa. Transaksi kapuputang ring notaris PPAT; akehan pangwangun makarya sareng pembeli internasional.' },
      { q: 'Asil sewa sapunapi sane prasida kaajap?',
        a: 'Ring wewengkon kasub Canggu lan Bukit, asil bersih sawarsa saking sewa jangka bawak malarapan perusahaan pengelola biasane 8–12% ring tingkat hunian 70–80%.' },
    ],
  },
  pl: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (a: string[]) => `${a.join(', ')}`,
    introWhereBali: 'Bali',
    introBeds1: (n: string) => ` z ${n} sypialnią`,
    introBedsN: (a: string[]) => ` z ${a.join('/')} sypialniami`,
    introMap: (where: string, beds: string) => `Apartamenty${beds} w ${where} zaznaczone na mapie.`,
    introList: (where: string, beds: string) => `Katalog apartamentów${beds} w ${where}.`,
    introTail: ' Porównaj lokalizację, ceny i parametry, przejrzyj zdjęcia i wybierz nieruchomość do zamieszkania lub inwestycji.',
    ctxUbud: 'Ubud to kulturalne serce wyspy, otoczone tarasami ryżowymi i dżunglą. Dobry wybór dla kupujących, którzy szukają spokojnego życia z dala od plażowego tłumu.',
    ctxCanggu: (d: string) => `${d} to część Canggu — dzielnicy surferów i cyfrowych nomadów: beach cluby, kawiarnie, ~10 min do plaży, aktywny rynek najmu.`,
    ctxBukit: (d: string) => `${d} leży na południowym półwyspie Bukit — widoki z klifów, wille premium, światowej klasy spoty surfingowe.`,
    ctxSanur: 'Sanur to spokojne wschodnie wybrzeże — laguna, promenada, popularne wśród rodzin i osób przeprowadzających się na dłużej.',
    ctxDefault: 'Bali to jeden z najbardziej dynamicznych rynków apartamentów w Azji Południowo-Wschodniej: nowe kompleksy oddawane są co miesiąc, rentowność z najmu krótkoterminowego w wysokim sezonie wynosi zwykle średnio 8–12% rocznie. Kluczowe rejony: Canggu (Berawa, Batu Bolong, Pererenan) dla surfingu i pracy zdalnej, Ubud dla życia w naturze, Bukit (Uluwatu, Pandawa) dla widoków na ocean klasy premium, Sanur i Nusa Dua dla pobytów rodzinnych.',
    titleAdj: (n: string) => `${n}-pokojowe`,
    titleNoun: 'apartamenty',
    titleNounCap: 'Apartamenty i mieszkania',
    titleInDistrict: (d: string) => ` w ${d}`,
    titleInDistricts: (a: string[]) => ` w ${a.join(', ')}`,
    titleMapTail: ' na mapie Bali',
    titleListTail: ' na Bali — katalog',
    popularHeading: 'Popularne rejony',
    availableHeading: 'Co jest dostępne',
    bedroomsLabel: (n: string) => `${n}-pokojowe`,
    statusLabel: (k: string) => k === 'building' ? 'w budowie' : 'gotowe',
    faqHeading: 'Najczęściej zadawane pytania',
    faq: [
      { q: 'Gdzie najlepiej kupić apartament na Bali?',
        a: 'Zależy od celu. Pod wynajem — Canggu (Berawa, Batu Bolong, Pererenan), ze stabilnym popytem przez cały rok. Do życia — Ubud lub Sanur. Dla widoków na ocean klasy premium — Bukit (Uluwatu, Pandawa).' },
      { q: 'Które rejony są bliżej oceanu?',
        a: 'Bezpośredni dostęp do plaży mają Berawa, Batu Bolong, Pandawa, Melasti, Nusa Dua, Sanur. Z Ubud do oceanu jest 30–40 min skuterem.' },
      { q: 'Ile kosztują apartamenty na Bali?',
        a: 'Kawalerki zaczynają się od 80–100 tys. $, apartament 1-pokojowy w Canggu — od 150 tys. $, 2-pokojowe z widokiem na Bukit — od 250 tys. $. Penthouse’y premium sięgają 1 mln $ i więcej.' },
      { q: 'Czy obcokrajowiec może kupić apartament na Bali?',
        a: 'Tak, w formule leasehold (dzierżawa długoterminowa) — od 25 do 99 lat. Transakcja jest zawierana u notariusza PPAT; większość deweloperów współpracuje z nabywcami międzynarodowymi.' },
      { q: 'Jakiej rentowności najmu można się spodziewać?',
        a: 'W popularnych rejonach Canggu i Bukit roczna rentowność netto z najmu krótkoterminowego przez firmę zarządzającą wynosi zwykle 8–12% przy obłożeniu 70–80%.' },
    ],
  },
  uk: {
    introWhereDistrict: (d: string) => `${d}`,
    introWhereDistricts: (a: string[]) => `${a.join(', ')}`,
    introWhereBali: 'Балі',
    introBeds1: (n: string) => ` з ${n} спальнею`,
    introBedsN: (a: string[]) => ` з ${a.join('/')} спальнями`,
    introMap: (where: string, beds: string) => `Апартаменти${beds} у ${where}, позначені на карті.`,
    introList: (where: string, beds: string) => `Каталог апартаментів${beds} у ${where}.`,
    introTail: ' Порівняйте розташування, ціни та характеристики, перегляньте фото й оберіть об’єкт для життя чи інвестицій.',
    ctxUbud: 'Убуд — культурне серце острова, оточене рисовими терасами й джунглями. Гарний вибір для покупців, які шукають спокійне життя подалі від пляжного натовпу.',
    ctxCanggu: (d: string) => `${d} — частина Чангу, району серферів і цифрових кочівників: пляжні клуби, кафе, ~10 хв до пляжу, активний ринок оренди.`,
    ctxBukit: (d: string) => `${d} розташований на південному півострові Букіт — краєвиди з урвищ, преміальні вілли, серф-споти світового рівня.`,
    ctxSanur: 'Санур — спокійне східне узбережжя: лагуна, набережна, популярне серед родин і тих, хто переїжджає надовго.',
    ctxDefault: 'Балі — один із найдинамічніших ринків апартаментів у Південно-Східній Азії: нові комплекси здаються щомісяця, дохідність від подобової оренди у високий сезон зазвичай у середньому перевищує 8–12% річних. Основні локації: Чангу (Berawa, Batu Bolong, Pererenan) для серфінгу та віддаленої роботи, Убуд для життя серед природи, Букіт (Uluwatu, Pandawa) для преміальних краєвидів на океан, Санур і Нуса-Дуа для сімейного відпочинку.',
    titleAdj: (n: string) => `${n}-кімнатні`,
    titleNoun: 'апартаменти',
    titleNounCap: 'Апартаменти та квартири',
    titleInDistrict: (d: string) => ` у ${d}`,
    titleInDistricts: (a: string[]) => ` у ${a.join(', ')}`,
    titleMapTail: ' на карті Балі',
    titleListTail: ' на Балі — каталог',
    popularHeading: 'Популярні райони',
    availableHeading: 'Що доступно',
    bedroomsLabel: (n: string) => `${n}-кімнатні`,
    statusLabel: (k: string) => k === 'building' ? 'що будуються' : 'готові',
    faqHeading: 'Часті запитання',
    faq: [
      { q: 'Де найкраще купити апартаменти на Балі?',
        a: 'Залежить від мети. Під оренду — Чангу (Berawa, Batu Bolong, Pererenan), де стабільний попит цілий рік. Для життя — Убуд або Санур. Для преміальних краєвидів на океан — Букіт (Uluwatu, Pandawa).' },
      { q: 'Які райони ближче до океану?',
        a: 'Прямий вихід до пляжу мають комплекси в Berawa, Batu Bolong, Pandawa, Melasti, Nusa Dua, Sanur. З Убуда до океану 30–40 хвилин на байку.' },
      { q: 'Скільки коштують апартаменти на Балі?',
        a: 'Студії стартують від 80–100 тис. $, 1-кімнатні апартаменти в Чангу — від 150 тис. $, видові 2-кімнатні на Букіті — від 250 тис. $. Преміальні пентхауси сягають 1 млн $ і вище.' },
      { q: 'Чи може іноземець купити апартаменти на Балі?',
        a: 'Так, за схемою лізхолд (довгострокова оренда) — від 25 до 99 років. Угода оформлюється в нотаріуса PPAT; більшість забудовників працюють із міжнародними покупцями.' },
      { q: 'Яку дохідність приносить здавання в оренду?',
        a: 'У популярних районах Чангу та Букіт чиста річна дохідність від подобової оренди через керуючу компанію зазвичай становить 8–12% за завантаження 70–80%.' },
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
                  {priceSegmentLabel(seg, lang)}
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
