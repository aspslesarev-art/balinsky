// Trust hub for the foreign-investor flow. Live numbers from raw_*
// tables, an honest description of the operator, the platform's
// editorial standards, and an invitation for buyers to send their
// purchase story for the future case-studies section.

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { loadAllManagers } from '@/lib/managers'
import { botLink } from '@/lib/bot-link'
import {
  Building2, Home, BedDouble, HardHat, UsersRound,
  ShieldCheck, FileSearch, Video, BookOpen, Send,
} from 'lucide-react'
import type { Lang } from '@/lib/i18n'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

const COPY = {
  ru: {
    home: 'Главная',
    crumb: 'О Balinsky',
    h1: 'Balinsky — что это и почему ему можно доверять',
    intro: 'Balinsky — каталог недвижимости Бали для иностранцев: виллы, апартаменты, жилые комплексы и аренда. На сайте собраны проекты от застройщиков, у которых мы лично проверили документы, посмотрели объекты на земле и сняли видео. Цены — в актуальных USD. Менеджеры по сделкам — реальные люди с фото, рейтингом и языками, на которых они говорят.',

    h2Numbers: 'Цифры на сегодня',
    numbersLead: 'Эти числа обновляются автоматически — на сайте показано столько объектов, сколько реально опубликовано в базе.',
    statVillas: 'вилл и домов',
    statApts: 'апартаментов',
    statComplexes: 'жилых комплексов',
    statDevs: 'застройщиков',
    statMgrs: 'менеджеров на связи',

    h2How: 'Как мы выбираем что публиковать',
    standards: [
      { Icon: FileSearch, title: 'Проверка документов', body: 'У каждого объекта в базе должен быть валидный PBG, понятная структура земли (SHM/HGB/Hak Pakai) и реальный застройщик с PT-регистрацией. Без этого набора объект просто не попадает на сайт.' },
      { Icon: Video,      title: 'Видео и фото с земли', body: 'На большую часть проектов наша команда снимала своё видео — дрон, ход стройки, окрестности. Не пресс-релиз застройщика, а реальное состояние на дату съёмки.' },
      { Icon: UsersRound, title: 'Менеджер с лицом', body: 'У каждого застройщика на сайте есть назначенный менеджер с фото, языками, прямым Telegram и WhatsApp. Не «обезличенный sales department», а конкретный человек, с которым можно созвониться.' },
      { Icon: BookOpen,   title: 'Редакторский шорт-лист', body: 'Мы не публикуем «всё подряд». Объекты, проекты и застройщики, которые не прошли наш внутренний QA по перечисленным выше пунктам, в каталог не попадают.' },
    ],

    h2Stack: 'Что вы получаете',
    stackItems: [
      { title: 'Каталог в актуальных USD', body: 'Цены пересчитываются на текущий курс, валюту переключаете в шапке. Сравнение объектов учитывает курс автоматически.' },
      { title: 'Прозрачная воронка', body: 'От первого нажатия «зарезервировать» до сдачи — каждый шаг и сумма зафиксированы на странице «Бронирование» и «Как купить».' },
      { title: 'Менеджер на связи', body: 'Ответ в Telegram / WhatsApp обычно в течение часа в рабочее время Бали. По крупным сделкам — видеозвонок до перевода депозита.' },
      { title: 'Сравнение и шортлист', body: 'Любой объект сохраняется в избранное, виллы и апартаменты сравниваются по 14 ключевым параметрам инвестора в одной таблице.' },
    ],

    h2Cases: 'Кейсы покупателей',
    pCases: 'Мы собираем истории закрытых сделок наших клиентов — что искали, как искали, на чём согласовывали SPA, что вышло в итоге, какая реальная доходность на сегодня. Каждый кейс — анонимизированный, без имён и адресов, но с реальными цифрами. Раздел будет наполняться по мере того как клиенты соглашаются поделиться. Если вы покупали через Balinsky и хотите рассказать свою историю (анонимно или с именем — на ваш выбор), напишите боту — это обычно занимает 20 минут разговора.',
    casesCta: 'Поделиться историей покупки',

    h2Contact: 'Связаться',
    pContact: 'По любому вопросу — каталог, конкретный объект, due diligence, видеосъёмка для вашей виллы — пишите боту в Telegram. Если Telegram неудобен — почта в подвале сайта.',
    contactBot: 'Написать боту',
    contactGuide: 'Сначала прочитать «Как купить»',
  },
  en: {
    home: 'Home',
    crumb: 'About Balinsky',
    h1: 'Balinsky — what it is and why you can trust it',
    intro: 'Balinsky is a Bali property catalogue for foreign buyers: villas, apartments, residential complexes and rentals. The site lists projects from developers whose documents we personally verified, whose sites we walked, and whose objects we filmed. Prices are shown in current USD. Sales managers are real people with photos, ratings, and the languages they speak.',

    h2Numbers: 'The numbers today',
    numbersLead: 'These figures update automatically — what you see on the site is exactly what is published in the database right now.',
    statVillas: 'villas and houses',
    statApts: 'apartments',
    statComplexes: 'residential complexes',
    statDevs: 'developers',
    statMgrs: 'managers on call',

    h2How: 'How we decide what to publish',
    standards: [
      { Icon: FileSearch, title: 'Document check', body: 'Every property in the catalogue must have a valid PBG, a clear land structure (SHM / HGB / Hak Pakai), and a real developer with a PT registration. Without that set, the property simply doesn’t make it onto the site.' },
      { Icon: Video,      title: 'Video and photos from the site', body: 'For most projects, our crew has shot original footage — drone, construction progress, the surroundings. Not a press release from the developer, but the real state on a known date.' },
      { Icon: UsersRound, title: 'A manager with a face', body: 'Every developer on the site has a named manager with photo, spoken languages, direct Telegram and WhatsApp. Not an anonymous "sales department" — an actual person you can video-call.' },
      { Icon: BookOpen,   title: 'Editorial shortlist', body: 'We don’t publish everything. Properties, projects and developers that don’t pass the QA above never make it into the catalogue.' },
    ],

    h2Stack: 'What you get',
    stackItems: [
      { title: 'Live USD pricing', body: 'Prices recompute against the current rate; the currency switcher is in the header. The comparison view recalculates automatically as you switch.' },
      { title: 'Transparent funnel', body: 'From the first "reserve" tap to handover — every step and amount is documented on the Reservation and Buying-Guide pages.' },
      { title: 'Live manager', body: 'Telegram / WhatsApp reply usually within an hour during Bali working hours. For larger deals — a video call before any deposit moves.' },
      { title: 'Compare and shortlist', body: 'Any listing saves to your shortlist; villas and apartments compare on 14 investor-grade parameters in one table.' },
    ],

    h2Cases: 'Buyer case studies',
    pCases: 'We are collecting closed-deal stories from our clients — what they were looking for, how they searched, where the SPA negotiation landed, what came of it, and the actual yield today. Every case is anonymised — no names or addresses, but with real numbers. This section will grow as clients agree to share. If you bought through Balinsky and want to share your story (anonymous or with name — your call), message the bot — it usually takes a 20-minute call.',
    casesCta: 'Share my purchase story',

    h2Contact: 'Get in touch',
    pContact: 'For anything — the catalogue, a specific property, due diligence, video shoots for your own villa — message the bot on Telegram. If Telegram is inconvenient, the email is in the site footer.',
    contactBot: 'Message the bot',
    contactGuide: 'Read the buying guide first',
  },
} as const

async function loadCounts() {
  const [v, a, c, d, mgrs] = await Promise.all([
    // Filter on the same `Опубликовать` / `Публикация` flags HomePage uses
    // so the counts on / and /о-balinsky never diverge — auditors flagged
    // 828 (home) vs 1272 (about) when this page counted drafts too.
    sb.from('raw_villas').select('airtable_id', { count: 'exact', head: true }).eq('data->>Опубликовать', 'true' as unknown as string),
    sb.from('raw_apartments').select('airtable_id', { count: 'exact', head: true }).eq('data->>Опубликовать', 'true' as unknown as string),
    sb.from('raw_complexes').select('airtable_id', { count: 'exact', head: true }),
    sb.from('raw_developers').select('airtable_id', { count: 'exact', head: true }).eq('data->>Публикация', 'true' as unknown as string),
    loadAllManagers(),
  ])
  return {
    villas: v.count ?? 0,
    apartments: a.count ?? 0,
    complexes: c.count ?? 0,
    developers: d.count ?? 0,
    managers: mgrs.length,
  }
}

export async function AboutView({ lang }: { lang: Lang }) {
  const c = COPY[lang]
  const counts = await loadCounts()
  const home = lang === 'en' ? '/en' : '/ru'

  const stats: { Icon: typeof Home; n: number; label: string; href: string }[] = [
    { Icon: Home,       n: counts.villas,     label: c.statVillas,    href: lang === 'en' ? '/en/villas'      : '/ru/villy' },
    { Icon: BedDouble,  n: counts.apartments, label: c.statApts,      href: lang === 'en' ? '/en/apartments'  : '/ru/apartamenty' },
    { Icon: Building2,  n: counts.complexes,  label: c.statComplexes, href: lang === 'en' ? '/en/complexes'   : '/ru/zhilye-kompleksy' },
    { Icon: HardHat,    n: counts.developers, label: c.statDevs,      href: lang === 'en' ? '/en/developers'  : '/ru/zastrojshhiki' },
    { Icon: UsersRound, n: counts.managers,   label: c.statMgrs,      href: lang === 'en' ? '/en/developers'  : '/ru/zastrojshhiki' },
  ]

  return (
    <>
      <Header />
      <PageContainer>
        <Breadcrumbs items={[
          { label: c.home, href: home },
          { label: c.crumb },
        ]} />

        <article className="mt-4 max-w-[760px]">
          <h1 className="text-[28px] md:text-[40px] font-semibold tracking-tight text-[#111827] leading-[1.1] mb-5">
            {c.h1}
          </h1>
          <p className="text-[16px] md:text-[17px] leading-[1.7] text-[var(--color-text)] mb-12">
            {c.intro}
          </p>
        </article>

        {/* Live numbers — pulled from raw_* tables on every render. */}
        <section className="mb-14">
          <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2Numbers}</h2>
          <p className="text-[14px] text-[var(--color-text-muted)] mb-6 max-w-2xl">{c.numbersLead}</p>
          <ul className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {stats.map(s => (
              <li key={s.label}>
                <Link href={s.href} className="block rounded-2xl border border-[var(--color-border)] bg-white p-5 hover:border-[var(--color-primary)] transition-colors no-underline">
                  <s.Icon size={20} strokeWidth={1.6} className="text-[var(--color-primary)] mb-2" />
                  <div className="text-[28px] md:text-[32px] font-semibold tabular-nums text-[#111827] leading-none mb-1">{s.n}</div>
                  <div className="text-[12px] uppercase tracking-wide text-[var(--color-text-muted)]">{s.label}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <article className="max-w-[760px]">
          {/* Editorial standards */}
          <section className="mb-14">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">{c.h2How}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {c.standards.map(s => (
                <div key={s.title} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                  <s.Icon size={18} strokeWidth={1.8} className="text-[var(--color-primary)] mb-2" />
                  <h3 className="text-[16px] font-semibold mb-1.5">{s.title}</h3>
                  <p className="text-[14px] leading-[1.6] text-[var(--color-text-muted)]">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* What you get */}
          <section className="mb-14">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-5">{c.h2Stack}</h2>
            <ul className="space-y-3">
              {c.stackItems.map(s => (
                <li key={s.title} className="flex gap-3">
                  <ShieldCheck size={18} strokeWidth={1.8} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[15px] font-semibold text-[#111827]">{s.title}</div>
                    <p className="text-[14px] leading-[1.6] text-[var(--color-text-muted)] mt-0.5">{s.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Case studies — empty by design today, pitched for buyers */}
          <section className="mb-14 rounded-2xl bg-[var(--color-search-bg)] p-6">
            <h2 className="text-[22px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2Cases}</h2>
            <p className="text-[15px] leading-[1.7] text-[var(--color-text)] mb-4">{c.pCases}</p>
            <a
              href={botLink('manager', '')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[13px] font-medium no-underline"
            >
              <Send size={14} /> {c.casesCta}
            </a>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-3">{c.h2Contact}</h2>
            <p className="text-[15px] leading-[1.7] text-[var(--color-text)] mb-4">{c.pContact}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={botLink('manager', '')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-pressed)] text-white text-[13px] font-medium no-underline"
              >
                <Send size={14} /> {c.contactBot}
              </a>
              <Link
                href={lang === 'en' ? '/en/how-to-buy' : '/ru/kak-kupit'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border)] text-[13px] no-underline text-[var(--color-text)] hover:border-[var(--color-primary)] bg-white"
              >
                {c.contactGuide}
              </Link>
            </div>
          </section>
        </article>

        <div className="h-16" />
      </PageContainer>
    </>
  )
}
