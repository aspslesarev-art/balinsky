'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useCurrency } from './CurrencyContext'
import { formatPrice } from '@/lib/currency'
import { pickCopy, type Lang } from '@/lib/i18n'
import type { ChanceFactor, ComplexYieldRange, YieldRange } from '@/lib/investment/chance'
import { CardYield } from './CardYield'

// Pro-блок карточки каталога (макет «Pro: доход от и до + вероятность»,
// утверждён 30.10.2026): полоса во всю ширину карточки с бледно-зелёным
// фоном — доход «от и до» в % и в деньгах, пять точек «Вероятность N%»
// (шанс по соседям: «не меньше нижней цифры — у K из N похожих») и
// «Почему?»: на компьютере причины всплывают окошком при наведении, на
// телефоне — окном снизу по нажатию (владелец 30.10.2026). Без Pro — серые
// полоски вместо цифр, без кнопки (Pro открывают в шапке). Разметка одна для
// всех, видимость — по метке data-pro (.bx-auth-block / .bx-nopro-block в
// globals.css), как остальная аналитика сайта. Суммы — только в валюте,
// выбранной на сайте.

const COPY = {
  ru: {
    daily: 'Доход до налогов, в год', monthly: 'Доход при помесячной сдаче, в год',
    perYear: 'в год', chance: (n: number) => `Вероятность ${n}%`, why: 'Почему?', close: 'Закрыть',
    odds: (low: string, k: number, n: number, km: number) => `Не меньше ${low}% в год — у ${k} из ${n} похожих в ${km} км`,
    oddsLong: (low: string, k: number, n: number, km: number) => `Рядом, в ${km} км: ${k} из ${n} похожих объектов на Booking своей ценой ночи и загрузкой дали бы этому объекту не меньше ${low}% в год.`,
    areaLong: (low: string, k: number, n: number) => `В округе 10 км: ${k} из ${n}.`,
    noNear: 'В 3 км мало похожих объектов с историей на Booking.',
    oddsBasis: 'Цена и загрузка — медиана за всё время наблюдений, с 5 августа 2026. Сетевые отели не считаем.',
    noOdds: 'Вероятность не посчитана: в 10 км мало похожих объектов с историей на Booking',
    noOddsMonthly: 'Вероятность не считаем: соседи на Booking сдаются посуточно, а здесь — помесячно',
    whyTitle: 'Почему такой доход',
    locked: 'Доход от и до и вероятность — в Pro',
    note: 'Нижняя граница — плохой год: цена ночи как у дешёвых соседей, загрузка ниже обычной. Верхняя — хороший год. Середина — как на странице объекта.',
    noteMonthly: 'Нижняя граница — аренда как у дешёвых соседей и 10 месяцев в году. Верхняя — как у дорогих и весь год.',
    units: 'Доход до налогов по юнитам, в год', villas: 'Виллы', apartments: 'Апартаменты',
  },
  en: {
    daily: 'Income before tax, per year', monthly: 'Income from monthly rental, per year',
    perYear: 'a year', chance: (n: number) => `Likelihood ${n}%`, why: 'Why?', close: 'Close',
    odds: (low: string, k: number, n: number, km: number) => `At least ${low}% a year — for ${k} of ${n} similar within ${km} km`,
    oddsLong: (low: string, k: number, n: number, km: number) => `Within ${km} km: ${k} of ${n} similar Booking rentals, at their nightly rate and occupancy, would give this property at least ${low}% a year.`,
    areaLong: (low: string, k: number, n: number) => `Within 10 km: ${k} of ${n}.`,
    oddsBasis: 'Rate and occupancy are medians over everything observed since 5 August 2026. Chain hotels are left out.',
    noOdds: 'Likelihood not calculated: too few similar rentals with a Booking history within 10 km',
    noNear: 'Within 3 km there are too few similar rentals with a Booking history.',
    noOddsMonthly: 'No likelihood: neighbours on Booking rent nightly, this one rents monthly',
    whyTitle: 'Why this income',
    locked: 'Income range and likelihood — in Pro',
    note: 'Low end — a bad year: nightly rate like the cheaper neighbours, occupancy below usual. High end — a good year. The middle matches the listing page.',
    noteMonthly: 'Low end — rent like the cheaper neighbours, 10 months a year. High end — like the pricier ones, all year.',
    units: 'Unit income before tax, per year', villas: 'Villas', apartments: 'Apartments',
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

const fmtKm = (m: number, en: boolean) => (m < 1000 ? `${m} ${en ? 'm' : 'м'}` : `${(m / 1000).toFixed(1).replace('.', en ? '.' : ',')} ${en ? 'km' : 'км'}`)

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
    case 'coast': return f.d > 0
      ? { k: t(`У моря: ${f.n} м до берега`, `By the sea: ${f.n} m to the shore`), v: t('Близость к воде помогает посуточной сдаче', 'Being near the water helps nightly rentals') }
      : { k: t(`До берега ${fmtKm(f.n ?? 0, en)}`, `${fmtKm(f.n ?? 0, en)} to the shore`), v: null }
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

const POP_W = 360
const GAP = 8

/** Причины вероятности: список и пояснение к вилке. */
function Reasons({ range, lang }: { range: YieldRange; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const en = lang !== 'ru'
  const low = pct(range.low, lang)
  const near = range.chance != null && range.chanceK != null && range.chanceN != null
    ? c.oddsLong(low, range.chanceK, range.chanceN, (range.chanceRadiusM ?? 2000) / 1000)
    : range.mode === 'monthly' ? c.noOddsMonthly : range.areaK != null ? c.noNear : c.noOdds
  const area = range.areaK != null && range.areaN != null ? c.areaLong(low, range.areaK, range.areaN) : null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="m-0 text-[13px] leading-[1.55] text-[var(--color-text)]">{near}{area ? ` ${area}` : ''}</p>
        {(range.chance != null || area) && <p className="m-0 text-[13px] leading-[1.5] text-[var(--color-text-muted)]">{c.oddsBasis}</p>}
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
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
      <p className="m-0 rounded-xl bg-[var(--color-surface-alt)] p-3 text-[13px] leading-[1.55] text-[var(--color-text-muted)]">
        {range.mode === 'monthly' ? c.noteMonthly : c.note}
      </p>
    </div>
  )
}

/**
 * «Почему?». Компьютер (есть наведение) — окошко у кнопки при наведении или
 * фокусе; телефон — окно снизу по нажатию. Окно — в портале: карточка
 * обрезает всё, что выходит за её края (overflow-hidden), а сеть
 * «main * { max-width: 100% }» сжала бы его по ширине. Карточка целиком —
 * ссылка, поэтому клики внутри не всплывают до неё (React ведёт события из
 * портала через дерево компонентов).
 */
function WhyButton({ range, lang }: { range: YieldRange; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const btn = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<number | null>(null)
  const [mode, setMode] = useState<'pop' | 'sheet' | null>(null)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 })

  const headPct = range.chance ?? (range.areaK != null && range.areaN ? Math.round((range.areaK / range.areaN) * 100) : null)
  const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const cancelClose = () => { if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null } }
  // Пауза, чтобы курсор успел дойти от кнопки до окошка.
  const closeSoon = () => { cancelClose(); closeTimer.current = window.setTimeout(() => setMode(m => (m === 'pop' ? null : m)), 160) }

  const openPop = () => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    cancelClose()
    const left = Math.max(16, Math.min(r.right - POP_W, window.innerWidth - POP_W - 16)) + window.scrollX
    // В нижней половине экрана окошко открывается вверх, чтобы не уйти за край.
    setPos(r.top > window.innerHeight / 2
      ? { left, bottom: document.documentElement.clientHeight - r.top - window.scrollY + GAP }
      : { left, top: r.bottom + window.scrollY + GAP })
    setMode('pop')
  }

  useEffect(() => {
    if (!mode) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMode(null) }
    window.addEventListener('keydown', onKey)
    // Окно снизу на телефоне — страница под ним не прокручивается.
    const prev = document.body.style.overflow
    if (mode === 'sheet') document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [mode])
  useEffect(() => cancelClose, [])

  const stop = (e: React.SyntheticEvent) => { e.stopPropagation() }

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={mode != null}
        onMouseEnter={() => { if (canHover()) openPop() }}
        onMouseLeave={() => { if (canHover()) closeSoon() }}
        onFocus={() => { if (canHover()) openPop() }}
        onBlur={() => { if (canHover()) closeSoon() }}
        onClick={e => {
          // Карточка целиком — ссылка на объект: «Почему?» её не открывает.
          e.preventDefault()
          e.stopPropagation()
          if (canHover()) { if (mode) setMode(null); else openPop() } else setMode('sheet')
        }}
        className="inline-flex h-8 items-center rounded text-[14px] text-[var(--color-primary-hover)] underline decoration-dotted underline-offset-4 hover:text-[var(--color-primary-pressed)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
      >
        {c.why}
      </button>

      {mode === 'pop' && createPortal(
        <div
          role="dialog"
          aria-label={c.whyTitle}
          onClick={stop}
          onMouseEnter={cancelClose}
          onMouseLeave={closeSoon}
          style={{ position: 'absolute', left: pos.left, top: pos.top, bottom: pos.bottom, width: POP_W }}
          className="z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[0_1px_2px_rgb(15_26_21/0.04),0_8px_24px_rgb(15_26_21/0.10)] animate-[bx-pop-in_200ms_cubic-bezier(.2,.8,.2,1)] motion-reduce:animate-none"
        >
          <div className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[var(--color-text)]">
            {headPct != null && <Dots chance={headPct} />}{headPct != null ? c.chance(headPct) : c.whyTitle}
          </div>
          <Reasons range={range} lang={lang} />
        </div>,
        document.body,
      )}

      {mode === 'sheet' && createPortal(
        <div className="fixed inset-0 z-50 flex items-end" onClick={e => { stop(e); setMode(null) }}>
          <div aria-hidden className="absolute inset-0 bg-[rgb(15_26_21/0.45)]" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={c.whyTitle}
            onClick={stop}
            className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white px-6 pb-8 pt-4 shadow-[0_-8px_24px_rgb(15_26_21/0.12)]"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[16px] font-semibold text-[var(--color-text)]">
                {headPct != null && <Dots chance={headPct} />}{headPct != null ? c.chance(headPct) : c.whyTitle}
              </span>
              <button
                type="button"
                aria-label={c.close}
                onClick={() => setMode(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-alt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
              >
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            </div>
            <Reasons range={range} lang={lang} />
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

export function CardYieldPro({ range, pct: legacyPct, lang = 'ru', className = '' }: {
  range: YieldRange | null | undefined
  /** Цифра без вилки (старые данные) — прежняя строка «≈N% в год». */
  pct?: number | null
  lang?: Lang
  className?: string
}) {
  const { currency } = useCurrency()
  const c = pickCopy(COPY, lang)
  if (!range) return <CardYield pct={legacyPct} lang={lang} className={className} />

  // Вероятность на карточке — по соседям рядом (2–3 км); мало их — по округе 10 км.
  const shown = range.chance != null && range.chanceK != null && range.chanceN != null
    ? { pct: range.chance, k: range.chanceK, n: range.chanceN, km: (range.chanceRadiusM ?? 2000) / 1000 }
    : range.areaK != null && range.areaN != null
      ? { pct: Math.round((range.areaK / range.areaN) * 100), k: range.areaK, n: range.areaN, km: 10 }
      : null
  const money = range.entryUsd != null && range.entryUsd > 0
    ? `${formatPrice(range.entryUsd * range.low / 100, currency, lang)} – ${formatPrice(range.entryUsd * range.high / 100, currency, lang)}`
    : null
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
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              {shown
                ? <span className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--color-text)]"><Dots chance={shown.pct} />{c.chance(shown.pct)}</span>
                : <span />}
              <WhyButton range={range} lang={lang} />
            </div>
            {/* К чему относится вероятность — сразу под ней, без наведения. */}
            <span className="text-[13px] leading-[1.5] text-[var(--color-text-muted)]">
              {shown
                ? c.odds(pct(range.low, lang), shown.k, shown.n, shown.km)
                : range.mode === 'monthly' ? c.noOddsMonthly : c.noOdds}
            </span>
          </div>
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
 *  юнитов, по строке на виллы и апартаменты. Вероятность и причины у каждого
 *  юнита свои — они на карточках юнитов, а не здесь. */
export function ComplexYieldPro({ range, lang = 'ru', className = '' }: { range: ComplexYieldRange; lang?: Lang; className?: string }) {
  const c = pickCopy(COPY, lang)
  return (
    <div className={className}>
      <div className={`bx-auth-block ${BAND}`}>
        <div className="flex flex-col gap-3">
          <span className="text-[13px] text-[var(--color-text-muted)]">{c.units}</span>
          <span className="whitespace-nowrap text-[24px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-primary)]">
            {pct(range.low, lang)} – {pct(range.high, lang)}%
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
