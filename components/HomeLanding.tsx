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
import { Search, ArrowRight, Send, FileCheck2, TrendingUp, Video, Phone, Sparkles, MapPin } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { VillaCard, type VillaCardData } from '@/components/VillaCard'
import { loadAll as loadAllVillas, buildAllCards as buildAllVillaCards, type VillaFilterState } from '@/app/ru/villy/_lib'
import { loadAllVillaScores } from '@/lib/investment/batch-scores'
import type { Lang } from '@/lib/i18n'
import { cdnBucketBase } from '@/lib/photo-cdn'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const sb = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!)

// === COPY =============================================================

const COPY = {
  ru: {
    locale: 'ru-RU',
    hero: {
      eyebrow: 'BALI · ЮВА',
      h1: 'Виллы и апартаменты на Бали с проверенными документами и понятной доходностью.',
      sub: 'Опишите AI-консьержу что ищете — за минуту получите 5–7 подходящих объектов. С PBG, SLF, расчётом доходности по реальным данным соседей и контактом местного менеджера.',
      placeholder: '2-спальная вилла рядом с Чангу до $300 000, под аренду…',
      tryLabel: 'Попробуйте',
      suggestions: [
        { label: 'Виллы в Убуде до $250k', href: '/ru/villy' },
        { label: 'Готовые с доходностью от 10%', href: '/ru/villy' },
        { label: 'ЖК со сдачей в 2026', href: '/ru/zhilye-kompleksy' },
      ],
      ctaPrimary: 'Найти виллу',
      ctaSecondary: 'Спросить менеджера',
      foot: 'Без регистрации.',
    },
    promises: {
      heading: 'Что отличает наш каталог.',
      items: [
        { Icon: FileCheck2, title: 'Документы проверены', body: 'PBG, SLF, leasehold, владелец — каждый объект проходит ручную проверку. Без объектов с серыми правами на землю.' },
        { Icon: TrendingUp, title: 'Доходность по реальным данным', body: 'Не прайс-лист застройщика, а расчёт по фактической загрузке и ценам соседей с Booking и Airbnb за последние 12 месяцев.' },
        { Icon: Video, title: 'Съёмка с земли', body: 'У каждого объекта — оригинальное видео и фото со стройки. Не рендеры, а как это выглядит на самом деле.' },
        { Icon: Phone, title: 'Менеджер на связи', body: 'Андрей Балинский плюс команда на Бали. Сопровождение от просмотра до получения ключей и сдачи в аренду.' },
      ],
    },
    villasSection: {
      eyebrow: '01 · ВИЛЛЫ',
      heading: 'Виллы с полученным PBG или SLF.',
      sub: 'Только объекты, у которых разрешения уже получены — без серых зон с правами на землю. Ранжированы по нашему инвест-скору: цена за м², заявленная доходность и сравнение с локальным рынком аренды.',
      linkAll: 'Все виллы каталога',
    },
    ai: {
      eyebrow: '02 · AI-КОНСЬЕРЖ',
      heading: 'Опишите что ищете. Получите шорт-лист за минуту.',
      body: 'Не нужно листать каталог часами и сравнивать вкладки. AI-консьерж знает каждый объект на платформе. Спросите голосом или текстом — на русском, английском или индонезийском — и получите подходящие варианты с цифрами, документами и расчётом доходности.',
      pointHeading1: 'Описание вместо фильтров',
      pointBody1: '«Двушка в Чангу до $300k для жены и удалённой работы» — этого достаточно. AI разберёт намерение и подберёт то, что подходит.',
      pointHeading2: 'Вопросы по любому объекту',
      pointBody2: 'Какие документы? Сколько на земельный налог? Когда сдают? Спрашивайте — AI отвечает мгновенно из самой полной базы по острову.',
      pointHeading3: 'На вашем языке, 24/7',
      pointBody3: 'Не нужно ждать утра по Бали — спросили ночью, получили ответ ночью. На том языке, на котором удобно.',
      cta: 'Открыть AI-консьерж в Telegram',
      hint: 'Тот же диалог хранится — спросили вчера, продолжаем сегодня. История, документы, расчёты в одном чате.',
    },
    complexesSection: {
      eyebrow: '03 · ЖИЛЫЕ КОМПЛЕКСЫ',
      heading: 'Закрытые комплексы с инфраструктурой.',
      sub: 'Бассейн, охрана, управляющая компания. Юниты под аренду и под себя.',
      linkAll: 'Все комплексы',
    },
    districts: {
      eyebrow: '04 · РАЙОНЫ',
      heading: 'Где покупать — короткий гид.',
      items: [
        { name: 'Чангу', tagline: 'сёрфинг, кафе, посуточная аренда', slug: 'Berawa' },
        { name: 'Убуд', tagline: 'природа, рисовые террасы, спокойствие', slug: 'Ubud' },
        { name: 'Букит', tagline: 'премиальные виды на океан', slug: 'Uluwatu' },
        { name: 'Санур', tagline: 'семейный формат, тихий пляж', slug: 'Sanur' },
      ],
    },
    knowledge: {
      eyebrow: '05 · ЗНАНИЯ',
      heading: 'Что важно знать до сделки.',
      items: [
        { title: 'Как купить недвижимость на Бали', body: 'Leasehold vs freehold, налоги, нотариус, регистрация — пошагово.', href: '/ru/znaniya' },
        { title: 'Документы PBG и SLF — зачем', body: 'Без них объект — серая зона. Что проверять и где.', href: '/ru/znaniya' },
        { title: 'Реальная доходность от аренды', body: 'Какие районы дают 10%+, какие — 4%. И почему прайс-листы врут.', href: '/ru/znaniya' },
      ],
      linkAll: 'База знаний',
    },
    proof: {
      heading: 'Что говорят покупатели.',
      items: [
        { quote: 'Купил виллу за две недели. Без перелёта на Бали. Все документы и проверки — внутри платформы.', author: 'Александр К., Москва', role: 'купил Origins Villa 75 м² в декабре 2025' },
        { quote: 'Сравнили семь объектов в одном Telegram-чате. AI-брокер отвечал ночью, когда я не мог уснуть от расчётов.', author: 'Anna L., Berlin', role: 'купила апартаменты в Canggu' },
        { quote: 'Объект соответствовал съёмке. Это редкость на Бали — обычно фото в рекламе и реальность совсем разные.', author: 'Дмитрий И., Дубай', role: 'купил виллу в Pererenan' },
      ],
    },
    finalCta: {
      h2: 'Найдите объект, который купите.',
      sub: 'Один поиск с AI-консьержем — точнее, чем три месяца изучения каталогов.',
      primary: 'Открыть каталог вилл',
      secondary: 'Написать менеджеру',
    },
  },
  en: {
    locale: 'en-US',
    hero: {
      eyebrow: 'BALI · SOUTHEAST ASIA',
      h1: 'Villas and apartments on Bali with verified documents and real-data yield.',
      sub: 'Tell the AI concierge what you\'re looking for — get 5–7 shortlisted properties in a minute. Each one with PBG/SLF documents, rental-yield based on actual neighbour Booking data, and a local manager you can talk to.',
      placeholder: '2-bedroom villa near Canggu under $300k with rental potential…',
      tryLabel: 'Try',
      suggestions: [
        { label: 'Villas in Ubud under $250k', href: '/en/villas' },
        { label: 'Ready-to-rent with 10%+ yield', href: '/en/villas' },
        { label: 'Complexes delivering in 2026', href: '/en/complexes' },
      ],
      ctaPrimary: 'Find a villa',
      ctaSecondary: 'Talk to a manager',
      foot: 'No signup.',
    },
    promises: {
      heading: 'What sets our catalog apart.',
      items: [
        { Icon: FileCheck2, title: 'Documents verified', body: 'PBG, SLF, leasehold, owner — every property passes manual due diligence. No grey-zone land titles.' },
        { Icon: TrendingUp, title: 'Yield from real data', body: 'Not a developer\'s pitch deck — actual occupancy and pricing from neighbour Booking and Airbnb data over the last 12 months.' },
        { Icon: Video, title: 'Ground-level footage', body: 'Every property has original video and photos from the construction site. Not renders — how it actually looks.' },
        { Icon: Phone, title: 'Manager on call', body: 'Andrei Balinsky and the Bali team. Hand-holding from viewing to keys, and rental ramp-up.' },
      ],
    },
    villasSection: {
      eyebrow: '01 · VILLAS',
      heading: 'Villas with PBG or SLF in hand.',
      sub: 'Only properties with permits already issued — no grey-zone land titles. Ranked by our investment score: price-per-sqm, claimed yield and benchmark against the local rental market.',
      linkAll: 'All villas',
    },
    ai: {
      eyebrow: '02 · AI CONCIERGE',
      heading: 'Describe what you want. Get a shortlist in a minute.',
      body: 'No more scrolling for hours and comparing tabs. The AI concierge knows every property on the platform. Ask in voice or text — in English, Russian, or Indonesian — and receive fitting options with numbers, documents and yield projections.',
      pointHeading1: 'Description instead of filters',
      pointBody1: '"2BR in Canggu under $300k for my partner and remote work" — that\'s enough. The AI parses intent and surfaces what fits.',
      pointHeading2: 'Questions on any property',
      pointBody2: 'What\'s the paperwork like? Annual land tax? Delivery date? Ask away — the AI answers instantly from the most complete database on the island.',
      pointHeading3: 'In your language, 24/7',
      pointBody3: 'No need to wait for Bali morning — ask at midnight, get an answer at midnight. In the language that\'s comfortable for you.',
      cta: 'Open AI concierge in Telegram',
      hint: 'Conversation persists — ask yesterday, continue today. History, documents, calculations in one thread.',
    },
    complexesSection: {
      eyebrow: '03 · RESIDENTIAL COMPLEXES',
      heading: 'Gated complexes with infrastructure.',
      sub: 'Pool, security, property management. Units for rental income and for living.',
      linkAll: 'All complexes',
    },
    districts: {
      eyebrow: '04 · DISTRICTS',
      heading: 'Where to buy — a short guide.',
      items: [
        { name: 'Canggu', tagline: 'surf, cafés, daily rental', slug: 'Berawa' },
        { name: 'Ubud', tagline: 'nature, rice terraces, calm', slug: 'Ubud' },
        { name: 'Bukit', tagline: 'premium ocean views', slug: 'Uluwatu' },
        { name: 'Sanur', tagline: 'family-friendly, quiet beach', slug: 'Sanur' },
      ],
    },
    knowledge: {
      eyebrow: '05 · LEARN',
      heading: 'What to know before the deal.',
      items: [
        { title: 'How to buy property in Bali', body: 'Leasehold vs freehold, taxes, notary, registration — step by step.', href: '/en/knowledge' },
        { title: 'PBG and SLF — what they are', body: 'Without them, a property is grey-zone. What to check and where.', href: '/en/knowledge' },
        { title: 'Real rental yield on Bali', body: 'Which districts deliver 10%+, which give 4%. And why pitch decks lie.', href: '/en/knowledge' },
      ],
      linkAll: 'Knowledge base',
    },
    proof: {
      heading: 'What buyers say.',
      items: [
        { quote: 'Bought a villa in two weeks. Without flying to Bali. All paperwork and checks inside the platform.', author: 'Alexander K., Moscow', role: 'bought Origins Villa 75 m² in December 2025' },
        { quote: 'We compared seven properties in one Telegram thread. The AI broker answered me at night when I couldn\'t sleep from the math.', author: 'Anna L., Berlin', role: 'bought an apartment in Canggu' },
        { quote: 'The property matched the footage. That\'s rare on Bali — usually the ads and the reality look completely different.', author: 'Dmitri I., Dubai', role: 'bought a villa in Pererenan' },
      ],
    },
    finalCta: {
      h2: 'Find the property you\'ll actually buy.',
      sub: 'One search with the AI concierge — sharper than three months of scrolling catalogs.',
      primary: 'Open villa catalog',
      secondary: 'Message a manager',
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
      district: [], bedrooms: [], status: [], permit: ['PBG', 'SLF'], year: [], developer: [], style: [], goal: null, dealType: [],
    }
    const cards = buildAllVillaCards(enriched, manifest, filters, scores, 'investment-desc', undefined, lang)
    return cards.slice(0, 6)
  } catch { return [] }
}

async function loadTopComplexes(): Promise<ComplexHomeCard[]> {
  try {
    const { data } = await sb.from('raw_complexes').select(`
      airtable_id, slug, cover_url,
      name:data->Project,
      district:data->"Location 2",
      district_alt:data->Location,
      units:data->"Total quantity of units",
      status:data->"Статус"
    `).limit(500)
    const COVER_BUCKET = cdnBucketBase('complex-covers')
    const items: ComplexHomeCard[] = []
    for (const r of (data ?? []) as Array<{ airtable_id: string; slug: string | null; cover_url: string | null; name: string | null; district: string | null; district_alt: string | null; units: number | null; status: string | null }>) {
      if (!r.slug || !r.name) continue
      items.push({
        slug: r.slug,
        title: r.name,
        district: r.district ?? r.district_alt,
        units: r.units,
        cover: r.cover_url ?? `${COVER_BUCKET}/${r.airtable_id}.jpg`,
      })
    }
    items.sort((a, b) => (b.units ?? 0) - (a.units ?? 0))
    return items.slice(0, 4)
  } catch { return [] }
}

async function loadStats() {
  const [v, a, k] = await Promise.all([
    sb.from('raw_villas').select('airtable_id', { count: 'exact', head: true }),
    sb.from('raw_apartments').select('airtable_id', { count: 'exact', head: true }),
    sb.from('raw_complexes').select('airtable_id', { count: 'exact', head: true }),
  ])
  return { villas: v.count ?? 0, apartments: a.count ?? 0, complexes: k.count ?? 0 }
}

// === COMPONENT =======================================================

export async function HomeLanding({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const r = ROUTES[lang]
  const [stats, topVillas, topComplexes] = await Promise.all([
    loadStats(),
    loadTopVillas(lang),
    loadTopComplexes(),
  ])
  const totalUnits = stats.villas + stats.apartments
  // Telegram-бот Balinsky — единая точка входа для всех CTA «спросить»/
  // «AI-консьерж» с главной. На стороне бота вшит AI-flow.
  const telegram = 'https://t.me/BalinskyBot'

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <Header />

      {/* === 1. Hero ============================================== */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <PageContainer>
          <div className="max-w-[820px]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-primary)] font-medium mb-5">
              {c.hero.eyebrow}
            </div>
            <h1 className="text-[34px] md:text-[54px] leading-[1.08] font-light tracking-[-0.02em] text-[#0E1A14]">
              {c.hero.h1}
            </h1>
            <p className="mt-5 md:mt-7 text-[15.5px] md:text-[17px] leading-[1.55] text-[#3D4D44] max-w-[680px]">
              {c.hero.sub}
            </p>

            <div className="mt-8 md:mt-10">
              <HeroSearch lang={lang} />
              <div className="mt-3 text-[12.5px] text-[#6B7570] flex items-baseline flex-wrap gap-x-2 gap-y-1">
                <span className="uppercase tracking-wider text-[11px] text-[#9CA59F]">{c.hero.tryLabel}:</span>
                {c.hero.suggestions.map((s, i) => (
                  <Link key={i} href={s.href} className="underline decoration-[#CFDDD4] underline-offset-2 hover:decoration-[var(--color-primary)] hover:text-[var(--color-primary)] no-underline-mobile">
                    {s.label}{i < c.hero.suggestions.length - 1 ? ' ·' : ''}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <Link href={r.villas} className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] text-white text-[14.5px] font-medium hover:bg-[var(--color-primary-pressed)] transition-colors">
                {c.hero.ctaPrimary} <ArrowRight size={16} />
              </Link>
              <a href={telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#D5DDD8] text-[14.5px] font-medium text-[#1A2620] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors no-underline">
                <Send size={15} /> {c.hero.ctaSecondary}
              </a>
              <span className="text-[12.5px] text-[#9CA59F] ml-1">{c.hero.foot}</span>
            </div>
          </div>

          {/* Trust strip — quiet, below CTA */}
          <div className="mt-12 md:mt-16 pt-7 border-t border-[var(--color-border)] grid grid-cols-3 gap-6 max-w-[820px]">
            <TrustCell value={fmtInt(totalUnits, c.locale)} label={lang === 'ru' ? 'объектов в каталоге' : 'properties in the catalog'} />
            <TrustCell value="100%" label={lang === 'ru' ? 'с проверенными документами' : 'with verified documents'} />
            <TrustCell value="3-4" label={lang === 'ru' ? 'страны покупателей' : 'buyer nationalities'} />
          </div>
        </PageContainer>
      </section>

      {/* === 2. Featured villas ================================== */}
      {topVillas.length > 0 && (
        <SectionWrap>
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

      {/* === 3. Promises (4 cards) =============================== */}
      <SectionWrap className="border-t border-[var(--color-border)] bg-[#FAFCFB]">
        <SectionHead title={c.promises.heading} />
        <div className="mt-10 md:mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {c.promises.items.map((p, i) => {
            const Icon = p.Icon
            return (
              <div key={i}>
                <Icon size={22} strokeWidth={1.5} className="text-[var(--color-primary)]" />
                <h3 className="mt-4 text-[17px] font-medium text-[#0E1A14] leading-tight">{p.title}</h3>
                <p className="mt-2.5 text-[14px] leading-[1.6] text-[#4B5563]">{p.body}</p>
              </div>
            )
          })}
        </div>
      </SectionWrap>

      {/* === 4. AI concierge (one strong block, not a tech showcase) === */}
      <SectionWrap className="border-t border-[var(--color-border)]">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-primary)] font-medium mb-4 flex items-center gap-2">
              <Sparkles size={13} strokeWidth={2} /> {c.ai.eyebrow}
            </div>
            <h2 className="text-[28px] md:text-[40px] leading-[1.1] font-light tracking-[-0.02em] text-[#0E1A14]">
              {c.ai.heading}
            </h2>
            <p className="mt-6 text-[15px] leading-[1.65] text-[#4B5563]">
              {c.ai.body}
            </p>
            <a href={telegram} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] text-white text-[14.5px] font-medium hover:bg-[var(--color-primary-pressed)] transition-colors no-underline">
              <Send size={15} /> {c.ai.cta}
            </a>
            <p className="mt-3 text-[12.5px] text-[#9CA59F] max-w-[380px]">{c.ai.hint}</p>
          </div>
          <div className="lg:col-span-7 grid gap-6 content-start">
            <AiPoint heading={c.ai.pointHeading1} body={c.ai.pointBody1} />
            <AiPoint heading={c.ai.pointHeading2} body={c.ai.pointBody2} />
            <AiPoint heading={c.ai.pointHeading3} body={c.ai.pointBody3} />
          </div>
        </div>
      </SectionWrap>

      {/* === 5. Featured complexes ============================== */}
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

      {/* === 6. Districts ======================================= */}
      <SectionWrap className="border-t border-[var(--color-border)]">
        <SectionHead eyebrow={c.districts.eyebrow} title={c.districts.heading} />
        <div className="mt-10 md:mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {c.districts.items.map(d => (
            <Link key={d.name} href={`${r.villas}?district=${d.slug}`} className="rounded-xl border border-[var(--color-border)] p-5 hover:border-[var(--color-primary)] transition-colors no-underline">
              <div className="text-[16px] font-medium text-[#0E1A14]">{d.name}</div>
              <div className="mt-1.5 text-[12.5px] text-[#6B7570] leading-[1.5]">{d.tagline}</div>
            </Link>
          ))}
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
              <Link href={r.villas} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-[15px] font-medium hover:bg-[var(--color-primary-pressed)] transition-colors">
                {c.finalCta.primary} <ArrowRight size={16} />
              </Link>
              <a href={telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-medium text-[#1A2620] hover:text-[var(--color-primary)] transition-colors no-underline">
                <Send size={15} /> {c.finalCta.secondary} <ArrowRight size={14} />
              </a>
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

function SectionHead({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="max-w-[820px]">
      {eyebrow && (
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-primary)] font-medium mb-4">
          {eyebrow}
        </div>
      )}
      <h2 className="text-[26px] md:text-[38px] leading-[1.15] font-light tracking-[-0.02em] text-[#0E1A14]">
        {title}
      </h2>
      {sub && <p className="mt-4 text-[15px] leading-[1.6] text-[#4B5563] max-w-[680px]">{sub}</p>}
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

function AiPoint({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="border-l-2 border-[var(--color-primary)] pl-5 py-1">
      <div className="text-[16px] font-medium text-[#0E1A14] leading-tight">{heading}</div>
      <p className="mt-2 text-[14px] leading-[1.6] text-[#4B5563]">{body}</p>
    </div>
  )
}

function HeroSearch({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const action = lang === 'en' ? '/en/villas' : '/ru/villy'
  return (
    <form action={action} method="get" className="relative">
      <Search size={18} strokeWidth={1.8} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#6B7570] pointer-events-none" />
      <input
        type="text"
        name="q"
        placeholder={c.hero.placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full pl-12 pr-16 py-4 md:py-5 text-[15px] md:text-[16px] rounded-2xl bg-white border border-[#D5DDD8] focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-shadow shadow-[0_1px_2px_rgba(0,0,0,0.03)] placeholder:text-[#9CA59F]"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#0E1A14] text-white hover:bg-[#1F2C25] transition-colors"
        aria-label={c.hero.ctaPrimary}
      >
        <ArrowRight size={16} />
      </button>
    </form>
  )
}

function fmtInt(n: number, locale: string): string {
  try { return n.toLocaleString(locale) } catch { return String(n) }
}
