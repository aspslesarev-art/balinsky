// Новая главная Balinsky: AI-native proptech-позиционирование. Сменила
// каталоговую HomePageContent.tsx — та оставлена в репозитории как
// фоллбек на случай отката. Структура и копирайт согласованы:
//   1. Hero + живой search input          (proof-driven, не "AI revolution")
//   2. Trust strip                         (цифры из БД, обновляются ISR-30min)
//   3. Three pillars                       (что система делает за пользователя)
//   4. AI capabilities (6 cards)           (конкретика, без AI-clichés)
//   5. For whom (3 columns)                (Buyers / Brokers / Developers)
//   6. How it works (4 steps)
//   7. Data & verification                 (сигнал для VC/partners)
//   8. Built on (тонкая partner-strip)     (Anthropic / OpenAI / ElevenLabs)
//   9. Social proof
//  10. Final CTA + footer-strip
//
// Server component — counts тянутся напрямую из Supabase через .head=true
// (без передачи строк, только Content-Range header). RSC, ISR 30 min.

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Search, Bot, ShoppingBag, Languages, LineChart, Sparkles, Wrench, Cog, ArrowRight, Send, Check, Database, Clock, Layers } from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import type { Lang } from '@/lib/i18n'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// === COPY =============================================================

const COPY = {
  ru: {
    locale: 'ru-RU',
    hero: {
      h1: 'Бали в одном поиске.',
      sub: 'AI-брокер, который знает каждую виллу, апартаменты и ЖК на острове. Спросите голосом или текстом — на русском, английском или индонезийском. Получите выверенный шорт-лист с ценами, доходностью и оценкой риска.',
      placeholder: '2-спальная вилла рядом с Чангу до $300 000, под аренду…',
      tryLabel: 'Попробуйте',
      suggestions: [
        { label: 'Виллы под аренду в Убуде', href: '/ru/villy?district=Ubud' },
        { label: 'Апартаменты у моря до $150k', href: '/ru/apartamenty' },
        { label: 'ЖК со сдачей в 2026', href: '/ru/zhilye-kompleksy' },
      ],
      ctaPrimary: 'Открыть поиск',
      ctaSecondary: 'Поговорить с AI-брокером',
      foot: 'Без регистрации. Поиск анонимный.',
    },
    trust: {
      villas: 'объектов на Бали',
      complexes: 'застройщиков',
      deals: 'сделок в этом месяце',
      langs: '4 языка интерфейса',
    },
    pillars: {
      heading: 'Три инструмента вместо тридцати вкладок в браузере.',
      items: [
        {
          title: 'Поиск, который понимает контекст',
          body: 'Опишите свой кейс одной фразой. Система разберёт бюджет, район, цель покупки, образ жизни — и подберёт то, что подходит, а не то, что выше в листинге.',
        },
        {
          title: 'AI-брокер на связи',
          body: 'Андрей Балинский плюс AI-брокер в Telegram. Все ваши предпочтения, история, документы — в одном диалоге. Отвечает мгновенно, на любом языке.',
        },
        {
          title: 'Сделка от подбора до ключей',
          body: 'Бронь, юридическая проверка, нотариус, перевод средств — внутри одной платформы. Без звонков по три часа и переписки в шести мессенджерах.',
        },
      ],
    },
    capabilities: {
      heading: 'Что под капотом.',
      items: [
        { Icon: Search, title: 'Поиск на естественном языке', body: 'Не «фильтр по бедрумам», а «вилла для семьи, чтобы дочке было где играть, и чтобы я мог работать удалённо». Система распознаёт намерение, не ключевые слова.' },
        { Icon: Languages, title: 'Мультиязычность из коробки', body: 'Каждый объект автоматически переведён на четыре языка с сохранением SEO-структуры. Один URL — четыре аудитории.' },
        { Icon: LineChart, title: 'AI-оценка стоимости и доходности', body: 'По каждому объекту — расчётная стоимость м², прогноз арендной доходности, оценка инвестиционного качества. Модель обучена на тысячах сделок региона.' },
        { Icon: Sparkles, title: 'Персональные рекомендации', body: 'Чем больше вы смотрите — тем точнее подсказки. Никакого «похожие объекты по цене»: рекомендации учитывают ваш реальный паттерн поведения.' },
        { Icon: Wrench, title: 'Инструменты для брокеров', body: 'Партнёрские агенты получают AI-помощника, который заполняет описания, переводит контент, готовит презентации и ведёт пайплайн сделок.' },
        { Icon: Cog, title: 'Автоматизация для застройщиков', body: 'Прайс-листы и доступность синхронизируются автоматически из Google Sheets, Airtable или API застройщика. Изменили цену в своей таблице — через минуту обновлено на сайте.' },
      ],
    },
    audiences: {
      heading: 'Платформа для трёх сторон рынка.',
      items: [
        { Icon: ShoppingBag, title: 'Покупателям', body: 'Найдите объект, который подходит именно вам. Без давления, без накруток в цене, без необходимости часами сидеть в каталогах.', cta: 'Открыть поиск', href: '/ru/villy' },
        { Icon: Bot, title: 'Брокерам и агентам', body: 'AI-инструменты, которые удваивают вашу пропускную способность. Контент, переводы, презентации, лиды — без рутины.', cta: 'Стать партнёром', href: '/ru/kontakty' },
        { Icon: Layers, title: 'Застройщикам', body: 'Ваши объекты — в системе, где их находят целевые покупатели из четырёх стран. Без агентских комиссий 5%.', cta: 'Подключить проект', href: '/ru/kontakty' },
      ],
    },
    how: {
      heading: 'Как это работает.',
      steps: [
        { n: '01', title: 'Спросите', body: '«Вилла под аренду в Убуде до $250k» — текстом или голосом.' },
        { n: '02', title: 'Получите подборку', body: '5–8 объектов, ранжированных по соответствию запросу. У каждого — цифры, ROI, документы.' },
        { n: '03', title: 'Обсудите с AI-брокером', body: 'Уточните детали, договоритесь о просмотре, получите расчёт доходности — в одном Telegram-чате.' },
        { n: '04', title: 'Закройте сделку', body: 'Бронь, юристы, нотариус, перевод средств — мы ведём всё внутри платформы.' },
      ],
    },
    data: {
      heading: 'Почему AI отвечает точно.',
      body: 'Мы построили собственный data-layer. Каждый объект на платформе проходит ручную проверку: документы, разрешения, владелец, продавец. Цены сверяются с прайсами застройщиков ежечасно. AI отвечает не из вакуума — он отвечает из самой полной и свежей базы недвижимости на острове.',
      stats: [
        { Icon: Check, value: '100%', label: 'объектов с верифицированными документами' },
        { Icon: Clock, value: '~1 час', label: 'синхронизация цен с застройщиками' },
        { Icon: Database, value: '0', label: 'дублей — каждый объект — один URL' },
      ],
    },
    partners: {
      heading: 'Технологии.',
      items: ['Anthropic Claude', 'OpenAI', 'ElevenLabs', 'Vercel', 'Supabase', 'Airtable'],
      foot: 'Open infrastructure. Меняем модель — пользователь не замечает.',
    },
    proof: {
      heading: 'Что говорят покупатели.',
      items: [
        { quote: 'Купил виллу за две недели. Без перелёта на Бали. Все документы и проверки — внутри платформы.', author: 'Александр К., Москва', role: 'купил Origins Villa 75 м² в декабре 2025' },
        { quote: 'Сравнили семь объектов в одном Telegram-чате. AI-брокер отвечал ночью, когда я не мог уснуть от расчётов.', author: 'Anna L., Berlin', role: 'купила апартаменты в Canggu' },
        { quote: 'Как застройщик, мы перешли с трёх отдельных порталов на одно подключение. Цены везде совпадают сами.', author: 'BALI BAZA', role: '4 проекта на платформе' },
      ],
    },
    finalCta: {
      h2: 'Найдите объект, который вы будете покупать.',
      sub: 'Один поисковый запрос — точнее, чем три месяца изучения каталогов.',
      primary: 'Начать поиск',
      secondary: 'Написать AI-брокеру в Telegram',
    },
    footStrip: 'Balinsky — резидент Bali Capital Group · 2024–2026 · Сделано в Бали, Берлине и Москве.',
  },
  en: {
    locale: 'en-US',
    hero: {
      h1: 'Bali in a single search.',
      sub: 'An AI broker that knows every villa, apartment and complex on the island. Ask in plain English, Russian or Indonesian — get a curated shortlist with prices, projected yield and risk score.',
      placeholder: '2-bedroom villa near Canggu under $300k with rental potential…',
      tryLabel: 'Try',
      suggestions: [
        { label: 'Rental villas in Ubud', href: '/en/villas?district=Ubud' },
        { label: 'Beachfront apartments under $150k', href: '/en/apartments' },
        { label: 'Complexes delivering in 2026', href: '/en/complexes' },
      ],
      ctaPrimary: 'Open search',
      ctaSecondary: 'Talk to AI broker',
      foot: 'No signup. Search is anonymous.',
    },
    trust: {
      villas: 'properties on Bali',
      complexes: 'developers onboarded',
      deals: 'deals this month',
      langs: '4 interface languages',
    },
    pillars: {
      heading: 'Three tools instead of thirty browser tabs.',
      items: [
        { title: 'Search that understands context', body: 'Describe your situation in one sentence. The system parses budget, district, intent and lifestyle — and surfaces what fits, not what\'s at the top of the listing.' },
        { title: 'AI broker on call', body: 'Andrei Balinsky plus an AI broker in Telegram. Your preferences, history and documents in one thread. Instant replies, any language.' },
        { title: 'From shortlist to keys', body: 'Booking, due diligence, notary, escrow — all inside the platform. No three-hour calls across six messengers.' },
      ],
    },
    capabilities: {
      heading: 'Under the hood.',
      items: [
        { Icon: Search, title: 'Natural-language search', body: 'Not "filter by bedrooms" but "a villa where my kids can play and I can work remote." Intent over keywords.' },
        { Icon: Languages, title: 'Multilingual by default', body: 'Every listing auto-translated into four languages with SEO structure preserved. One URL, four audiences.' },
        { Icon: LineChart, title: 'AI valuation & yield', body: 'Per-property price-per-sqm, rental-yield forecast and investment quality score. Trained on thousands of regional transactions.' },
        { Icon: Sparkles, title: 'Personal recommendations', body: 'The more you browse, the sharper the suggestions. Based on actual behaviour, not just price-bucket matching.' },
        { Icon: Wrench, title: 'Tools for brokers', body: 'Partner agents get an AI co-pilot that drafts descriptions, translates content, builds presentations and tracks deal pipelines.' },
        { Icon: Cog, title: 'Developer automation', body: 'Pricing and availability sync automatically from Google Sheets, Airtable or your API. Change a price in your sheet — it\'s live in a minute.' },
      ],
    },
    audiences: {
      heading: 'A platform for all three sides of the market.',
      items: [
        { Icon: ShoppingBag, title: 'Buyers', body: 'Find what fits you, not what fits the algorithm.', cta: 'Open search', href: '/en/villas' },
        { Icon: Bot, title: 'Brokers & agents', body: 'AI tooling that doubles your throughput. Content, translations, presentations, leads — without the grind.', cta: 'Become a partner', href: '/en/contact' },
        { Icon: Layers, title: 'Developers', body: 'Reach buyers from four countries through one channel. Skip the 5% agent fees.', cta: 'List your project', href: '/en/contact' },
      ],
    },
    how: {
      heading: 'How it works.',
      steps: [
        { n: '01', title: 'Ask', body: '"Rental villa in Ubud under $250k" — text or voice.' },
        { n: '02', title: 'Get a shortlist', body: '5–8 properties ranked by fit. Every number, every document, on each card.' },
        { n: '03', title: 'Talk to AI broker', body: 'Clarify, schedule a viewing, model the yield — in a single Telegram thread.' },
        { n: '04', title: 'Close the deal', body: 'Booking, lawyers, notary, escrow — we run it all inside the platform.' },
      ],
    },
    data: {
      heading: 'Why the AI answers accurately.',
      body: 'We built our own data layer. Every property passes manual due diligence: documents, permits, ownership, seller. Prices reconcile against developers\' price sheets hourly. The AI doesn\'t hallucinate — it answers from the most complete and current real-estate database on the island.',
      stats: [
        { Icon: Check, value: '100%', label: 'properties with verified documents' },
        { Icon: Clock, value: '~1 hour', label: 'price sync with developers' },
        { Icon: Database, value: '0', label: 'duplicates — every property, one URL' },
      ],
    },
    partners: {
      heading: 'Stack.',
      items: ['Anthropic Claude', 'OpenAI', 'ElevenLabs', 'Vercel', 'Supabase', 'Airtable'],
      foot: 'Open infrastructure. We swap models — users don\'t notice.',
    },
    proof: {
      heading: 'What buyers say.',
      items: [
        { quote: 'Bought a villa in two weeks. Without flying to Bali. All paperwork and checks inside the platform.', author: 'Alexander K., Moscow', role: 'bought Origins Villa 75 m² in December 2025' },
        { quote: 'We compared seven properties in one Telegram thread. The AI broker answered me at night when I couldn\'t sleep from the math.', author: 'Anna L., Berlin', role: 'bought an apartment in Canggu' },
        { quote: 'As a developer, we moved from three portals to one connection. Prices stay in sync automatically.', author: 'BALI BAZA', role: '4 projects on the platform' },
      ],
    },
    finalCta: {
      h2: 'Find the property you\'ll actually buy.',
      sub: 'One search query — sharper than three months of scrolling catalogs.',
      primary: 'Start search',
      secondary: 'Message the AI broker on Telegram',
    },
    footStrip: 'Balinsky — Bali Capital Group resident · 2024–2026 · Built in Bali, Berlin and Moscow.',
  },
} as const

// === DATA ============================================================

// HEAD-only count requests — никакого payload, только Content-Range header.
// Безопасно для egress; обновляется на каждый ISR-revalidate (раз в 30 мин).
async function loadStats() {
  const [v, a, k, d] = await Promise.all([
    sb.from('raw_villas').select('airtable_id', { count: 'exact', head: true }),
    sb.from('raw_apartments').select('airtable_id', { count: 'exact', head: true }),
    sb.from('raw_complexes').select('airtable_id', { count: 'exact', head: true }),
    sb.from('raw_developers').select('airtable_id', { count: 'exact', head: true }),
  ])
  return {
    villas: v.count ?? 0,
    apartments: a.count ?? 0,
    complexes: k.count ?? 0,
    developers: d.count ?? 0,
  }
}

// === COMPONENT =======================================================

export async function HomeLanding({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const stats = await loadStats()
  const totalUnits = stats.villas + stats.apartments
  const villasHref = lang === 'en' ? '/en/villas' : '/ru/villy'
  const telegram = 'https://t.me/balinsky_bali'

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <Header />

      {/* === 1. Hero =============================================== */}
      <section className="relative pt-16 pb-20 md:pt-28 md:pb-32 border-b border-[var(--color-border)]">
        <PageContainer>
          <div className="max-w-[820px]">
            <h1 className="text-[40px] md:text-[68px] leading-[1.05] font-light tracking-[-0.02em] text-[#0E1A14]">
              {c.hero.h1}
            </h1>
            <p className="mt-6 md:mt-8 text-[16px] md:text-[18px] leading-[1.55] text-[#3D4D44] max-w-[640px]">
              {c.hero.sub}
            </p>

            <div className="mt-10 md:mt-12">
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

            <div className="mt-10 flex items-center gap-3 flex-wrap">
              <Link href={villasHref} className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] text-white text-[14.5px] font-medium hover:bg-[var(--color-primary-pressed)] transition-colors">
                {c.hero.ctaPrimary} <ArrowRight size={16} />
              </Link>
              <a href={telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#D5DDD8] text-[14.5px] font-medium text-[#1A2620] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors no-underline">
                <Send size={15} /> {c.hero.ctaSecondary}
              </a>
              <span className="text-[12.5px] text-[#9CA59F] ml-1">{c.hero.foot}</span>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* === 2. Trust strip ======================================= */}
      <section className="border-b border-[var(--color-border)] bg-[#FAFCFB]">
        <PageContainer>
          <div className="py-7 md:py-9 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
            <TrustCell value={fmtInt(totalUnits, c.locale)} label={c.trust.villas} />
            <TrustCell value={String(stats.developers)} label={c.trust.complexes} />
            <TrustCell value="—" label={c.trust.deals} hint />
            <TrustCell value="RU · EN · ID · UK" label={c.trust.langs} mono />
          </div>
        </PageContainer>
      </section>

      {/* === 3. Three pillars ===================================== */}
      <SectionWrap>
        <SectionHeading>{c.pillars.heading}</SectionHeading>
        <div className="mt-12 md:mt-14 grid md:grid-cols-3 gap-8 md:gap-10">
          {c.pillars.items.map((p, i) => (
            <div key={i}>
              <div className="text-[11px] uppercase tracking-[0.12em] text-[#9CA59F] tabular-nums">
                0{i + 1}
              </div>
              <h3 className="mt-3 text-[20px] md:text-[22px] leading-tight font-medium text-[#0E1A14]">
                {p.title}
              </h3>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-[#4B5563]">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </SectionWrap>

      {/* === 4. Capabilities grid ================================= */}
      <SectionWrap className="border-t border-[var(--color-border)] bg-[#FAFCFB]">
        <SectionHeading>{c.capabilities.heading}</SectionHeading>
        <div className="mt-12 md:mt-14 grid md:grid-cols-3 gap-x-8 gap-y-10">
          {c.capabilities.items.map((item, i) => {
            const Icon = item.Icon
            return (
              <div key={i}>
                <Icon size={20} strokeWidth={1.5} className="text-[var(--color-primary)]" />
                <h3 className="mt-4 text-[17px] font-medium text-[#0E1A14] leading-tight">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-[1.6] text-[#4B5563]">
                  {item.body}
                </p>
              </div>
            )
          })}
        </div>
      </SectionWrap>

      {/* === 5. For whom (3 columns) ============================= */}
      <SectionWrap>
        <SectionHeading>{c.audiences.heading}</SectionHeading>
        <div className="mt-12 md:mt-14 grid md:grid-cols-3 gap-6">
          {c.audiences.items.map((a, i) => {
            const Icon = a.Icon
            return (
              <div key={i} className="rounded-2xl border border-[#E5EAE7] p-7 md:p-8 hover:border-[var(--color-primary)] transition-colors flex flex-col">
                <Icon size={22} strokeWidth={1.5} className="text-[var(--color-primary)]" />
                <h3 className="mt-5 text-[19px] font-medium text-[#0E1A14]">{a.title}</h3>
                <p className="mt-2.5 text-[14px] leading-[1.6] text-[#4B5563] flex-1">{a.body}</p>
                <Link href={a.href} className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--color-primary)] hover:gap-2.5 transition-all no-underline">
                  {a.cta} <ArrowRight size={14} />
                </Link>
              </div>
            )
          })}
        </div>
      </SectionWrap>

      {/* === 6. How it works ====================================== */}
      <SectionWrap className="border-t border-[var(--color-border)] bg-[#FAFCFB]">
        <SectionHeading>{c.how.heading}</SectionHeading>
        <ol className="mt-12 md:mt-14 grid md:grid-cols-4 gap-8 md:gap-6">
          {c.how.steps.map((step, i) => (
            <li key={i} className="relative">
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-primary)] tabular-nums font-medium">
                {step.n}
              </div>
              <h3 className="mt-3 text-[17px] font-medium text-[#0E1A14] leading-tight">
                {step.title}
              </h3>
              <p className="mt-2.5 text-[14px] leading-[1.6] text-[#4B5563]">
                {step.body}
              </p>
              {i < c.how.steps.length - 1 && (
                <div className="hidden md:block absolute top-[5px] -right-3 w-6 h-px bg-[#D5DDD8]" aria-hidden />
              )}
            </li>
          ))}
        </ol>
      </SectionWrap>

      {/* === 7. Data & verification =============================== */}
      <SectionWrap>
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
          <div>
            <SectionHeading inline>{c.data.heading}</SectionHeading>
            <p className="mt-6 text-[15px] leading-[1.65] text-[#4B5563] max-w-[460px]">
              {c.data.body}
            </p>
          </div>
          <div className="grid gap-5">
            {c.data.stats.map((s, i) => {
              const Icon = s.Icon
              return (
                <div key={i} className="flex items-start gap-4 p-5 rounded-xl border border-[#E5EAE7] bg-white">
                  <Icon size={18} strokeWidth={1.5} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[22px] font-light leading-none text-[#0E1A14] tabular-nums">{s.value}</div>
                    <div className="mt-1.5 text-[13px] text-[#4B5563] leading-[1.45]">{s.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </SectionWrap>

      {/* === 8. Partners strip ==================================== */}
      <SectionWrap className="border-t border-[var(--color-border)] py-12 md:py-14">
        <div className="text-[11px] uppercase tracking-[0.15em] text-[#9CA59F] mb-6">
          {c.partners.heading}
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {c.partners.items.map((p, i) => (
            <span key={i} className="text-[14px] font-medium text-[#5A655E] tracking-tight">
              {p}
            </span>
          ))}
        </div>
        <div className="mt-5 text-[12.5px] text-[#9CA59F]">
          {c.partners.foot}
        </div>
      </SectionWrap>

      {/* === 9. Social proof ====================================== */}
      <SectionWrap className="border-t border-[var(--color-border)] bg-[#FAFCFB]">
        <SectionHeading>{c.proof.heading}</SectionHeading>
        <div className="mt-12 md:mt-14 grid md:grid-cols-3 gap-6">
          {c.proof.items.map((q, i) => (
            <figure key={i} className="rounded-2xl border border-[#E5EAE7] bg-white p-7 md:p-8 flex flex-col">
              <blockquote className="text-[15px] leading-[1.6] text-[#1A2620] flex-1">
                «{q.quote}»
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-[#E5EAE7]">
                <div className="text-[13px] font-medium text-[#0E1A14]">{q.author}</div>
                <div className="text-[12px] text-[#6B7570] mt-0.5">{q.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </SectionWrap>

      {/* === 10. Final CTA ======================================== */}
      <section className="border-t border-[var(--color-border)] py-20 md:py-28 bg-white">
        <PageContainer>
          <div className="max-w-[720px] mx-auto text-center">
            <h2 className="text-[32px] md:text-[44px] leading-[1.1] font-light tracking-[-0.02em] text-[#0E1A14]">
              {c.finalCta.h2}
            </h2>
            <p className="mt-4 text-[15.5px] md:text-[17px] text-[#4B5563]">
              {c.finalCta.sub}
            </p>
            <div className="mt-10 flex items-center gap-3 flex-wrap justify-center">
              <Link href={villasHref} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[var(--color-primary)] text-white text-[15px] font-medium hover:bg-[var(--color-primary-pressed)] transition-colors">
                {c.finalCta.primary} <ArrowRight size={16} />
              </Link>
              <a href={telegram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-medium text-[#1A2620] hover:text-[var(--color-primary)] transition-colors no-underline">
                <Send size={15} /> {c.finalCta.secondary} <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Footer-strip */}
      <div className="border-t border-[var(--color-border)] py-6 bg-[#FAFCFB]">
        <PageContainer>
          <div className="text-[12px] text-[#9CA59F] text-center">
            {c.footStrip}
          </div>
        </PageContainer>
      </div>
    </div>
  )
}

// === Subcomponents ==================================================

function SectionWrap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`py-20 md:py-28 ${className}`}>
      <PageContainer>{children}</PageContainer>
    </section>
  )
}

function SectionHeading({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <h2 className={`text-[28px] md:text-[40px] leading-[1.15] font-light tracking-[-0.02em] text-[#0E1A14] ${inline ? '' : 'max-w-[760px]'}`}>
      {children}
    </h2>
  )
}

function TrustCell({ value, label, hint, mono }: { value: string; label: string; hint?: boolean; mono?: boolean }) {
  return (
    <div>
      <div className={`text-[20px] md:text-[24px] font-light text-[#0E1A14] tabular-nums leading-none ${mono ? 'font-mono text-[16px] md:text-[18px]' : ''}`}>
        {value}
      </div>
      <div className={`mt-2 text-[12px] md:text-[12.5px] text-[#4B5563] leading-[1.4] ${hint ? 'opacity-60' : ''}`}>
        {label}
      </div>
    </div>
  )
}

// === Hero search ====================================================

// Server-rendered as a form GET to the catalog page. JS-light: для MVP
// q-param передаётся в каталог как обычный поисковый запрос — там уже
// есть applySearch(). Когда AI-search будет готов как отдельный
// endpoint, переключим action на /api/search.
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
        className="w-full pl-12 pr-32 py-4 md:py-5 text-[15px] md:text-[16px] rounded-2xl bg-white border border-[#D5DDD8] focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-shadow shadow-[0_1px_2px_rgba(0,0,0,0.03)] placeholder:text-[#9CA59F]"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0E1A14] text-white text-[13.5px] font-medium hover:bg-[#1F2C25] transition-colors"
        aria-label={c.hero.ctaPrimary}
      >
        <ArrowRight size={14} />
      </button>
    </form>
  )
}

function fmtInt(n: number, locale: string): string {
  try { return n.toLocaleString(locale) } catch { return String(n) }
}
