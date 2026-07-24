// Лендинг выездной серии встреч «Balinsky на Пхукете», 29 июля — 10 августа.
// Самостоятельная страница: вне локализованной структуры (/ru, /en, …),
// noindex + вне sitemap, без шапки и футера маркетплейса — визуально
// наследует только дизайн-систему Balinsky. Весь текст живёт в _content.ts.

import type { Metadata } from 'next'
import Image from 'next/image'
import { ArrowUpRight, Check, MessageCircle } from 'lucide-react'
import {
  ABOUT,
  BOOKING,
  DEVELOPERS,
  HERO,
  TAKEAWAYS,
  TRIP,
  WHY_BALI,
  WHY_NOW,
  lineHref,
  whatsappHref,
} from './_content'
import { Card, Container, CtaButtons, Section, SectionHead } from './_ui'

export const metadata: Metadata = {
  title: 'Balinsky на Пхукете · 29 июля — 10 августа',
  description:
    'Встречи с агентствами Пхукета: отобранные застройщики Бали, защита клиента на 12 месяцев и бонус +0,5% к комиссии. 30 слотов по 30 минут.',
  robots: { index: false, follow: false },
}

export default function PhuketPage() {
  return (
    // Нижний паддинг на мобильном — под фиксированную панель брони,
    // иначе она перекрывает последний абзац блока «Расписание и бронь».
    <div className="min-h-screen bg-white text-[#111827] pb-[72px] md:pb-0">
      {/* === 1. Hero ==================================================== */}
      <section className="relative flex items-end min-h-[100svh] overflow-hidden bg-[#0E1A14]">
        <Image src={HERO.photo} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06100C]/96 via-[#06100C]/70 to-[#06100C]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06100C]/75 via-[#06100C]/15 to-transparent" />

        <Container>
          <div className="relative max-w-[800px] pt-24 pb-14 md:pt-32 md:pb-20">
            <div className="text-[11px] md:text-[12px] uppercase tracking-[0.2em] text-white font-semibold mb-5 [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]">
              {HERO.eyebrow}
            </div>
            <h1 className="text-[32px] md:text-[54px] leading-[1.07] font-extrabold tracking-[-0.015em] text-white [text-shadow:0_2px_22px_rgba(0,0,0,0.65),0_1px_3px_rgba(0,0,0,0.55)]">
              {HERO.title}
            </h1>
            <p className="mt-5 text-[16px] md:text-[19px] leading-[1.5] text-white/90 max-w-[640px] [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
              {HERO.lead}
            </p>

            <div className="mt-7 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm text-white text-[14px] font-medium">
              {TRIP.dates} · {TRIP.place}
            </div>

            <div className="mt-7 md:mt-9">
              <CtaButtons isOnDark />
            </div>
          </div>
        </Container>
      </section>

      {/* === 2. Почему сейчас =========================================== */}
      <Section className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <SectionHead eyebrow={WHY_NOW.eyebrow} title={WHY_NOW.title} />
        <div className="mt-10 grid md:grid-cols-3 gap-5 md:gap-6">
          {WHY_NOW.points.map(p => (
            <Card key={p.title} className="p-6 md:p-7">
              <h3 className="text-[17px] font-medium text-[#0E1A14] leading-snug">{p.title}</h3>
              <p className="mt-3 text-[14.5px] leading-[1.6] text-[#4B5563]">{p.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 md:mt-10 rounded-2xl bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/25 p-6 md:p-8">
          <p className="text-[17px] md:text-[21px] leading-[1.45] font-medium text-[var(--color-primary-pressed)]">
            {WHY_NOW.key}
          </p>
        </div>
      </Section>

      {/* === 3. Что вы унесёте со встречи =============================== */}
      <Section className="border-b border-[var(--color-border)]">
        <SectionHead eyebrow={TAKEAWAYS.eyebrow} title={TAKEAWAYS.title} />
        <ol className="mt-10 grid sm:grid-cols-2 gap-5 md:gap-6">
          {TAKEAWAYS.items.map((item, i) => (
            <li key={item.title}>
              <Card className="h-full p-6 md:p-7">
                <div className="flex items-start gap-4">
                  <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)] text-[14px] font-semibold">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-medium text-[#0E1A14] leading-snug">{item.title}</h3>
                    <p className="mt-2.5 text-[14.5px] leading-[1.6] text-[#4B5563]">{item.body}</p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ol>
        <p className="mt-7 text-[15px] leading-[1.6] text-[#4B5563]">{TAKEAWAYS.note}</p>
      </Section>

      {/* === 4. Почему Бали продаётся клиенту =========================== */}
      <Section className="bg-[#FAFCFB] border-b border-[var(--color-border)]">
        <SectionHead eyebrow={WHY_BALI.eyebrow} title={WHY_BALI.title} />
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {WHY_BALI.items.map(item => (
            <Card key={item.title} className="p-6">
              <Check size={20} strokeWidth={1.8} className="text-[var(--color-primary)]" />
              <h3 className="mt-4 text-[16.5px] font-medium text-[#0E1A14] leading-snug">{item.title}</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-[#4B5563]">{item.body}</p>
            </Card>
          ))}
        </div>
        <p className="mt-7 text-[15px] leading-[1.6] text-[#4B5563]">{WHY_BALI.note}</p>
      </Section>

      {/* === 5. Застройщики ============================================= */}
      <Section className="border-b border-[var(--color-border)]">
        <SectionHead eyebrow="ЗАСТРОЙЩИКИ, КОТОРЫХ Я ПРЕДСТАВЛЯЮ" title="Прошли фильтр Balinsky" />
        <div className="mt-10 grid lg:grid-cols-2 gap-6 md:gap-7">
          {DEVELOPERS.map(dev => (
            <Card key={dev.name} className="overflow-hidden">
              <div className="p-6 md:p-7 flex items-center gap-5 border-b border-[var(--color-border)]">
                <div className="shrink-0 w-[110px] h-[52px] flex items-center justify-center">
                  <Image
                    src={dev.logo}
                    alt={dev.name}
                    width={140}
                    height={56}
                    unoptimized
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[19px] font-medium text-[#0E1A14] leading-tight">{dev.name}</h3>
                  <p className="mt-1 text-[13.5px] text-[#4B5563]">{dev.meta}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-px bg-[var(--color-border)]">
                {dev.photos.map(photo => (
                  <div key={photo.src} className="relative aspect-[4/3] bg-[var(--color-search-bg)]">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      sizes="(max-width: 1024px) 33vw, 180px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>

              <div className="p-6 md:p-7">
                <div className="flex flex-wrap gap-2">
                  {dev.badges.map(badge => (
                    <span
                      key={badge}
                      className="inline-flex items-center px-3 py-1.5 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)] text-[12.5px] font-medium"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <a
                  href={dev.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-pressed)] transition-colors"
                >
                  Профиль застройщика на Balinsky
                  <ArrowUpRight size={15} strokeWidth={2} />
                </a>
              </div>
            </Card>
          ))}
        </div>
        <p className="mt-7 text-[15px] leading-[1.6] text-[#4B5563]">
          Полные условия по каждому проекту — на встрече.
        </p>
      </Section>

      {/* === 6. Кто я =================================================== */}
      <Section className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <div className="grid md:grid-cols-[280px_1fr] gap-8 md:gap-12 md:items-center">
          <div className="relative w-[200px] md:w-full aspect-square rounded-2xl overflow-hidden bg-[var(--color-search-bg)]">
            <Image
              src={ABOUT.photo}
              alt={`${ABOUT.name} — ${ABOUT.role}`}
              fill
              sizes="(max-width: 768px) 200px, 280px"
              className="object-cover"
            />
          </div>
          <div>
            <div className="text-[11px] md:text-[12px] uppercase tracking-[0.2em] font-semibold mb-4 text-[var(--color-primary)]">
              {ABOUT.eyebrow}
            </div>
            <h2 className="text-[26px] md:text-[36px] leading-[1.12] font-light tracking-[-0.02em] text-[#0E1A14]">
              {ABOUT.name}, {ABOUT.role}
            </h2>
            <p className="mt-5 text-[16px] md:text-[17px] leading-[1.6] text-[#4B5563]">{ABOUT.body}</p>
            <p className="mt-3 text-[16px] md:text-[17px] leading-[1.6] text-[#4B5563]">{ABOUT.partners}</p>
          </div>
        </div>
      </Section>

      {/* === 7. Расписание и бронь ====================================== */}
      <Section id="booking" className="bg-[#0E1A14]">
        <SectionHead eyebrow={BOOKING.eyebrow} title={BOOKING.title} sub={BOOKING.body} isOnDark />
        <div className="mt-9">
          <CtaButtons isOnDark />
        </div>
        <p className="mt-5 text-[14.5px] leading-[1.6] text-white/70 max-w-[640px]">{BOOKING.note}</p>
      </Section>

      {/* Липкая панель брони — только на мобильном, где герой уже уехал. */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-white/95 backdrop-blur-sm px-4 py-3 flex gap-2">
        <a
          href={whatsappHref()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[var(--color-primary)] text-white text-[14.5px] font-medium"
        >
          <MessageCircle size={16} strokeWidth={1.8} />
          WhatsApp
        </a>
        <a
          href={lineHref()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-[var(--color-border)] text-[#0E1A14] text-[14.5px] font-medium"
        >
          <MessageCircle size={16} strokeWidth={1.8} />
          Line
        </a>
      </div>
    </div>
  )
}
