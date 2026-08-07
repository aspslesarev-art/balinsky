// Лендинг партнёрской программы «Balinsky × Phuket Partners».
// Самостоятельная страница: вне локализованной структуры (/ru, /en, …),
// noindex + вне sitemap, без шапки и футера маркетплейса — визуально
// наследует только дизайн-систему Balinsky. Весь текст живёт в _content.ts.
//
// Палитра светлая по требованию: тёмных плашек нет вообще. Поверхности —
// белое, белое с окантовкой и мягкие фирменные оттенки (--color-primary-soft,
// --color-header-bg, --color-bg). Оранжевый --color-brand держим для двух
// акцентов срочности: бонус в туре и дата дедлайна.

import type { Metadata } from 'next'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import {
  BRIDGE,
  EARLY,
  FINAL,
  HERO,
  ONBOARDING,
  PATHS,
  SAFETY,
  STATS,
  STEPS,
  STRIP,
  TOUR,
} from './_content'
import { typo } from './_typo'
import { Card, Container, CtaButtons, Section, SectionHead } from './_ui'

export const metadata: Metadata = {
  title: 'Balinsky × Phuket Partners — продавайте два рынка',
  description:
    'Партнёрская программа Balinsky для агентов Пхукета: передавайте клиентов по Бали, получайте комиссию, клиент закреплён за вами.',
  robots: { index: false, follow: false },
}

/** Стрелка обмена — общий мотив страницы. */
function Exchange({ className = '' }: { className?: string }) {
  return <span className={`font-light ${className}`}>⇄</span>
}

export default function PhuketPartnersPage() {
  return (
    <div className="min-h-screen bg-white text-[var(--color-text)]">
      {/* === Полоса-маркер вместо бегущей строки исходника: сайт спокойный,
              а бесконечная анимация конфликтует с prefers-reduced-motion. === */}
      <div className="bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]">
        <Container>
          <div className="py-2.5 text-[11px] md:text-[12px] uppercase tracking-[0.18em] font-semibold">
            <span className="sm:hidden">{typo(STRIP.short)}</span>
            <span className="hidden sm:inline">{typo(STRIP.full)}</span>
          </div>
        </Container>
      </div>

      {/* === 1. Hero ==================================================== */}
      <header className="border-b border-[var(--color-border)] bg-white">
        <Container>
          <div className="py-16 md:py-24 max-w-[900px]">
            <div className="text-[11px] md:text-[12px] uppercase tracking-[0.2em] font-semibold text-[var(--color-primary)] mb-5">
              {HERO.eyebrow}
            </div>
            <h1 className="text-[34px] md:text-[58px] leading-[1.08] font-light tracking-[-0.025em] text-[var(--color-primary-pressed)] text-balance">
              {HERO.titleLines.map((line, i) => (
                <span key={line} className="block">
                  {/* Стрелку в «Бали ⇄ Пхукет» красим отдельно — она несущий знак страницы. */}
                  {i === HERO.titleLines.length - 1
                    ? typo(line).split('⇄').flatMap((part, j, all) => [
                        <span key={`t${j}`}>{part}</span>,
                        j < all.length - 1 ? (
                          <Exchange key={`x${j}`} className="text-[var(--color-brand)]" />
                        ) : null,
                      ])
                    : typo(line)}
                </span>
              ))}
            </h1>
            <p className="mt-6 text-[17px] md:text-[20px] leading-[1.55] text-[var(--color-text-muted)] max-w-[640px] text-pretty">
              {typo(HERO.lead)}
            </p>
            <div className="mt-9">
              <CtaButtons />
            </div>
          </div>
        </Container>
      </header>

      {/* === 2. Мост между рынками ====================================== */}
      <section className="bg-[var(--color-header-bg)]">
        <Container>
          <div className="py-14 md:py-20 grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
            {[BRIDGE.left, BRIDGE.right].map((side, i) => (
              <Card key={side.title} className={`p-7 md:p-8 ${i === 1 ? 'order-3' : ''}`}>
                <div className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[var(--color-primary)] mb-3">
                  {side.tag}
                </div>
                <h2 className="text-[24px] md:text-[28px] font-light tracking-[-0.02em] text-[var(--color-primary-pressed)] mb-3">
                  {side.title}
                </h2>
                <p className="text-[15px] md:text-[16px] leading-[1.6] text-[var(--color-text-muted)] text-pretty">
                  {typo(side.body)}
                </p>
              </Card>
            ))}
            {/* На мобильном стрелка поворачивается и встаёт между карточками,
                которые уходят в колонку, — отсюда явный order-2. */}
            <div className="order-2 text-center py-2 md:px-4">
              <Exchange className="block text-[40px] md:text-[44px] text-[var(--color-brand)] rotate-90 md:rotate-0" />
              <span className="mt-2 block text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {typo(BRIDGE.caption)}
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* === 3. Цифры =================================================== */}
      <Section className="border-b border-[var(--color-border)]">
        <div className="grid gap-8 sm:grid-cols-3">
          {STATS.map(stat => (
            <div key={stat.label}>
              <div className="text-[32px] md:text-[42px] font-light tracking-[-0.03em] text-[var(--color-primary)]">
                {stat.value}
              </div>
              <p className="mt-2 text-[15px] leading-[1.5] text-[var(--color-text-muted)] text-pretty">
                {typo(stat.label)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* === 4. Два пути ================================================ */}
      <Section id="paths">
        <SectionHead eyebrow={PATHS.eyebrow} title={PATHS.title} />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Первый путь выделен зелёной подложкой и рамкой — он и есть
              предложение, с которого начинаем. */}
          <div className="rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-7 md:p-9">
            <span className="inline-block rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold text-white">
              {PATHS.now.when}
            </span>
            <h3 className="mt-6 text-[22px] md:text-[26px] font-light tracking-[-0.02em] text-[var(--color-primary-pressed)]">
              {typo(PATHS.now.title)}
            </h3>
            <div className="mt-4 space-y-3">
              {PATHS.now.points.map(point => (
                <p
                  key={point}
                  className="text-[15px] md:text-[16px] leading-[1.6] text-[var(--color-text-muted)] text-pretty"
                >
                  {typo(point)}
                </p>
              ))}
            </div>
          </div>
          <Card className="p-7 md:p-9">
            <span className="inline-block rounded-full border border-[var(--color-border)] px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold text-[var(--color-text-muted)]">
              {PATHS.later.when}
            </span>
            <h3 className="mt-6 text-[22px] md:text-[26px] font-light tracking-[-0.02em] text-[var(--color-primary-pressed)]">
              {typo(PATHS.later.title)}
            </h3>
            <div className="mt-4 space-y-3">
              {PATHS.later.points.map(point => (
                <p
                  key={point}
                  className="text-[15px] md:text-[16px] leading-[1.6] text-[var(--color-text-muted)] text-pretty"
                >
                  {typo(point)}
                </p>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      {/* === 5. Как это работает ======================================== */}
      <Section id="how" className="bg-[var(--color-bg)]">
        <SectionHead eyebrow={STEPS.eyebrow} title={STEPS.title} />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.items.map((step, i) => (
            <Card key={step.title} className="p-6 md:p-7">
              <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.15em] font-semibold text-[var(--color-primary)]">
                {step.n}
                {i < STEPS.items.length - 1 && (
                  <ArrowRight size={14} strokeWidth={1.8} className="hidden lg:block text-[var(--color-border)]" />
                )}
              </div>
              <h3 className="mt-4 text-[17px] font-medium text-[var(--color-primary-pressed)]">{typo(step.title)}</h3>
              <p className="mt-2 text-[15px] leading-[1.55] text-[var(--color-text-muted)] text-pretty">
                {typo(step.body)}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      {/* === 6. Что будет после «да» ==================================== */}
      <Section id="start">
        <SectionHead eyebrow={ONBOARDING.eyebrow} title={ONBOARDING.title} />
        <ol className="mt-10 max-w-[760px]">
          {ONBOARDING.items.map((item, i) => {
            const isLast = i === ONBOARDING.items.length - 1
            return (
              <li key={item.title} className="relative grid grid-cols-[48px_1fr] gap-5 md:gap-6">
                {/* Соединительная линия идёт от кружка вниз и обрывается на последнем шаге. */}
                {!isLast && (
                  <span className="absolute left-[23px] top-12 bottom-0 w-px bg-[var(--color-border)]" aria-hidden />
                )}
                <span className="relative z-[1] flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-[16px] font-medium text-white">
                  {i + 1}
                </span>
                <div className={isLast ? 'pt-2.5' : 'pt-2.5 pb-8'}>
                  <h3 className="text-[17px] md:text-[19px] font-medium text-[var(--color-primary-pressed)]">
                    {typo(item.title)}
                  </h3>
                  <p className="mt-2 text-[15px] md:text-[16px] leading-[1.6] text-[var(--color-text-muted)] text-pretty">
                    {typo(item.body)}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>

        {/* Инспекционный тур — карточка на мягкой зелёной подложке внутри той
            же секции: это продолжение онбординга, а не отдельное предложение. */}
        <div className="mt-12 rounded-2xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-7 md:p-10 grid gap-8 md:grid-cols-[1.2fr_1fr] md:gap-12">
          <div>
            <h3 className="text-[22px] md:text-[26px] font-light tracking-[-0.02em] text-[var(--color-primary-pressed)] text-balance">
              <span className="block">{typo(TOUR.title)}</span>
              <span className="block text-[var(--color-brand)]">{typo(TOUR.accent)}</span>
            </h3>
            <div className="mt-4 space-y-3">
              {TOUR.body.map(paragraph => (
                <p
                  key={paragraph}
                  className="text-[15px] md:text-[16px] leading-[1.6] text-[var(--color-text-muted)] text-pretty"
                >
                  {typo(paragraph)}
                </p>
              ))}
            </div>
          </div>
          <div>
            <ul className="space-y-3.5">
              {TOUR.perks.map(perk => (
                <li key={perk} className="flex gap-3 text-[15px] leading-[1.5] text-[var(--color-text-muted)]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                  {typo(perk)}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-[var(--color-brand)] bg-white p-4 md:p-5 text-[14.5px] leading-[1.55] text-[var(--color-text-muted)]">
              <b className="font-medium text-[var(--color-brand)]">{typo(TOUR.bonus.lead)}</b> {typo(TOUR.bonus.body)}
            </div>
          </div>
        </div>
      </Section>

      {/* === 7. Гарантии ================================================ */}
      <Section className="bg-[var(--color-bg)]">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16 md:items-start">
          <SectionHead eyebrow={SAFETY.eyebrow} title={SAFETY.title} sub={SAFETY.sub} />
          <div className="space-y-6">
            {SAFETY.items.map(item => (
              <div key={item.title} className="flex gap-4">
                <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                <p className="text-[15px] md:text-[16px] leading-[1.6] text-[var(--color-text-muted)] text-pretty">
                  <b className="block font-medium text-[var(--color-primary-pressed)]">{typo(item.title)}</b>
                  {typo(item.body)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* === 8. Early Birds ============================================= */}
      <Section id="early">
        <div className="rounded-2xl border-2 border-[var(--color-brand)] bg-white p-7 md:p-10 grid gap-8 md:grid-cols-[1.3fr_1fr] md:gap-12 md:items-center">
          <div>
            <span className="inline-block rounded-full bg-[var(--color-brand)] px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold text-white">
              {EARLY.badge}
            </span>
            <h2 className="mt-5 text-[22px] md:text-[28px] font-light tracking-[-0.02em] text-[var(--color-primary-pressed)] text-balance">
              {EARLY.title.map(line => (
                <span key={line} className="block">
                  {typo(line)}
                </span>
              ))}
            </h2>
            <div className="mt-4 space-y-3">
              {EARLY.body.map(paragraph => (
                <p
                  key={paragraph}
                  className="text-[15px] md:text-[16px] leading-[1.6] text-[var(--color-text-muted)] text-pretty"
                >
                  {typo(paragraph)}
                </p>
              ))}
              <p className="text-[15px] md:text-[16px] leading-[1.6] font-medium text-[var(--color-primary-pressed)]">
                {typo(EARLY.highlight)}
              </p>
            </div>
          </div>
          {/* Панель дедлайна — единственное место с оранжевой подложкой:
              срочность должна выделяться на фоне зелёной страницы. */}
          <div className="rounded-xl border border-[var(--color-brand)] bg-[var(--color-bg)] p-6 md:p-7 text-center">
            <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[var(--color-text-muted)]">
              {EARLY.deadline.label}
            </div>
            <div className="mt-3 text-[30px] md:text-[36px] font-light tracking-[-0.02em] text-[var(--color-brand)]">
              {EARLY.deadline.date}
            </div>
            <p className="mt-3 text-[14px] leading-[1.55] text-[var(--color-text-muted)] text-pretty">
              {typo(EARLY.deadline.note)}
            </p>
            <a
              href="#contact"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-[15px] font-medium text-white hover:bg-[var(--color-primary-pressed)] transition-colors"
            >
              Зафиксировать условия
            </a>
          </div>
        </div>
      </Section>

      {/* === 9. Финальный CTA =========================================== */}
      <section id="contact" className="bg-[var(--color-primary-soft)]">
        <Container>
          <div className="py-16 md:py-24 text-center">
            <h2 className="mx-auto max-w-[760px] text-[26px] md:text-[44px] leading-[1.12] font-light tracking-[-0.025em] text-[var(--color-primary-pressed)] text-balance">
              {FINAL.titleLines.map((line, i) => (
                <span key={line} className="block">
                  {typo(line)}
                  {i === FINAL.titleLines.length - 1 && (
                    <>
                      {' '}
                      <Exchange className="text-[var(--color-brand)]" />
                    </>
                  )}
                </span>
              ))}
            </h2>
            <p className="mx-auto mt-5 max-w-[560px] text-[16px] md:text-[18px] leading-[1.55] text-[var(--color-text-muted)] text-pretty">
              {typo(FINAL.body)}
            </p>
            <div className="mt-9 flex justify-center">
              <CtaButtons />
            </div>
          </div>
        </Container>
      </section>

      <footer className="bg-white border-t border-[var(--color-border)]">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-3 py-6 text-[13px] text-[var(--color-text-muted)]">
            <span>Balinsky × Phuket Partners</span>
            <a
              href="https://balinsky.info"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors"
            >
              balinsky.info
              <ArrowUpRight size={14} strokeWidth={1.8} />
            </a>
          </div>
        </Container>
      </footer>
    </div>
  )
}
