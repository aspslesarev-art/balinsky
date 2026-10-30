'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import { pickCopy, type Lang } from '@/lib/i18n'
import type { ChanceFactor, ComplexYieldRange, YieldRange } from '@/lib/investment/chance'
import { CardYield } from './CardYield'

// Pro-блок карточки каталога (макет «Pro: доход от и до + вероятность»,
// утверждён 30.10.2026): полоса во всю ширину карточки с бледно-зелёным
// фоном — доход «от и до» в % и в деньгах, пять точек «Вероятность N%» и
// «Почему?», которое раскрывает причины прямо в карточке. Без Pro — серые
// полоски вместо цифр, без кнопки (Pro открывают в шапке). Разметка одна для
// всех, видимость — по метке data-pro (.bx-auth-block / .bx-nopro-block в
// globals.css), как остальная аналитика сайта. Суммы — только в валюте,
// выбранной на сайте.

const COPY = {
  ru: {
    daily: 'Доход до налогов, в год', monthly: 'Доход при помесячной сдаче, в год',
    perYear: 'в год', chance: (n: number) => `Вероятность ${n}%`, why: 'Почему?', hide: 'Скрыть',
    locked: 'Доход от и до и вероятность — в Pro',
    note: 'Нижняя граница — плохой год: цена ночи как у дешёвых соседей, загрузка ниже обычной. Верхняя — хороший год. Середина — как на странице объекта.',
    noteMonthly: 'Нижняя граница — аренда как у дешёвых соседей и 10 месяцев в году. Верхняя — как у дорогих и весь год.',
    units: 'Доход до налогов по юнитам, в год', villas: 'Виллы', apartments: 'Апартаменты',
    chanceRange: (a: number, b: number) => `Вероятность ${a}–${b}%`,
  },
  en: {
    daily: 'Income before tax, per year', monthly: 'Income from monthly rental, per year',
    perYear: 'a year', chance: (n: number) => `Likelihood ${n}%`, why: 'Why?', hide: 'Hide',
    locked: 'Income range and likelihood — in Pro',
    note: 'Low end — a bad year: nightly rate like the cheaper neighbours, occupancy below usual. High end — a good year. The middle matches the listing page.',
    noteMonthly: 'Low end — rent like the cheaper neighbours, 10 months a year. High end — like the pricier ones, all year.',
    units: 'Unit income before tax, per year', villas: 'Villas', apartments: 'Apartments',
    chanceRange: (a: number, b: number) => `Likelihood ${a}–${b}%`,
  },
} as const

const VIEW: Record<string, { ru: string; en: string }> = {
  jungle: { ru: 'Вид на джунгли', en: 'Jungle view' },
  ocean_full: { ru: 'Вид на океан', en: 'Ocean view' },
  ocean_partial: { ru: 'Частичный вид на океан', en: 'Partial ocean view' },
  rice_field: { ru: 'Вид на рисовые поля', en: 'Rice field view' },
  cliff: { ru: 'Вид со скал', en: 'Clifftop view' },
  mountain: { ru: 'Вид на горы', en: 'Mountain view' },
  river_valley: { ru: 'Вид на реку и долину', en: 'River valley view' },
  city: { ru: 'Вид на застройку', en: 'View of buildings' },
  garden: { ru: 'Вид в сад', en: 'Garden view' },
  none: { ru: 'Без вида', en: 'No view' },
}

const VIEW_NOTE: Record<string, { ru: string; en: string }> = {
  jungle: { ru: 'У вилл с таким видом загрузка на 4% выше (замер по 3 700 виллам на Booking)', en: 'Villas with this view are booked 4% more (3,700 villas on Booking)' },
  ocean_full: { ru: 'У вилл с таким видом загрузка на 7% выше (замер по 3 700 виллам на Booking)', en: 'Villas with this view are booked 7% more (3,700 villas on Booking)' },
  rice_field: { ru: 'На загрузку почти не влияет (замер по 3 700 виллам на Booking)', en: 'Barely affects bookings (3,700 villas on Booking)' },
  city: { ru: 'У вилл с таким видом загрузка на 4% ниже (замер по 3 700 виллам на Booking)', en: 'Villas with this view are booked 4% less (3,700 villas on Booking)' },
  none: { ru: 'У вилл без вида загрузка на 9% ниже (замер по 3 700 виллам на Booking)', en: 'Villas with no view are booked 9% less (3,700 villas on Booking)' },
}

function factorText(f: ChanceFactor, en: boolean): { k: string; v: string | null } {
  const t = (ru: string, eng: string) => (en ? eng : ru)
  switch (f.k) {
    case 'view': return { k: (VIEW[f.s ?? ''] ?? VIEW.none)[en ? 'en' : 'ru'], v: VIEW_NOTE[f.s ?? '']?.[en ? 'en' : 'ru'] ?? null }
    case 'own': return { k: t('Комплекс уже сдаётся', 'Already rented out'), v: t(`Загрузка его объявлений на Booking — ${f.n}%`, `Its Booking listings are ${f.n}% booked`) }
    case 'land': return f.s === 'tourism'
      ? { k: t('Земля под посуточную сдачу', 'Zoned for daily rental'), v: t('Туристическая или коммерческая зона', 'Tourism or commercial zone') }
      : f.s === 'residential'
        ? { k: t('Жилая земля', 'Residential land'), v: t('Посуточно сдавать нельзя — доход посчитан по помесячной аренде', 'No daily rental — income is for monthly rental') }
        : { k: t('Зона земли не указана', 'Land zoning not stated'), v: t('Нельзя проверить, разрешена ли посуточная сдача', 'Can’t check whether daily rental is allowed') }
    case 'demand': return (f.d > 0)
      ? { k: t('Туристы здесь есть', 'Tourists come here'), v: t(`Рядом сдаётся ${f.n} объектов`, `${f.n} rentals nearby`) }
      : { k: t('Рядом мало кто сдаёт', 'Few rentals nearby'), v: t(`Только ${f.n} объектов поблизости`, `Only ${f.n} rentals around`) }
    case 'format': return f.d > 0
      ? { k: t('Формат частый в районе', 'Common format here'), v: t(`${f.n} похожих объектов рядом — цена ночи известна точно`, `${f.n} similar rentals nearby — the nightly rate is well known`) }
      : f.d < 0
        ? { k: t('Мало соседей для сравнения', 'Few comparable rentals'), v: t(`${f.n} похожих рядом — цена ночи известна неточно`, `${f.n} similar nearby — the nightly rate is uncertain`) }
        : { k: t('Похожие объекты рядом есть', 'Some comparable rentals'), v: t(`${f.n} похожих рядом`, `${f.n} similar nearby`) }
    case 'permit': {
      const m: Record<string, [string, string, string, string]> = {
        slf: ['Есть SLF', 'Ввод в эксплуатацию получен', 'SLF issued', 'Occupancy certificate in place'],
        pbg: ['Есть PBG', 'Разрешение на строительство получено', 'PBG issued', 'Building permit in place'],
        slf_applied: ['SLF: подана заявка', 'Ввод в эксплуатацию ещё не получен', 'SLF applied for', 'Occupancy certificate pending'],
        pbg_applied: ['PBG: подана заявка', 'Разрешение на строительство ещё не получено', 'PBG applied for', 'Building permit pending'],
        none: ['Разрешение: нет данных', 'Застройщик не показал PBG', 'Permit: no data', 'The developer hasn’t shown a PBG'],
      }
      const r = m[f.s ?? 'none'] ?? m.none
      return { k: en ? r[2] : r[0], v: en ? r[3] : r[1] }
    }
    case 'lease': return { k: t('Короткая аренда земли', 'Short land lease'), v: t(`Осталось ${f.n} лет`, `${f.n} years left`) }
    case 'built': return f.s === 'ready'
      ? { k: t('Уже построен', 'Already built'), v: t('Сдавать можно сразу', 'Can be rented right away') }
      : f.s === 'later'
        ? { k: t('Сдача не скоро', 'Completion is far off'), v: t(`Ещё около ${f.n} лет стройки`, `About ${f.n} more years to build`) }
        : { k: t('Ещё строится', 'Still being built'), v: t('Доход начнётся после сдачи', 'Income starts after completion') }
    case 'place': return f.s === 'lively'
      ? { k: t('Оживлённое место', 'Lively area'), v: t('Рядом много мест с высокими отзывами', 'Plenty of well-reviewed places nearby') }
      : { k: t('Тихое место', 'Quiet area'), v: t('Рядом мало кафе и мест для туристов', 'Few cafes or tourist spots nearby') }
  }
}

const pct = (n: number, lang: Lang) => {
  const s = n.toFixed(1)
  return lang === 'en' || lang === 'zh' ? s : s.replace('.', ',')
}

// Тон точек: 70+ — уверенно (зелёные), 50–69 — средне (охра), ниже — мало.
function Dots({ chance }: { chance: number }) {
  const on = Math.max(1, Math.min(5, Math.round(chance / 20)))
  const tone = chance >= 70 ? 'bg-[var(--color-primary)]' : chance >= 50 ? 'bg-[#B86E1F]' : 'bg-[#C2410C]'
  return (
    <span aria-hidden className="inline-flex gap-[3px]">
      {[0, 1, 2, 3, 4].map(i => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < on ? tone : 'bg-[var(--color-neutral-300)]'}`} />)}
    </span>
  )
}

const ARROW = { 1: '↑', 0: '=', [-1]: '↓' } as const
const ARROW_TONE = {
  1: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]',
  0: 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)]',
  [-1]: 'bg-[#FBEBDD] text-[#8A4A0C]',
} as const

// max-w-none: сеть «main * { max-width: 100% }» в globals.css иначе обрезает
// полосу по ширине содержимого, и правый край не доходит до рамки.
const BAND = 'mx-[-24px] max-w-none px-6 py-5 bg-[rgb(31_139_95/0.07)]'

export function CardYieldPro({ range, pct: legacyPct, lang = 'ru', className = '' }: {
  range: YieldRange | null | undefined
  /** Цифра без вилки (старые данные) — прежняя строка «≈N% в год». */
  pct?: number | null
  lang?: Lang
  className?: string
}) {
  const { currency } = useCurrency()
  const [open, setOpen] = useState(false)
  const c = pickCopy(COPY, lang)
  const en = lang !== 'ru'
  if (!range) return <CardYield pct={legacyPct} lang={lang} className={className} />

  const money = range.entryUsd != null && range.entryUsd > 0
    ? `${formatPrice(range.entryUsd * range.low / 100, currency, lang)} – ${formatPrice(range.entryUsd * range.high / 100, currency, lang)}`
    : null
  const toggle = (e: React.MouseEvent) => {
    // Карточка целиком — ссылка на объект: «Почему?» её не открывает.
    e.preventDefault()
    e.stopPropagation()
    setOpen(o => !o)
  }

  return (
    <div className={className}>
      <div className={`bx-auth-block ${BAND}`}>
        <div className="flex flex-col gap-3">
          <span className="text-[13px] text-[var(--color-text-muted)]">{range.mode === 'monthly' ? c.monthly : c.daily}</span>
          {/* Не влезает в строку (рупии, узкий экран) — сумма уходит под
              проценты целиком, а не рвётся посередине. */}
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="whitespace-nowrap text-[24px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-primary)]">
              {pct(range.low, lang)} – {pct(range.high, lang)}%
            </span>
            {money && <span className="whitespace-nowrap text-[14px] text-[var(--color-text)]">{money}</span>}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--color-text)]">
              <Dots chance={range.chance} />{c.chance(range.chance)}
            </span>
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className="inline-flex h-8 items-center gap-1 rounded text-[14px] text-[var(--color-primary-hover)] hover:text-[var(--color-primary-pressed)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              {open ? c.hide : c.why}
              <ChevronDown size={14} strokeWidth={2} aria-hidden className={`transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {open && (
            <div className="flex flex-col gap-3">
              <ul className="flex flex-col">
                {range.factors.map((f, i) => {
                  const { k, v } = factorText(f, en)
                  return (
                    <li key={i} className="grid grid-cols-[24px_1fr] items-start gap-3 border-t border-[var(--color-border)] py-3">
                      <span aria-hidden className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold ${ARROW_TONE[f.d]}`}>{ARROW[f.d]}</span>
                      <span>
                        <span className="block text-[14px] font-medium text-[var(--color-text)]">{k}</span>
                        {v && <span className="mt-0.5 block text-[13px] leading-[1.5] text-[var(--color-text-muted)]">{v}</span>}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p className="m-0 rounded-xl bg-white p-3 text-[13px] leading-[1.55] text-[var(--color-text-muted)]">
                {range.mode === 'monthly' ? c.noteMonthly : c.note}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className={`bx-nopro-block ${BAND}`}>
        <div className="flex flex-col gap-3">
          <span className="text-[13px] text-[var(--color-text-muted)]">{range.mode === 'monthly' ? c.monthly : c.daily}</span>
          <div aria-hidden className="flex flex-col gap-2">
            <span className="block h-6 w-[168px] rounded-md bg-[#D5E3DB]" />
            <span className="block h-4 w-[140px] rounded-md bg-[#D5E3DB]" />
          </div>
          <span className="text-[14px] leading-[1.5] text-[var(--color-text-muted)]">{c.locked}</span>
        </div>
      </div>
    </div>
  )
}

/** Карточка комплекса: вилка от самого низкого до самого высокого дохода его
 *  юнитов, по строке на виллы и апартаменты, и разброс вероятности. Причины
 *  у каждого юнита свои — они на карточках юнитов, а не здесь. */
export function ComplexYieldPro({ range, lang = 'ru', className = '' }: { range: ComplexYieldRange; lang?: Lang; className?: string }) {
  const c = pickCopy(COPY, lang)
  const chance = range.chanceMin === range.chanceMax ? c.chance(range.chanceMin) : c.chanceRange(range.chanceMin, range.chanceMax)
  return (
    <div className={className}>
      <div className={`bx-auth-block ${BAND}`}>
        <div className="flex flex-col gap-3">
          <span className="text-[13px] text-[var(--color-text-muted)]">{c.units}</span>
          <span className="whitespace-nowrap text-[24px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-primary)]">
            {pct(range.low, lang)} – {pct(range.high, lang)}%
          </span>
          <span className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--color-text)]">
            <Dots chance={Math.round((range.chanceMin + range.chanceMax) / 2)} />{chance}
          </span>
          {range.groups.length > 1 && (
            <ul className="flex flex-col gap-2">
              {range.groups.map(g => (
                <li key={g.kind} className="flex items-baseline justify-between gap-3 text-[14px]">
                  <span className="text-[var(--color-text)]">{g.kind === 'villa' ? c.villas : c.apartments}<span className="text-[13px] text-[var(--color-text-muted)]"> · {g.n}</span></span>
                  <span className="font-semibold text-[var(--color-text)]">{pct(g.low, lang)}–{pct(g.high, lang)}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className={`bx-nopro-block ${BAND}`}>
        <div className="flex flex-col gap-3">
          <span className="text-[13px] text-[var(--color-text-muted)]">{c.units}</span>
          <span aria-hidden className="block h-6 w-[168px] rounded-md bg-[#D5E3DB]" />
          <span className="text-[14px] leading-[1.5] text-[var(--color-text-muted)]">{c.locked}</span>
        </div>
      </div>
    </div>
  )
}
