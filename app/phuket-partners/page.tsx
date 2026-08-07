// Лендинг партнёрской программы «Balinsky × Phuket Partners».
// Самостоятельная страница: вне локализованной структуры (/ru, /en, …),
// noindex + вне sitemap, без шапки и футера маркетплейса — визуально
// наследует только дизайн-систему Balinsky. Весь текст живёт в _content.ts.

import type { Metadata } from 'next'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import {
  BRIDGE,
  FINAL,
  HERO,
  PATHS,
  SAFETY,
  STATS,
  STEPS,
  STRIP,
} from './_content'
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
    <div className="min-h-screen bg-white text-[#111827]">
      {/* === Полоса-маркер вместо бегущей строки исходника: сайт спокойный,
              а бесконечная анимация конфликтует с prefers-reduced-motion. === */}
      <div className="bg-[#0E1A14] text-white/70">
        <Container>
          <div className="py-2.5 text-[11px] md:text-[12px] uppercase tracking-[0.18em] font-medium">
            <span className="sm:hidden">{STRIP.short}</span>
            <span className="hidden sm:inline">{STRIP.full}</span>
          </div>
        </Container>
      </div>

      {/* === 1. Hero ==================================================== */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <Container>
          <div className="py-16 md:py-24 max-w-[900px]">
            <div className="text-[11px] md:text-[12px] uppercase tracking-[0.2em] font-semibold text-[var(--color-primary)] mb-5">
              {HERO.eyebrow}
            </div>
            <h1 className="text-[34px] md:text-[58px] leading-[1.08] font-light tracking-[-0.025em] text-[#0E1A14] text-balance">
              {HERO.titleLines.map((line, i) => (
                <span key={line} className="block">
                  {/* Стрелку в «Бали ⇄ Пхукет» красим отдельно — она несущий знак страницы. */}
                  {i === HERO.titleLines.length - 1
                    ? line.split('⇄').flatMap((part, j, all) => [
                        <span key={`t${j}`}>{part}</span>,
                        j < all.length - 1 ? (
                          <Exchange key={`x${j}`} className="text-[var(--color-primary)]" />
                        ) : null,
                      ])
                    : line}
                </span>
              ))}
            </h1>
            <p className="mt-6 text-[17px] md:text-[20px] leading-[1.55] text-[#4B5563] max-w-[640px] text-pretty">
              {HERO.lead}
            </p>
            <div className="mt-9">
              <CtaButtons />
            </div>
          </div>
        </Container>
      </header>

      {/* === 2. Мост между рынками ====================================== */}
      <section className="bg-[#0E1A14]">
        <Container>
          <div className="py-14 md:py-20 grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
            {[BRIDGE.left, BRIDGE.right].map((side, i) => (
              <div
                key={side.title}
                className={`rounded-2xl border border-white/15 p-7 md:p-8 ${i === 1 ? 'order-3' : ''}`}
              >
                <div className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[var(--color-primary-soft)] mb-3">
                  {side.tag}
                </div>
                <h2 className="text-[24px] md:text-[28px] font-light tracking-[-0.02em] text-white mb-3">
                  {side.title}
                </h2>
                <p className="text-[15px] md:text-[16px] leading-[1.6] text-white/75 text-pretty">{side.body}</p>
              </div>
            ))}
            {/* На мобильном стрелка поворачивается и встаёт между карточками,
                которые уходят в колонку, — отсюда явный order-2. */}
            <div className="order-2 text-center py-2 md:px-4">
              <Exchange className="block text-[40px] md:text-[44px] text-[var(--color-primary-soft)] rotate-90 md:rotate-0" />
              <span className="mt-2 block text-[11px] uppercase tracking-[0.18em] text-white/45">
                {BRIDGE.caption}
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
              <div className="text-[32px] md:text-[42px] font-light tracking-[-0.03em] text-[#0E1A14]">
                {stat.value}
              </div>
              <p className="mt-2 text-[15px] leading-[1.5] text-[#4B5563] text-pretty">{stat.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* === 4. Два пути ================================================ */}
      <Section id="paths">
        <SectionHead eyebrow={PATHS.eyebrow} title={PATHS.title} sub={PATHS.sub} />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Первый путь — тёмная карточка: он и есть предложение, с которого начинаем. */}
          <div className="rounded-2xl bg-[#0E1A14] p-7 md:p-9">
            <span className="inline-block rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold text-white">
              {PATHS.now.when}
            </span>
            <h3 className="mt-6 text-[22px] md:text-[26px] font-light tracking-[-0.02em] text-white">
              {PATHS.now.title}
            </h3>
            <div className="mt-4 space-y-3">
              {PATHS.now.points.map(point => (
                <p key={point} className="text-[15px] md:text-[16px] leading-[1.6] text-white/80 text-pretty">
                  {point}
                </p>
              ))}
            </div>
          </div>
          <Card className="p-7 md:p-9">
            <span className="inline-block rounded-full border border-[var(--color-border)] px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold text-[#6B7280]">
              {PATHS.later.when}
            </span>
            <h3 className="mt-6 text-[22px] md:text-[26px] font-light tracking-[-0.02em] text-[#0E1A14]">
              {PATHS.later.title}
            </h3>
            <div className="mt-4 space-y-3">
              {PATHS.later.points.map(point => (
                <p key={point} className="text-[15px] md:text-[16px] leading-[1.6] text-[#4B5563] text-pretty">
                  {point}
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
                  <ArrowRight size={14} strokeWidth={1.8} className="hidden lg:block text-[#D1D5DB]" />
                )}
              </div>
              <h3 className="mt-4 text-[17px] font-medium text-[#0E1A14]">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.55] text-[#4B5563] text-pretty">{step.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* === 6. Гарантии ================================================ */}
      <Section>
        <div className="grid gap-10 md:grid-cols-2 md:gap-16 md:items-start">
          <SectionHead eyebrow={SAFETY.eyebrow} title={SAFETY.title} sub={SAFETY.sub} />
          <div className="space-y-6">
            {SAFETY.items.map(item => (
              <div key={item.title} className="flex gap-4">
                <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                <p className="text-[15px] md:text-[16px] leading-[1.6] text-[#4B5563] text-pretty">
                  <b className="block font-medium text-[#0E1A14]">{item.title}</b>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* === 7. Финальный CTA =========================================== */}
      <section className="bg-[#0E1A14]">
        <Container>
          <div className="py-16 md:py-24 text-center">
            <h2 className="mx-auto max-w-[760px] text-[26px] md:text-[44px] leading-[1.12] font-light tracking-[-0.025em] text-white text-balance">
              {FINAL.title} <Exchange className="text-[var(--color-primary-soft)]" />
            </h2>
            <p className="mx-auto mt-5 max-w-[560px] text-[16px] md:text-[18px] leading-[1.55] text-white/75 text-pretty">
              {FINAL.body}
            </p>
            <div className="mt-9 flex justify-center">
              <CtaButtons isOnDark />
            </div>
          </div>
        </Container>
      </section>

      <footer className="bg-[#0E1A14] border-t border-white/10">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-3 py-6 text-[13px] text-white/50">
            <span>Balinsky × Phuket Partners</span>
            <a
              href="https://balinsky.info"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-white transition-colors"
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
