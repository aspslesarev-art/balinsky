// Главная Balinsky — buyer-first позиционирование. Покупатель пришёл
// купить виллу с красивым видом, проверенными документами и понятной
// доходностью, а не читать про «AI infrastructure». AI представлен
// одной отдельной секцией (AI-консьерж) как сервис, упрощающий
// именно его поиск. Tech-stack badges уехали в quiet trust-strip
// у футера — это для грантов/VC, не для покупателя.
//
// Структура:
//   1. Hero — про объект мечты + поиск + 4 promise-чипа
//   2. Trust strip — количество объектов, документы, страны
//   3. Featured villas — 6 реальных карточек с лучшей доходностью
//   4. Three promises — документы / доходность / съёмка с земли
//   5. AI-консьерж — одна сильная секция (не 6 карточек)
//   6. Featured complexes — 4 ЖК с фото
//   7. Districts — визуальные карточки районов
//   8. Knowledge — образовательный контент
//   9. Social proof — 3 цитаты
//  10. Final CTA + tech trust strip (quiet)

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { ArrowRight, Send, FileCheck2, TrendingUp, Video, Phone, Sparkles, MapPin, Building2, BarChart3, ShieldCheck } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { VillaCard, type VillaCardData } from '@/components/VillaCard'
import { loadAll as loadAllVillas, buildAllCards as buildAllVillaCards, type VillaFilterState } from '@/app/ru/villy/_lib'
import { loadAllVillaScores } from '@/lib/investment/batch-scores'
import { loadHomeCollections } from '@/lib/home-collections'
import { HomeCollections } from '@/components/HomeCollections'
import { HeroBalinaSearch } from '@/components/HeroBalinaSearch'
import { BalinaCTA } from '@/components/BalinaCTA'
import { LeadButton } from '@/components/LeadButton'
import { BalinaChatMock } from '@/components/BalinaChatMock'
import { isHiddenDeveloper } from '@/lib/hidden-developers'
import { loadHomeFinder } from '@/lib/home-finder'
import { DISTRICT_TO_SLUG } from '@/lib/seo-routes'
import { HomeFinder } from '@/components/HomeFinder'
import {
  StepChat, StepStudy, StepRequest,
  VizYield, VizCompetitors, VizNearby, VizDocs, VizDeveloper, VizFootage,
  SafetyFlow,
} from '@/components/LandingVisuals'
import { pickCopy, type Lang } from '@/lib/i18n'
import { translit, hasCyrillic } from '@/lib/translit'
import { cdnBucketBase, cdnManifestUrl } from '@/lib/photo-cdn'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

// === COPY =============================================================

const COPY = {
  ru: {
    locale: 'ru-RU',
    hero: {
      eyebrow: 'НЕЗАВИСИМЫЙ МАРКЕТПЛЕЙС · БАЛИ',
      h1: 'Купить виллу или апартаменты на Бали',
      h1sub: 'Безопасно, с проверенными документами и понятной доходностью.',
      placeholder: '2-спальная вилла рядом с Чангу до $300 000, под аренду…',
      tryLabel: 'Попробуйте',
      suggestions: [
        { label: 'Виллы в Убуде до $250k', href: '/ru/villy' },
        { label: 'Готовые с доходностью от 10%', href: '/ru/villy' },
        { label: 'ЖК со сдачей в 2026', href: '/ru/zhilye-kompleksy' },
      ],
      ctaPrimary: 'Найти виллу',
      ctaSecondary: 'Спросить менеджера',
      voiceAria: 'Спросить голосом',
      foot: 'Без регистрации.',
    },
    howItWorks: {
      eyebrow: 'КАК ЭТО РАБОТАЕТ',
      heading: 'Купите спокойно — даже не приезжая на Бали.',
      sub: 'AI-брокер и команда на земле проведут от вопроса до ключей.',
      cta: 'Спросить AI-брокера',
      steps: [
        { n: '01', Icon: Sparkles, title: 'Спросите AI-брокера', body: 'Подберёт объекты и ответит на вопросы. Бесплатно, 24/7.' },
        { n: '02', Icon: TrendingUp, title: 'Изучите объект', body: 'Доходность соседей, конкуренты, документы, застройщик — без рендеров.' },
        { n: '03', Icon: Phone, title: 'Оставьте заявку', body: 'Zoom-презентация, показ, безопасная сделка с гарантиями.' },
      ],
    },
    features: {
      eyebrow: 'ЦИФРЫ, А НЕ ОБЕЩАНИЯ',
      heading: 'Решайте по реальным цифрам, а не по словам застройщика.',
      sub: 'Всё видно ещё до разговора с продавцом.',
      items: [
        { Icon: TrendingUp, title: 'Доходность соседей', body: 'Сколько реально зарабатывают рядом — по Booking и Airbnb.' },
        { Icon: BarChart3, title: 'Конкуренты объекта', body: 'С чем сравнить и как объект на их фоне.' },
        { Icon: MapPin, title: 'Что рядом и сколько ехать', body: 'Кафе, пляжи, школы, споты — с временем в пути.' },
        { Icon: FileCheck2, title: 'Документы и зональность', body: 'PBG, SLF, leasehold — без серых зон с землёй.' },
        { Icon: Building2, title: 'Профиль застройщика', body: 'Что построил, что строит, какие новости.' },
        { Icon: Video, title: 'Съёмка с земли', body: 'Реальное видео со стройки, а не рендеры.' },
      ],
    },
    safety: {
      eyebrow: 'БЕЗОПАСНОСТЬ СДЕЛКИ',
      heading: 'Без серых схем и риска потерять деньги.',
      body: 'Вся информация — наша, плюс внутренние нюансы, которых нет на сайте. Поможем закрыть сделку с гарантиями.',
      points: [
        'Независимый маркетплейс, а не лендинг одного застройщика',
        'Знаем внутренние нюансы по объектам и застройщикам',
        'Прямые контакты менеджеров — общайтесь сами или через нас',
        'Сопровождение, гарантии и страховки на сделке',
      ],
      cta: 'Оставить заявку',
      ctaText: 'Хочу оставить заявку — подключите менеджера: нужна презентация объекта и помощь с безопасной сделкой.',
    },
    villasSection: {
      eyebrow: '01 · ВИЛЛЫ',
      heading: 'Только виллы с готовыми документами.',
      sub: 'Без серых зон с землёй. Сверху — самые выгодные.',
      linkAll: 'Все виллы каталога',
    },
    ai: {
      eyebrow: '02 · AI-БРОКЕР',
      heading: 'Спросите что угодно — без агента, без спама, бесплатно.',
      body: 'Знает каждый объект на платформе. Спросите голосом или текстом — получите варианты с цифрами, документами и доходностью.',
      pointHeading1: 'Описание вместо фильтров',
      pointBody1: '«Двушка в Чангу до $300k для жены и удалённой работы» — этого достаточно. AI разберёт намерение и подберёт то, что подходит.',
      pointHeading2: 'Вопросы по любому объекту',
      pointBody2: 'Какие документы? Сколько на земельный налог? Когда сдают? Спрашивайте — AI отвечает мгновенно из самой полной базы по острову.',
      pointHeading3: 'На вашем языке, 24/7',
      pointBody3: 'Не нужно ждать утра по Бали — спросили ночью, получили ответ ночью. На том языке, на котором удобно.',
      cta: 'Открыть AI-консьерж в Telegram',
      hint: 'Тот же диалог хранится — спросили вчера, продолжаем сегодня. История, документы, расчёты в одном чате.',
      anon: 'Спрашивайте анонимно. Менеджер подключится, только если оставите контакты.',
    },
    complexesSection: {
      eyebrow: '03 · ЖИЛЫЕ КОМПЛЕКСЫ',
      heading: 'Закрытые комплексы с инфраструктурой.',
      sub: 'Бассейн, охрана, управляющая компания. Юниты под аренду и под себя.',
      linkAll: 'Все комплексы',
    },
    districts: {
      eyebrow: '04 · РАЙОНЫ',
      heading: 'В каком районе купить под вашу цель.',
      items: [
        { name: 'Чангу', tagline: 'сёрфинг, кафе, посуточная аренда', slug: 'Berawa' },
        { name: 'Убуд', tagline: 'природа, рисовые террасы, спокойствие', slug: 'Ubud' },
        { name: 'Букит', tagline: 'премиальные виды на океан', slug: 'Uluwatu' },
        { name: 'Санур', tagline: 'семейный формат, тихий пляж', slug: 'Sanur' },
      ],
    },
    knowledge: {
      eyebrow: '05 · ЗНАНИЯ',
      heading: 'Поймёте сделку до того, как платить.',
      items: [
        { title: 'Как купить недвижимость на Бали', body: 'Leasehold vs freehold, налоги, нотариус, регистрация — пошагово.', href: '/ru/znaniya' },
        { title: 'Документы PBG и SLF — зачем', body: 'Без них объект — серая зона. Что проверять и где.', href: '/ru/znaniya' },
        { title: 'Реальная доходность от аренды', body: 'Какие районы дают 10%+, какие — 4%. И почему прайс-листы врут.', href: '/ru/znaniya' },
      ],
      linkAll: 'База знаний',
    },
    proof: {
      heading: 'Уже купили через нас.',
      items: [
        { quote: 'Купил виллу за две недели. Без перелёта на Бали. Все документы и проверки — внутри платформы.', author: 'Alexander K., Moscow', role: 'купил Origins Villa 75 м² в декабре 2025' },
        { quote: 'Сравнили семь объектов в одном Telegram-чате. AI-брокер отвечал ночью, когда я не мог уснуть от расчётов.', author: 'Anna L., Berlin', role: 'купила апартаменты в Canggu' },
        { quote: 'Объект соответствовал съёмке. Это редкость на Бали — обычно фото в рекламе и реальность совсем разные.', author: 'Dmitri I., Dubai', role: 'купил виллу в Pererenan' },
      ],
    },
    finalCta: {
      h2: 'Найдите недвижимость, которую реально купите.',
      sub: 'Спросите AI-брокера или оставьте заявку — доведём до безопасной сделки.',
      primary: 'Спросить AI-брокера',
      secondary: 'Оставить заявку',
      secondaryText: 'Хочу оставить заявку — подключите менеджера: нужна презентация объекта и помощь со сделкой.',
    },
  },
  en: {
    locale: 'en-US',
    hero: {
      eyebrow: 'INDEPENDENT MARKETPLACE · BALI',
      h1: 'Buy a villa or apartment in Bali',
      h1sub: 'Safely, with verified documents and transparent yield.',
      placeholder: '2-bedroom villa near Canggu under $300k with rental potential…',
      tryLabel: 'Try',
      suggestions: [
        { label: 'Villas in Ubud under $250k', href: '/en/villas' },
        { label: 'Ready-to-rent with 10%+ yield', href: '/en/villas' },
        { label: 'Complexes delivering in 2026', href: '/en/complexes' },
      ],
      ctaPrimary: 'Find a villa',
      ctaSecondary: 'Talk to a manager',
      voiceAria: 'Ask by voice',
      foot: 'No signup.',
    },
    howItWorks: {
      eyebrow: 'HOW IT WORKS',
      heading: 'Buy with confidence — without flying to Bali.',
      sub: 'An AI broker and a team on the ground take you from question to keys.',
      cta: 'Ask the AI broker',
      steps: [
        { n: '01', Icon: Sparkles, title: 'Ask the AI broker', body: 'It shortlists properties and answers your questions. Free, 24/7.' },
        { n: '02', Icon: TrendingUp, title: 'Study the property', body: 'Neighbour yield, competitors, documents, developer — no renders.' },
        { n: '03', Icon: Phone, title: 'Leave a request', body: 'A Zoom presentation, a viewing, a safe deal with guarantees.' },
      ],
    },
    features: {
      eyebrow: 'NUMBERS, NOT PROMISES',
      heading: 'Decide on real numbers, not the developer\'s pitch.',
      sub: 'All visible before you talk to the seller.',
      items: [
        { Icon: TrendingUp, title: 'Neighbour yield', body: 'What nearby properties actually earn — from Booking and Airbnb.' },
        { Icon: BarChart3, title: 'The competitors', body: 'What to compare against, and how it stacks up.' },
        { Icon: MapPin, title: 'What\'s nearby and how far', body: 'Cafés, beaches, schools, surf spots — with travel times.' },
        { Icon: FileCheck2, title: 'Documents and zoning', body: 'PBG, SLF, leasehold — no grey land zones.' },
        { Icon: Building2, title: 'Developer profile', body: 'What they\'ve built, what\'s in progress, the news.' },
        { Icon: Video, title: 'Ground-level footage', body: 'Real video from the site — not renders.' },
      ],
    },
    safety: {
      eyebrow: 'A SAFER DEAL',
      heading: 'No grey schemes, no risk of losing your money.',
      body: 'All the data is ours, plus the internal details you won\'t find on the site. We\'ll help you close the deal with guarantees.',
      points: [
        'An independent marketplace, not one developer\'s landing page',
        'We know the internal details on properties and developers',
        'Direct manager contacts — reach out yourself or through us',
        'Hand-holding, guarantees and insurance on the deal',
      ],
      cta: 'Leave a request',
      ctaText: 'I\'d like to leave a request — please connect a manager: I need a property presentation and help with a safe deal.',
    },
    villasSection: {
      eyebrow: '01 · VILLAS',
      heading: 'Only villas with documents in hand.',
      sub: 'No grey-zone land. The best-value ones on top.',
      linkAll: 'All villas',
    },
    ai: {
      eyebrow: '02 · AI BROKER',
      heading: 'Ask anything — no agent, no spam, free.',
      body: 'It knows every property on the platform. Ask by voice or text — get options with numbers, documents and yield.',
      pointHeading1: 'Description instead of filters',
      pointBody1: '"2BR in Canggu under $300k for my partner and remote work" — that\'s enough. The AI parses intent and surfaces what fits.',
      pointHeading2: 'Questions on any property',
      pointBody2: 'What\'s the paperwork like? Annual land tax? Delivery date? Ask away — the AI answers instantly from the most complete database on the island.',
      pointHeading3: 'In your language, 24/7',
      pointBody3: 'No need to wait for Bali morning — ask at midnight, get an answer at midnight. In the language that\'s comfortable for you.',
      cta: 'Open AI concierge in Telegram',
      hint: 'Conversation persists — ask yesterday, continue today. History, documents, calculations in one thread.',
      anon: 'Ask anonymously. A manager steps in only if you leave your contacts.',
    },
    complexesSection: {
      eyebrow: '03 · RESIDENTIAL COMPLEXES',
      heading: 'Gated complexes with infrastructure.',
      sub: 'Pool, security, property management. Units for rental income and for living.',
      linkAll: 'All complexes',
    },
    districts: {
      eyebrow: '04 · DISTRICTS',
      heading: 'Which district fits your goal.',
      items: [
        { name: 'Canggu', tagline: 'surf, cafés, daily rental', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'nature, rice terraces, calm', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'premium ocean views', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'family-friendly, quiet beach', slug: 'Sanur' },
      ],
    },
    knowledge: {
      eyebrow: '05 · LEARN',
      heading: 'Understand the deal before you pay.',
      items: [
        { title: 'How to buy property in Bali', body: 'Leasehold vs freehold, taxes, notary, registration — step by step.', href: '/en/knowledge' },
        { title: 'PBG and SLF — what they are', body: 'Without them, a property is grey-zone. What to check and where.', href: '/en/knowledge' },
        { title: 'Real rental yield on Bali', body: 'Which districts deliver 10%+, which give 4%. And why pitch decks lie.', href: '/en/knowledge' },
      ],
      linkAll: 'Knowledge base',
    },
    proof: {
      heading: 'Already bought through us.',
      items: [
        { quote: 'Bought a villa in two weeks. Without flying to Bali. All paperwork and checks inside the platform.', author: 'Alexander K., Moscow', role: 'bought Origins Villa 75 m² in December 2025' },
        { quote: 'We compared seven properties in one Telegram thread. The AI broker answered me at night when I couldn\'t sleep from the math.', author: 'Anna L., Berlin', role: 'bought an apartment in Canggu' },
        { quote: 'The property matched the footage. That\'s rare on Bali — usually the ads and the reality look completely different.', author: 'Dmitri I., Dubai', role: 'bought a villa in Pererenan' },
      ],
    },
    finalCta: {
      h2: 'Find the property you\'ll actually buy.',
      sub: 'Ask the AI broker or leave a request — we\'ll see the deal through safely.',
      primary: 'Ask the AI broker',
      secondary: 'Leave a request',
      secondaryText: 'I\'d like to leave a request — please connect a manager: I need a property presentation and help with the deal.',
    },
  },
  id: {
    locale: 'id-ID',
    hero: {
      eyebrow: 'MARKETPLACE INDEPENDEN · BALI',
      h1: 'Beli vila atau apartemen di Bali',
      h1sub: 'Dengan aman, dokumen terverifikasi, dan imbal hasil transparan.',
      placeholder: 'Vila 2 kamar dekat Canggu di bawah $300k dengan potensi sewa…',
      tryLabel: 'Coba',
      suggestions: [
        { label: 'Vila di Ubud di bawah $250k', href: '/en/villas' },
        { label: 'Siap disewakan dengan imbal hasil 10%+', href: '/en/villas' },
        { label: 'Kompleks serah terima 2026', href: '/en/complexes' },
      ],
      ctaPrimary: 'Cari vila',
      ctaSecondary: 'Hubungi manajer',
      voiceAria: 'Tanya dengan suara',
      foot: 'Tanpa pendaftaran.',
    },
    howItWorks: {
      eyebrow: 'CARA KERJANYA',
      heading: 'Beli dengan percaya diri — tanpa terbang ke Bali.',
      sub: 'Broker AI dan tim di lokasi mengantar Anda dari pertanyaan hingga kunci.',
      cta: 'Tanya broker AI',
      steps: [
        { n: '01', Icon: Sparkles, title: 'Tanya broker AI', body: 'Ia menyaring properti dan menjawab pertanyaan Anda. Gratis, 24/7.' },
        { n: '02', Icon: TrendingUp, title: 'Pelajari properti', body: 'Imbal hasil tetangga, pesaing, dokumen, pengembang — tanpa render.' },
        { n: '03', Icon: Phone, title: 'Ajukan permintaan', body: 'Presentasi Zoom, kunjungan, transaksi aman dengan jaminan.' },
      ],
    },
    features: {
      eyebrow: 'ANGKA, BUKAN JANJI',
      heading: 'Putuskan berdasarkan angka nyata, bukan promosi pengembang.',
      sub: 'Semua terlihat sebelum Anda bicara dengan penjual.',
      items: [
        { Icon: TrendingUp, title: 'Imbal hasil tetangga', body: 'Berapa penghasilan nyata properti sekitar — dari Booking dan Airbnb.' },
        { Icon: BarChart3, title: 'Para pesaing', body: 'Apa pembandingnya, dan bagaimana posisinya.' },
        { Icon: MapPin, title: 'Apa yang dekat dan seberapa jauh', body: 'Kafe, pantai, sekolah, spot selancar — dengan waktu tempuh.' },
        { Icon: FileCheck2, title: 'Dokumen dan zonasi', body: 'PBG, SLF, leasehold — tanpa zona tanah abu-abu.' },
        { Icon: Building2, title: 'Profil pengembang', body: 'Apa yang telah dibangun, yang sedang berjalan, beritanya.' },
        { Icon: Video, title: 'Rekaman dari lokasi', body: 'Video nyata dari lokasi — bukan render.' },
      ],
    },
    safety: {
      eyebrow: 'TRANSAKSI LEBIH AMAN',
      heading: 'Tanpa skema abu-abu, tanpa risiko kehilangan uang.',
      body: 'Semua data milik kami, plus detail internal yang tak Anda temukan di situs. Kami bantu menutup transaksi dengan jaminan.',
      points: [
        'Marketplace independen, bukan halaman promosi satu pengembang',
        'Kami tahu detail internal properti dan pengembang',
        'Kontak manajer langsung — hubungi sendiri atau lewat kami',
        'Pendampingan, jaminan, dan asuransi pada transaksi',
      ],
      cta: 'Ajukan permintaan',
      ctaText: 'Saya ingin mengajukan permintaan — tolong hubungkan dengan manajer: saya perlu presentasi properti dan bantuan transaksi yang aman.',
    },
    villasSection: {
      eyebrow: '01 · VILA',
      heading: 'Hanya vila dengan dokumen lengkap.',
      sub: 'Tanpa tanah zona abu-abu. Yang paling bernilai di atas.',
      linkAll: 'Semua vila',
    },
    ai: {
      eyebrow: '02 · BROKER AI',
      heading: 'Tanya apa saja — tanpa agen, tanpa spam, gratis.',
      body: 'Ia mengenal setiap properti di platform. Tanya lewat suara atau teks — dapatkan pilihan dengan angka, dokumen, dan imbal hasil.',
      pointHeading1: 'Deskripsi, bukan filter',
      pointBody1: '"2BR di Canggu di bawah $300k untuk pasangan dan kerja jarak jauh" — itu cukup. AI memahami maksud dan menampilkan yang cocok.',
      pointHeading2: 'Pertanyaan tentang properti apa pun',
      pointBody2: 'Bagaimana dokumennya? Pajak tanah tahunan? Tanggal serah terima? Tanyakan — AI menjawab seketika dari basis data terlengkap di pulau.',
      pointHeading3: 'Dalam bahasa Anda, 24/7',
      pointBody3: 'Tak perlu menunggu pagi Bali — tanya tengah malam, dijawab tengah malam. Dalam bahasa yang nyaman bagi Anda.',
      cta: 'Buka AI concierge di Telegram',
      hint: 'Percakapan tersimpan — tanya kemarin, lanjut hari ini. Riwayat, dokumen, perhitungan dalam satu utas.',
      anon: 'Tanya secara anonim. Manajer hanya bergabung jika Anda meninggalkan kontak.',
    },
    complexesSection: {
      eyebrow: '03 · KOMPLEKS HUNIAN',
      heading: 'Kompleks tertutup dengan infrastruktur.',
      sub: 'Kolam, keamanan, pengelolaan properti. Unit untuk pendapatan sewa dan untuk ditinggali.',
      linkAll: 'Semua kompleks',
    },
    districts: {
      eyebrow: '04 · KAWASAN',
      heading: 'Kawasan mana yang cocok dengan tujuan Anda.',
      items: [
        { name: 'Canggu', tagline: 'selancar, kafe, sewa harian', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'alam, terasering padi, ketenangan', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'pemandangan laut premium', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'ramah keluarga, pantai tenang', slug: 'Sanur' },
      ],
    },
    knowledge: {
      eyebrow: '05 · PENGETAHUAN',
      heading: 'Pahami transaksinya sebelum membayar.',
      items: [
        { title: 'Cara membeli properti di Bali', body: 'Leasehold vs freehold, pajak, notaris, pendaftaran — langkah demi langkah.', href: '/en/knowledge' },
        { title: 'PBG dan SLF — apa itu', body: 'Tanpanya, properti berada di zona abu-abu. Apa yang diperiksa dan di mana.', href: '/en/knowledge' },
        { title: 'Imbal hasil sewa nyata di Bali', body: 'Kawasan mana memberi 10%+, mana yang 4%. Dan mengapa dek promosi berbohong.', href: '/en/knowledge' },
      ],
      linkAll: 'Basis pengetahuan',
    },
    proof: {
      heading: 'Sudah membeli lewat kami.',
      items: [
        { quote: 'Beli vila dalam dua minggu. Tanpa terbang ke Bali. Semua dokumen dan pemeriksaan ada di dalam platform.', author: 'Alexander K., Moscow', role: 'membeli Origins Villa 75 m² pada Desember 2025' },
        { quote: 'Kami membandingkan tujuh properti dalam satu utas Telegram. Broker AI menjawab saya malam hari saat saya tak bisa tidur karena hitung-hitungan.', author: 'Anna L., Berlin', role: 'membeli apartemen di Canggu' },
        { quote: 'Propertinya sesuai dengan rekamannya. Itu langka di Bali — biasanya iklan dan kenyataan sangat berbeda.', author: 'Dmitri I., Dubai', role: 'membeli vila di Pererenan' },
      ],
    },
    finalCta: {
      h2: 'Temukan properti yang benar-benar akan Anda beli.',
      sub: 'Tanya broker AI atau ajukan permintaan — kami mengawal transaksi hingga aman.',
      primary: 'Tanya broker AI',
      secondary: 'Ajukan permintaan',
      secondaryText: 'Saya ingin mengajukan permintaan — tolong hubungkan dengan manajer: saya perlu presentasi properti dan bantuan transaksi.',
    },
  },
  fr: {
    locale: 'fr-FR',
    hero: {
      eyebrow: 'MARKETPLACE INDÉPENDANT · BALI',
      h1: 'Achetez une villa ou un appartement à Bali',
      h1sub: 'En toute sécurité, avec des documents vérifiés et un rendement transparent.',
      placeholder: 'Villa 2 chambres près de Canggu sous $300k avec potentiel locatif…',
      tryLabel: 'Essayez',
      suggestions: [
        { label: 'Villas à Ubud sous $250k', href: '/en/villas' },
        { label: 'Prêtes à louer, rendement 10%+', href: '/en/villas' },
        { label: 'Résidences livrées en 2026', href: '/en/complexes' },
      ],
      ctaPrimary: 'Trouver une villa',
      ctaSecondary: 'Parler à un conseiller',
      voiceAria: 'Demander à la voix',
      foot: 'Sans inscription.',
    },
    howItWorks: {
      eyebrow: 'COMMENT ÇA MARCHE',
      heading: 'Achetez en confiance — sans prendre l\'avion pour Bali.',
      sub: 'Un courtier IA et une équipe sur place vous mènent de la question aux clés.',
      cta: 'Demander au courtier IA',
      steps: [
        { n: '01', Icon: Sparkles, title: 'Demandez au courtier IA', body: 'Il présélectionne des biens et répond à vos questions. Gratuit, 24/7.' },
        { n: '02', Icon: TrendingUp, title: 'Étudiez le bien', body: 'Rendement du voisinage, concurrents, documents, promoteur — sans rendus.' },
        { n: '03', Icon: Phone, title: 'Laissez une demande', body: 'Une présentation Zoom, une visite, une transaction sûre avec garanties.' },
      ],
    },
    features: {
      eyebrow: 'DES CHIFFRES, PAS DES PROMESSES',
      heading: 'Décidez sur des chiffres réels, pas sur le discours du promoteur.',
      sub: 'Tout est visible avant même de parler au vendeur.',
      items: [
        { Icon: TrendingUp, title: 'Rendement du voisinage', body: 'Ce que gagnent réellement les biens voisins — via Booking et Airbnb.' },
        { Icon: BarChart3, title: 'Les concurrents', body: 'À quoi le comparer, et comment il se situe.' },
        { Icon: MapPin, title: 'Ce qui est à proximité et à quelle distance', body: 'Cafés, plages, écoles, spots de surf — avec les temps de trajet.' },
        { Icon: FileCheck2, title: 'Documents et zonage', body: 'PBG, SLF, leasehold — sans zones foncières grises.' },
        { Icon: Building2, title: 'Profil du promoteur', body: 'Ce qu\'il a construit, ce qui est en cours, les actualités.' },
        { Icon: Video, title: 'Images tournées sur place', body: 'De vraies vidéos du site — pas des rendus.' },
      ],
    },
    safety: {
      eyebrow: 'UNE TRANSACTION PLUS SÛRE',
      heading: 'Pas de montages douteux, aucun risque de perdre votre argent.',
      body: 'Toutes les données sont les nôtres, plus les détails internes introuvables sur le site. Nous vous aidons à conclure la transaction avec des garanties.',
      points: [
        'Un marketplace indépendant, pas la page d\'un seul promoteur',
        'Nous connaissons les détails internes des biens et des promoteurs',
        'Contacts directs des conseillers — écrivez vous-même ou via nous',
        'Accompagnement, garanties et assurance sur la transaction',
      ],
      cta: 'Laisser une demande',
      ctaText: 'Je souhaite laisser une demande — merci de me mettre en relation avec un conseiller : j\'ai besoin d\'une présentation du bien et d\'aide pour une transaction sûre.',
    },
    villasSection: {
      eyebrow: '01 · VILLAS',
      heading: 'Uniquement des villas dont les documents sont en règle.',
      sub: 'Pas de terrains en zone grise. Les meilleures affaires en tête.',
      linkAll: 'Toutes les villas',
    },
    ai: {
      eyebrow: '02 · COURTIER IA',
      heading: 'Demandez ce que vous voulez — sans agent, sans spam, gratuit.',
      body: 'Il connaît chaque bien de la plateforme. Demandez à la voix ou par écrit — obtenez des options avec chiffres, documents et rendement.',
      pointHeading1: 'Une description au lieu de filtres',
      pointBody1: '« 2BR à Canggu sous $300k pour mon partenaire et le télétravail » — c\'est suffisant. L\'IA comprend l\'intention et fait remonter ce qui convient.',
      pointHeading2: 'Des questions sur n\'importe quel bien',
      pointBody2: 'Quels sont les documents ? La taxe foncière annuelle ? La date de livraison ? Demandez — l\'IA répond instantanément depuis la base la plus complète de l\'île.',
      pointHeading3: 'Dans votre langue, 24/7',
      pointBody3: 'Pas besoin d\'attendre le matin à Bali — demandez à minuit, obtenez une réponse à minuit. Dans la langue qui vous convient.',
      cta: 'Ouvrir le concierge IA dans Telegram',
      hint: 'La conversation persiste — posez une question hier, continuez aujourd\'hui. Historique, documents, calculs dans un seul fil.',
      anon: 'Demandez anonymement. Un conseiller n\'intervient que si vous laissez vos coordonnées.',
    },
    complexesSection: {
      eyebrow: '03 · RÉSIDENCES',
      heading: 'Résidences sécurisées avec infrastructures.',
      sub: 'Piscine, sécurité, gestion immobilière. Des unités pour le revenu locatif et pour y vivre.',
      linkAll: 'Toutes les résidences',
    },
    districts: {
      eyebrow: '04 · QUARTIERS',
      heading: 'Quel quartier correspond à votre objectif.',
      items: [
        { name: 'Canggu', tagline: 'surf, cafés, location journalière', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'nature, rizières en terrasses, calme', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'vues premium sur l\'océan', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'familial, plage tranquille', slug: 'Sanur' },
      ],
    },
    knowledge: {
      eyebrow: '05 · APPRENDRE',
      heading: 'Comprenez la transaction avant de payer.',
      items: [
        { title: 'Comment acheter un bien à Bali', body: 'Leasehold vs freehold, fiscalité, notaire, enregistrement — étape par étape.', href: '/en/knowledge' },
        { title: 'PBG et SLF — de quoi s\'agit-il', body: 'Sans eux, un bien est en zone grise. Que vérifier et où.', href: '/en/knowledge' },
        { title: 'Le vrai rendement locatif à Bali', body: 'Quels quartiers rapportent 10%+, lesquels 4%. Et pourquoi les dossiers de vente mentent.', href: '/en/knowledge' },
      ],
      linkAll: 'Base de connaissances',
    },
    proof: {
      heading: 'Ont déjà acheté grâce à nous.',
      items: [
        { quote: 'Villa achetée en deux semaines. Sans prendre l\'avion pour Bali. Tous les documents et vérifications dans la plateforme.', author: 'Alexander K., Moscow', role: 'a acheté Origins Villa 75 m² en décembre 2025' },
        { quote: 'Nous avons comparé sept biens dans un seul fil Telegram. Le courtier IA me répondait la nuit quand les calculs m\'empêchaient de dormir.', author: 'Anna L., Berlin', role: 'a acheté un appartement à Canggu' },
        { quote: 'Le bien correspondait aux images. C\'est rare à Bali — d\'habitude, les annonces et la réalité n\'ont rien à voir.', author: 'Dmitri I., Dubai', role: 'a acheté une villa à Pererenan' },
      ],
    },
    finalCta: {
      h2: 'Trouvez le bien que vous allez vraiment acheter.',
      sub: 'Demandez au courtier IA ou laissez une demande — nous menons la transaction à bien en toute sécurité.',
      primary: 'Demander au courtier IA',
      secondary: 'Laisser une demande',
      secondaryText: 'Je souhaite laisser une demande — merci de me mettre en relation avec un conseiller : j\'ai besoin d\'une présentation du bien et d\'aide pour la transaction.',
    },
  },
  de: {
    locale: 'de-DE',
    hero: {
      eyebrow: 'UNABHÄNGIGER MARKTPLATZ · BALI',
      h1: 'Villa oder Apartment auf Bali kaufen',
      h1sub: 'Sicher, mit geprüften Dokumenten und transparenter Rendite.',
      placeholder: '2-Schlafzimmer-Villa nahe Canggu unter $300k mit Vermietungspotenzial…',
      tryLabel: 'Versuchen Sie',
      suggestions: [
        { label: 'Villen in Ubud unter $250k', href: '/en/villas' },
        { label: 'Vermietfertig mit 10%+ Rendite', href: '/en/villas' },
        { label: 'Anlagen mit Fertigstellung 2026', href: '/en/complexes' },
      ],
      ctaPrimary: 'Villa finden',
      ctaSecondary: 'Mit einem Manager sprechen',
      voiceAria: 'Per Sprache fragen',
      foot: 'Keine Anmeldung.',
    },
    howItWorks: {
      eyebrow: 'SO FUNKTIONIERT ES',
      heading: 'Kaufen Sie mit Zuversicht — ohne nach Bali zu fliegen.',
      sub: 'Ein KI-Makler und ein Team vor Ort begleiten Sie von der Frage bis zum Schlüssel.',
      cta: 'Den KI-Makler fragen',
      steps: [
        { n: '01', Icon: Sparkles, title: 'Den KI-Makler fragen', body: 'Er wählt Objekte aus und beantwortet Ihre Fragen. Kostenlos, rund um die Uhr.' },
        { n: '02', Icon: TrendingUp, title: 'Das Objekt prüfen', body: 'Nachbarrendite, Wettbewerber, Dokumente, Bauträger — ohne Renderings.' },
        { n: '03', Icon: Phone, title: 'Anfrage hinterlassen', body: 'Eine Zoom-Präsentation, eine Besichtigung, ein sicherer Deal mit Garantien.' },
      ],
    },
    features: {
      eyebrow: 'ZAHLEN, KEINE VERSPRECHEN',
      heading: 'Entscheiden Sie anhand echter Zahlen, nicht der Verkaufsrede des Bauträgers.',
      sub: 'Alles sichtbar, bevor Sie mit dem Verkäufer sprechen.',
      items: [
        { Icon: TrendingUp, title: 'Nachbarrendite', body: 'Was benachbarte Objekte tatsächlich einbringen — von Booking und Airbnb.' },
        { Icon: BarChart3, title: 'Die Wettbewerber', body: 'Womit man vergleicht und wie es im Vergleich abschneidet.' },
        { Icon: MapPin, title: 'Was in der Nähe ist und wie weit', body: 'Cafés, Strände, Schulen, Surfspots — mit Fahrzeiten.' },
        { Icon: FileCheck2, title: 'Dokumente und Zonierung', body: 'PBG, SLF, Leasehold — keine grauen Grundstückszonen.' },
        { Icon: Building2, title: 'Bauträger-Profil', body: 'Was sie gebaut haben, was in Arbeit ist, die Neuigkeiten.' },
        { Icon: Video, title: 'Aufnahmen vor Ort', body: 'Echtes Video von der Baustelle — keine Renderings.' },
      ],
    },
    safety: {
      eyebrow: 'EIN SICHERERER DEAL',
      heading: 'Keine Grauzonen-Modelle, kein Risiko, Ihr Geld zu verlieren.',
      body: 'Alle Daten sind unsere, plus die internen Details, die Sie nicht auf der Website finden. Wir helfen Ihnen, den Deal mit Garantien abzuschließen.',
      points: [
        'Ein unabhängiger Marktplatz, nicht die Landingpage eines einzelnen Bauträgers',
        'Wir kennen die internen Details zu Objekten und Bauträgern',
        'Direkte Manager-Kontakte — wenden Sie sich selbst an sie oder über uns',
        'Begleitung, Garantien und Versicherung beim Deal',
      ],
      cta: 'Anfrage hinterlassen',
      ctaText: 'Ich möchte eine Anfrage hinterlassen — bitte verbinden Sie mich mit einem Manager: Ich brauche eine Objektpräsentation und Hilfe bei einem sicheren Deal.',
    },
    villasSection: {
      eyebrow: '01 · VILLEN',
      heading: 'Nur Villen mit vorliegenden Dokumenten.',
      sub: 'Kein Grauzonen-Grundstück. Die preiswertesten oben.',
      linkAll: 'Alle Villen',
    },
    ai: {
      eyebrow: '02 · KI-MAKLER',
      heading: 'Fragen Sie alles — kein Agent, kein Spam, kostenlos.',
      body: 'Er kennt jedes Objekt auf der Plattform. Fragen Sie per Sprache oder Text — erhalten Sie Optionen mit Zahlen, Dokumenten und Rendite.',
      pointHeading1: 'Beschreibung statt Filter',
      pointBody1: '„2-Schlafzimmer in Canggu unter $300k für meinen Partner und Remote-Arbeit“ — das genügt. Die KI erkennt die Absicht und zeigt, was passt.',
      pointHeading2: 'Fragen zu jedem Objekt',
      pointBody2: 'Wie sind die Papiere? Jährliche Grundsteuer? Fertigstellungstermin? Fragen Sie einfach — die KI antwortet sofort aus der vollständigsten Datenbank der Insel.',
      pointHeading3: 'In Ihrer Sprache, rund um die Uhr',
      pointBody3: 'Kein Warten auf den Morgen auf Bali — fragen Sie um Mitternacht, erhalten Sie um Mitternacht eine Antwort. In der Sprache, die für Sie bequem ist.',
      cta: 'KI-Concierge in Telegram öffnen',
      hint: 'Das Gespräch bleibt erhalten — gestern gefragt, heute fortgesetzt. Verlauf, Dokumente, Berechnungen in einem Thread.',
      anon: 'Fragen Sie anonym. Ein Manager schaltet sich nur ein, wenn Sie Ihre Kontaktdaten hinterlassen.',
    },
    complexesSection: {
      eyebrow: '03 · WOHNANLAGEN',
      heading: 'Geschlossene Anlagen mit Infrastruktur.',
      sub: 'Pool, Sicherheit, Hausverwaltung. Einheiten zur Vermietung und zum Wohnen.',
      linkAll: 'Alle Anlagen',
    },
    districts: {
      eyebrow: '04 · REGIONEN',
      heading: 'Welche Region zu Ihrem Ziel passt.',
      items: [
        { name: 'Canggu', tagline: 'Surfen, Cafés, Tagesvermietung', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'Natur, Reisterrassen, Ruhe', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'erstklassige Meerblicke', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'familienfreundlich, ruhiger Strand', slug: 'Sanur' },
      ],
    },
    knowledge: {
      eyebrow: '05 · WISSEN',
      heading: 'Verstehen Sie den Deal, bevor Sie zahlen.',
      items: [
        { title: 'Wie man auf Bali Immobilien kauft', body: 'Leasehold vs. Freehold, Steuern, Notar, Registrierung — Schritt für Schritt.', href: '/en/knowledge' },
        { title: 'PBG und SLF — was sie sind', body: 'Ohne sie ist ein Objekt eine Grauzone. Was zu prüfen ist und wo.', href: '/en/knowledge' },
        { title: 'Echte Mietrendite auf Bali', body: 'Welche Regionen 10%+ liefern, welche 4%. Und warum Verkaufsunterlagen lügen.', href: '/en/knowledge' },
      ],
      linkAll: 'Wissensdatenbank',
    },
    proof: {
      heading: 'Haben bereits über uns gekauft.',
      items: [
        { quote: 'Villa in zwei Wochen gekauft. Ohne nach Bali zu fliegen. Alle Papiere und Prüfungen innerhalb der Plattform.', author: 'Alexander K., Moscow', role: 'kaufte Origins Villa 75 m² im Dezember 2025' },
        { quote: 'Wir haben sieben Objekte in einem Telegram-Thread verglichen. Der KI-Makler antwortete mir nachts, als ich vor lauter Rechnen nicht schlafen konnte.', author: 'Anna L., Berlin', role: 'kaufte ein Apartment in Canggu' },
        { quote: 'Das Objekt entsprach den Aufnahmen. Das ist selten auf Bali — normalerweise sehen Anzeige und Realität völlig anders aus.', author: 'Dmitri I., Dubai', role: 'kaufte eine Villa in Pererenan' },
      ],
    },
    finalCta: {
      h2: 'Finden Sie das Objekt, das Sie wirklich kaufen werden.',
      sub: 'Fragen Sie den KI-Makler oder hinterlassen Sie eine Anfrage — wir bringen den Deal sicher zum Abschluss.',
      primary: 'Den KI-Makler fragen',
      secondary: 'Anfrage hinterlassen',
      secondaryText: 'Ich möchte eine Anfrage hinterlassen — bitte verbinden Sie mich mit einem Manager: Ich brauche eine Objektpräsentation und Hilfe beim Deal.',
    },
  },
  zh: {
    locale: 'zh-CN',
    hero: {
      eyebrow: '独立平台 · 巴厘岛',
      h1: '在巴厘岛购买别墅或公寓',
      h1sub: '安全交易，文件经过核实，收益透明。',
      placeholder: '想找 Canggu 附近30万美元以内、有出租潜力的两卧别墅…',
      tryLabel: '试试',
      suggestions: [
        { label: 'Ubud 25万美元以内的别墅', href: '/en/villas' },
        { label: '收益10%以上、可即刻出租', href: '/en/villas' },
        { label: '2026年交付的住宅区', href: '/en/complexes' },
      ],
      ctaPrimary: '寻找别墅',
      ctaSecondary: '联系经理',
      voiceAria: '语音提问',
      foot: '无需注册。',
    },
    howItWorks: {
      eyebrow: '运作方式',
      heading: '安心购买——无需飞往巴厘岛。',
      sub: 'AI经纪人与当地团队，带您从提问一路到交钥匙。',
      cta: '咨询AI经纪人',
      steps: [
        { n: '01', Icon: Sparkles, title: '咨询AI经纪人', body: '为您筛选房源并解答疑问。免费，全天候。' },
        { n: '02', Icon: TrendingUp, title: '研究房产', body: '邻近收益、竞品、文件、开发商——不看效果图。' },
        { n: '03', Icon: Phone, title: '提交申请', body: 'Zoom演示、看房、有保障的安全交易。' },
      ],
    },
    features: {
      eyebrow: '用数字，不用承诺',
      heading: '凭真实数字决策，而非开发商的说辞。',
      sub: '在与卖方交谈前一切都可见。',
      items: [
        { Icon: TrendingUp, title: '邻近收益', body: '附近房产的真实收入——来自Booking和Airbnb。' },
        { Icon: BarChart3, title: '竞争对手', body: '拿什么比较，以及它的表现如何。' },
        { Icon: MapPin, title: '周边有什么、多远', body: '咖啡馆、海滩、学校、冲浪点——附通行时间。' },
        { Icon: FileCheck2, title: '文件与分区', body: 'PBG、SLF、租赁产权——没有土地灰色地带。' },
        { Icon: Building2, title: '开发商档案', body: '他们建过什么、在建什么、有何动态。' },
        { Icon: Video, title: '实地拍摄', body: '来自工地的真实视频——不是效果图。' },
      ],
    },
    safety: {
      eyebrow: '更安全的交易',
      heading: '没有灰色操作，不会有损失钱财的风险。',
      body: '所有数据都是我们自有的，还有网站上找不到的内部细节。我们将帮您在有保障的情况下完成交易。',
      points: [
        '独立平台，而非某一家开发商的落地页',
        '我们了解房产和开发商的内部细节',
        '经理直接联系方式——自己联系或通过我们',
        '交易全程陪同、保障与保险',
      ],
      cta: '提交申请',
      ctaText: '我想提交申请——请安排一位经理：我需要房产演示以及安全交易的帮助。',
    },
    villasSection: {
      eyebrow: '01 · 别墅',
      heading: '只提供文件齐全的别墅。',
      sub: '没有灰色地带土地。最超值的排在前面。',
      linkAll: '全部别墅',
    },
    ai: {
      eyebrow: '02 · AI经纪人',
      heading: '尽管提问——没有中介、没有骚扰、免费。',
      body: '它了解平台上的每一处房产。用语音或文字提问——获得带数字、文件和收益的选项。',
      pointHeading1: '用描述代替筛选',
      pointBody1: '"Canggu 30万美元以内、供伴侣居住并远程办公的两卧"——这就够了。AI会理解意图并呈现合适的房源。',
      pointHeading2: '任何房产都能问',
      pointBody2: '文件如何？每年地税多少？何时交付？尽管问——AI会立即从全岛最完整的数据库中作答。',
      pointHeading3: '用您的语言，全天候',
      pointBody3: '无需等到巴厘岛的清晨——半夜提问，半夜就能得到答复。用您觉得方便的语言。',
      cta: '在Telegram中打开AI礼宾',
      hint: '对话会被保存——昨天问过，今天继续。历史、文件、计算都在同一个会话里。',
      anon: '匿名提问。只有当您留下联系方式时，经理才会介入。',
    },
    complexesSection: {
      eyebrow: '03 · 住宅区',
      heading: '配备基础设施的封闭式社区。',
      sub: '泳池、安保、物业管理。单元可出租亦可自住。',
      linkAll: '全部住宅区',
    },
    districts: {
      eyebrow: '04 · 区域',
      heading: '哪个区域契合您的目标。',
      items: [
        { name: 'Canggu', tagline: '冲浪、咖啡馆、日租', slug: 'Berawa' },
        { name: 'Ubud', tagline: '自然、稻田梯田、宁静', slug: 'Ubud' },
        { name: 'Bukit', tagline: '顶级海景', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: '适合家庭、宁静海滩', slug: 'Sanur' },
      ],
    },
    knowledge: {
      eyebrow: '05 · 知识',
      heading: '付款之前先弄懂这笔交易。',
      items: [
        { title: '如何在巴厘岛购买房产', body: '租赁产权与永久产权、税费、公证、登记——逐步讲解。', href: '/en/knowledge' },
        { title: 'PBG与SLF——它们是什么', body: '没有它们，房产就处于灰色地带。该查什么、去哪查。', href: '/en/knowledge' },
        { title: '巴厘岛真实的租金收益', body: '哪些区域能达到10%以上，哪些只有4%。以及为何销售资料会说谎。', href: '/en/knowledge' },
      ],
      linkAll: '知识库',
    },
    proof: {
      heading: '已经通过我们购买。',
      items: [
        { quote: '两周内买下一套别墅。无需飞往巴厘岛。所有文件和核查都在平台内完成。', author: 'Alexander K., Moscow', role: '于2025年12月购入Origins Villa 75 m²' },
        { quote: '我们在一个Telegram会话里比较了七处房产。当我为算账睡不着时，AI经纪人半夜也在回复我。', author: 'Anna L., Berlin', role: '在Canggu购入一套公寓' },
        { quote: '房产与拍摄的一致。这在巴厘岛很难得——通常广告和现实截然不同。', author: 'Dmitri I., Dubai', role: '在Pererenan购入一套别墅' },
      ],
    },
    finalCta: {
      h2: '找到您真正会买下的房产。',
      sub: '咨询AI经纪人或提交申请——我们会安全地促成交易。',
      primary: '咨询AI经纪人',
      secondary: '提交申请',
      secondaryText: '我想提交申请——请安排一位经理：我需要房产演示以及交易方面的帮助。',
    },
  },
  nl: {
    locale: 'nl-NL',
    hero: {
      eyebrow: 'ONAFHANKELIJKE MARKTPLAATS · BALI',
      h1: 'Koop een villa of appartement op Bali',
      h1sub: 'Veilig, met geverifieerde documenten en transparant rendement.',
      placeholder: 'Villa met 2 slaapkamers bij Canggu onder $300k met verhuurpotentieel…',
      tryLabel: 'Probeer',
      suggestions: [
        { label: "Villa's in Ubud onder $250k", href: '/en/villas' },
        { label: 'Direct te verhuren met 10%+ rendement', href: '/en/villas' },
        { label: 'Complexen opgeleverd in 2026', href: '/en/complexes' },
      ],
      ctaPrimary: 'Vind een villa',
      ctaSecondary: 'Praat met een manager',
      voiceAria: 'Vraag met je stem',
      foot: 'Geen registratie.',
    },
    howItWorks: {
      eyebrow: 'HOE HET WERKT',
      heading: 'Koop met vertrouwen — zonder naar Bali te vliegen.',
      sub: 'Een AI-makelaar en een team ter plaatse begeleiden je van vraag tot sleutel.',
      cta: 'Vraag de AI-makelaar',
      steps: [
        { n: '01', Icon: Sparkles, title: 'Vraag de AI-makelaar', body: 'Hij maakt een selectie en beantwoordt je vragen. Gratis, 24/7.' },
        { n: '02', Icon: TrendingUp, title: 'Bestudeer het object', body: 'Rendement van buren, concurrenten, documenten, ontwikkelaar — zonder renders.' },
        { n: '03', Icon: Phone, title: 'Laat een aanvraag achter', body: 'Een Zoom-presentatie, een bezichtiging, een veilige deal met garanties.' },
      ],
    },
    features: {
      eyebrow: 'CIJFERS, GEEN BELOFTES',
      heading: 'Beslis op basis van echte cijfers, niet de verkooppraat van de ontwikkelaar.',
      sub: 'Alles zichtbaar voordat je met de verkoper praat.',
      items: [
        { Icon: TrendingUp, title: 'Rendement van buren', body: 'Wat nabijgelegen objecten werkelijk opbrengen — via Booking en Airbnb.' },
        { Icon: BarChart3, title: 'De concurrenten', body: 'Waarmee te vergelijken en hoe het zich verhoudt.' },
        { Icon: MapPin, title: 'Wat dichtbij is en hoe ver', body: 'Cafés, stranden, scholen, surfspots — met reistijden.' },
        { Icon: FileCheck2, title: 'Documenten en bestemming', body: 'PBG, SLF, leasehold — geen grijze grondzones.' },
        { Icon: Building2, title: 'Ontwikkelaarsprofiel', body: 'Wat ze hebben gebouwd, wat er loopt, het nieuws.' },
        { Icon: Video, title: 'Opnames ter plaatse', body: 'Echte video van de locatie — geen renders.' },
      ],
    },
    safety: {
      eyebrow: 'EEN VEILIGERE DEAL',
      heading: 'Geen grijze constructies, geen risico om je geld te verliezen.',
      body: 'Alle data is van ons, plus de interne details die je niet op de site vindt. We helpen je de deal met garanties af te ronden.',
      points: [
        'Een onafhankelijke marktplaats, niet de landingspagina van één ontwikkelaar',
        'We kennen de interne details van objecten en ontwikkelaars',
        'Directe contacten van managers — neem zelf contact op of via ons',
        'Begeleiding, garanties en verzekering bij de deal',
      ],
      cta: 'Laat een aanvraag achter',
      ctaText: 'Ik wil een aanvraag achterlaten — verbind me met een manager: ik heb een objectpresentatie nodig en hulp bij een veilige deal.',
    },
    villasSection: {
      eyebrow: "01 · VILLA'S",
      heading: "Alleen villa's met de documenten op orde.",
      sub: 'Geen grijze-zone grond. De voordeligste bovenaan.',
      linkAll: "Alle villa's",
    },
    ai: {
      eyebrow: '02 · AI-MAKELAAR',
      heading: 'Vraag wat je wilt — geen agent, geen spam, gratis.',
      body: 'Hij kent elk object op het platform. Vraag met je stem of tekst — krijg opties met cijfers, documenten en rendement.',
      pointHeading1: 'Een beschrijving in plaats van filters',
      pointBody1: '"2 slaapkamers in Canggu onder $300k voor mijn partner en thuiswerk" — dat is genoeg. De AI begrijpt de bedoeling en toont wat past.',
      pointHeading2: 'Vragen over elk object',
      pointBody2: 'Hoe zit het met de papieren? Jaarlijkse grondbelasting? Opleverdatum? Vraag maar raak — de AI antwoordt direct uit de meest complete database van het eiland.',
      pointHeading3: 'In jouw taal, 24/7',
      pointBody3: 'Geen wachten op de ochtend op Bali — vraag om middernacht, krijg om middernacht antwoord. In de taal die jou uitkomt.',
      cta: 'Open AI-concierge in Telegram',
      hint: 'Het gesprek blijft bewaard — gisteren gevraagd, vandaag verder. Geschiedenis, documenten, berekeningen in één thread.',
      anon: 'Vraag anoniem. Een manager stapt alleen in als je je contactgegevens achterlaat.',
    },
    complexesSection: {
      eyebrow: '03 · WOONCOMPLEXEN',
      heading: 'Afgesloten complexen met infrastructuur.',
      sub: 'Zwembad, beveiliging, vastgoedbeheer. Units voor verhuur en om zelf te wonen.',
      linkAll: 'Alle complexen',
    },
    districts: {
      eyebrow: "04 · REGIO'S",
      heading: 'Welke regio past bij jouw doel.',
      items: [
        { name: 'Canggu', tagline: 'surfen, cafés, dagverhuur', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'natuur, rijstterrassen, rust', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'premium uitzicht op zee', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'gezinsvriendelijk, rustig strand', slug: 'Sanur' },
      ],
    },
    knowledge: {
      eyebrow: '05 · LEREN',
      heading: 'Begrijp de deal voordat je betaalt.',
      items: [
        { title: 'Hoe koop je vastgoed op Bali', body: 'Leasehold vs. freehold, belastingen, notaris, registratie — stap voor stap.', href: '/en/knowledge' },
        { title: 'PBG en SLF — wat ze zijn', body: 'Zonder deze is een object grijze zone. Wat je moet controleren en waar.', href: '/en/knowledge' },
        { title: 'Echt huurrendement op Bali', body: "Welke regio's 10%+ opleveren, welke 4%. En waarom verkoopbrochures liegen.", href: '/en/knowledge' },
      ],
      linkAll: 'Kennisbank',
    },
    proof: {
      heading: 'Kochten al via ons.',
      items: [
        { quote: 'In twee weken een villa gekocht. Zonder naar Bali te vliegen. Alle papieren en controles binnen het platform.', author: 'Alexander K., Moscow', role: 'kocht Origins Villa 75 m² in december 2025' },
        { quote: "We vergeleken zeven objecten in één Telegram-thread. De AI-makelaar antwoordde me 's nachts toen ik niet kon slapen van het rekenen.", author: 'Anna L., Berlin', role: 'kocht een appartement in Canggu' },
        { quote: 'Het object kwam overeen met de opnames. Dat is zeldzaam op Bali — meestal zien de advertentie en de werkelijkheid er totaal anders uit.', author: 'Dmitri I., Dubai', role: 'kocht een villa in Pererenan' },
      ],
    },
    finalCta: {
      h2: 'Vind het object dat je echt gaat kopen.',
      sub: 'Vraag de AI-makelaar of laat een aanvraag achter — we brengen de deal veilig tot een goed einde.',
      primary: 'Vraag de AI-makelaar',
      secondary: 'Laat een aanvraag achter',
      secondaryText: 'Ik wil een aanvraag achterlaten — verbind me met een manager: ik heb een objectpresentatie nodig en hulp bij de deal.',
    },
  },
  ban: {
    locale: 'id-ID',
    hero: {
      eyebrow: 'MARKETPLACE INDEPENDEN · BALI',
      h1: 'Numbas vila utawi apartemen ring Bali',
      h1sub: 'Aman, sareng dokumen sane sampun kacek lan hasil sane terang.',
      placeholder: 'Vila 2 kamar nampek Canggu ring sor $300k sane dados kasewaang…',
      tryLabel: 'Cobain',
      suggestions: [
        { label: 'Vila ring Ubud ring sor $250k', href: '/en/villas' },
        { label: 'Siap kasewaang hasil 10%+', href: '/en/villas' },
        { label: 'Kompleks serah terima 2026', href: '/en/complexes' },
      ],
      ctaPrimary: 'Ngrereh vila',
      ctaSecondary: 'Mabaos sareng manajer',
      voiceAria: 'Mataken nganggen suara',
      foot: 'Tanpa pendaftaran.',
    },
    howItWorks: {
      eyebrow: 'SAPUNAPI CARANE',
      heading: 'Numbas anteng — tanpa makeber ka Bali.',
      sub: 'Broker AI lan tim ring genah nuntun Ragane saking patakon kantos konci.',
      cta: 'Mataken broker AI',
      steps: [
        { n: '01', Icon: Sparkles, title: 'Mataken broker AI', body: 'Ngerincikang properti lan nyawis patakon Ragane. Gratis, 24/7.' },
        { n: '02', Icon: TrendingUp, title: 'Nyelajahin properti', body: 'Hasil pisaga, saingan, dokumen, pangwangun — tanpa render.' },
        { n: '03', Icon: Phone, title: 'Ngicalang permintaan', body: 'Presentasi Zoom, ningalin, transaksi aman sareng jaminan.' },
      ],
    },
    features: {
      eyebrow: 'ANGKA, BOYA JANJI',
      heading: 'Mutusang manut angka sane nyata, boya baos pangwangun.',
      sub: 'Sami kacingak sadurung mabaos sareng sang adol.',
      items: [
        { Icon: TrendingUp, title: 'Hasil pisaga', body: 'Sapunapi pikolih nyata properti nampek — saking Booking lan Airbnb.' },
        { Icon: BarChart3, title: 'Para saingan', body: 'Napi anggen ngbandingang, lan sapunapi dane.' },
        { Icon: MapPin, title: 'Napi nampek lan sapunapi doh', body: 'Kafe, pasih, sekolah, spot selancar — sareng galah majalan.' },
        { Icon: FileCheck2, title: 'Dokumen lan zonasi', body: 'PBG, SLF, leasehold — tanpa zona tanah abu-abu.' },
        { Icon: Building2, title: 'Profil pangwangun', body: 'Napi sane sampun kawangun, sane kantun, gatra ipun.' },
        { Icon: Video, title: 'Rekaman saking genah', body: 'Video nyata saking genah — boya render.' },
      ],
    },
    safety: {
      eyebrow: 'TRANSAKSI SANE LEBIH AMAN',
      heading: 'Tanpa skema abu-abu, tanpa risiko kelangan jinah.',
      body: 'Sami data punika druen tiang, sareng detail internal sane nenten wenten ring situs. Tiang jagi nulungin muputang transaksi sareng jaminan.',
      points: [
        'Marketplace independen, boya halaman promosi asiki pangwangun',
        'Tiang uning detail internal properti lan pangwangun',
        'Kontak manajer langsung — mabaos padidi utawi lewat tiang',
        'Pendampingan, jaminan, lan asuransi ring transaksi',
      ],
      cta: 'Ngicalang permintaan',
      ctaText: 'Tiang meled ngicalang permintaan — ledang nyambungang manajer: tiang merluang presentasi properti lan wantuan transaksi sane aman.',
    },
    villasSection: {
      eyebrow: '01 · VILA',
      heading: 'Wantah vila sane dokumenne sampun jangkep.',
      sub: 'Tanpa tanah zona abu-abu. Sane paling maji ring duur.',
      linkAll: 'Sami vila',
    },
    ai: {
      eyebrow: '02 · BROKER AI',
      heading: 'Mataken napija — tanpa agen, tanpa spam, gratis.',
      body: 'Ipun uning asing-asing properti ring platform. Mataken nganggen suara utawi teks — polih pilihan sareng angka, dokumen, lan hasil.',
      pointHeading1: 'Deskripsi boya filter',
      pointBody1: '"2BR ring Canggu ring sor $300k anggen kurenan lan makarya saking joh" — punika sampun cukup. AI ngresepang tetujon lan nyinahang sane cocok.',
      pointHeading2: 'Patakon indik properti napija',
      pointBody2: 'Sapunapi dokumenne? Pajak tanah warsan? Galah serah terima? Takenang — AI nyawis prasida saking basis data sane pinih jangkep ring pulo.',
      pointHeading3: 'Nganggen basa Ragane, 24/7',
      pointBody3: 'Nenten perlu ngantosang semeng Bali — mataken tengah wengi, polih pasaur tengah wengi. Nganggen basa sane luung anggen Ragane.',
      cta: 'Ngampakang AI concierge ring Telegram',
      hint: 'Bebaosan kasimpen — mataken dibi, nglanturang mangkin. Riwayat, dokumen, itungan ring asiki utas.',
      anon: 'Mataken anonim. Manajer wau nyarengin yening Ragane ngicalang kontak.',
    },
    complexesSection: {
      eyebrow: '03 · KOMPLEKS HUNIAN',
      heading: 'Kompleks katutup sareng infrastruktur.',
      sub: 'Kolam, keamanan, pengelolaan properti. Unit anggen sewa lan anggen magenah.',
      linkAll: 'Sami kompleks',
    },
    districts: {
      eyebrow: '04 · WEWIDANGAN',
      heading: 'Wewidangan sane cocok sareng tetujon Ragane.',
      items: [
        { name: 'Canggu', tagline: 'selancar, kafe, sewa harian', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'alam, subak, sutrepti', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'pemandangan pasih premium', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'cocok kulawarga, pasih sepi', slug: 'Sanur' },
      ],
    },
    knowledge: {
      eyebrow: '05 · KAWRUHAN',
      heading: 'Resepang transaksine sadurung mayah.',
      items: [
        { title: 'Sapunapi numbas properti ring Bali', body: 'Leasehold vs freehold, pajak, notaris, pendaftaran — laksana ping laksana.', href: '/en/knowledge' },
        { title: 'PBG lan SLF — punapi punika', body: 'Tanpa punika, properti wenten ring zona abu-abu. Napi kacek lan ring dija.', href: '/en/knowledge' },
        { title: 'Hasil sewa nyata ring Bali', body: 'Wewidangan sane ngicen 10%+, sane 4%. Lan ngudiang dek promosi mauk.', href: '/en/knowledge' },
      ],
      linkAll: 'Basis kawruhan',
    },
    proof: {
      heading: 'Sampun numbas lewat tiang.',
      items: [
        { quote: 'Numbas vila ring kalih minggu. Tanpa makeber ka Bali. Sami dokumen lan pamariksan wenten ring platform.', author: 'Alexander K., Moscow', role: 'numbas Origins Villa 75 m² ring Desember 2025' },
        { quote: 'Tiang ngbandingang pitu properti ring asiki utas Telegram. Broker AI nyawis tiang wengi rikala tiang nenten prasida sirep krana ngitung.', author: 'Anna L., Berlin', role: 'numbas apartemen ring Canggu' },
        { quote: 'Propertine cocok sareng rekamanne. Punika arang ring Bali — biasane iklan lan kanyatan matiosan pisan.', author: 'Dmitri I., Dubai', role: 'numbas vila ring Pererenan' },
      ],
    },
    finalCta: {
      h2: 'Rereh properti sane pacang katumbas Ragane.',
      sub: 'Mataken broker AI utawi ngicalang permintaan — tiang jagi muputang transaksi sane aman.',
      primary: 'Mataken broker AI',
      secondary: 'Ngicalang permintaan',
      secondaryText: 'Tiang meled ngicalang permintaan — ledang nyambungang manajer: tiang merluang presentasi properti lan wantuan transaksi.',
    },
  },
} as const

// === DATA ===========================================================

const ROUTES = {
  ru: { villas: '/ru/villy', apartments: '/ru/apartamenty', complexes: '/ru/zhilye-kompleksy', knowledge: '/ru/znaniya', contact: '/ru/kontakty' },
  en: { villas: '/en/villas', apartments: '/en/apartments', complexes: '/en/complexes', knowledge: '/en/knowledge', contact: '/en/contact' },
} as const

type ComplexHomeCard = {
  slug: string
  title: string
  district: string | null
  cover: string | null
  units: number | null
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
    const filters: VillaFilterState = {
      q: '', priceMin: null, priceMax: null,
      district: [], bedrooms: [], status: [], permit: ['PBG', 'SLF'], year: [], developer: [], style: [], features: [], goal: null, dealType: [],
    }
    const cards = buildAllVillaCards(enriched, manifest, filters, scores, 'investment-desc', undefined, lang)
    return cards.slice(0, 6)
  } catch { return [] }
}

const loadTopComplexes = unstable_cache(async (): Promise<ComplexHomeCard[]> => {
  try {
    const { data } = await sb.from('raw_complexes').select(`
      airtable_id, slug, cover_url,
      name:data->Project,
      district:data->"Location 2",
      district_alt:data->Location,
      units:data->"Total quantity of units",
      status:data->"Статус",
      developer:data->Developer1
    `).limit(500)
    // Real photos live in the complex-photos manifest. cover_url and the
    // complex-covers/<id>.jpg bucket both point at a dead path (404), so they
    // are only last-resort fallbacks.
    let manifest: Record<string, string[]> = {}
    try {
      const mr = await fetch(cdnManifestUrl(`${SUPABASE_URL}/storage/v1/object/public/complex-photos/_manifest.json`, 600), { next: { revalidate: 600 } })
      if (mr.ok) manifest = await mr.json()
    } catch { /* fall back below */ }
    const COVER_BUCKET = cdnBucketBase('complex-covers')
    const items: ComplexHomeCard[] = []
    for (const r of (data ?? []) as Array<{ airtable_id: string; slug: string | null; cover_url: string | null; name: string | null; district: string | null; district_alt: string | null; units: number | null; status: string | null; developer: string | string[] | null }>) {
      if (!r.slug || !r.name) continue
      if (isHiddenDeveloper(Array.isArray(r.developer) ? r.developer[0] : r.developer)) continue
      items.push({
        slug: r.slug,
        title: r.name,
        district: r.district ?? r.district_alt,
        units: r.units,
        cover: manifest[r.airtable_id]?.[0] ?? r.cover_url ?? `${COVER_BUCKET}/${r.airtable_id}.jpg`,
      })
    }
    items.sort((a, b) => (b.units ?? 0) - (a.units ?? 0))
    return items.slice(0, 4)
  } catch { return [] }
}, ['home-landing-top-complexes-v2'], { revalidate: 3600 })

async function loadStats() {
  const [v, a, k, d, unitRows] = await Promise.all([
    sb.from('raw_villas').select('airtable_id', { count: 'exact', head: true }),
    sb.from('raw_apartments').select('airtable_id', { count: 'exact', head: true }),
    sb.from('raw_complexes').select('airtable_id', { count: 'exact', head: true }),
    sb.from('raw_developers').select('airtable_id', { count: 'exact', head: true }),
    // Total units on the site = sum of every complex's unit count.
    sb.from('raw_complexes').select('u:data->"Total quantity of units"').limit(2000),
  ])
  let units = 0
  for (const r of (unitRows.data ?? []) as Array<{ u: unknown }>) {
    const n = Number(r.u)
    if (Number.isFinite(n)) units += n
  }
  return {
    villas: v.count ?? 0,
    apartments: a.count ?? 0,
    complexes: k.count ?? 0,
    developers: d.count ?? 0,
    units,
  }
}

// === COMPONENT =======================================================

export async function HomeLanding({ lang }: { lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const r = pickCopy(ROUTES, lang)
  const [stats, topVillas, topComplexes, collections, finderItems] = await Promise.all([
    loadStats(),
    loadTopVillas(lang),
    loadTopComplexes(),
    loadHomeCollections(lang),
    loadHomeFinder(lang),
  ])
  // Immersive hero: a real catalog photo behind the headline. Top villas are
  // ranked by investment score with a clean-document filter, so [0] is a strong
  // hero shot. (Complex covers can 404, villa manifest photos are reliable.)
  const heroPhoto = topVillas.find(v => v.photos[0])?.photos[0] ?? null
  // Per-district cover for the photo tiles — reuse the covers already loaded for
  // the collections block (no extra fetch). First listing with a photo wins.
  const districtCovers: Record<string, string> = {}
  for (const t of collections)
    for (const d of t.districts) {
      if (districtCovers[d.slug]) continue
      const cov = d.items.find(it => it.cover)?.cover
      if (cov) districtCovers[d.slug] = cov
    }

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <Header />

      {/* === 1. Hero — immersive photo =========================== */}
      <section className="relative flex items-end min-h-[80vh] md:min-h-[88vh] overflow-hidden bg-[#0E1A14]">
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
          <div className="relative max-w-[760px] pt-32 pb-14 md:pt-40 md:pb-20">
            <div className="text-[11px] md:text-[12px] uppercase tracking-[0.2em] text-white font-semibold mb-5 [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">
              {c.hero.eyebrow}
            </div>
            <h1 className="text-[34px] md:text-[56px] leading-[1.06] font-extrabold tracking-[-0.015em] text-white [text-shadow:0_2px_22px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.55)]">
              {c.hero.h1}
            </h1>
            <p className="mt-4 md:mt-5 text-[18px] md:text-[26px] leading-[1.25] font-semibold text-white/95 max-w-[620px] [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
              {c.hero.h1sub}
            </p>

            <div className="mt-8 md:mt-10">
              <HeroBalinaSearch
                lang={lang}
                placeholder={c.hero.placeholder}
                tryLabel={c.hero.tryLabel}
                suggestions={c.hero.suggestions}
                sendAria={c.hero.ctaPrimary}
                voiceAria={c.hero.voiceAria}
              />
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Trust strip — quiet light band under the photo. */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <PageContainer>
          <div className="py-7 md:py-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-6">
            <TrustCell value={fmtInt(stats.complexes, c.locale)} label={pickCopy({ ru: 'жилых комплексов', en: 'residential complexes', id: 'kompleks hunian', fr: 'complexes résidentiels', de: 'Wohnkomplexe', zh: '住宅社区', nl: 'wooncomplexen', ban: 'komplek hunian' }, lang)} />
            <TrustCell value={fmtInt(stats.developers, c.locale)} label={pickCopy({ ru: 'застройщиков', en: 'developers', id: 'pengembang', fr: 'promoteurs', de: 'Bauträger', zh: '开发商', nl: 'ontwikkelaars', ban: 'pengembang' }, lang)} />
            <TrustCell value={fmtInt(stats.villas, c.locale)} label={pickCopy({ ru: 'планировок вилл', en: 'villa layouts', id: 'denah vila', fr: 'plans de villas', de: 'Villa-Grundrisse', zh: '别墅户型', nl: 'villaplattegronden', ban: 'denah villa' }, lang)} />
            <TrustCell value={fmtInt(stats.apartments, c.locale)} label={pickCopy({ ru: 'планировок апартаментов', en: 'apartment layouts', id: 'denah apartemen', fr: 'plans d’appartements', de: 'Apartment-Grundrisse', zh: '公寓户型', nl: 'appartementplattegronden', ban: 'denah apartemen' }, lang)} />
            <TrustCell value={fmtInt(stats.units, c.locale)} label={pickCopy({ ru: 'юнитов на сайте', en: 'units on the site', id: 'unit di situs', fr: 'lots sur le site', de: 'Einheiten auf der Seite', zh: '在售单元', nl: 'units op de site', ban: 'unit ring situs' }, lang)} />
          </div>
        </PageContainer>
      </section>

      {/* === Guided finder — easy mode: 3 taps → ranked shortlist == */}
      {finderItems.length > 0 && (
        <SectionWrap className="border-t border-[var(--color-border)]">
          <SectionHead title={pickCopy({ ru: 'Подберём виллу за 3 ответа.', en: 'Find your villa in 3 taps.', id: 'Temukan vila Anda dalam 3 langkah.', fr: 'Trouvez votre villa en 3 réponses.', de: 'Finden Sie Ihre Villa in 3 Schritten.', zh: '三步找到你的别墅。', nl: 'Vind uw villa in 3 stappen.', ban: 'Alih villa Ragane ring 3 lengkah.' }, lang)} />
          <div className="mt-8 md:mt-10">
            <HomeFinder items={finderItems} lang={lang} />
          </div>
        </SectionWrap>
      )}

      {/* === How it works — sell the service, not the villa ===== */}
      <SectionWrap className="border-t border-[var(--color-border)]">
        <SectionHead eyebrow={c.howItWorks.eyebrow} title={c.howItWorks.heading} sub={c.howItWorks.sub} />
        <div className="mt-10 md:mt-14 grid md:grid-cols-3 gap-6 md:gap-7">
          {c.howItWorks.steps.map((s, i) => {
            const Icon = s.Icon
            const Visual = [StepChat, StepStudy, StepRequest][i]
            return (
              <div key={i} className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
                <div className="relative h-[150px] bg-[var(--color-search-bg)] border-b border-[var(--color-border)]">
                  {Visual && <Visual lang={lang} />}
                </div>
                <div className="p-6 md:p-7">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]">
                      <Icon size={19} strokeWidth={1.7} />
                    </span>
                    <span className="text-[13px] font-mono text-[#9CA59F]">{s.n}</span>
                  </div>
                  <h3 className="mt-5 text-[18px] font-medium text-[#0E1A14] leading-tight">{s.title}</h3>
                  <p className="mt-2.5 text-[14px] leading-[1.6] text-[#4B5563]">{s.body}</p>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-9">
          <BalinaCTA className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] text-white text-[14.5px] font-medium hover:bg-[var(--color-primary-pressed)] transition-colors cursor-pointer">
            <Sparkles size={15} /> {c.howItWorks.cta}
          </BalinaCTA>
        </div>
      </SectionWrap>

      {/* === Per-property analytics — "what you actually see" ==== */}
      <SectionWrap className="border-t border-[var(--color-border)] bg-[#FAFCFB]">
        <SectionHead eyebrow={c.features.eyebrow} title={c.features.heading} sub={c.features.sub} />
        <div className="mt-10 md:mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {c.features.items.map((p, i) => {
            const Icon = p.Icon
            const Visual = [VizYield, VizCompetitors, VizNearby, VizDocs, VizDeveloper, VizFootage][i]
            return (
              <div key={i} className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
                <div className="relative h-[124px] bg-[var(--color-search-bg)] border-b border-[var(--color-border)]">
                  {Visual && <Visual lang={lang} />}
                </div>
                <div className="p-5">
                  <Icon size={20} strokeWidth={1.5} className="text-[var(--color-primary)]" />
                  <h3 className="mt-3 text-[16.5px] font-medium text-[#0E1A14] leading-tight">{p.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-[1.6] text-[#4B5563]">{p.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </SectionWrap>

      {/* === AI broker — copy + live chat mockup ================ */}
      <SectionWrap className="border-t border-[var(--color-border)]">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 lg:items-center">
          <div>
            <h2 className="text-[28px] md:text-[40px] leading-[1.1] font-light tracking-[-0.02em] text-[#0E1A14]">
              {c.ai.heading}
            </h2>
            <p className="mt-4 text-[14.5px] leading-[1.6] text-[#1A2620] font-medium border-l-2 border-[var(--color-primary)] pl-4">
              {c.ai.anon}
            </p>
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <BalinaCTA className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] text-white text-[14.5px] font-medium hover:bg-[var(--color-primary-pressed)] transition-colors cursor-pointer">
                <Sparkles size={15} /> {c.howItWorks.cta}
              </BalinaCTA>
              <LeadButton
                label={c.ai.cta}
                lang={lang}
                context={{ source: 'home' }}
                icon={<Send size={15} />}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#D5DDD8] text-[14.5px] font-medium text-[#1A2620] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
              />
            </div>
          </div>
          <div className="lg:pl-4">
            <BalinaChatMock lang={lang} />
          </div>
        </div>
      </SectionWrap>

      {/* === On your own or through us = safer =================== */}
      <SectionWrap className="border-t border-[var(--color-border)]">
        <div className="rounded-3xl bg-gradient-to-br from-[var(--color-primary-soft)] via-[#F1F7F3] to-white border border-[var(--color-border)] p-7 md:p-12">
          <div className="mb-8 md:mb-10 max-w-[560px]">
            <SafetyFlow lang={lang} />
          </div>
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-14 lg:items-center">
            <div className="lg:col-span-7">
              <h2 className="text-[26px] md:text-[38px] leading-[1.15] font-light tracking-[-0.02em] text-[#0E1A14]">
                {c.safety.heading}
              </h2>
              <p className="mt-5 text-[15px] leading-[1.65] text-[#3D4D44]">{c.safety.body}</p>
              <div className="mt-7">
                <BalinaCTA text={c.safety.ctaText} className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] text-white text-[14.5px] font-medium hover:bg-[var(--color-primary-pressed)] transition-colors cursor-pointer">
                  <Send size={15} /> {c.safety.cta}
                </BalinaCTA>
              </div>
            </div>
            <ul className="lg:col-span-5 grid gap-3">
              {c.safety.points.map((pt, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl bg-white/70 border border-[var(--color-border)] p-4">
                  <ShieldCheck size={17} strokeWidth={1.8} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                  <span className="text-[14px] leading-[1.5] text-[#1A2620]">{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionWrap>

      {/* === Proof: featured villas ============================= */}
      {topVillas.length > 0 && (
        <SectionWrap className="border-t border-[var(--color-border)] bg-[#FAFCFB]">
          <SectionHead eyebrow={c.villasSection.eyebrow} title={c.villasSection.heading} sub={c.villasSection.sub} />
          <div className="mt-10 md:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {topVillas.map(v => <VillaCard key={v.slug} a={v} lang={lang} />)}
          </div>
          <div className="mt-10">
            <Link href={r.villas} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-primary)] hover:gap-2.5 transition-all no-underline">
              {c.villasSection.linkAll} <ArrowRight size={15} />
            </Link>
          </div>
        </SectionWrap>
      )}

      {/* === Proof: collections by budget + district ============= */}
      {collections.length > 0 && (
        <SectionWrap className="border-t border-[var(--color-border)]">
          <SectionHead
            eyebrow={pickCopy({ ru: 'Подборки', en: 'Collections', id: 'Koleksi', fr: 'Sélections', de: 'Kollektionen', zh: '精选', nl: 'Collecties', ban: 'Koleksi' }, lang)}
            title={pickCopy({ ru: 'Лучшее в вашем бюджете', en: 'The best in your budget', id: 'Yang terbaik sesuai anggaran Anda', fr: 'Le meilleur dans votre budget', de: 'Das Beste in Ihrem Budget', zh: '预算之内的精选', nl: 'Het beste binnen uw budget', ban: 'Sane pinih becik ring anggaran Ragane' }, lang)}
            sub={pickCopy({
              ru: 'Топ-объекты по доходности и популярности — выберите бюджет и район',
              en: 'Top listings by yield and popularity — pick a budget and a district',
              id: 'Properti teratas berdasarkan imbal hasil dan popularitas — pilih anggaran dan area',
              fr: 'Les meilleurs biens par rendement et popularité — choisissez un budget et un quartier',
              de: 'Top-Objekte nach Rendite und Beliebtheit — Budget und Gebiet wählen',
              zh: '按收益和热度排名的优质房源 — 选择预算和区域',
              nl: 'Topaanbod op rendement en populariteit — kies een budget en een gebied',
              ban: 'Properti utama manut hasil lan popularitas — pilih anggaran lan wewidangan',
            }, lang)}
          />
          <div className="mt-8 md:mt-10">
            <HomeCollections tiers={collections} lang={lang} />
          </div>
        </SectionWrap>
      )}

      {/* === Proof: featured complexes ========================= */}
      {topComplexes.length > 0 && (
        <SectionWrap className="border-t border-[var(--color-border)] bg-[#FAFCFB]">
          <SectionHead eyebrow={c.complexesSection.eyebrow} title={c.complexesSection.heading} sub={c.complexesSection.sub} />
          <div className="mt-10 md:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {topComplexes.map(k => (
              <Link key={k.slug} href={`${r.complexes}/o/${k.slug}`} className="group rounded-2xl overflow-hidden border border-[var(--color-border)] bg-white no-underline hover:border-[var(--color-primary)] transition-colors">
                {k.cover && (
                  <div className="relative h-[180px] bg-[var(--color-search-bg)]">
                    <Image src={k.cover} alt={k.title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="text-[15px] font-medium text-[#0E1A14] truncate">{lang !== 'ru' && k.title && hasCyrillic(k.title) ? translit(k.title) : k.title}</div>
                  <div className="mt-1 text-[12.5px] text-[#6B7570] flex items-center gap-1.5">
                    {k.district && <><MapPin size={11} /> {k.district}</>}
                    {k.units != null && <span className="ml-auto tabular-nums">{k.units} {pickCopy({ ru: 'юнитов', en: 'units', id: 'unit', fr: 'lots', de: 'Einheiten', zh: '套', nl: 'units', ban: 'unit' }, lang)}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-10">
            <Link href={r.complexes} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-primary)] hover:gap-2.5 transition-all no-underline">
              {c.complexesSection.linkAll} <ArrowRight size={15} />
            </Link>
          </div>
        </SectionWrap>
      )}

      {/* === 6. Districts — photo tiles ========================= */}
      <SectionWrap className="border-t border-[var(--color-border)]">
        <SectionHead eyebrow={c.districts.eyebrow} title={c.districts.heading} />
        <div className="mt-10 md:mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {c.districts.items.map(d => {
            const cover = districtCovers[d.slug.toLowerCase()]
            // Link to the crawlable canonical filter path (/ru/villy/<slug>,
            // which is in the sitemap) instead of ?district=, which robots.txt
            // blocks via `Disallow: /*?`. EN has no clean filter routes, so it
            // keeps the query form (its filter pages aren't indexed anyway).
            const districtSlug = DISTRICT_TO_SLUG[d.slug]
            const districtHref = lang === 'ru' && districtSlug
              ? `${r.villas}/${districtSlug}`
              : `${r.villas}?district=${d.slug}`
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
                  <div className="text-[17px] md:text-[18px] font-medium text-white">{d.name}</div>
                  <div className="mt-1 text-[12.5px] text-white/75 leading-[1.45]">{d.tagline}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </SectionWrap>

      {/* === 7. Knowledge ======================================= */}
      <SectionWrap className="border-t border-[var(--color-border)] bg-[#FAFCFB]">
        <SectionHead eyebrow={c.knowledge.eyebrow} title={c.knowledge.heading} />
        <div className="mt-10 md:mt-12 grid md:grid-cols-3 gap-6">
          {c.knowledge.items.map((k, i) => (
            <Link key={i} href={k.href} className="rounded-2xl border border-[var(--color-border)] bg-white p-6 hover:border-[var(--color-primary)] transition-colors no-underline">
              <div className="text-[16px] font-medium text-[#0E1A14] leading-tight">{k.title}</div>
              <p className="mt-2 text-[13.5px] text-[#4B5563] leading-[1.55]">{k.body}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-[12.5px] text-[var(--color-primary)]">
                {pickCopy({ ru: 'Читать', en: 'Read', id: 'Baca', fr: 'Lire', de: 'Lesen', zh: '阅读', nl: 'Lezen', ban: 'Wacen' }, lang)} <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-8">
          <Link href={r.knowledge} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-primary)] hover:gap-2.5 transition-all no-underline">
            {c.knowledge.linkAll} <ArrowRight size={15} />
          </Link>
        </div>
      </SectionWrap>

      {/* === 8. Social proof ==================================== */}
      <SectionWrap className="border-t border-[var(--color-border)]">
        <SectionHead title={c.proof.heading} />
        <div className="mt-10 md:mt-12 grid md:grid-cols-3 gap-6">
          {c.proof.items.map((q, i) => (
            <figure key={i} className="rounded-2xl border border-[var(--color-border)] bg-[#FAFCFB] p-7 flex flex-col">
              <blockquote className="text-[15px] leading-[1.6] text-[#1A2620] flex-1">
                «{q.quote}»
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-[var(--color-border)]">
                <div className="text-[13px] font-medium text-[#0E1A14]">{q.author}</div>
                <div className="text-[12px] text-[#6B7570] mt-0.5">{q.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </SectionWrap>

      {/* === 9. Final CTA ======================================= */}
      <section className="border-t border-[var(--color-border)] py-20 md:py-28 bg-[var(--color-bg)]">
        <PageContainer>
          <div className="max-w-[720px] mx-auto text-center">
            <h2 className="text-[30px] md:text-[42px] leading-[1.1] font-light tracking-[-0.02em] text-[#0E1A14]">
              {c.finalCta.h2}
            </h2>
            <p className="mt-4 text-[15.5px] md:text-[17px] text-[#4B5563]">
              {c.finalCta.sub}
            </p>
            <div className="mt-9 flex items-center gap-3 flex-wrap justify-center">
              <BalinaCTA className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-[15px] font-medium hover:bg-[var(--color-primary-pressed)] transition-colors cursor-pointer">
                <Sparkles size={16} /> {c.finalCta.primary}
              </BalinaCTA>
              <BalinaCTA text={c.finalCta.secondaryText} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-medium text-[#1A2620] hover:text-[var(--color-primary)] transition-colors cursor-pointer">
                <Send size={15} /> {c.finalCta.secondary} <ArrowRight size={14} />
              </BalinaCTA>
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
    <section className={`py-16 md:py-24 ${className}`}>
      <PageContainer>{children}</PageContainer>
    </section>
  )
}

// Eyebrow + sub intentionally dropped — kept in the signature so existing call
// sites don't need editing; the homepage shows only the heading now.
function SectionHead({ title }: { eyebrow?: string; title: string; sub?: string }) {
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
