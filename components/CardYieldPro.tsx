'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useCurrency } from './CurrencyContext'
import { formatMoney, formatPrice } from '@/lib/currency'
import { pickCopy, type Lang } from '@/lib/i18n'
import { pluralRu } from '@/lib/plural-ru'
import type { ChanceFactor, ComplexYieldRange, Match, YieldRange } from '@/lib/investment/chance'
import { CardYield } from './CardYield'

// Pro-блок карточки каталога (макет «Pro: доход от и до + вероятность»,
// утверждён 30.10.2026): полоса во всю ширину карточки с бледно-зелёным
// фоном — самая вероятная доходность (медиана того, что дали бы объекту
// похожие соседи на Booking; владелец 31.10.2026: «хочу одну конкретную,
// самую вероятную»), у половины соседей — от и до, шанс для нижней и для
// верхней цифры вилки точками («не меньше 4% — у 9 из 10») и «Почему?»: на компьютере причины всплывают окошком при наведении, на
// телефоне — окном снизу по нажатию (владелец 30.10.2026). Без Pro — серые
// полоски вместо цифр, без кнопки (Pro открывают в шапке). Разметка одна для
// всех, видимость — по метке data-pro (.bx-auth-block / .bx-nopro-block в
// globals.css), как остальная аналитика сайта. Суммы — только в валюте,
// выбранной на сайте.

const COPY = {
  ru: {
    daily: 'Доход до налогов, в год', monthly: 'Доход при помесячной сдаче, в год',
    likelyLabel: 'Скорее всего, в год до налогов',
    likelyHead: (x: string) => `Скорее всего ${x}%`,
    half: (a: string, b: string, km: number) => `У половины похожих в ${km} км — от ${a} до ${b}%`,
    atLeast: (x: string, k: number, n: number) => `${x}% и больше — у ${k} из ${n}`,
    basedOn: (n: number, km: number) => `По ${n} похожим объектам в ${km} км на Booking`,
    siteEstimate: 'Расчёт сайта: своего класса рядом мало для сравнения',
    siteMonthly: 'Расчёт сайта по помесячной аренде у соседей',
    siteOwn: 'По броням самого комплекса на Booking',
    why: 'Почему?', close: 'Закрыть', perYear: 'в год',
    how: (n: number, km: number, what: string, likely: string) => `Взяли ${n} похожих на Booking в ${km} км: ${what}. Цену ночи и загрузку каждого пересчитали на этот объект — его цену, расходы и комиссии. Половина дала бы больше ${likely}%, половина — меньше.`,
    areaHow: (likely: string, n: number) => `По округе 10 км самая вероятная — ${likely}% (${n} похожих).`,
    oddsBasis: 'Цена и загрузка — медиана за всё время наблюдений, с 5 августа 2026. Сетевые отели не считаем.',
    noOdds: 'Сравнить с соседями не удалось: в 10 км мало похожих объектов того же класса с историей на Booking. Цифры — расчёт сайта.',
    noOddsMonthly: 'Соседи на Booking сдаются посуточно, а здесь — помесячно, поэтому цифры — расчёт сайта.',
    badGood: (low: string, high: string) => `Плохой год — ${low}%, хороший — ${high}%`,
    whyTitle: 'Почему такой доход',
    locked: 'Самая вероятная доходность — в Pro',
    note: (low: string, high: string, mid: string) => `${low}% — плохой год по расчёту сайта: цена ночи как у дешёвых соседей, загрузка ниже обычной. ${high}% — хороший год. Средний год на странице объекта — ${mid}%.`,
    noteMonthly: (low: string, high: string) => `${low}% — аренда как у дешёвых соседей и 10 месяцев в году. ${high}% — как у дорогих и весь год.`,
    units: 'Доход до налогов по юнитам, в год', villas: 'Виллы', apartments: 'Апартаменты',
  },
  en: {
    daily: 'Income before tax, per year', monthly: 'Income from monthly rental, per year',
    likelyLabel: 'Most likely, per year before tax',
    likelyHead: (x: string) => `Most likely ${x}%`,
    half: (a: string, b: string, km: number) => `Half of similar rentals within ${km} km: ${a}–${b}%`,
    atLeast: (x: string, k: number, n: number) => `${x}% or more — ${k} of ${n}`,
    basedOn: (n: number, km: number) => `Based on ${n} similar Booking rentals within ${km} km`,
    siteEstimate: 'Site estimate: too few rentals of the same class nearby',
    siteMonthly: 'Site estimate from monthly rents nearby',
    siteOwn: 'From the complex’s own Booking reservations',
    why: 'Why?', close: 'Close', perYear: 'a year',
    how: (n: number, km: number, what: string, likely: string) => `We took ${n} similar Booking rentals within ${km} km: ${what}. Each one's nightly rate and occupancy were applied to this property — its price, costs and fees. Half would give more than ${likely}%, half less.`,
    areaHow: (likely: string, n: number) => `Within 10 km the most likely is ${likely}% (${n} similar).`,
    oddsBasis: 'Rate and occupancy are medians over everything observed since 5 August 2026. Chain hotels are left out.',
    noOdds: 'No neighbour comparison: too few similar rentals of the same class with a Booking history within 10 km. Figures are the site estimate.',
    noOddsMonthly: 'Booking neighbours rent nightly and this one rents monthly, so figures are the site estimate.',
    badGood: (low: string, high: string) => `Bad year ${low}%, good year ${high}%`,
    whyTitle: 'Why this income',
    locked: 'Most likely income — in Pro',
    note: (low: string, high: string, mid: string) => `${low}% is a bad year by the site estimate: nightly rate like the cheaper neighbours, occupancy below usual. ${high}% is a good year. The average year on the listing page is ${mid}%.`,
    noteMonthly: (low: string, high: string) => `${low}% — rent like the cheaper neighbours, 10 months a year. ${high}% — like the pricier ones, all year.`,
    units: 'Unit income before tax, per year', villas: 'Villas', apartments: 'Apartments',
  },
} as const

const VIEW: Record<string, { ru: string; en: string }> = {
  jungle: { ru: 'Вид на джунгли', en: 'Jungle view' },
  ocean: { ru: 'Вид на океан', en: 'Ocean view' },
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
  ocean: { ru: 'Океан виден на фото объекта', en: 'The ocean shows in the listing photos' },
  garden: { ru: 'У вилл с видом в сад загрузка на 3% выше (замер по 3 700 виллам на Booking)', en: 'Villas with a garden view are booked 3% more (3,700 villas on Booking)' },
  jungle: { ru: 'У вилл с таким видом загрузка на 4% выше (замер по 3 700 виллам на Booking)', en: 'Villas with this view are booked 4% more (3,700 villas on Booking)' },
  ocean_full: { ru: 'У вилл с таким видом загрузка на 7% выше (замер по 3 700 виллам на Booking)', en: 'Villas with this view are booked 7% more (3,700 villas on Booking)' },
  rice_field: { ru: 'На загрузку почти не влияет (замер по 3 700 виллам на Booking)', en: 'Barely affects bookings (3,700 villas on Booking)' },
  city: { ru: 'У вилл с таким видом загрузка на 4% ниже (замер по 3 700 виллам на Booking)', en: 'Villas with this view are booked 4% less (3,700 villas on Booking)' },
  none: { ru: 'У вилл без вида загрузка на 9% ниже (замер по 3 700 виллам на Booking)', en: 'Villas with no view are booked 9% less (3,700 villas on Booking)' },
}

const fmtKm = (m: number, en: boolean) => (m < 1000 ? `${m} ${en ? 'm' : 'м'}` : `${(m / 1000).toFixed(1).replace('.', en ? '.' : ',')} ${en ? 'km' : 'км'}`)

/** «виллы на 2 спальни с частным бассейном, 100–260 м², ночь $130–520» — с кем
 *  сравнивали. Цена ночи — в валюте, выбранной на сайте. */
function matchText(m: Match, en: boolean, money: (usd: number) => string): string {
  const r10 = (x: number) => Math.round(x / 10) * 10
  const kind = m.k === 'villa' ? (en ? 'villas' : 'виллы') : (en ? 'apartments' : 'апартаменты')
  const br = m.b == null ? '' : m.b === 0 ? (en ? ' (studios)' : '-студии') : en ? ` with ${m.b} bedroom${m.b > 1 ? 's' : ''}` : ` на ${m.b} ${pluralRu(m.b, ['спальню', 'спальни', 'спален'])}`
  const pool = m.l === 'type' || m.l === 'area' || m.p == null ? '' : m.p ? (en ? ', private pool' : ' с частным бассейном') : (en ? ', no private pool' : ' без своего бассейна')
  const area = (m.l === 'pool_area' || m.l === 'area') && m.a != null ? `, ${r10(m.a * 0.6)}–${r10(m.a * 1.6)} ${en ? 'm²' : 'м²'}` : ''
  const cls = m.c ? `, ${en ? 'night' : 'ночь'} ${money(m.c[0])}–${money(m.c[1])}` : `, ${en ? 'any price class (too few of the same class)' : 'любого класса (своего класса мало)'}`
  return `${kind}${br}${pool}${area}${cls}`
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
// Для верхней цифры мало точек — не тревога, а просто редкая удача: тон ровный.
function Dots({ chance, even = false }: { chance: number; even?: boolean }) {
  const on = Math.max(0, Math.min(5, Math.round(chance / 20)))
  const tone = even || chance >= 70 ? 'bg-[var(--color-primary)]' : chance >= 50 ? 'bg-[#B86E1F]' : 'bg-[#C2410C]'
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
  const { currency } = useCurrency()
  const en = lang !== 'ru'
  const o = range.odds
  const top = o
    ? c.how(o.n, o.radiusM / 1000, range.match ? matchText(range.match, en, usd => formatMoney(usd, currency, lang)) : '', pct(o.likely, lang))
    : range.mode === 'monthly' ? c.noOddsMonthly : c.noOdds
  const area = o && range.area && o.radiusM !== 10000 ? c.areaHow(pct(range.area.likely, lang), range.area.n) : null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="m-0 text-[13px] leading-[1.55] text-[var(--color-text)]">{top}{area ? ` ${area}` : ''}</p>
        {o ? (
          <ul className="m-0 my-1 flex list-none flex-col gap-1 p-0 text-[13px] text-[var(--color-text)]">
            <li>{c.half(pct(o.q25, lang), pct(o.q75, lang), o.radiusM / 1000)}</li>
            <li className="flex items-center gap-2"><Dots chance={Math.round((o.kLow / o.n) * 100)} />{c.atLeast(pct(range.low, lang), o.kLow, o.n)}</li>
            <li className="flex items-center gap-2"><Dots chance={Math.round((o.kHigh / o.n) * 100)} even />{c.atLeast(pct(range.high, lang), o.kHigh, o.n)}</li>
          </ul>
        ) : (
          <p className="m-0 text-[13px] leading-[1.55] text-[var(--color-text)]">{c.badGood(pct(range.low, lang), pct(range.high, lang))}</p>
        )}
        {o && <p className="m-0 text-[13px] leading-[1.5] text-[var(--color-text-muted)]">{c.oddsBasis}</p>}
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
        {range.mode === 'monthly'
          ? c.noteMonthly(pct(range.low, lang), pct(range.high, lang))
          : c.note(pct(range.low, lang), pct(range.high, lang), pct(range.mid, lang))}
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

  const head = range.odds ? c.likelyHead(pct(range.odds.likely, lang)) : c.whyTitle
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
          <div className="mb-2 text-[15px] font-semibold text-[var(--color-text)]">{head}</div>
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
              <span className="text-[16px] font-semibold text-[var(--color-text)]">{head}</span>
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

  const o = range.odds
  const big = o ? o.likely : range.mid
  const money = range.entryUsd != null && range.entryUsd > 0 ? formatPrice(range.entryUsd * big / 100, currency, lang) : null
  return (
    <div className={className}>
      <div className={`bx-auth-block ${BAND}`}>
        <div className="flex flex-col gap-3">
          <span className="text-[13px] text-[var(--color-text-muted)]">{range.mode === 'monthly' ? c.monthly : o ? c.likelyLabel : c.daily}</span>
          <div className="flex flex-col gap-1">
            {/* Не влезает в строку (рупии, узкий экран) — сумма уходит под
                проценты целиком, а не рвётся посередине. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="whitespace-nowrap text-[24px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--color-primary)]">
                {pct(big, lang)}%
              </span>
              {money && <span className="whitespace-nowrap text-[14px] text-[var(--color-text)]">{money} {c.perYear}</span>}
            </div>
            <span className="text-[13px] leading-[1.5] text-[var(--color-text-muted)]">
              {o ? c.basedOn(o.n, o.radiusM / 1000)
                : range.mode === 'monthly' ? c.siteMonthly
                : range.factors.some(f => f.k === 'own') ? c.siteOwn
                : c.siteEstimate}
            </span>
          </div>
          {/* Одна цифра на карточке (владелец 31.10.2026); разброс и шансы
              для нижней и верхней цифры — в «Почему?». */}
          <div className="-mt-1 flex justify-end"><WhyButton range={range} lang={lang} /></div>
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
