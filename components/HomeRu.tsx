// Главная (русская версия, 17.10.2026) — по согласованному макету в Claude Design
// «как сервис»: светло, по центру, главная картинка — сама страница объекта.
//   1. Обещание + цель (жить / сдавать / и то, и другое) + страница объекта с плашками
//   2. Три пути
//   3. Четыре ответа — плитки с кусками настоящей страницы (public/home/*.webp,
//      сняты со страницы MAISON BOHEME)
//   4. «Без проверки легко ошибиться»
//   5. Бесплатно, без регистрации
// Остальные языки пока на HomeLanding — переводы по готовности русского.

import Link from 'next/link'
import Image from 'next/image'
import { Check, Home, TrendingUp, Repeat, ArrowRight } from 'lucide-react'
import { Header } from '@/components/Header'
import { HomeGoalPicker } from '@/components/HomeGoalPicker'
import { loadStats } from '@/components/HomeLanding'

// Пример объекта: с его страницы сняты все картинки главной.
const DEMO_HREF = '/ru/villy/o/maison-boheme-sanur-108m2-2-bedroom'
const BEACH_THUMB = 'https://images.balinsky.info/storage/v1/object/public/villa-photos/_beaches/19-pantai-segera-ayu.jpg'

const PATHS = [
  { label: 'Жить', note: 'Тихий район, пляж и школа рядом, нормальная дорога.', href: '/ru/villy?goal=live', Icon: Home },
  { label: 'Сдавать', note: 'Можно сдавать посуточно, и рядом это хорошо сдаётся.', href: '/ru/villy?goal=invest', Icon: TrendingUp },
  { label: 'И то, и другое', note: 'Живёте сами, а когда уезжаете - дом приносит деньги.', href: '/ru/villy?goal=invest', Icon: Repeat },
]

const ANSWERS = [
  { q: 'Безопасно ли?', a: 'Документы, стройка, земля, застройщик и природные риски - одним списком.', img: '/home/safety-2.webp', w: 1208, h: 755 },
  { q: 'Удобно ли жить?', a: 'Пляж с фото и отзывами, школа, магазин, тишина, погода.', img: '/home/beach-2.webp', w: 1300, h: 812 },
  { q: 'Будет ли спрос?', a: 'Что и почём сдают соседи, за сколько продают похожие дома.', img: '/home/demand-2.webp', w: 1300, h: 812 },
  { q: 'Сколько принесёт?', a: 'Плохой, средний и хороший год. Калькулятор с налогами.', img: '/home/calc-2.webp', w: 1105, h: 690 },
]

const MISTAKES = [
  ['Купили дом, который нельзя сдавать посуточно', 'Статус документов и зону участка'],
  ['Поверили доходности из рекламы', 'Почём реально сдают соседи'],
  ['Переплатили за дом', 'Цены похожих домов рядом'],
  ['Под окном бар, стройка или трасса', 'Тихо ли вокруг - до покупки'],
  ['Земля в аренде меньше, чем думали', 'Сколько лет аренды осталось'],
]

const H2 = 'mx-auto max-w-[760px] text-center text-[32px] md:text-[48px] leading-[1.08] font-bold tracking-[-0.03em] text-[#1D1D1F] [text-wrap:balance]'
const CHIP = 'flex items-center gap-2.5 rounded-2xl bg-white/95 px-4 py-3 text-left shadow-[0_2px_4px_rgb(0_0_0/.04),0_12px_32px_rgb(0_0_0/.12)]'
const fmt = (n: number) => n.toLocaleString('ru-RU')

export async function HomeRu() {
  const stats = await loadStats().catch(() => null)

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F]">
      <Header />

      {/* 1. Обещание + цель + страница объекта */}
      <section className="mx-auto max-w-[1240px] px-6 pt-16 text-center md:pt-24">
        <p className="text-[15px] font-semibold text-[var(--color-primary)]">Виллы и квартиры на Бали - для жизни и для сдачи</p>
        <h1 className="mx-auto mt-4 max-w-[900px] text-[38px] md:text-[64px] lg:text-[76px] leading-[1.03] font-bold tracking-[-0.04em] [text-wrap:balance]">
          Вся правда о доме - до того, как вы его купите
        </h1>
        <p className="mx-auto mt-6 max-w-[620px] text-[18px] md:text-[21px] leading-[1.5] text-[#6E6E73]">
          Документы, пляж, соседи и реальный доход по каждому объекту. Мы уже всё проверили.
        </p>
        <HomeGoalPicker />

        <div className="relative mx-auto mt-14 max-w-[1080px] md:mt-[72px]">
          <Link href={DEMO_HREF} aria-label="Открыть пример: вилла MAISON BOHEME в Сануре" className="block">
            <Image src="/home/product.webp" alt="Страница виллы MAISON BOHEME на Balinsky" width={1800} height={1048} priority
              sizes="(min-width: 1128px) 1080px, 100vw"
              className="h-auto w-full rounded-[20px] border border-[#ECECEE] shadow-[0_2px_4px_rgb(0_0_0/.04),0_24px_64px_rgb(0_0_0/.10)]" />
          </Link>
          {/* Плашки: на компьютере — поверх картинки, на телефоне — под ней. */}
          <div className="mt-4 flex flex-wrap justify-center gap-2 lg:contents">
            <div className={`${CHIP} lg:absolute lg:-left-10 lg:top-[14%]`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F4EE] text-[var(--color-primary)]"><Check size={16} strokeWidth={2.4} aria-hidden /></span>
              <span><span className="block text-[13px] text-[#6E6E73]">Земля в аренде</span><span className="block text-[16px] font-semibold">ещё 29 лет</span></span>
            </div>
            <div className={`${CHIP} !py-2.5 !pl-2.5 lg:absolute lg:-right-10 lg:top-[34%]`}>
              <Image src={BEACH_THUMB} alt="" width={48} height={48} className="h-12 w-12 rounded-[10px] object-cover" />
              <span><span className="block text-[13px] text-[#6E6E73]">Пляж в 450 м</span><span className="block text-[16px] font-semibold">★ 4,5 · 1 924 отзыва</span></span>
            </div>
            <div className={`${CHIP} flex-col !items-start !gap-0.5 lg:absolute lg:-left-10 lg:top-[50%]`}>
              <span className="text-[13px] text-[#6E6E73]">Если сдавать посуточно</span>
              <span className="text-[22px] font-bold tracking-[-0.02em]">≈ 17,8% в год</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Три пути */}
      <section className="mx-auto max-w-[1240px] px-6 pt-24 pb-24 md:pt-[120px] md:pb-[104px]">
        <h2 className={H2}>Скажите, зачем вам дом. <span className="text-[#6E6E73]">Подходящие покажем первыми.</span></h2>
        <div className="mt-14 grid grid-cols-1 gap-12 md:mt-16 md:grid-cols-3">
          {PATHS.map(({ label, note, href, Icon }) => (
            <Link key={label} href={href}
              className="group flex flex-col items-center gap-3 rounded-2xl text-center text-[#1D1D1F] no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)]">
              <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#F5F5F7] text-[var(--color-primary)]"><Icon size={28} strokeWidth={1.7} aria-hidden /></span>
              <span className="mt-2 text-[24px] font-bold tracking-[-0.02em]">{label}</span>
              <span className="max-w-[300px] text-[17px] leading-[1.5] text-[#6E6E73]">{note}</span>
              <span className="mt-1 text-[17px] font-semibold text-[var(--color-primary)] group-hover:underline">Подобрать ›</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Четыре ответа */}
      <section className="bg-[#F5F5F7]">
        <div className="mx-auto max-w-[1240px] px-6 py-24 md:py-28">
          <h2 className={H2}>Четыре ответа на странице каждого дома</h2>
          <div className="mt-14 grid grid-cols-1 gap-5 md:mt-16 lg:grid-cols-2">
            {ANSWERS.map(({ q, a, img, w, h }) => (
              <Link key={q} href={DEMO_HREF} className="group flex flex-col overflow-hidden rounded-[28px] bg-white text-[#1D1D1F] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
                <div className="px-7 pt-8 md:px-10 md:pt-10">
                  <div className="text-[24px] md:text-[28px] font-bold tracking-[-0.02em]">{q}</div>
                  <p className="mt-2.5 text-[16px] md:text-[17px] leading-[1.5] text-[#6E6E73]">{a}</p>
                </div>
                <div className="mt-8 h-[220px] overflow-hidden pl-7 md:h-[280px] md:pl-10">
                  <Image src={img} alt={`Пример: ${q}`} width={w} height={h} sizes="(min-width: 1024px) 640px, 110vw"
                    className="h-auto w-[115%] max-w-none rounded-tl-[14px] border border-[#ECECEE] shadow-[0_12px_32px_rgb(0_0_0/.08)] transition-transform duration-[320ms] [transition-timing-function:cubic-bezier(.2,.8,.2,1)] group-hover:-translate-y-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Без проверки */}
      <section className="mx-auto max-w-[1040px] px-6 py-24 md:py-[120px]">
        <h2 className={H2}>Без проверки <span className="text-[#6E6E73]">легко ошибиться</span></h2>
        <div className="mt-14 md:mt-16">
          <div className="grid grid-cols-2 gap-6 border-b border-[#ECECEE] pb-3.5 text-[14px] font-semibold text-[#6E6E73] md:gap-8">
            <span>Частая ошибка</span><span>Что вы видите у нас</span>
          </div>
          {MISTAKES.map(([bad, good], i) => (
            <div key={bad} className={`grid grid-cols-2 gap-6 py-6 text-[16px] md:gap-8 md:text-[18px] leading-[1.45] ${i < MISTAKES.length - 1 ? 'border-b border-[#ECECEE]' : ''}`}>
              <span className="flex gap-3"><span className="font-bold text-[#C2410C]" aria-hidden>×</span>{bad}</span>
              <span className="flex gap-3"><span className="font-bold text-[var(--color-primary)]" aria-hidden>✓</span>{good}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Начать */}
      <section className="bg-[#F5F5F7]">
        <div className="mx-auto max-w-[1240px] px-6 py-24 text-center md:py-28">
          <h2 className={H2}>Бесплатно. Без регистрации.</h2>
          {stats && (
            <p className="mx-auto mt-4 text-[17px] md:text-[19px] text-[#6E6E73]">
              {fmt(stats.objects)} вилл и квартир · {fmt(stats.complexes)} жилых комплексов · цены аренды каждый день
            </p>
          )}
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/ru/villy"
              className="inline-flex min-h-14 items-center gap-2.5 rounded-full bg-[var(--color-primary)] px-7 text-[17px] font-semibold text-white no-underline transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
              Подобрать дом <ArrowRight size={18} aria-hidden />
            </Link>
            <Link href={DEMO_HREF}
              className="inline-flex min-h-14 items-center rounded-full px-7 text-[17px] font-semibold text-[var(--color-primary)] no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
              Посмотреть пример ›
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
