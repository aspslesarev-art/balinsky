// Разметка аналитической части страницы объекта: «карта страницы» сразу
// после описания и нумерованные разделы под ней.
//
// Данных на странице много (Google Maps, Booking, кадастр), и человек,
// открывший её впервые, не понимал, с чего начать и как блоки связаны:
// калькулятор стоял раньше, чем ставки соседей, на которых он построен.
// Теперь порядок один на все типы объектов — место → аренда рядом →
// доходность → участок, — у каждого раздела номер и строка «как читать».

import type { ReactNode } from 'react'
import { MapPin, BedDouble, Calculator, Landmark } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import { InlinePrice } from './InlinePrice'

export type ChapterId = 'mesto' | 'arenda' | 'dokhodnost' | 'uchastok'

// Классы целиком, чтобы Tailwind их увидел: карточек столько, сколько
// у объекта разделов с данными, и сетка не должна оставлять дыру справа.
const GRID_COLS: Record<number, string> = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' }

const ICONS = { mesto: MapPin, arenda: BedDouble, dokhodnost: Calculator, uchastok: Landmark } as const

const COPY = {
  ru: {
    guideTitle: 'Как читать данные об объекте',
    guideSub: 'Эти данные мы собираем сами — из Google Maps, Booking и официальных карт зонирования Бали — и обновляем каждый день. Идите по порядку: каждый раздел опирается на предыдущий.',
    jump: 'Перейти',
    chapters: {
      mesto: {
        title: 'Место',
        short: 'Что вокруг, дорога, погода',
        hint: 'Что вокруг, сколько ехать до аэропорта и пляжей, какая погода. Отсюда видно, будут ли туда ехать гости.',
      },
      arenda: {
        title: 'Аренда рядом',
        short: 'Почём сдают соседи и есть ли спрос',
        hint: 'Почём сдают похожие объекты по соседству и насколько этот сильнее или слабее их. Это основа для расчёта дохода.',
      },
      dokhodnost: {
        title: 'Доходность',
        short: 'Сколько останется владельцу в год',
        hint: 'Калькулятор: берёт ставку соседей из раздела «Аренда рядом» и считает, сколько останется владельцу после всех расходов и налога. Ползунки можно двигать.',
      },
      uchastok: {
        title: 'Участок',
        short: 'Что разрешено на этой земле',
        hint: 'Что разрешено строить на этой земле и можно ли легально сдавать посуточно — по официальной карте зон.',
      },
    },
    neighbours: 'за ночь у соседей',
    airport: (min: number) => `${min} мин до аэропорта`,
    demand: (score: number) => `${score} из 100 по спросу`,
    strYes: 'Сдавать посуточно можно',
    strNo: 'Посуточно сдавать нельзя',
    strMaybe: 'Посуточная аренда под вопросом',
    calcTeaser: 'Посчитать чистый доход',
  },
  en: {
    guideTitle: 'How to read the data on this property',
    guideSub: 'We collect this data ourselves — from Google Maps, Booking and Bali’s official zoning maps — and refresh it daily. Go in order: each section builds on the previous one.',
    jump: 'Go',
    chapters: {
      mesto: {
        title: 'Location',
        short: 'Surroundings, travel times, weather',
        hint: 'What is around, how far the airport and beaches are, what the weather is like. It shows whether guests will want to come.',
      },
      arenda: {
        title: 'Rentals nearby',
        short: 'What neighbours charge and demand',
        hint: 'What similar places next door charge and how this one compares. This is the basis for the income estimate.',
      },
      dokhodnost: {
        title: 'Yield',
        short: 'What the owner keeps per year',
        hint: 'A calculator: it takes the neighbour rate from “Rentals nearby” and shows what the owner keeps after all costs and tax. The sliders can be moved.',
      },
      uchastok: {
        title: 'Land',
        short: 'What the zoning allows',
        hint: 'What may be built on this land and whether short-term rental is legal — per the official zoning map.',
      },
    },
    neighbours: 'per night at neighbours',
    airport: (min: number) => `${min} min to the airport`,
    demand: (score: number) => `${score} of 100 on demand`,
    strYes: 'Short-term rental allowed',
    strNo: 'Short-term rental not allowed',
    strMaybe: 'Short-term rental unclear',
    calcTeaser: 'Estimate net income',
  },
}

export type GuideFacts = {
  airportMin?: number | null
  neighbourAdrUsd?: number | null
  demandScore?: number | null
  // Сырое значение str_likely_allowed из профиля участка.
  strAllowed?: string | null
}

// Раздел аналитики. Заголовок нарочно не крупный: внутри у блоков свои
// заголовки («Что вокруг», «Почём сдают соседи»), а номер и строка
// пояснения говорят, зачем раздел и как его читать.
export function DataChapter({
  id,
  n,
  lang,
  children,
}: {
  id: ChapterId
  n: number
  lang: Lang
  children: ReactNode
}) {
  const c = pickCopy(COPY, lang).chapters[id]
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <div className="mb-6 max-w-[68ch]">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-[13px] font-semibold">
            {n}
          </span>
          <span className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-primary-pressed)]">
            {c.title}
          </span>
        </div>
        <p className="text-[15px] leading-relaxed text-[var(--color-text-muted)]">{c.hint}</p>
      </div>
      <div className="flex flex-col gap-4 [&_[data-investment-block]]:mt-0 [&>section:last-child]:mb-0">{children}</div>
    </section>
  )
}

// «Карта страницы»: четыре раздела с главной цифрой каждого. Карточка —
// ссылка на свой раздел, так что по ней же можно и перейти.
export function DataGuide({
  lang,
  chapters,
  facts,
}: {
  lang: Lang
  chapters: ChapterId[]
  facts: GuideFacts
}) {
  const c = pickCopy(COPY, lang)
  if (chapters.length < 2) return null

  const teaser = (id: ChapterId): ReactNode => {
    if (id === 'arenda') {
      if (facts.neighbourAdrUsd) {
        return <><InlinePrice usd={facts.neighbourAdrUsd} lang={lang} /> {c.neighbours}</>
      }
      if (facts.demandScore != null) return c.demand(facts.demandScore)
    }
    if (id === 'uchastok' && facts.strAllowed) {
      const s = facts.strAllowed.toLowerCase()
      if (s.startsWith('likely yes') || s.startsWith('yes')) return c.strYes
      if (s.startsWith('no')) return c.strNo
      return c.strMaybe
    }
    if (id === 'dokhodnost') return c.calcTeaser
    if (id === 'mesto' && facts.airportMin) return c.airport(facts.airportMin)
    return null
  }

  return (
    <section className="mb-16" aria-labelledby="data-guide-title">
      <h2 id="data-guide-title" className="text-[24px] md:text-[28px] font-semibold tracking-tight text-[#111827] mb-2">
        {c.guideTitle}
      </h2>
      <p className="text-[15px] leading-relaxed text-[var(--color-text-muted)] max-w-[68ch] mb-6">{c.guideSub}</p>
      <ol className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${GRID_COLS[chapters.length] ?? 'lg:grid-cols-4'}`}>
        {chapters.map((id, i) => {
          const Icon = ICONS[id]
          const ch = c.chapters[id]
          const t = teaser(id)
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                className="group flex h-full flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-white p-4 transition-colors duration-[120ms] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                <span className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--color-primary-pressed)]">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-primary)] text-white normal-case tracking-normal">
                    {i + 1}
                  </span>
                  <Icon size={16} aria-hidden />
                  {ch.title}
                </span>
                {t && <span className="text-[15px] font-semibold text-[#111827]">{t}</span>}
                <span className="text-[13px] leading-snug text-[var(--color-text-muted)]">{ch.short}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
