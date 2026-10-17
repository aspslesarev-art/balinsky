// Главная (русская версия, 17.10.2026): «понятно 14-летнему».
//
// Одна мысль: мы уже проверили каждый объект — откройте страницу и
// увидите ответы на четыре вопроса. Порядок экранов:
//   1. Фото + обещание + три цели (жить / сдавать / и то, и другое)
//   2. Три числа
//   3. «Ответы на 4 вопроса» — живые куски страницы объекта (public/home/*.webp,
//      сняты со страницы MAISON BOHEME)
//   4. Пример целиком
//   5. Как выбрать за 3 шага
//   6. Вход в каталог
// Остальные языки пока на HomeLanding — переводы по готовности русского.

import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, Heart, TrendingUp, Repeat, ShieldCheck, Sun, Users, Wallet,
  Home, Building2, Building,
} from 'lucide-react'
import { Header } from '@/components/Header'
import { PageContainer } from '@/components/PageContainer'
import { loadStats } from '@/components/HomeLanding'

// Пример объекта: с его страницы сняты картинки блока «4 вопроса».
const DEMO_HREF = '/ru/villy/o/maison-boheme-sanur-108m2-2-bedroom'
// Фото для первого экрана — сад и бассейн той же виллы. Первое фото лучших
// вилл бывает кухней или ванной, поэтому берём проверенное.
const HERO_PHOTO = 'https://images.balinsky.info/storage/v1/object/public/villa-photos/recpx7ThaxsOnuT5f/0.jpg'

const GOALS = [
  { label: 'Для жизни', note: 'Тихо, рядом пляж и школа', href: '/ru/villy?goal=live', Icon: Heart },
  { label: 'Для дохода', note: 'Хорошо сдаётся посуточно', href: '/ru/villy?goal=invest', Icon: TrendingUp },
  { label: 'И то, и другое', note: 'Жить и сдавать, когда уезжаете', href: '/ru/villy?goal=invest', Icon: Repeat },
]

const QUESTIONS = [
  {
    q: 'Безопасно ли?',
    a: 'Документы на дом, готова ли стройка, сколько лет аренды земли, сколько сдал застройщик, есть ли риск наводнений.',
    img: '/home/safety-2.webp', w: 1208, h: 755, Icon: ShieldCheck,
  },
  {
    q: 'Удобно ли там жить?',
    a: 'Пляж с фото и отзывами, школа, магазин, тишина, погода по месяцам и сколько ехать до аэропорта.',
    img: '/home/beach-2.webp', w: 1300, h: 812, Icon: Sun,
  },
  {
    q: 'Будет ли спрос?',
    a: 'Что сдают рядом и почём - посуточно и помесячно. И за сколько продают похожие дома по соседству.',
    img: '/home/demand-2.webp', w: 1300, h: 812, Icon: Users,
  },
  {
    q: 'Сколько принесёт?',
    a: 'Плохой, средний и хороший год. И калькулятор: двигайте цену, загрузку и налоги - итог считается сразу.',
    img: '/home/calc-2.webp', w: 1105, h: 690, Icon: Wallet,
  },
]

const STEPS = [
  { t: 'Выберите цель', d: 'Жить, сдавать или и то, и другое.' },
  { t: 'Посмотрите подборку', d: 'Сверху - те, что лучше подходят под вашу цель.' },
  { t: 'Откройте объект', d: 'Четыре ответа, фото, цифры. Сравните два-три варианта.' },
]

const CATALOG = [
  { label: 'Виллы', note: 'Свой дом с садом и бассейном', href: '/ru/villy', Icon: Home },
  { label: 'Апартаменты', note: 'Квартира в доме с бассейном и охраной', href: '/ru/apartamenty', Icon: Building2 },
  { label: 'Жилые комплексы', note: 'Все дома и квартиры одного проекта', href: '/ru/zhilye-kompleksy', Icon: Building },
]

const fmt = (n: number) => n.toLocaleString('ru-RU')

export async function HomeRu() {
  const stats = await loadStats().catch(() => null)

  return (
    <div className="min-h-screen text-[var(--color-text)]">
      <Header />

      {/* 1. Обещание + три цели. Фото справа, а не на весь экран: исходник
          768 px, растянутый на всю ширину он выглядел бы мыльным. */}
      <section className="bg-white">
        <PageContainer>
          <div className="grid grid-cols-1 items-center gap-10 pt-24 pb-12 md:pt-32 md:pb-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <h1 className="text-[34px] md:text-[52px] leading-[1.08] font-semibold tracking-[-0.02em] text-[#0E1A14] [text-wrap:balance]">
                Выберите дом на Бали - мы уже всё проверили
              </h1>
              <p className="mt-4 md:mt-5 max-w-[560px] text-[17px] md:text-[20px] leading-[1.5] text-[var(--color-text-muted)]">
                Для жизни или для сдачи в аренду. По каждой вилле и квартире - честные цифры и ответы на главные вопросы.
              </p>
              <p className="mt-8 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Зачем вам дом?</p>
              <div className="mt-3 flex flex-col gap-3">
                {GOALS.map(({ label, note, href, Icon }) => (
                  <Link key={label} href={href}
                    className="group flex items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3.5 no-underline transition-colors duration-[120ms] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]">
                      <Icon size={20} strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-semibold text-[#0E1A14]">{label}</span>
                      <span className="block text-[14px] leading-snug text-[var(--color-text-muted)]">{note}</span>
                    </span>
                    <ArrowRight size={18} className="shrink-0 text-[var(--color-primary)] transition-transform duration-[120ms] group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                ))}
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-[var(--color-surface-alt)]">
              <Image src={HERO_PHOTO} alt="Сад и бассейн виллы на Бали" fill priority sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
            </div>
          </div>
        </PageContainer>
      </section>

      {/* 2. Три числа */}
      {stats && (
        <section className="border-y border-[var(--color-border)] bg-[var(--color-surface-alt)]">
          <PageContainer>
            <div className="grid grid-cols-3 gap-4 py-7 md:py-8">
              {[
                { v: fmt(stats.objects), l: 'вилл и квартир' },
                { v: fmt(stats.complexes), l: 'жилых комплексов' },
                { v: 'каждый день', l: 'обновляем цены аренды' },
              ].map(x => (
                <div key={x.l}>
                  <div className="text-[22px] md:text-[32px] font-semibold leading-none tracking-[-0.02em] text-[#0E1A14]">{x.v}</div>
                  <div className="mt-2 text-[13px] leading-snug text-[var(--color-text-muted)]">{x.l}</div>
                </div>
              ))}
            </div>
          </PageContainer>
        </section>
      )}

      {/* 3. Ответы на 4 вопроса */}
      <section className="py-14 md:py-24">
        <PageContainer>
          <h2 className="max-w-[760px] text-[28px] md:text-[40px] leading-[1.15] font-semibold tracking-[-0.02em] text-[#0E1A14] [text-wrap:balance]">
            Откройте любой объект - и увидите ответы на 4 вопроса
          </h2>
          <p className="mt-4 max-w-[640px] text-[16px] md:text-[18px] leading-[1.6] text-[var(--color-text-muted)]">
            Мы собрали данные за вас: документы, соседей, пляжи, цены аренды. Читать договоры и сравнивать сайты не нужно.
          </p>
          <div className="mt-10 md:mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            {QUESTIONS.map(({ q, a, img, w, h, Icon }, i) => (
              <article key={q} className="flex flex-col overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-white">
                <div className="relative aspect-[16/10] overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                  <Image src={img} alt={`Пример: ${q}`} width={w} height={h} sizes="(min-width: 768px) 560px, 100vw"
                    className="absolute left-4 top-4 h-auto w-[calc(100%-32px)] max-w-none rounded-xl border border-[var(--color-border)] bg-white md:left-6 md:top-6 md:w-[calc(100%-48px)]" />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-6 md:p-7">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[13px] font-semibold text-[var(--color-primary-pressed)]">{i + 1}</span>
                    <h3 className="text-[20px] md:text-[22px] font-semibold text-[#0E1A14]">{q}</h3>
                    <Icon size={18} className="ml-auto text-[var(--color-text-muted)]" aria-hidden />
                  </div>
                  <p className="text-[15px] md:text-[16px] leading-[1.6] text-[var(--color-text-muted)]">{a}</p>
                </div>
              </article>
            ))}
          </div>

          {/* 4. Пример целиком */}
          <div className="mt-10 flex flex-col items-start gap-4 rounded-[20px] bg-[var(--color-primary-soft)] p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div>
              <div className="text-[20px] font-semibold text-[#0E1A14]">Посмотрите, как это выглядит целиком</div>
              <div className="mt-1 text-[15px] text-[var(--color-text-muted)]">Вилла в Сануре, 2 спальни - все ответы на одной странице.</div>
            </div>
            <Link href={DEMO_HREF}
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 text-[15px] font-medium text-white no-underline transition-colors duration-[120ms] hover:bg-[var(--color-primary-pressed)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
              Открыть пример <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </PageContainer>
      </section>

      {/* 5. Как выбрать за 3 шага */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface-alt)] py-14 md:py-24">
        <PageContainer>
          <h2 className="text-[28px] md:text-[40px] leading-[1.15] font-semibold tracking-[-0.02em] text-[#0E1A14]">Как выбрать за 3 шага</h2>
          <ol className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            {STEPS.map((s, i) => (
              <li key={s.t} className="rounded-[20px] border border-[var(--color-border)] bg-white p-6 md:p-7">
                <div className="text-[40px] font-semibold leading-none text-[var(--color-primary)]">{i + 1}</div>
                <div className="mt-4 text-[20px] font-semibold text-[#0E1A14]">{s.t}</div>
                <p className="mt-2 text-[15px] leading-[1.6] text-[var(--color-text-muted)]">{s.d}</p>
              </li>
            ))}
          </ol>
        </PageContainer>
      </section>

      {/* 6. Вход в каталог */}
      <section className="py-14 md:py-24">
        <PageContainer>
          <h2 className="text-[28px] md:text-[40px] leading-[1.15] font-semibold tracking-[-0.02em] text-[#0E1A14]">Что смотрим?</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3 md:gap-8">
            {CATALOG.map(({ label, note, href, Icon }) => (
              <Link key={label} href={href}
                className="group rounded-[20px] border border-[var(--color-border)] bg-white p-6 no-underline transition-colors duration-[120ms] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] md:p-7">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]">
                  <Icon size={22} strokeWidth={1.7} aria-hidden />
                </span>
                <div className="mt-5 text-[22px] font-semibold text-[#0E1A14]">{label}</div>
                <p className="mt-2 text-[15px] leading-[1.55] text-[var(--color-text-muted)]">{note}</p>
                <ArrowRight size={18} className="mt-4 text-[var(--color-primary)] transition-transform duration-[120ms] group-hover:translate-x-1" aria-hidden />
              </Link>
            ))}
          </div>
        </PageContainer>
      </section>
    </div>
  )
}
