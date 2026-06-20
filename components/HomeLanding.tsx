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
import { BalinaChatMock } from '@/components/BalinaChatMock'
import { isHiddenDeveloper } from '@/lib/hidden-developers'
import { loadHomeFinder } from '@/lib/home-finder'
import { HomeFinder } from '@/components/HomeFinder'
import {
  StepChat, StepStudy, StepRequest,
  VizYield, VizCompetitors, VizNearby, VizDocs, VizDeveloper, VizFootage,
  SafetyFlow,
} from '@/components/LandingVisuals'
import type { Lang } from '@/lib/i18n'
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
        { quote: 'Купил виллу за две недели. Без перелёта на Бали. Все документы и проверки — внутри платформы.', author: 'Александр К., Москва', role: 'купил Origins Villa 75 м² в декабре 2025' },
        { quote: 'Сравнили семь объектов в одном Telegram-чате. AI-брокер отвечал ночью, когда я не мог уснуть от расчётов.', author: 'Anna L., Berlin', role: 'купила апартаменты в Canggu' },
        { quote: 'Объект соответствовал съёмке. Это редкость на Бали — обычно фото в рекламе и реальность совсем разные.', author: 'Дмитрий И., Дубай', role: 'купил виллу в Pererenan' },
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
  const c = COPY[lang]
  const r = ROUTES[lang]
  const [stats, topVillas, topComplexes, collections, finderItems] = await Promise.all([
    loadStats(),
    loadTopVillas(lang),
    loadTopComplexes(),
    loadHomeCollections(lang),
    loadHomeFinder(lang),
  ])
  // Telegram-бот Balinsky — единая точка входа для всех CTA «спросить»/
  // «AI-консьерж» с главной. На стороне бота вшит AI-flow.
  const telegram = 'https://t.me/BalinskyBot'

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
            <TrustCell value={fmtInt(stats.complexes, c.locale)} label={lang === 'ru' ? 'жилых комплексов' : 'residential complexes'} />
            <TrustCell value={fmtInt(stats.developers, c.locale)} label={lang === 'ru' ? 'застройщиков' : 'developers'} />
            <TrustCell value={fmtInt(stats.villas, c.locale)} label={lang === 'ru' ? 'планировок вилл' : 'villa layouts'} />
            <TrustCell value={fmtInt(stats.apartments, c.locale)} label={lang === 'ru' ? 'планировок апартаментов' : 'apartment layouts'} />
            <TrustCell value={fmtInt(stats.units, c.locale)} label={lang === 'ru' ? 'юнитов на сайте' : 'units on the site'} />
          </div>
        </PageContainer>
      </section>

      {/* === Guided finder — easy mode: 3 taps → ranked shortlist == */}
      {finderItems.length > 0 && (
        <SectionWrap className="border-t border-[var(--color-border)]">
          <SectionHead title={lang === 'ru' ? 'Подберём виллу за 3 ответа.' : 'Find your villa in 3 taps.'} />
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
              <a href={telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#D5DDD8] text-[14.5px] font-medium text-[#1A2620] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors no-underline">
                <Send size={15} /> {c.ai.cta}
              </a>
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
            eyebrow={lang === 'ru' ? 'Подборки' : 'Collections'}
            title={lang === 'ru' ? 'Лучшее в вашем бюджете' : 'The best in your budget'}
            sub={lang === 'ru'
              ? 'Топ-объекты по доходности и популярности — выберите бюджет и район'
              : 'Top listings by yield and popularity — pick a budget and a district'}
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
                  <div className="text-[15px] font-medium text-[#0E1A14] truncate">{k.title}</div>
                  <div className="mt-1 text-[12.5px] text-[#6B7570] flex items-center gap-1.5">
                    {k.district && <><MapPin size={11} /> {k.district}</>}
                    {k.units != null && <span className="ml-auto tabular-nums">{k.units} {lang === 'ru' ? 'юнитов' : 'units'}</span>}
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
            return (
              <Link
                key={d.name}
                href={`${r.villas}?district=${d.slug}`}
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
                {lang === 'ru' ? 'Читать' : 'Read'} <ArrowRight size={12} />
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
