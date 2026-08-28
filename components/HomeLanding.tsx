// Главная Balinsky — «понятно ребёнку».
//
// Принцип: одна мысль на экран, короткие фразы, никакого жаргона
// (PBG/SLF/leasehold/«cap rate» на главной больше нет — это уровень
// карточки объекта, а не первой страницы). Всё, что было текстовыми
// простынями (6 карточек аналитики, блок безопасности, отзывы,
// подборки, база знаний), либо свёрнуто в одну простую строку, либо
// убрано — глубокие страницы остаются в каталоге и в sitemap.
//
// Структура — 8 экранов:
//   1. Фото + один вопрос + поиск
//   2. Три числа
//   3. «Что вы ищете?» — виллы / квартиры / комплексы
//   4. Подбор за три вопроса
//   5. «Как купить» — три шага
//   6. Виллы (6 карточек)
//   7. «Где на Бали?» — четыре района
//   8. «Поможем купить» + две кнопки

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import {
  ArrowRight, Send, Search, Home, Building2, Building, MapPin, ShieldCheck,
  TrendingUp, BarChart3, Flame, Gauge, FileCheck,
  Sparkles, Heart, KeyRound, Sun, ListChecks, BookOpen,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { VillaCard, type VillaCardData } from '@/components/VillaCard'
import { loadAll as loadAllVillas, buildAllCards as buildAllVillaCards, type VillaFilterState } from '@/app/ru/villy/_lib'
import { loadAllVillaScores } from '@/lib/investment/batch-scores'
import { HeroCatalogSearch } from '@/components/HeroCatalogSearch'
import { LeadButton } from '@/components/LeadButton'
import { loadHomeFinder } from '@/lib/home-finder'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { HomeFinder } from '@/components/HomeFinder'
import {
  VizYield, VizCompetitors, VizHeat, VizNearby, VizDemand, VizDocs,
} from '@/components/LandingVisuals'
import { pickCopy, switchLangPath, type Lang } from '@/lib/i18n'

// Порядок здесь = порядок COPY.powers.items во всех локалях: доход,
// цены соседей, тепловая карта туристов, что рядом, балл востребованности,
// документы. Меняешь порядок — меняй в обоих местах.
const POWER_ICONS = [TrendingUp, BarChart3, Flame, MapPin, Gauge, FileCheck]
const POWER_VISUALS = [VizYield, VizCompetitors, VizHeat, VizNearby, VizDemand, VizDocs]

// Второй слой главной: разделы, которые помогают выбрать, но не являются
// аналитикой объекта. Иконки в порядке COPY.tools.items.
const TOOL_ROUTES: { path: string; Icon: typeof Sparkles }[] = [
  { path: '/ru/poisk', Icon: Sparkles },
  { path: '/ru/izbrannoe', Icon: Heart },
  { path: '/ru/arenda', Icon: KeyRound },
  { path: '/ru/zhizn-na-bali', Icon: Sun },
  { path: '/ru/kak-kupit', Icon: ListChecks },
  { path: '/ru/znaniya', Icon: BookOpen },
]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

// === COPY =============================================================
//
// Правило для всех десяти языков: предложение — до восьми слов, слова —
// такие, которые знает восьмилетний ребёнок. Никаких аббревиатур.

const COPY = {
  ru: {
    locale: 'ru-RU',
    hero: {
      h1: 'Дом или квартира на Бали',
      sub: 'Смотрите фото и цены. Поможем купить безопасно.',
      tryLabel: 'Например',
      suggestions: ['Виллы до $250 000', 'Квартиры у моря', 'Дома в Убуде'],
      search: 'Найти',
    },
    stats: { objects: 'домов и квартир', complexes: 'жилых комплексов', developers: 'застройщиков' },
    browse: {
      heading: 'Что вы ищете?',
      villas: 'Виллы',
      villasNote: 'Свой дом с садом и бассейном',
      apartments: 'Квартиры',
      apartmentsNote: 'Своё жильё в большом доме',
      complexes: 'Комплексы',
      complexesNote: 'Дома и квартиры с бассейном и охраной',
    },
    finder: { heading: 'Ответьте на три вопроса' },
    powers: {
      heading: 'Что умеет Balinsky',
      sub: 'Ни один сайт недвижимости в Юго-Восточной Азии не показывает столько данных о доме. Всё открыто и бесплатно, регистрация не нужна.',
      cta: 'Посмотреть на примере виллы',
      items: [
        { title: 'Сколько заработает дом', body: 'Три сценария дохода: плохой, обычный, хороший. Считаем по домам, которые уже сдаются рядом.' },
        { title: 'Цены соседей', body: 'Видно, дороже этот дом или дешевле, чем такие же рядом. Цена за метр — на одной шкале.' },
        { title: 'Где ходят туристы', body: 'Тепловая карта по 13 600 местам Бали. Сразу видно живые районы и пустые.' },
        { title: 'Что рядом с домом', body: 'Пляж, кафе, школа, серф, больница — со временем в пути.' },
        { title: 'Балл востребованности', body: 'Одно число от 1 до 100: насколько дом сильнее тех, что сдаются вокруг.' },
        { title: 'Документы и проверка', body: 'PBG, SLF, срок аренды земли. Красные флаги видно сразу.' },
      ],
    },
    tools: {
      heading: 'Ещё на сайте',
      items: [
        'Спросите словами — найдём',
        'Избранное и презентация в PDF',
        'Сколько сдают в аренду рядом',
        'Жизнь на Бали: визы, школы, врачи',
        'Как купить — по шагам',
        'Статьи и разборы',
      ],
    },
    villas: { heading: 'Посмотрите виллы', linkAll: 'Все виллы' },
    districts: {
      heading: 'Где на Бали?',
      items: [
        { name: 'Чангу', tagline: 'море, серфинг и кафе', slug: 'Berawa' },
        { name: 'Убуд', tagline: 'лес, рисовые поля, тишина', slug: 'Ubud' },
        { name: 'Букит', tagline: 'высокие скалы и вид на океан', slug: 'Uluwatu' },
        { name: 'Санур', tagline: 'тихий пляж, хорошо с детьми', slug: 'Sanur' },
      ],
    },
    help: {
      heading: 'Поможем купить',
      points: [
        'Проверим документы на дом и землю',
        'Покажем дом по видео — приезжать не нужно',
        'Будем рядом до самого конца',
      ],
      primary: 'Смотреть виллы',
      secondary: 'Написать нам',
    },
  },
  en: {
    locale: 'en-US',
    hero: {
      h1: 'A home or apartment in Bali',
      sub: 'See photos and prices. We help you buy safely.',
      tryLabel: 'For example',
      suggestions: ['Villas under $250,000', 'Apartments near the sea', 'Homes in Ubud'],
      search: 'Search',
    },
    stats: { objects: 'homes and apartments', complexes: 'residential complexes', developers: 'developers' },
    browse: {
      heading: 'What are you looking for?',
      villas: 'Villas',
      villasNote: 'Your own house with a garden and a pool',
      apartments: 'Apartments',
      apartmentsNote: 'Your own place in a big building',
      complexes: 'Complexes',
      complexesNote: 'Homes and apartments with a pool and security',
    },
    finder: { heading: 'Answer three questions' },
    powers: {
      heading: 'What Balinsky can do',
      sub: 'No property site in South-East Asia shows this much about a home. All of it is open and free, no sign-up.',
      cta: 'See it on a real villa',
      items: [
        { title: 'What the home will earn', body: 'Three income scenarios: poor, normal, good. Counted from homes already rented out nearby.' },
        { title: 'Neighbour prices', body: 'See whether this home is dearer or cheaper than the same ones around. Price per m² on one scale.' },
        { title: 'Where tourists go', body: 'A heat map of 13,600 places in Bali. Busy areas and empty ones at a glance.' },
        { title: 'What is near the home', body: 'Beach, café, school, surf, hospital — with travel time.' },
        { title: 'Demand score', body: 'One number from 1 to 100: how much stronger the home is than those rented around it.' },
        { title: 'Papers and checks', body: 'PBG, SLF, land lease term. Red flags show up straight away.' },
      ],
    },
    tools: {
      heading: 'Also on the site',
      items: [
        'Ask in your own words',
        'Favourites and a PDF presentation',
        'What homes rent for nearby',
        'Living in Bali: visas, schools, doctors',
        'How to buy — step by step',
        'Articles and breakdowns',
      ],
    },
    villas: { heading: 'Take a look at villas', linkAll: 'All villas' },
    districts: {
      heading: 'Where in Bali?',
      items: [
        { name: 'Canggu', tagline: 'sea, surfing and cafés', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'forest, rice fields, quiet', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'high cliffs and ocean views', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'a calm beach, good with kids', slug: 'Sanur' },
      ],
    },
    help: {
      heading: 'We help you buy',
      points: [
        'We check the papers for the house and the land',
        'We show the home on video — no need to fly over',
        'We stay with you to the very end',
      ],
      primary: 'See villas',
      secondary: 'Write to us',
    },
  },
  id: {
    locale: 'id-ID',
    hero: {
      h1: 'Rumah atau apartemen di Bali',
      sub: 'Lihat foto dan harga. Kami bantu membeli dengan aman.',
      tryLabel: 'Contohnya',
      suggestions: ['Vila di bawah $250.000', 'Apartemen dekat laut', 'Rumah di Ubud'],
      search: 'Cari',
    },
    stats: { objects: 'rumah dan apartemen', complexes: 'kompleks hunian', developers: 'pengembang' },
    browse: {
      heading: 'Anda mencari apa?',
      villas: 'Vila',
      villasNote: 'Rumah sendiri dengan taman dan kolam',
      apartments: 'Apartemen',
      apartmentsNote: 'Tempat sendiri di gedung besar',
      complexes: 'Kompleks',
      complexesNote: 'Rumah dan apartemen dengan kolam dan keamanan',
    },
    finder: { heading: 'Jawab tiga pertanyaan' },
    powers: {
      heading: 'Yang bisa dilakukan Balinsky',
      sub: 'Tidak ada situs properti di Asia Tenggara yang menampilkan sebanyak ini tentang satu rumah. Semuanya terbuka dan gratis, tanpa daftar.',
      cta: 'Lihat contohnya pada satu vila',
      items: [
        { title: 'Berapa hasil rumah ini', body: 'Tiga skenario pendapatan: buruk, biasa, bagus. Dihitung dari rumah yang sudah disewakan di sekitar.' },
        { title: 'Harga tetangga', body: 'Terlihat rumah ini lebih mahal atau lebih murah dari yang serupa di sekitar. Harga per m² dalam satu skala.' },
        { title: 'Ke mana turis pergi', body: 'Peta panas 13.600 tempat di Bali. Area ramai dan sepi langsung terlihat.' },
        { title: 'Apa saja di dekat rumah', body: 'Pantai, kafe, sekolah, surf, rumah sakit — dengan waktu tempuh.' },
        { title: 'Skor permintaan', body: 'Satu angka 1 sampai 100: seberapa kuat rumah ini dibanding yang disewakan di sekitar.' },
        { title: 'Dokumen dan pemeriksaan', body: 'PBG, SLF, masa sewa tanah. Tanda bahaya langsung terlihat.' },
      ],
    },
    tools: {
      heading: 'Ada juga di situs',
      items: [
        'Tanya dengan kata-kata Anda',
        'Favorit dan presentasi PDF',
        'Berapa harga sewa di sekitar',
        'Hidup di Bali: visa, sekolah, dokter',
        'Cara membeli — langkah demi langkah',
        'Artikel dan ulasan',
      ],
    },
    villas: { heading: 'Lihat vila', linkAll: 'Semua vila' },
    districts: {
      heading: 'Di mana di Bali?',
      items: [
        { name: 'Canggu', tagline: 'laut, selancar, dan kafe', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'hutan, sawah, tenang', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'tebing tinggi dan laut', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'pantai tenang, cocok untuk anak', slug: 'Sanur' },
      ],
    },
    help: {
      heading: 'Kami bantu membeli',
      points: [
        'Kami periksa dokumen rumah dan tanahnya',
        'Kami tunjukkan rumahnya lewat video — tak perlu datang',
        'Kami dampingi sampai selesai',
      ],
      primary: 'Lihat vila',
      secondary: 'Hubungi kami',
    },
  },
  fr: {
    locale: 'fr-FR',
    hero: {
      h1: 'Une maison ou un appartement à Bali',
      sub: 'Regardez les photos et les prix. On vous aide à acheter en sécurité.',
      tryLabel: 'Par exemple',
      suggestions: ['Villas à moins de 250 000 $', 'Appartements près de la mer', 'Maisons à Ubud'],
      search: 'Chercher',
    },
    stats: { objects: 'maisons et appartements', complexes: 'résidences', developers: 'promoteurs' },
    browse: {
      heading: 'Que cherchez-vous ?',
      villas: 'Villas',
      villasNote: 'Votre maison avec jardin et piscine',
      apartments: 'Appartements',
      apartmentsNote: 'Votre logement dans un grand immeuble',
      complexes: 'Résidences',
      complexesNote: 'Maisons et appartements avec piscine et gardien',
    },
    finder: { heading: 'Répondez à trois questions' },
    powers: {
      heading: 'Ce que fait Balinsky',
      sub: 'Aucun site immobilier d’Asie du Sud-Est n’en montre autant sur un bien. Tout est ouvert et gratuit, sans inscription.',
      cta: 'Voir sur une vraie villa',
      items: [
        { title: 'Ce que la maison rapporte', body: 'Trois scénarios de revenu : bas, normal, bon. Calculés sur les maisons déjà louées à côté.' },
        { title: 'Les prix des voisins', body: 'On voit si ce bien est plus cher ou moins cher que les mêmes autour. Prix au m² sur une seule échelle.' },
        { title: 'Où vont les touristes', body: 'Carte de chaleur de 13 600 lieux à Bali. Les zones vivantes et les zones vides, d’un coup d’œil.' },
        { title: 'Ce qu’il y a autour', body: 'Plage, café, école, surf, hôpital — avec le temps de trajet.' },
        { title: 'Note de demande', body: 'Un chiffre de 1 à 100 : la force du bien face à ceux loués autour.' },
        { title: 'Documents et vérification', body: 'PBG, SLF, durée du bail. Les drapeaux rouges se voient tout de suite.' },
      ],
    },
    tools: {
      heading: 'Aussi sur le site',
      items: [
        'Demandez avec vos mots',
        'Favoris et présentation PDF',
        'Les loyers autour',
        'Vivre à Bali : visas, écoles, médecins',
        'Comment acheter — étape par étape',
        'Articles et analyses',
      ],
    },
    villas: { heading: 'Regardez les villas', linkAll: 'Toutes les villas' },
    districts: {
      heading: 'Où à Bali ?',
      items: [
        { name: 'Canggu', tagline: 'la mer, le surf et les cafés', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'la forêt, les rizières, le calme', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'de hautes falaises et l’océan', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'une plage calme, bien avec des enfants', slug: 'Sanur' },
      ],
    },
    help: {
      heading: 'On vous aide à acheter',
      points: [
        'On vérifie les papiers de la maison et du terrain',
        'On montre le bien en vidéo — pas besoin de venir',
        'On reste avec vous jusqu’au bout',
      ],
      primary: 'Voir les villas',
      secondary: 'Écrivez-nous',
    },
  },
  de: {
    locale: 'de-DE',
    hero: {
      h1: 'Ein Haus oder eine Wohnung auf Bali',
      sub: 'Fotos und Preise ansehen. Wir helfen beim sicheren Kauf.',
      tryLabel: 'Zum Beispiel',
      suggestions: ['Villen unter 250.000 $', 'Wohnungen am Meer', 'Häuser in Ubud'],
      search: 'Suchen',
    },
    stats: { objects: 'Häuser und Wohnungen', complexes: 'Wohnanlagen', developers: 'Bauträger' },
    browse: {
      heading: 'Was suchen Sie?',
      villas: 'Villen',
      villasNote: 'Ein eigenes Haus mit Garten und Pool',
      apartments: 'Wohnungen',
      apartmentsNote: 'Eine eigene Wohnung im großen Haus',
      complexes: 'Wohnanlagen',
      complexesNote: 'Häuser und Wohnungen mit Pool und Wachdienst',
    },
    finder: { heading: 'Beantworten Sie drei Fragen' },
    powers: {
      heading: 'Was Balinsky kann',
      sub: 'Keine Immobilienseite in Südostasien zeigt so viel über ein Haus. Alles offen und kostenlos, ohne Anmeldung.',
      cta: 'An einer echten Villa ansehen',
      items: [
        { title: 'Was das Haus einbringt', body: 'Drei Ertragsszenarien: schlecht, normal, gut. Gerechnet nach Häusern, die nebenan schon vermietet werden.' },
        { title: 'Preise der Nachbarn', body: 'Sie sehen, ob dieses Haus teurer oder günstiger ist als gleiche in der Nähe. Preis pro m² auf einer Skala.' },
        { title: 'Wohin Touristen gehen', body: 'Wärmekarte mit 13.600 Orten auf Bali. Belebte und leere Gegenden auf einen Blick.' },
        { title: 'Was in der Nähe ist', body: 'Strand, Café, Schule, Surfen, Krankenhaus — mit Wegzeit.' },
        { title: 'Nachfrage-Punktzahl', body: 'Eine Zahl von 1 bis 100: wie viel stärker das Haus ist als die Vermietungen ringsum.' },
        { title: 'Papiere und Prüfung', body: 'PBG, SLF, Laufzeit des Landpachtvertrags. Rote Flaggen sieht man sofort.' },
      ],
    },
    tools: {
      heading: 'Außerdem auf der Seite',
      items: [
        'Fragen Sie in eigenen Worten',
        'Favoriten und PDF-Präsentation',
        'Was die Mieten nebenan bringen',
        'Leben auf Bali: Visa, Schulen, Ärzte',
        'Wie man kauft — Schritt für Schritt',
        'Artikel und Analysen',
      ],
    },
    villas: { heading: 'Sehen Sie sich Villen an', linkAll: 'Alle Villen' },
    districts: {
      heading: 'Wo auf Bali?',
      items: [
        { name: 'Canggu', tagline: 'Meer, Surfen und Cafés', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'Wald, Reisfelder, Ruhe', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'hohe Klippen und Meerblick', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'ruhiger Strand, gut mit Kindern', slug: 'Sanur' },
      ],
    },
    help: {
      heading: 'Wir helfen beim Kauf',
      points: [
        'Wir prüfen die Papiere für Haus und Grundstück',
        'Wir zeigen das Haus per Video — Sie müssen nicht herkommen',
        'Wir bleiben bis zum Schluss dabei',
      ],
      primary: 'Villen ansehen',
      secondary: 'Schreiben Sie uns',
    },
  },
  zh: {
    locale: 'zh-CN',
    hero: {
      h1: '在巴厘岛买房子或公寓',
      sub: '看照片和价格。我们帮你安全买下。',
      tryLabel: '例如',
      suggestions: ['25 万美元以内的别墅', '海边的公寓', '乌布的房子'],
      search: '搜索',
    },
    stats: { objects: '套房子和公寓', complexes: '个住宅社区', developers: '家开发商' },
    browse: {
      heading: '你想找什么？',
      villas: '别墅',
      villasNote: '带花园和泳池的独立房子',
      apartments: '公寓',
      apartmentsNote: '大楼里属于你的家',
      complexes: '社区',
      complexesNote: '带泳池和保安的房子和公寓',
    },
    finder: { heading: '回答三个问题' },
    powers: {
      heading: 'Balinsky 能做什么',
      sub: '东南亚没有哪个房产网站能展示这么多关于一套房的细节。全部公开免费，无需注册。',
      cta: '在一套真实别墅上查看',
      items: [
        { title: '这套房能赚多少', body: '三种收益情景：差、一般、好。按附近已出租的房子计算。' },
        { title: '邻居的价格', body: '看清这套比周围同类更贵还是更便宜。每平方米价格在同一标尺上。' },
        { title: '游客都去哪里', body: '13 600 个巴厘岛地点的热力图。热闹与冷清一目了然。' },
        { title: '房子周边有什么', body: '海滩、咖啡馆、学校、冲浪点、医院——含路程时间。' },
        { title: '需求评分', body: '1 到 100 的一个数字：这套房比周围出租的强多少。' },
        { title: '证件与核查', body: 'PBG、SLF、土地租期。红旗一眼就能看到。' },
      ],
    },
    tools: {
      heading: '网站还有',
      items: [
        '用自己的话提问',
        '收藏与 PDF 演示文稿',
        '周边的租金水平',
        '巴厘岛生活：签证、学校、医生',
        '如何购买——分步指南',
        '文章与解读',
      ],
    },
    villas: { heading: '看看别墅', linkAll: '全部别墅' },
    districts: {
      heading: '在巴厘岛的哪里？',
      items: [
        { name: 'Canggu', tagline: '大海、冲浪和咖啡馆', slug: 'Berawa' },
        { name: 'Ubud', tagline: '森林、稻田、安静', slug: 'Ubud' },
        { name: 'Bukit', tagline: '高高的悬崖和海景', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: '安静的海滩，适合带孩子', slug: 'Sanur' },
      ],
    },
    help: {
      heading: '我们帮你买',
      points: [
        '我们检查房子和土地的证件',
        '我们用视频带你看房——不用飞过来',
        '我们全程陪着你',
      ],
      primary: '看别墅',
      secondary: '联系我们',
    },
  },
  nl: {
    locale: 'nl-NL',
    hero: {
      h1: 'Een huis of appartement op Bali',
      sub: 'Bekijk foto’s en prijzen. Wij helpen je veilig kopen.',
      tryLabel: 'Bijvoorbeeld',
      suggestions: ['Villa’s onder $250.000', 'Appartementen bij zee', 'Huizen in Ubud'],
      search: 'Zoeken',
    },
    stats: { objects: 'huizen en appartementen', complexes: 'wooncomplexen', developers: 'ontwikkelaars' },
    browse: {
      heading: 'Wat zoek je?',
      villas: 'Villa’s',
      villasNote: 'Je eigen huis met tuin en zwembad',
      apartments: 'Appartementen',
      apartmentsNote: 'Je eigen plek in een groot gebouw',
      complexes: 'Wooncomplexen',
      complexesNote: 'Huizen en appartementen met zwembad en bewaking',
    },
    finder: { heading: 'Beantwoord drie vragen' },
    powers: {
      heading: 'Wat Balinsky kan',
      sub: 'Geen enkele vastgoedsite in Zuidoost-Azië laat zoveel over een huis zien. Alles open en gratis, zonder account.',
      cta: 'Bekijk het op een echte villa',
      items: [
        { title: 'Wat het huis opbrengt', body: 'Drie scenario’s: slecht, normaal, goed. Berekend op huizen die er al verhuurd worden.' },
        { title: 'Prijzen van de buren', body: 'Je ziet of dit huis duurder of goedkoper is dan gelijke huizen in de buurt. Prijs per m² op één schaal.' },
        { title: 'Waar toeristen komen', body: 'Warmtekaart van 13.600 plekken op Bali. Drukke en lege buurten in één blik.' },
        { title: 'Wat er in de buurt is', body: 'Strand, café, school, surf, ziekenhuis — met reistijd.' },
        { title: 'Vraagscore', body: 'Eén getal van 1 tot 100: hoeveel sterker het huis is dan de verhuur eromheen.' },
        { title: 'Papieren en controle', body: 'PBG, SLF, looptijd van de grondpacht. Rode vlaggen zie je meteen.' },
      ],
    },
    tools: {
      heading: 'Ook op de site',
      items: [
        'Vraag het in je eigen woorden',
        'Favorieten en PDF-presentatie',
        'Wat de huren in de buurt opleveren',
        'Wonen op Bali: visa, scholen, artsen',
        'Hoe je koopt — stap voor stap',
        'Artikelen en analyses',
      ],
    },
    villas: { heading: 'Bekijk villa’s', linkAll: 'Alle villa’s' },
    districts: {
      heading: 'Waar op Bali?',
      items: [
        { name: 'Canggu', tagline: 'zee, surfen en cafés', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'bos, rijstvelden, rust', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'hoge kliffen en uitzicht op zee', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'rustig strand, fijn met kinderen', slug: 'Sanur' },
      ],
    },
    help: {
      heading: 'Wij helpen je kopen',
      points: [
        'Wij controleren de papieren van het huis en de grond',
        'Wij tonen het huis op video — je hoeft niet te komen',
        'Wij blijven tot het einde bij je',
      ],
      primary: 'Villa’s bekijken',
      secondary: 'Schrijf ons',
    },
  },
  ban: {
    locale: 'id-ID',
    hero: {
      h1: 'Umah utawi apartemen ring Bali',
      sub: 'Cingakin foto lan aji. Titiang nulungin numbas sane aman.',
      tryLabel: 'Upami',
      suggestions: ['Vila sane kirang saking $250.000', 'Apartemen nampek pasih', 'Umah ring Ubud'],
      search: 'Rereh',
    },
    stats: { objects: 'umah lan apartemen', complexes: 'komplek hunian', developers: 'pangwangun' },
    browse: {
      heading: 'Napi sane rerehin Ragane?',
      villas: 'Vila',
      villasNote: 'Umah padidi sareng taman lan kolam',
      apartments: 'Apartemen',
      apartmentsNote: 'Genah padidi ring gedung sane ageng',
      complexes: 'Komplek',
      complexesNote: 'Umah lan apartemen sareng kolam lan penjaga',
    },
    finder: { heading: 'Saurin tigang patakon' },
    powers: {
      heading: 'Napi sane prasida antuk Balinsky',
      sub: 'Nenten wenten situs properti ring Asia Tenggara sane nyinahang akeh kadi puniki indik umah. Sami terbuka lan gratis, nenten perlu ndaftar.',
      cta: 'Cingakin conto ring silih tunggil vila',
      items: [
        { title: 'Sapunapi hasil umahe', body: 'Tigang skenario hasil: kaon, biasa, becik. Kaitung saking umah sane sampun kasewaang ring kiwa tengen.' },
        { title: 'Aji pisagane', body: 'Kacingak umah puniki maelan napi mudahan saking sane pateh ring kiwa tengen. Aji sabilang m² ring asiki skala.' },
        { title: 'Ring dija turise malelancaran', body: 'Peta panes 13.600 genah ring Bali. Genah rame lan genah sepi prasida kacingak.' },
        { title: 'Napi sane nampek ring umah', body: 'Pasih, kafe, sekolah, selancar, rumah sakit — sareng suenipun ring margi.' },
        { title: 'Skor permintaan', body: 'Asiki angka 1 nyantos 100: sapunapi kuat umahe bandingang sareng sane kasewaang ring kiwa tengen.' },
        { title: 'Dokumen lan pameriksaan', body: 'PBG, SLF, masa sewa tanah. Tanda bahaya prasida kacingak digelis.' },
      ],
    },
    tools: {
      heading: 'Wenten taler ring situs',
      items: [
        'Metaken nganggen basan Ragane',
        'Kaplihan lan presentasi PDF',
        'Sapunapi aji sewa ring kiwa tengen',
        'Urip ring Bali: visa, sekolah, dokter',
        'Carane numbas — sabilang langkah',
        'Artikel lan ulasan',
      ],
    },
    villas: { heading: 'Cingakin vila', linkAll: 'Sami vila' },
    districts: {
      heading: 'Ring dija ring Bali?',
      items: [
        { name: 'Canggu', tagline: 'pasih, selancar, lan kafe', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'alas, subak, sutrepti', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'bukit tegeh lan pasih', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'pasih sepi, becik sareng alit-alit', slug: 'Sanur' },
      ],
    },
    help: {
      heading: 'Titiang nulungin numbas',
      points: [
        'Titiang mriksa dokumen umah lan tanahnyane',
        'Titiang nyinahang umahe lewat video — nenten perlu rauh',
        'Titiang nyarengin nyantos puput',
      ],
      primary: 'Cingakin vila',
      secondary: 'Kontak titiang',
    },
  },
  pl: {
    locale: 'pl-PL',
    hero: {
      h1: 'Dom albo mieszkanie na Bali',
      sub: 'Zobacz zdjęcia i ceny. Pomożemy kupić bezpiecznie.',
      tryLabel: 'Na przykład',
      suggestions: ['Wille do 250 000 $', 'Mieszkania przy morzu', 'Domy w Ubud'],
      search: 'Szukaj',
    },
    stats: { objects: 'domów i mieszkań', complexes: 'kompleksów mieszkaniowych', developers: 'deweloperów' },
    browse: {
      heading: 'Czego szukasz?',
      villas: 'Wille',
      villasNote: 'Własny dom z ogrodem i basenem',
      apartments: 'Mieszkania',
      apartmentsNote: 'Własne miejsce w dużym budynku',
      complexes: 'Kompleksy',
      complexesNote: 'Domy i mieszkania z basenem i ochroną',
    },
    finder: { heading: 'Odpowiedz na trzy pytania' },
    powers: {
      heading: 'Co potrafi Balinsky',
      sub: 'Żaden serwis nieruchomości w Azji Południowo-Wschodniej nie pokazuje tylu danych o domu. Wszystko otwarte i za darmo, bez rejestracji.',
      cta: 'Zobacz na prawdziwej willi',
      items: [
        { title: 'Ile zarobi dom', body: 'Trzy scenariusze dochodu: słaby, normalny, dobry. Liczone po domach już wynajmowanych obok.' },
        { title: 'Ceny sąsiadów', body: 'Widać, czy ten dom jest droższy czy tańszy od podobnych obok. Cena za m² na jednej skali.' },
        { title: 'Gdzie chodzą turyści', body: 'Mapa ciepła 13 600 miejsc na Bali. Od razu widać żywe i puste okolice.' },
        { title: 'Co jest w pobliżu domu', body: 'Plaża, kawiarnia, szkoła, surf, szpital — z czasem dojazdu.' },
        { title: 'Ocena popytu', body: 'Jedna liczba od 1 do 100: o ile dom jest mocniejszy od wynajmowanych obok.' },
        { title: 'Dokumenty i weryfikacja', body: 'PBG, SLF, okres dzierżawy ziemi. Czerwone flagi widać od razu.' },
      ],
    },
    tools: {
      heading: 'Jeszcze na stronie',
      items: [
        'Zapytaj własnymi słowami',
        'Ulubione i prezentacja PDF',
        'Ile wynoszą czynsze obok',
        'Życie na Bali: wizy, szkoły, lekarze',
        'Jak kupić — krok po kroku',
        'Artykuły i analizy',
      ],
    },
    villas: { heading: 'Zobacz wille', linkAll: 'Wszystkie wille' },
    districts: {
      heading: 'Gdzie na Bali?',
      items: [
        { name: 'Canggu', tagline: 'morze, surfing i kawiarnie', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'las, pola ryżowe, cisza', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'wysokie klify i widok na ocean', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'cicha plaża, dobrze z dziećmi', slug: 'Sanur' },
      ],
    },
    help: {
      heading: 'Pomożemy kupić',
      points: [
        'Sprawdzimy papiery domu i ziemi',
        'Pokażemy dom na wideo — nie musisz przylatywać',
        'Będziemy z Tobą do samego końca',
      ],
      primary: 'Zobacz wille',
      secondary: 'Napisz do nas',
    },
  },
  uk: {
    locale: 'uk-UA',
    hero: {
      h1: 'Дім або квартира на Балі',
      sub: 'Дивіться фото й ціни. Допоможемо купити безпечно.',
      tryLabel: 'Наприклад',
      suggestions: ['Вілли до $250 000', 'Квартири біля моря', 'Будинки в Убуді'],
      search: 'Знайти',
    },
    stats: { objects: 'будинків і квартир', complexes: 'житлових комплексів', developers: 'забудовників' },
    browse: {
      heading: 'Що ви шукаєте?',
      villas: 'Вілли',
      villasNote: 'Власний дім із садом і басейном',
      apartments: 'Квартири',
      apartmentsNote: 'Власне житло у великому будинку',
      complexes: 'Комплекси',
      complexesNote: 'Будинки й квартири з басейном і охороною',
    },
    finder: { heading: 'Дайте відповідь на три питання' },
    powers: {
      heading: 'Що вміє Balinsky',
      sub: 'Жоден сайт нерухомості в Південно-Східній Азії не показує стільки про будинок. Усе відкрито й безкоштовно, без реєстрації.',
      cta: 'Подивитися на прикладі вілли',
      items: [
        { title: 'Скільки заробить будинок', body: 'Три сценарії доходу: поганий, звичайний, добрий. Рахуємо за будинками, які вже здаються поруч.' },
        { title: 'Ціни сусідів', body: 'Видно, дорожчий цей будинок чи дешевший за такі самі поруч. Ціна за м² на одній шкалі.' },
        { title: 'Куди ходять туристи', body: 'Теплова карта 13 600 місць Балі. Одразу видно живі райони й порожні.' },
        { title: 'Що поруч із будинком', body: 'Пляж, кафе, школа, серф, лікарня — з часом у дорозі.' },
        { title: 'Бал затребуваності', body: 'Одне число від 1 до 100: наскільки будинок сильніший за ті, що здаються навколо.' },
        { title: 'Документи та перевірка', body: 'PBG, SLF, строк оренди землі. Червоні прапорці видно одразу.' },
      ],
    },
    tools: {
      heading: 'Ще на сайті',
      items: [
        'Запитайте своїми словами',
        'Обране та презентація в PDF',
        'Скільки здають в оренду поруч',
        'Життя на Балі: візи, школи, лікарі',
        'Як купити — покроково',
        'Статті та розбори',
      ],
    },
    villas: { heading: 'Подивіться вілли', linkAll: 'Усі вілли' },
    districts: {
      heading: 'Де на Балі?',
      items: [
        { name: 'Canggu', tagline: 'море, серфінг і кафе', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'ліс, рисові поля, тиша', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'високі скелі й вид на океан', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'тихий пляж, добре з дітьми', slug: 'Sanur' },
      ],
    },
    help: {
      heading: 'Допоможемо купити',
      points: [
        'Перевіримо документи на дім і землю',
        'Покажемо дім по відео — приїжджати не треба',
        'Будемо поруч до самого кінця',
      ],
      primary: 'Дивитися вілли',
      secondary: 'Написати нам',
    },
  },
} as const

// === DATA ===========================================================

// Фильтр «ничего не отсеиваем» — базовый набор для buildAllCards.
const NO_FILTERS: VillaFilterState = {
  q: '', priceMin: null, priceMax: null,
  district: [], bedrooms: [], status: [], permit: [], year: [], developer: [], style: [], features: [], goal: null, dealType: [],
}

async function loadTopVillas(lang: Lang): Promise<VillaCardData[]> {
  try {
    const [{ enriched, manifest }, scores] = await Promise.all([
      loadAllVillas(),
      loadAllVillaScores().catch(() => undefined),
    ])
    // Фильтр: только виллы с ПОЛУЧЕННЫМ PBG или SLF. Заявки и «нет»
    // на главную не идут — покупатель должен сразу видеть «чистые»
    // объекты, это buyer-first позиционирование.
    //   PBG = Persetujuan Bangunan Gedung — разрешение на строительство (получено)
    //   SLF = Sertifikat Laik Fungsi      — сертификат пригодности (получен, выше PBG)
    const filters: VillaFilterState = { ...NO_FILTERS, permit: ['PBG', 'SLF'] }
    const cards = buildAllVillaCards(enriched, manifest, filters, scores, 'investment-desc', undefined, lang)
    return cards.slice(0, 6)
  } catch { return [] }
}

// Обложки для плиток районов. Раньше их поставлял блок «Подборки»; он
// с главной ушёл, поэтому берём первое фото каждого района прямо из
// каталога вилл. loadAllVillas() кэширован на уровне модуля
// (revisionedCache), так что второго обращения к Supabase здесь нет.
// Строим карточки на 'en': нужен латинский Location 2 ('Berawa', 'Ubud'…),
// которым размечены районы в COPY.
async function loadDistrictCovers(): Promise<Record<string, string>> {
  const covers: Record<string, string> = {}
  try {
    const { enriched, manifest } = await loadAllVillas()
    const cards = buildAllVillaCards(enriched, manifest, NO_FILTERS, undefined, 'investment-desc', undefined, 'en')
    for (const card of cards) {
      const key = card.district?.trim().toLowerCase()
      if (!key || covers[key] || !card.photos[0]) continue
      covers[key] = card.photos[0]
    }
  } catch { /* плитки останутся с градиентом вместо фото */ }
  return covers
}

async function loadStats() {
  const [v, a, k, d] = await Promise.all([
    sb.from('raw_villas').select('airtable_id', { count: 'exact', head: true }),
    sb.from('raw_apartments').select('airtable_id', { count: 'exact', head: true }),
    sb.from('raw_complexes').select('airtable_id', { count: 'exact', head: true }),
    sb.from('raw_developers').select('airtable_id', { count: 'exact', head: true }),
  ])
  return {
    objects: (v.count ?? 0) + (a.count ?? 0),
    complexes: k.count ?? 0,
    developers: d.count ?? 0,
  }
}

// === COMPONENT =======================================================

export async function HomeLanding({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const [stats, topVillas, districtCovers, finderItems] = await Promise.all([
    loadStats(),
    loadTopVillas(lang),
    loadDistrictCovers(),
    loadHomeFinder(lang),
  ])

  const villasHref = switchLangPath('/ru/villy', lang)
  const apartmentsHref = switchLangPath('/ru/apartamenty', lang)
  const complexesHref = switchLangPath('/ru/zhilye-kompleksy', lang)

  // Immersive hero: a real catalog photo behind the headline. Top villas are
  // ranked by investment score with a clean-document filter, so [0] is a strong
  // hero shot. (Complex covers can 404, villa manifest photos are reliable.)
  const heroPhoto = topVillas.find(v => v.photos[0])?.photos[0] ?? null

  // «Посмотреть на примере виллы» ведёт на реальную карточку из каталога —
  // хардкод слага протух бы при первой же продаже объекта.
  const demoVilla = topVillas[0]
  const demoVillaHref = demoVilla ? switchLangPath(`/ru/villy/o/${demoVilla.slug}`, lang) : null

  const toolLinks = TOOL_ROUTES.map((t, i) => ({
    href: switchLangPath(t.path, lang),
    Icon: t.Icon,
    label: c.tools.items[i],
  })).filter(t => Boolean(t.label))

  const browseCards = [
    { label: c.browse.villas, note: c.browse.villasNote, href: villasHref, Icon: Home },
    { label: c.browse.apartments, note: c.browse.apartmentsNote, href: apartmentsHref, Icon: Building2 },
    { label: c.browse.complexes, note: c.browse.complexesNote, href: complexesHref, Icon: Building },
  ]

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <Header />

      {/* === 1. Фото + один вопрос + поиск ======================= */}
      <section className="relative flex items-end min-h-[72vh] md:min-h-[80vh] overflow-hidden bg-[#0E1A14]">
        {heroPhoto && (
          <Image
            src={heroPhoto}
            alt={c.hero.h1}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        {/* Legibility wash — dark from the bottom where the copy sits. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06100C]/96 via-[#06100C]/62 to-[#06100C]/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06100C]/70 via-[#06100C]/10 to-transparent" />

        <PageContainer>
          <div className="relative max-w-[720px] pt-32 pb-14 md:pt-40 md:pb-20">
            <h1 className="text-[36px] md:text-[60px] leading-[1.05] font-extrabold tracking-[-0.015em] text-white [text-shadow:0_2px_22px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.55)]">
              {c.hero.h1}
            </h1>
            <p className="mt-4 md:mt-5 text-[18px] md:text-[24px] leading-[1.3] font-semibold text-white/95 max-w-[560px] [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
              {c.hero.sub}
            </p>

            <div className="mt-8 md:mt-10">
              <HeroCatalogSearch
                lang={lang}
                tryLabel={c.hero.tryLabel}
                suggestions={c.hero.suggestions.map(label => ({ label, href: villasHref }))}
                sendAria={c.hero.search}
              />
            </div>
          </div>
        </PageContainer>
      </section>

      {/* === 2. Три числа ======================================== */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <PageContainer>
          <div className="py-7 md:py-8 grid grid-cols-3 gap-x-5 gap-y-6">
            <TrustCell value={fmtInt(stats.objects, c.locale)} label={c.stats.objects} />
            <TrustCell value={fmtInt(stats.complexes, c.locale)} label={c.stats.complexes} />
            <TrustCell value={fmtInt(stats.developers, c.locale)} label={c.stats.developers} />
          </div>
        </PageContainer>
      </section>

      {/* === 3. Что вы ищете? — три больших выбора =============== */}
      <SectionWrap className="border-t border-[var(--color-border)]">
        <SectionHead title={c.browse.heading} />
        <div className="mt-8 md:mt-10 grid sm:grid-cols-3 gap-5">
          {browseCards.map(({ label, note, href, Icon }) => (
            <Link
              key={label}
              href={href}
              className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 md:p-7 no-underline hover:border-[var(--color-primary)] transition-colors"
            >
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]">
                <Icon size={22} strokeWidth={1.7} />
              </span>
              <div className="mt-5 text-[21px] md:text-[23px] font-medium text-[#0E1A14] leading-tight">{label}</div>
              <p className="mt-2 text-[14.5px] leading-[1.55] text-[#4B5563]">{note}</p>
              <span className="mt-4 inline-flex items-center text-[var(--color-primary)] group-hover:translate-x-1 transition-transform">
                <ArrowRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </SectionWrap>

      {/* === 4. Что умеет Balinsky — витрина возможностей ======== */}
      <SectionWrap className="border-t border-[var(--color-border)]">
        <SectionHead title={c.powers.heading} />
        <p className="mt-4 max-w-[680px] text-[16px] md:text-[17px] leading-[1.6] text-[#4B5563]">
          {c.powers.sub}
        </p>
        <div className="mt-8 md:mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
          {c.powers.items.map((p, i) => {
            const Icon = POWER_ICONS[i]
            const Visual = POWER_VISUALS[i]
            return (
              <div key={p.title} className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
                <div className="relative h-[150px] bg-[var(--color-search-bg)] border-b border-[var(--color-border)]">
                  {Visual && <Visual lang={lang} />}
                </div>
                <div className="p-6 md:p-7">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]">
                    {Icon && <Icon size={19} strokeWidth={1.7} />}
                  </span>
                  <h3 className="mt-5 text-[19px] font-medium text-[#0E1A14] leading-tight">{p.title}</h3>
                  <p className="mt-2.5 text-[15px] leading-[1.6] text-[#4B5563]">{p.body}</p>
                </div>
              </div>
            )
          })}
        </div>
        {demoVillaHref && (
          <div className="mt-9">
            <Link
              href={demoVillaHref}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] text-white text-[15px] font-medium hover:bg-[var(--color-primary-pressed)] transition-colors no-underline"
            >
              <ArrowRight size={15} /> {c.powers.cta}
            </Link>
          </div>
        )}

        {/* Инструменты — вторым слоем, одной строкой каждый. */}
        <div className="mt-14 md:mt-16 pt-10 border-t border-[var(--color-border)]">
          <h3 className="text-[17px] md:text-[19px] font-medium text-[#0E1A14]">{c.tools.heading}</h3>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {toolLinks.map(t => (
              <Link
                key={t.href}
                href={t.href}
                className="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3.5 no-underline hover:border-[var(--color-primary)] transition-colors"
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-search-bg)] text-[var(--color-primary-pressed)] shrink-0">
                  <t.Icon size={16} strokeWidth={1.8} />
                </span>
                <span className="text-[14.5px] leading-snug text-[#1A2620]">{t.label}</span>
                <ArrowRight size={15} className="ml-auto shrink-0 text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </SectionWrap>

      {/* === 5. Подбор за три вопроса =========================== */}
      {finderItems.length > 0 && (
        <SectionWrap className="border-t border-[var(--color-border)] bg-[#FAFCFB]">
          <SectionHead title={c.finder.heading} />
          <div className="mt-8 md:mt-10">
            <HomeFinder items={finderItems} lang={lang} />
          </div>
        </SectionWrap>
      )}

      {/* === 6. Виллы =========================================== */}
      {topVillas.length > 0 && (
        <SectionWrap className="border-t border-[var(--color-border)] bg-[#FAFCFB]">
          <SectionHead title={c.villas.heading} />
          <div className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {topVillas.map(v => <VillaCard key={v.slug} a={v} lang={lang} />)}
          </div>
          <div className="mt-10">
            <Link href={villasHref} className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--color-primary)] hover:gap-2.5 transition-all no-underline">
              {c.villas.linkAll} <ArrowRight size={15} />
            </Link>
          </div>
        </SectionWrap>
      )}

      {/* === 7. Где на Бали? ==================================== */}
      <SectionWrap className="border-t border-[var(--color-border)]">
        <SectionHead title={c.districts.heading} />
        <div className="mt-8 md:mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {c.districts.items.map(d => {
            const cover = districtCovers[d.slug.toLowerCase()]
            // Link to the crawlable canonical filter path (/ru/villy/<slug>,
            // which is in the sitemap) instead of ?district=, which robots.txt
            // blocks via `Disallow: /*?`. EN has no clean filter routes, so it
            // keeps the query form (its filter pages aren't indexed anyway).
            const districtSlug = DISTRICT_TO_SLUG[d.slug]
            const districtHref = lang === 'ru' && districtSlug
              ? `${villasHref}/${districtSlug}`
              : `${villasHref}?district=${d.slug}`
            return (
              <Link
                key={d.name}
                href={districtHref}
                className="group relative flex items-end overflow-hidden rounded-2xl aspect-[3/4] bg-[#0E1A14] no-underline"
              >
                {cover ? (
                  <Image
                    src={cover}
                    alt={d.name}
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#16352A] to-[#0E1A14]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#091310]/85 via-[#091310]/15 to-transparent" />
                <div className="relative p-4 md:p-5">
                  <div className="flex items-center gap-1.5 text-[18px] md:text-[19px] font-medium text-white">
                    <MapPin size={14} className="opacity-80" /> {d.name}
                  </div>
                  <div className="mt-1 text-[13px] text-white/80 leading-[1.45]">{d.tagline}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </SectionWrap>

      {/* === 8. Поможем купить ================================== */}
      <section className="border-t border-[var(--color-border)] py-16 md:py-24 bg-[var(--color-bg)]">
        <PageContainer>
          <div className="max-w-[720px] mx-auto text-center">
            <h2 className="text-[30px] md:text-[42px] leading-[1.1] font-light tracking-[-0.02em] text-[#0E1A14]">
              {c.help.heading}
            </h2>
            <ul className="mt-8 grid gap-3 text-left sm:max-w-[560px] sm:mx-auto">
              {c.help.points.map(pt => (
                <li key={pt} className="flex items-start gap-3 rounded-xl bg-white border border-[var(--color-border)] p-4">
                  <ShieldCheck size={18} strokeWidth={1.8} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                  <span className="text-[15px] leading-[1.5] text-[#1A2620]">{pt}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex items-center gap-3 flex-wrap justify-center">
              <Link
                href={villasHref}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-[15px] font-medium hover:bg-[var(--color-primary-pressed)] transition-colors no-underline"
              >
                <Search size={16} /> {c.help.primary}
              </Link>
              <LeadButton
                label={c.help.secondary}
                lang={lang}
                context={{ source: 'home' }}
                icon={<Send size={15} />}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-[#D5DDD8] text-[15px] font-medium text-[#1A2620] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
              />
            </div>
          </div>
        </PageContainer>
      </section>

    </div>
  )
}

// === Subcomponents ==================================================

function SectionWrap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`py-14 md:py-20 ${className}`}>
      <PageContainer>{children}</PageContainer>
    </section>
  )
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="max-w-[820px]">
      <h2 className="text-[26px] md:text-[38px] leading-[1.15] font-light tracking-[-0.02em] text-[#0E1A14]">
        {title}
      </h2>
    </div>
  )
}

function TrustCell({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-[22px] md:text-[26px] font-light text-[#0E1A14] tabular-nums leading-none">
        {value}
      </div>
      <div className="mt-2 text-[12px] md:text-[12.5px] text-[#4B5563] leading-[1.4]">
        {label}
      </div>
    </div>
  )
}

function fmtInt(n: number, locale: string): string {
  try { return n.toLocaleString(locale) } catch { return String(n) }
}
