// Главная (русская версия, 20.11.2026) — макет HomeB в Claude Design:
// «маркетплейс недвижимости Бали для иностранцев». Вся недвижимость здесь в
// лизхолде — то, что законно может купить человек без индонезийского паспорта.
//   1. Фото на весь экран, заголовок и поиск поверх
//   2. Цифры каталога
//   3. 01 Почему здесь всё в лизхолде
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
        {/* 3. Почему лизхолд */}
        <section className="flex flex-col gap-8">
          <Head no="01" title="Почему здесь всё в лизхолде" />
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
            <Head no="02" title="Виллы с лучшей доходностью" link={{ href: '/ru/villy', label: 'Весь каталог' }} />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {picks.slice(0, 6).map(v => <VillaCard key={v.slug} a={v} lang="ru" />)}
            </div>
          </section>
        )}

        {/* 5. Издалека */}
        <section className="grid grid-cols-1 items-center gap-8 border-t border-[#ECEFED] pt-16 md:grid-cols-2 md:gap-16 md:pt-24">
          <div className="flex flex-col gap-4">
            <Head no="03" title="Для тех, кто покупает издалека" />
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
