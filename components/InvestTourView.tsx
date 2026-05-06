// Premium concierge "fly to Bali for 5 days, we run the tour" landing
// page. Targets serious foreign investors who'll fly anyway — better
// they fly with us than with a competitor. Pattern lifted from
// blackpoint.group/invest-tour but with our own positioning, copy and
// structure.

import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { botLink } from '@/lib/bot-link'
import {
  Plane, Car, Building2, Users, Scale, MapPin, Send,
  Clock, Star, Sparkles, ChevronRight,
} from 'lucide-react'
import type { Lang } from '@/lib/i18n'

const COPY = {
  ru: {
    home: 'Главная',
    crumb: 'Инвест-тур',
    h1: 'Инвест-тур по объектам Бали',
    intro: 'Прилетайте на 3–5 дней — встретим в аэропорту, покажем 5–10 объектов под вашу задачу, организуем встречи с застройщиками и юристом. Вы концентрируетесь на сравнении и решении, мы берём на себя логистику и переговоры.',
    bookCta: 'Забронировать тур',
    contactCta: 'Задать вопрос',

    h2Why: 'Почему живой осмотр',
    why: [
      { Icon: Sparkles, title: 'Видите фактическое состояние', body: 'На сайтах застройщиков всегда красиво. На земле — сразу понятно качество стройки, окружение, шум, доступ к пляжу, реальный путь до удобств. Полтора часа осмотра объекта дают больше, чем 20 страниц pdf-презентации.' },
      { Icon: Users,    title: 'Прямой контакт с застройщиком', body: 'Не sales-менеджер с заготовленными ответами, а непосредственно команда проекта. Можно спросить про задержки прошлых очередей, условия escape-clause, реальную загрузку сданных объектов.' },
      { Icon: Star,     title: 'Условия только для участников тура', body: 'У части застройщиков для гостей тура — отдельные условия по цене или payment-plan. Не на всех проектах и не везде, но регулярно отбивает стоимость самой поездки.' },
    ],

    h2Includes: 'Что входит в программу',
    includes: [
      { Icon: Plane,     title: 'Встреча в аэропорту и брифинг', body: 'Встречаем после прилёта, отвозим в гостиницу, проводим короткий брифинг по плану тура — маршрут, расписание встреч, рекомендации по адаптации к Бали.' },
      { Icon: Car,       title: 'Транспорт между объектами', body: 'Комфортный автомобиль с водителем на весь тур. Маршрут планируется заранее с учётом пробок Чангу/Букита, чтобы между объектами не уходило по 1.5 часа.' },
      { Icon: Building2, title: 'Просмотр 5–10 проектов', body: 'Виллы и апартаменты по вашим критериям — район, бюджет, формат сделки. На каждом объекте брокер рассказывает про застройщика, документы, окрестности, потенциал аренды.' },
      { Icon: Users,     title: 'Встречи с командами девелоперов', body: 'По 1–3 интересующим проектам — личная встреча с founder/sales директором. Обсуждение сроков, рассрочки, гарантий, условий выхода и любых нестандартных вопросов.' },
      { Icon: Scale,     title: 'Юридическая консультация', body: 'Час-полтора с независимым юристом, специализирующимся на сделках для иностранцев — leasehold vs PT PMA, KITAS, налоговая структура, специфика вашего гражданства.' },
      { Icon: MapPin,    title: 'Обзор районов и инфраструктуры', body: 'Поездка по релевантным районам — Чангу, Убуд, Букит, Санур. Что где растёт, какой профиль арендатора, где сейчас лучшая ликвидность для перепродажи.' },
    ],

    h2Programs: 'Форматы',
    programs: [
      {
        name: 'Express',
        duration: '2 дня',
        line: '3–5 проектов',
        body: 'Для тех, кто уже выбрал короткий шорт-лист по сайту и хочет быстро посмотреть варианты вживую и закрыть сделку. Без юриста, минимум встреч с девелоперами.',
        bestFor: 'Решение принято, остался выбор между 2–3 объектами',
      },
      {
        name: 'Standard',
        duration: '3–4 дня',
        line: '5–8 проектов',
        body: 'Оптимальный формат. Полный цикл: осмотры, встречи с командами проектов, час с юристом, обзор 2–3 районов. Большинство сделок закрывается на этом тире.',
        bestFor: 'Серьёзная покупка, нужно сравнить и проверить юр. сторону',
        highlight: true,
      },
      {
        name: 'Premium',
        duration: '5–7 дней',
        line: '10+ проектов · нотариус',
        body: 'Расширенная программа: дополнительные районы, встреча с нотариусом PPAT, помощь с регистрацией PT PMA если нужно, отдельный консьерж для семьи. Оптимально для бюджета $1M+.',
        bestFor: 'Несколько объектов в портфель или релокация всей семьи',
      },
    ],
    programBestFor: 'Подходит',
    programBook: 'Забронировать',

    h2Faq: 'Частые вопросы',
    faq: [
      { q: 'Сколько стоит участие в туре?',
        a: 'Зависит от формата и сезона. Сам тур — обычно $0 для серьёзных покупателей с подтверждённым бюджетом, мы покрываем логистику из комиссии застройщика после сделки. Express может быть $0–500, Premium для семьи с няней — отдельная смета. Финальную цену называем после короткого звонка.' },
      { q: 'Нужна ли виза в Индонезию?',
        a: 'Туристическая VOA на 30 дней оформляется по прилёту в аэропорту Денпасар (около $35) или заранее через E-VOA. Для граждан стран ЕС / США / Австралии / Великобритании — без приглашений. Помогаем с рекомендациями по конкретной стране.' },
      { q: 'А я могу взять с собой жену / партнёра?',
        a: 'Да, обычно так и приезжают. Программа подстраивается — параллельная встреча с няней или экскурсия по Убуду пока вы на встречах с девелоперами. Скажите заранее сколько вас и какой профиль попутчиков.' },
      { q: 'Что если ничего не понравится?',
        a: 'Это нормально и часто полезно. Лучше понять что Бали или конкретные объекты не подходят, потратив 4 дня на туре, чем сделать сделку вслепую и пожалеть. Никакого давления купить — мы зарабатываем только на закрытых сделках, и то только если объект подходит вам.' },
      { q: 'Как далеко вперёд бронировать?',
        a: 'За 2–4 недели обычно достаточно. На пиковые недели (декабрь–февраль и июнь–август) — лучше за 4–6 недель, чтобы зафиксировать встречи с девелоперами и расписание юриста.' },
      { q: 'Можно ли купить во время тура?',
        a: 'Часто так и происходит. Reservation form подписывается прямо на встрече с застройщиком, holding deposit вносится в течение 1–2 дней после возвращения домой. Сама SPA — у нотариуса PPAT, обычно через 2–4 недели после reservation.' },
      { q: 'А если я не буду готов покупать после тура?',
        a: 'Совершенно нормально. Большинство наших клиентов приезжают «посмотреть и подумать» и принимают решение через 1–3 месяца после возвращения. Тур даёт fundamentals, дальше вы сравниваете спокойно у себя дома, и если возвращаетесь — готовите сделку.' },
    ],

    bookCardHeading: 'Готовы приехать',
    bookCardText: 'Напишите боту короткое сообщение: бюджет, ориентировочные даты, цель покупки (под аренду / лайфстайл / релокация). Мы подберём формат тура и дадим расчёт за 24 часа.',
    bookCardCta: 'Связаться',

    perksLabel: 'Включено',
  },
  en: {
    home: 'Home',
    crumb: 'Invest tour',
    h1: 'Bali property investment tour',
    intro: 'Fly in for 3–5 days — we meet you at the airport, walk you through 5–10 listings tailored to your goal, line up developer and lawyer meetings. You focus on the comparison and the decision; we handle the logistics and the negotiation.',
    bookCta: 'Book a tour',
    contactCta: 'Ask a question',

    h2Why: 'Why see it in person',
    why: [
      { Icon: Sparkles, title: 'You see actual condition', body: 'Developer websites always look good. On the ground, build quality, surroundings, noise, beach access and the real walk to amenities are immediately obvious. 90 minutes on site beats 20 pages of PDF.' },
      { Icon: Users,    title: 'Direct line to the developer', body: 'Not a sales rep with rehearsed answers — the actual project team. You can ask about previous-phase delays, the escape clauses, real occupancy on delivered units.' },
      { Icon: Star,     title: 'Tour-only conditions', body: 'Some developers offer dedicated price or payment-plan terms to tour participants. Not on every project, but it lands often enough to offset the trip cost itself.' },
    ],

    h2Includes: 'What’s included',
    includes: [
      { Icon: Plane,     title: 'Airport pickup and briefing', body: 'We meet you on arrival, drive you to the hotel, run a short briefing on the tour — route, schedule of meetings, Bali adaptation tips.' },
      { Icon: Car,       title: 'Transport between sites', body: 'Comfortable car with driver throughout the tour. The route is planned around Canggu/Bukit traffic patterns so you do not lose 90 minutes between objects.' },
      { Icon: Building2, title: '5–10 project visits', body: 'Villas and apartments on your criteria — district, budget, deal type. At each site the broker walks you through the developer, documents, surroundings and rental potential.' },
      { Icon: Users,     title: 'Meetings with developer teams', body: 'For 1–3 of the most interesting projects — personal meeting with the founder or sales director. Discuss timelines, payment plans, guarantees, exit terms and any non-standard questions.' },
      { Icon: Scale,     title: 'Lawyer consultation', body: '60–90 minutes with an independent lawyer who specialises in foreigner deals — leasehold vs PT PMA, KITAS, tax structure, specifics of your nationality.' },
      { Icon: MapPin,    title: 'Districts and infrastructure tour', body: 'A drive through the relevant districts — Canggu, Ubud, Bukit, Sanur. What is rising where, the renter profile in each, where the resale liquidity is best right now.' },
    ],

    h2Programs: 'Tour formats',
    programs: [
      {
        name: 'Express',
        duration: '2 days',
        line: '3–5 projects',
        body: 'For buyers who already short-listed online and want to see them in person and close. Lightweight: no lawyer block, minimal developer meetings.',
        bestFor: 'Decision is made, choosing between 2–3 listings',
      },
      {
        name: 'Standard',
        duration: '3–4 days',
        line: '5–8 projects',
        body: 'The default format. Full cycle — site visits, developer team meetings, an hour with the lawyer, drive through 2–3 districts. Most deals close on this tier.',
        bestFor: 'Serious purchase that needs comparison and legal validation',
        highlight: true,
      },
      {
        name: 'Premium',
        duration: '5–7 days',
        line: '10+ projects · notary',
        body: 'Extended programme — additional districts, a meeting with the PPAT notary, help with PT PMA registration if needed, dedicated concierge for the family. Optimal for budgets above $1M.',
        bestFor: 'Several listings into a portfolio, or relocating the whole family',
      },
    ],
    programBestFor: 'Best for',
    programBook: 'Book this format',

    h2Faq: 'Frequently asked',
    faq: [
      { q: 'How much does the tour cost?',
        a: 'Depends on the format and season. The tour itself is usually $0 for serious buyers with confirmed budget — we cover logistics out of the developer commission after the deal. Express can be $0–500, Premium with a family-and-nanny package is quoted separately. We give the final number after a short call.' },
      { q: 'Do I need a visa for Indonesia?',
        a: 'A 30-day tourist VOA is issued on arrival at Denpasar airport (about $35) or in advance via E-VOA. EU / US / Australia / UK passport holders need no invitation. We help with country-specific recommendations.' },
      { q: 'Can I bring my partner / family?',
        a: 'Yes, that is usually how it goes. The programme adapts — a parallel nanny session or an Ubud excursion while you are in the developer meetings. Tell us up front who is coming and the profile of the companions.' },
      { q: 'What if nothing on the tour fits?',
        a: 'That is normal and often useful. Better to spend 4 days realising Bali or the specific listings do not fit than to close blind and regret it. No pressure to buy — we make money only on closed deals, and only if the object fits you.' },
      { q: 'How far in advance should I book?',
        a: '2–4 weeks is usually enough. For peak weeks (Dec–Feb and Jun–Aug) — better 4–6 weeks ahead so we can lock in the developer meetings and the lawyer schedule.' },
      { q: 'Can I buy during the tour?',
        a: 'Often that is exactly what happens. Reservation form is signed at the developer meeting; the holding deposit wires within 1–2 days of you returning home. The SPA itself goes to the PPAT notary 2–4 weeks after reservation.' },
      { q: 'What if I am not ready to buy after the tour?',
        a: 'Completely fine. Most clients come to "look and think" and decide 1–3 months after returning. The tour gives you fundamentals; you compare quietly at home, and if you come back — we prepare the deal.' },
    ],

    bookCardHeading: 'Ready to come',
    bookCardText: 'Send the bot a short message: budget, target dates, purpose (rental income / lifestyle / relocation). We pick the format and quote you within 24 hours.',
    bookCardCta: 'Get in touch',

    perksLabel: 'Included',
  },
} as const

export function InvestTourView({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const home = lang === 'en' ? '/en' : '/ru'
  const contact = botLink('manager', '')

  // FAQ JSON-LD so Google can pick this up as a rich-snippet candidate.
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const offerJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: c.h1,
    description: c.intro,
    touristType: 'Property investor',
    provider: { '@type': 'Organization', name: 'Balinsky', url: 'https://balinsky.info' },
    location: { '@type': 'Place', name: 'Bali, Indonesia' },
  }

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.crumb },
        ]} />

        {/* HERO */}
        <section className="mt-4 mb-14 max-w-[760px]">
          <h1 className="text-[28px] md:text-[44px] font-semibold tracking-tight text-[#111827] leading-[1.05] mb-5">
            {c.h1}
          </h1>
          <p className="text-[16px] md:text-[18px] leading-[1.65] text-[var(--color-text)] mb-7">
            {c.intro}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={contact}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[14px] font-medium no-underline"
            >
              <Send size={16} /> {c.bookCta}
            </a>
            <a
              href="#programs"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[var(--color-border)] text-[14px] no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] bg-white"
            >
              {c.h2Programs} <ChevronRight size={14} />
            </a>
          </div>
        </section>

        {/* WHY */}
        <section className="mb-14">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-6">
            {c.h2Why}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {c.why.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                <Icon size={20} strokeWidth={1.6} className="text-[var(--color-primary)] mb-3" />
                <h3 className="text-[16px] font-semibold mb-2">{title}</h3>
                <p className="text-[14px] leading-[1.6] text-[var(--color-text-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* INCLUDED */}
        <section className="mb-14">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-6">
            {c.h2Includes}
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {c.includes.map(({ Icon, title, body }) => (
              <li key={title} className="rounded-2xl border border-[var(--color-border)] bg-white p-5 flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-search-bg)] text-[var(--color-primary)] flex items-center justify-center">
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold mb-1">{title}</h3>
                  <p className="text-[13px] leading-[1.6] text-[var(--color-text-muted)]">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* PROGRAMS */}
        <section id="programs" className="mb-14 scroll-mt-24">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-6">
            {c.h2Programs}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {c.programs.map(p => (
              <div
                key={p.name}
                className={`rounded-2xl border-2 p-6 flex flex-col ${
                  ('highlight' in p && p.highlight)
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                    : 'border-[var(--color-border)] bg-white'
                }`}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-[20px] font-semibold text-[#111827]">{p.name}</h3>
                  <span className="text-[12px] text-[var(--color-text-muted)] inline-flex items-center gap-1">
                    <Clock size={11} /> {p.duration}
                  </span>
                </div>
                <div className="text-[13px] text-[var(--color-text-muted)] mb-3">{p.line}</div>
                <p className="text-[14px] leading-[1.6] text-[var(--color-text)] mb-4">{p.body}</p>
                <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5 mt-auto">
                  {c.programBestFor}
                </div>
                <p className="text-[13px] text-[var(--color-text)] mb-4">{p.bestFor}</p>
                <a
                  href={contact}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium no-underline mt-2 ${
                    ('highlight' in p && p.highlight)
                      ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white'
                      : 'border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] bg-white'
                  }`}
                >
                  <Send size={13} /> {c.programBook}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-14 max-w-[760px]">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">
            {c.h2Faq}
          </h2>
          <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {c.faq.map(f => (
              <li key={f.q} className="py-4">
                <h3 className="text-[16px] font-semibold mb-1.5 text-[#111827]">{f.q}</h3>
                <p className="text-[14px] leading-[1.65] text-[var(--color-text-muted)]">{f.a}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* CONTACT CARD */}
        <section className="mb-12 max-w-[760px]">
          <div className="rounded-2xl bg-[var(--color-search-bg)] p-6 md:p-8">
            <h2 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-[#111827] mb-3">
              {c.bookCardHeading}
            </h2>
            <p className="text-[15px] leading-[1.65] text-[var(--color-text)] mb-5">{c.bookCardText}</p>
            <a
              href={contact}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[14px] font-medium no-underline"
            >
              <Send size={16} /> {c.bookCardCta}
            </a>
          </div>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }} />

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
