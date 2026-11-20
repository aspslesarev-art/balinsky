// Главная (русская версия, 20.11.2026) — макет HomeB в Claude Design:
// «маркетплейс недвижимости Бали для иностранцев». Вся недвижимость здесь в
// лизхолде — то, что законно может купить человек без индонезийского паспорта.
//   1. Фото на весь экран, заголовок и поиск поверх
//   2. Цифры каталога
//   3. 01 Каждый объект проверяет ИИ (13 проверок)
//      02 Почему здесь всё в лизхолде
//   4. 02 Виллы с лучшей доходностью
//   5. 03 Для тех, кто покупает издалека
// Balinsky в сделке не участвует (project_balinsky_info_only) — это сказано внизу.
// Остальные языки пока на HomeLanding — переводы по готовности русского.

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Header } from '@/components/Header'
import { HomeSearch } from '@/components/HomeSearch'
import { VillaCard } from '@/components/VillaCard'
import { loadStats, loadTopVillas } from '@/components/HomeLanding'

const fmt = (n: number) => n.toLocaleString('ru-RU')
const CAP = 'text-[12px] uppercase tracking-[0.08em]'
const H2 = 'text-[28px] md:text-[36px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#0F1A15]'
const plural = (n: number, f: [string, string, string]) => {
  const m10 = n % 10, m100 = n % 100
  return f[m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2]
}

const WHY = [
  { t: 'Это может купить иностранец', d: 'Землю в собственность на Бали иностранцу оформить нельзя. Долгая аренда земли — лизхолд — законный путь, и на сайте только он.' },
  { t: 'Срок аренды у каждого дома', d: 'Сколько лет аренды земли осталось и до какого года — прямо в карточке объекта.' },
  { t: 'Как купить — по шагам', d: 'Договор, нотариус, проверка документов и налоги — понятным языком.', href: '/ru/kak-kupit' },
]

// 13 проверок ИИ на странице каждого объекта (AnalyticsPanel), по темам —
// как в окне «Проверьте виллу с ИИ» (владелец 20.11.2026, макет HomeAI_A).
const AI = [
  { g: 'Деньги', bg: '#E8F1EC', ink: '#1F8B5F', items: ['Как сдавать посуточно?', 'Как оценят на Booking?', 'Как сдавать помесячно?', 'Как не переплатить?'] },
  { g: 'Документы и участок', bg: '#F6EEE4', ink: '#C9772B', items: ['Что с документами?', 'Сколько стоит земля?', 'Что с участком?'] },
  { g: 'Место', bg: '#E8EFF8', ink: '#2E7DD1', items: ['Что рядом?', 'Какой уровень туризма?', 'Как добраться?'] },
  { g: 'Жизнь в доме', bg: '#EFEAF7', ink: '#8E5BD0', items: ['Какая погода и ветер?', 'Какой воздух?', 'Какой климат к 2050?'] },
]
const AI_DEMO = '/ru/villy/o/maison-boheme-sanur-108m2-2-bedroom#analitika'

// Картинка темы — без цифр, только образ (точки соседей, галочки, метки, солнце).
function AiCover({ i, ink }: { i: number; ink: string }) {
  const shapes = [
    [[60, 100], [110, 70], [150, 110], [205, 60], [245, 100]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="8" className="ap-float" style={{ animationDelay: `${-k * 0.7}s` }} />),
    [0, 1, 2].map(k => <g key={k} className="ap-breathe" style={{ animationDelay: `${-k * 1.2}s` }}><circle cx={80 + k * 70} cy="86" r="22" fill="none" stroke={ink} strokeWidth="4" /><path d={`M${70 + k * 70} 86l7 8 14-16`} fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></g>),
    [[90, 70], [160, 105], [215, 60]].map(([x, y], k) => <path key={k} className="ap-bob" style={{ animationDelay: `${-k}s` }} d={`M${x} ${y + 22}c-12-14-18-22-18-30a18 18 0 0 1 36 0c0 8-6 16-18 30z`} />),
    [<circle key="s" cx="150" cy="86" r="26" className="ap-pulse" />, ...[0, 45, 90, 135, 180, 225, 270, 315].map(a => <line key={a} x1={150 + 38 * Math.cos(a * Math.PI / 180)} y1={86 + 38 * Math.sin(a * Math.PI / 180)} x2={150 + 50 * Math.cos(a * Math.PI / 180)} y2={86 + 50 * Math.sin(a * Math.PI / 180)} stroke={ink} strokeWidth="4" strokeLinecap="round" />)],
  ][i]
  return <svg viewBox="0 0 300 172" className="ap-cover block h-full w-full" aria-hidden><g fill={ink} opacity=".85">{shapes}</g></svg>
}

const LANGS = [
  ['🇬🇧', 'English'], ['🇫🇷', 'Français'], ['🇩🇪', 'Deutsch'], ['🇳🇱', 'Nederlands'], ['🇵🇱', 'Polski'],
  ['🇷🇺', 'Русский'], ['🇺🇦', 'Українська'], ['🇨🇳', '中文'], ['🇮🇩', 'Indonesia'],
] as const

function Head({ no, title, link }: { no: string; title: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <h2 className="flex items-baseline gap-4"><span className="text-[13px] font-normal tabular-nums text-[#6B7570]">{no}</span><span className={H2}>{title}</span></h2>
      {link && <Link href={link.href} className="text-[15px] text-[#0F1A15] underline underline-offset-4 hover:text-[var(--color-primary)]">{link.label}</Link>}
    </div>
  )
}

export async function HomeRu() {
  const [stats, villas] = await Promise.all([
    loadStats().catch(() => null),
    loadTopVillas('ru').catch(() => []),
  ])
  const hero = villas.find(v => v.photos[0])?.photos[0] ?? null
  // По одной вилле от комплекса — иначе витрина из четырёх одинаковых таунхаусов.
  const seen = new Set<string>()
  const picks = villas.filter(v => {
    const key = v.title.split(/\s[-—–]\s/)[0].replace(/^(Вилла|Таунхаус|Villa|Townhouse)\s+/i, '').trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <div className="min-h-screen bg-white text-[#0F1A15]">
      <Header />

      {/* 1. Фото на весь экран, заголовок и поиск поверх */}
      <section className="relative flex min-h-[640px] items-end overflow-hidden bg-[#1B211E] md:min-h-[680px]">
        {hero && <Image src={hero} alt="Вилла на Бали из каталога Balinsky" fill priority sizes="100vw" className="object-cover" />}
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgb(15_26_21/.25),rgb(15_26_21/.7))]" aria-hidden />
        <div className="relative mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-6 pb-10 pt-24 text-white md:gap-6 md:pb-16">
          <p className={`${CAP} text-white/85`}>Маркетплейс недвижимости Бали для иностранцев</p>
          <h1 className="w-full min-w-0 max-w-[980px] text-[29px] font-semibold leading-[1.1] tracking-[-0.03em] [overflow-wrap:normal] [word-break:normal] sm:text-[40px] md:text-[60px] md:leading-[1.06] md:tracking-[-0.035em] md:[text-wrap:balance]">
            Недвижимость на Бали для тех, у кого нет индонезийского паспорта
          </h1>
          <p className="max-w-[720px] text-[17px] leading-[1.5] text-white/90 md:text-[19px]">
            Всё в лизхолде. Цены, документы и доход — по каждому объекту.
          </p>
          <div className="mt-2 max-w-[880px]"><HomeSearch /></div>
        </div>
      </section>

      {/* 2. Цифры каталога */}
      {stats && (
        <section className="border-b border-[#ECEFED]">
          <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-6 px-6 py-8 md:flex md:gap-14 md:py-10">
            {[
              [stats.villas, plural(stats.villas, ['вилла', 'виллы', 'вилл'])],
              [stats.apartments, plural(stats.apartments, ['апартамент', 'апартамента', 'апартаментов'])],
              [stats.developers, plural(stats.developers, ['застройщик', 'застройщика', 'застройщиков'])],
              [10, 'языков сайта'],
            ].map(([v, l]) => (
              <span key={String(l)} className="flex flex-col gap-0.5">
                <span className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] tabular-nums md:text-[32px]">{fmt(Number(v))}</span>
                <span className="text-[14px] text-[#6B7570]">{l}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mx-auto flex max-w-[1280px] flex-col gap-16 px-6 py-16 md:gap-24 md:py-24">
        {/* 3. ИИ проверяет каждый объект */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <Head no="01" title="Не просто объявления: каждый объект проверяет ИИ" />
            <p className="max-w-[68ch] text-[17px] leading-[1.6] text-[#4A5550] md:text-[18px]">
              13 проверок по открытым данным: документы, цена против соседей, доход от аренды, что рядом, погода. Всё это — до звонка застройщику.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {AI.map((t, i) => (
              <div key={t.g} className="flex flex-col gap-3">
                <div className="aspect-[300/172] overflow-hidden rounded-md" style={{ background: t.bg }}><AiCover i={i} ink={t.ink} /></div>
                <span className={`${CAP} text-[#6B7570]`}>{t.g}</span>
                <ul className="m-0 flex list-none flex-col p-0">
                  {t.items.map(it => (
                    <li key={it} className="flex items-center gap-2 border-t border-[#ECEFED] py-2.5 text-[16px]"><span style={{ color: t.ink }} aria-hidden>✓</span>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href={AI_DEMO} className="inline-flex h-[52px] items-center rounded-xl bg-[var(--color-primary)] px-7 text-[16px] font-semibold text-white no-underline transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
              Посмотреть на примере виллы
            </Link>
            <span className="text-[14px] text-[#6B7570]">Откроется проверка MAISON BOHEME в Сануре</span>
          </div>
        </section>

        {/* 4. Почему лизхолд */}
        <section className="flex flex-col gap-8">
          <Head no="02" title="Почему здесь всё в лизхолде" />
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
            {WHY.map(w => (
              <div key={w.t} className="flex flex-col gap-2.5 border-t-2 border-[#0F1A15] pt-4">
                <span className="text-[20px] font-semibold tracking-[-0.01em]">{w.t}</span>
                <span className="max-w-[68ch] text-[16px] leading-[1.6] text-[#4A5550]">{w.d}</span>
                {w.href && <Link href={w.href} className="mt-1 inline-flex items-center gap-1.5 self-start text-[15px] font-semibold text-[var(--color-primary)] no-underline hover:underline">Читать гид <ArrowRight size={15} aria-hidden /></Link>}
              </div>
            ))}
          </div>
        </section>

        {/* 4. Виллы */}
        {picks.length > 0 && (
          <section className="flex flex-col gap-8">
            <Head no="03" title="Виллы с лучшей доходностью" link={{ href: '/ru/villy', label: 'Весь каталог' }} />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {picks.slice(0, 6).map(v => <VillaCard key={v.slug} a={v} lang="ru" />)}
            </div>
          </section>
        )}

        {/* 5. Издалека */}
        <section className="grid grid-cols-1 items-center gap-8 border-t border-[#ECEFED] pt-16 md:grid-cols-2 md:gap-16 md:pt-24">
          <div className="flex flex-col gap-4">
            <Head no="04" title="Для тех, кто покупает издалека" />
            <p className="max-w-[60ch] text-[17px] leading-[1.6] text-[#4A5550]">
              Сайт на 10 языках, цены в вашей валюте. Созвониться с застройщиком по видео можно из любой страны — запись прямо на странице объекта.
            </p>
            <p className="max-w-[60ch] text-[14px] leading-[1.6] text-[#6B7570]">
              Balinsky — каталог и аналитика. Мы не продаём объекты и не участвуем в сделке: договор вы заключаете с застройщиком.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {LANGS.map(([f, n]) => (
              <span key={n} className="inline-flex items-center gap-2.5 rounded-full border border-[#ECEFED] px-4 py-2 text-[15px]">
                <span aria-hidden className="text-[20px] leading-none">{f}</span>{n}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
