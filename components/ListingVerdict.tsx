// Страница объекта для новичка: «Стоит ли брать» и четыре раздела-вопроса
// (безопасно → удобно → спрос → деньги). Выводы — lib/listing-verdict.ts.
// Тексты пока RU + EN; остальные языки берут английский до перевода.
import type { ReactNode } from 'react'
import { pickCopy, type Lang } from '@/lib/i18n'
import type { Verdict, Tone, YieldFacts, ComplexFacts } from '@/lib/listing-verdict'
import type { MonthlyBundle } from '@/lib/investment/monthly'
import { InlinePrice } from './InlinePrice'
import { CardRail } from './CardRail'

const TONE_PILL: Record<Tone, string> = {
  plus: 'bg-[var(--color-primary-soft)] text-[var(--color-primary-pressed)]',
  warn: 'bg-[#FDF0DC] text-[#8A4B00]',
  minus: 'bg-[#FCE8E6] text-[#A1281C]',
}
const TONE_TEXT: Record<Tone, string> = {
  plus: 'text-[var(--color-primary-pressed)]',
  warn: 'text-[#8A4B00]',
  minus: 'text-[#A1281C]',
}

const pctFmt = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`
const pctFmtEn = (x: number) => `${(x * 100).toFixed(1)}%`

const COPY = {
  ru: {
    title: 'Стоит ли брать этот объект',
    sub: 'Четыре вопроса, которые задаёт себе каждый, кто покупает на Бали впервые. Ответы - из данных, а не из рекламы.',
    total: 'Итог',
    more: 'Подробнее',
    q: { safety: 'Безопасно ли это?', comfort: 'Удобно ли там жить?', demand: 'Будет ли спрос?', money: 'Сколько принесёт?' },
    qOf: (n: number) => `Вопрос ${n} из 4`,
    pluses: 'Чем хорош объект',
    checks: 'Что проверить до первой оплаты',
    howCheck: 'Как проверить документы - простая инструкция',
    status: {
      safety: { plus: 'Рисков не видно', warn: 'Есть вопросы', minus: 'Есть риски' },
      comfort: { plus: 'Удобно', warn: 'Тихо, но далеко', minus: 'Далеко' },
      demand: { plus: 'Спрос есть', warn: 'Спрос средний', minus: 'Спрос слабый' },
      demandMonthly: { plus: 'Только помесячно', warn: 'Только помесячно', minus: 'Только помесячно' },
      money: { plus: 'Хорошо', warn: 'Средне', minus: 'Мало' },
    },
    safetyAnswer: (v: Verdict) => v.safety.permitMissing && v.safety.notStarted
      ? 'Стройка не начата, документов на строительство мы не видели'
      : v.safety.permitMissing ? 'Документов на строительство мы не видели'
      : v.safety.notStarted ? 'Стройка ещё не начата - вы платите за будущий дом'
      : v.safety.noFinishedProjects ? 'Документы есть, но сданных проектов у застройщика мы не видим'
      : 'Явных рисков в данных нет',
    safetyShort: (v: Verdict, underConstruction: boolean) => [
      underConstruction ? 'Большую часть цены вы заплатите, пока дом строят.' : null,
      v.safety.hazards.length && !v.safety.hazards.some(h => h.key !== 'earthquake' && h.level === 'high') ? 'Природных рисков вроде наводнений нет.' : null,
    ].filter(Boolean).join(' '),
    comfortAnswer: (v: Verdict) => v.comfort.airportBand === 'near' ? 'Аэропорт и основные районы рядом'
      : v.comfort.airportBand === 'far' ? 'Далеко от аэропорта - больше для жизни, чем для отпуска'
      : 'Средне по удалённости - для жизни нормально, для отпуска далековато',
    comfortShort: (v: Verdict) => v.comfort.airportMin != null ? `До аэропорта около ${v.comfort.airportMin} мин.` : '',
    demandAnswer: (v: Verdict, m: MonthlyBundle | null) => v.demand.monthlyOnly
      ? (m && m.n >= 10 ? 'Сдавать можно только надолго - и на это спрос рядом есть' : 'Сдавать можно только надолго, а похожих объявлений рядом мало')
      : v.demand.tone === 'plus' ? 'Похожие объекты рядом сдаются хорошо' : 'Спрос рядом есть, но не высокий',
    demandShort: (v: Verdict, m: MonthlyBundle | null) => v.demand.monthlyOnly
      ? `Туристам посуточно нельзя по закону: земля под жильё.${m ? ` Помесячно рядом сдают ${m.n} похожих.` : ''}`
      : '',
    moneyAnswer: (y: YieldFacts | null) => y ? `Около ${pctFmt(y.pct.beforeTax)} в год до налогов, ${pctFmt(y.pct.nonResident)} - если вы не резидент` : 'Посчитать доход по этому объекту пока не из чего',
    moneyShort: (y: YieldFacts | null, diff: number | null) => [
      y?.paybackYears ? `Вложения вернутся примерно за ${Math.round(y.paybackYears)} лет.` : null,
      diff != null && diff >= 10 ? 'Цена выше похожих рядом.' : diff != null && diff <= -5 ? 'Цена ниже похожих рядом.' : null,
    ].filter(Boolean).join(' '),
    totalLine: (v: Verdict) => {
      const earn = v.money.tone === 'minus' || v.demand.tone === 'minus' ? 'Для заработка на аренде - слабый вариант.'
        : v.money.tone === 'plus' && v.demand.tone === 'plus' ? 'Для заработка на аренде - сильный вариант.'
        : 'Для заработка на аренде - средний вариант.'
      const live = v.demand.monthlyOnly ? ' Подходит для жизни или долгой аренды.' : ''
      const docs = v.safety.tone === 'minus' ? ' Сначала проверьте документы.' : ''
      return earn + live + docs
    },
    totalWhy: (v: Verdict, diff: number | null) => [
      v.demand.monthlyOnly ? 'туристам посуточно сдавать нельзя' : null,
      diff != null && diff >= 10 ? `цена выше похожих рядом на ${Math.round(diff)}%` : null,
      v.safety.notStarted ? 'стройка ещё не началась' : null,
    ].filter(Boolean).join(', '),
    plus: {
      pool: 'Свой бассейн', smallComplex: 'Маленький комплекс - мало соседей', installments: 'Можно платить частями, пока идёт стройка',
      flat: 'Ровный участок с подъездом', cheaper: 'Дешевле похожих рядом', nearAirport: 'Близко к аэропорту', strongYield: 'Доходность выше средней',
    },
    check: {
      permit: 'Разрешение на строительство (PBG) - попросите копию', lease: 'Договор аренды земли и условия продления - у нотариуса',
      delays: 'Что будет, если стройка задержится: сроки и штрафы в договоре', zoneMonthly: 'Земля под жильё - туристам посуточно сдавать нельзя',
    },
    // Безопасность
    docs: 'Документы и стройка', permitRow: 'Разрешение на строительство', permitNo: 'не видели', permitYes: 'есть', permitUnknown: 'нет данных',
    build: 'Стройка', notStarted: 'ещё не начата', readiness: (p: number) => `готова на ${Math.round(p * 100)}%`, built: 'дом готов',
    handover: 'Сдача', payment: 'Оплата',
    docsNote: 'Почему это важно: без разрешения стройку могут остановить, а деньги к тому времени будут уже заплачены. Попросите копию разрешения (PBG) до первой оплаты.',
    landT: 'Земля', leaseRow: 'Аренда земли', leaseVal: (y: number) => `${y} лет`, extRow: 'Продление', extVal: (y: number) => `ещё ${y} лет`,
    zoneRow: 'Зона', zoneHousing: 'жёлтая - для жилья',
    landNote: 'Иностранцы на Бали покупают не землю, а право пользоваться ею на срок. Дом всё это время ваш: можно жить, сдавать, продать.',
    landNoteYellow: ' Жёлтая зона - земля под жильё: жить и сдавать надолго можно, туристам посуточно - нельзя.',
    devT: (n: string | null) => n ? `Застройщик ${n}` : 'Застройщик', devProjects: 'Проектов на Бали', devReady: 'Сданных проектов',
    devNone: 'не видим', devNote: 'Новый застройщик - не значит плохой, но опыта сдачи объектов у него пока не видно. Спросите, что они уже построили, и съездите посмотреть.',
    devNoteOk: 'Сданные проекты можно съездить посмотреть - это лучший способ оценить качество.',
    natureT: 'Природа', natureNote: 'По официальной карте рисков Индонезии (InaRISK).',
    hz: { flood: 'Наводнения', flash_flood: 'Внезапные паводки', landslide: 'Оползни', tsunami: 'Цунами', volcano: 'Вулкан', earthquake: 'Землетрясения' } as Record<string, string>,
    lvl: { none: 'нет риска', low: 'низкий риск', medium: 'средний риск', high: 'высокий риск' },
    // Спрос
    monthlyT: 'Сдают рядом помесячно', monthlyV: (n: number) => `${n} объявлений`, monthlySub: (b: number | null, km: number) => `${b != null ? `с ${b} спальнями, ` : ''}в радиусе ${km} км`,
    usualT: 'Обычная цена', perMonth: 'в месяц', usualSub: 'чаще всего от', to: 'до',
    dailyT: 'Посуточно у соседей', dailyTRestricted: 'Если бы можно было посуточно', perNight: 'за ночь',
    dailySub: (n: number, occ: number | null) => `${n} объектов на Booking${occ != null ? `, загрузка около ${Math.round(occ)}%` : ''}`,
    dailySubRestricted: 'так сдают соседи - но этому объекту нельзя',
    monthlyCards: 'Что сдают рядом помесячно', away: 'от объекта', km: 'км', br: 'сп.',
    futureT: 'А что будет дальше',
    futureBuild: (p: number) => `Конкурентов станет больше: за последние годы зданий вокруг прибавилось на ${p}%.`,
    futureData: 'Растёт спрос или падает, скажем позже: историю загрузки на Booking копим с августа 2026.',
    prev: 'Назад', next: 'Дальше', open: 'Объявление',
    // Деньги
    yTitle: (p: string) => `В среднем этот объект сейчас приносил бы ${p} в год`,
    yLeadMonthly: 'Если ничего не учитывать и просто сдавать его помесячно по средней цене соседей -',
    yLeadDaily: 'Если ничего не учитывать и сдавать посуточно по средней цене похожих соседей -',
    yLeadTail: 'Все расходы на содержание уже вычтены, налог зависит от вашего статуса:',
    yBefore: 'До налогов', yRes: 'Если вы резидент', yNon: 'Если вы не резидент', yResSub: 'налог 10% с аренды', yNonSub: 'налог 20% с аренды', yPerYear: 'в год',
    yMeans: 'Что это значит на деле:',
    yPayback: (n: number) => `вложения вернутся примерно за ${n} лет.`,
    yMultiple: (m: string, y: number) => ` За ${y} лет аренды земли объект принесёт около ${m} ваших вложений до налогов - а потом земля вернётся хозяину.`,
    yNote: 'Это средний ориентир, а не обещание. Свою цену аренды и загрузку поставьте в калькуляторе ниже.',
    yCalc: 'Открыть калькулятор',
  },
  en: {
    title: 'Is this property worth buying',
    sub: 'Four questions every first-time buyer in Bali asks. The answers come from data, not from advertising.',
    total: 'Bottom line',
    more: 'Details',
    q: { safety: 'Is it safe?', comfort: 'Is it a good place to live?', demand: 'Will there be demand?', money: 'How much will it earn?' },
    qOf: (n: number) => `Question ${n} of 4`,
    pluses: 'What is good about it',
    checks: 'What to check before the first payment',
    howCheck: 'How to check the documents - a simple guide',
    status: {
      safety: { plus: 'No visible risks', warn: 'Open questions', minus: 'Risks' },
      comfort: { plus: 'Convenient', warn: 'Quiet but far', minus: 'Far' },
      demand: { plus: 'In demand', warn: 'Moderate demand', minus: 'Weak demand' },
      demandMonthly: { plus: 'Monthly only', warn: 'Monthly only', minus: 'Monthly only' },
      money: { plus: 'Good', warn: 'Average', minus: 'Low' },
    },
    safetyAnswer: (v: Verdict) => v.safety.permitMissing && v.safety.notStarted
      ? 'Construction has not started and we have not seen a building permit'
      : v.safety.permitMissing ? 'We have not seen a building permit'
      : v.safety.notStarted ? 'Construction has not started - you pay for a future house'
      : v.safety.noFinishedProjects ? 'Documents are in place, but we see no completed projects by this developer'
      : 'No obvious risks in the data',
    safetyShort: (v: Verdict, underConstruction: boolean) => [
      underConstruction ? 'You pay most of the price while the house is being built.' : null,
      v.safety.hazards.length && !v.safety.hazards.some(h => h.key !== 'earthquake' && h.level === 'high') ? 'No natural hazards like floods.' : null,
    ].filter(Boolean).join(' '),
    comfortAnswer: (v: Verdict) => v.comfort.airportBand === 'near' ? 'Close to the airport and main areas'
      : v.comfort.airportBand === 'far' ? 'Far from the airport - better for living than for a holiday'
      : 'Average distance - fine for living, a bit far for a holiday',
    comfortShort: (v: Verdict) => v.comfort.airportMin != null ? `About ${v.comfort.airportMin} min to the airport.` : '',
    demandAnswer: (v: Verdict, m: MonthlyBundle | null) => v.demand.monthlyOnly
      ? (m && m.n >= 10 ? 'Only long-term rental is allowed - and there is demand for it nearby' : 'Only long-term rental is allowed, and few similar listings nearby')
      : v.demand.tone === 'plus' ? 'Similar places nearby rent well' : 'There is demand nearby, but not high',
    demandShort: (v: Verdict, m: MonthlyBundle | null) => v.demand.monthlyOnly
      ? `Nightly rental to tourists is not allowed: residential land.${m ? ` ${m.n} similar places nearby rent monthly.` : ''}`
      : '',
    moneyAnswer: (y: YieldFacts | null) => y ? `About ${pctFmtEn(y.pct.beforeTax)} a year before tax, ${pctFmtEn(y.pct.nonResident)} for non-residents` : 'Not enough data to estimate income yet',
    moneyShort: (y: YieldFacts | null, diff: number | null) => [
      y?.paybackYears ? `Pays back in about ${Math.round(y.paybackYears)} years.` : null,
      diff != null && diff >= 10 ? 'Priced above similar places nearby.' : diff != null && diff <= -5 ? 'Priced below similar places nearby.' : null,
    ].filter(Boolean).join(' '),
    totalLine: (v: Verdict) => {
      const earn = v.money.tone === 'minus' || v.demand.tone === 'minus' ? 'For rental income - a weak option.'
        : v.money.tone === 'plus' && v.demand.tone === 'plus' ? 'For rental income - a strong option.'
        : 'For rental income - an average option.'
      const live = v.demand.monthlyOnly ? ' Suits living or long-term rental.' : ''
      const docs = v.safety.tone === 'minus' ? ' Check the documents first.' : ''
      return earn + live + docs
    },
    totalWhy: (v: Verdict, diff: number | null) => [
      v.demand.monthlyOnly ? 'nightly rental to tourists is not allowed' : null,
      diff != null && diff >= 10 ? `priced ${Math.round(diff)}% above similar places nearby` : null,
      v.safety.notStarted ? 'construction has not started' : null,
    ].filter(Boolean).join(', '),
    plus: {
      pool: 'Private pool', smallComplex: 'Small complex - few neighbours', installments: 'Pay in instalments during construction',
      flat: 'Flat plot with road access', cheaper: 'Cheaper than similar places nearby', nearAirport: 'Close to the airport', strongYield: 'Above-average yield',
    },
    check: {
      permit: 'Building permit (PBG) - ask for a copy', lease: 'Land lease and extension terms - with a notary',
      delays: 'What happens if construction is late: deadlines and penalties in the contract', zoneMonthly: 'Residential land - no nightly rental to tourists',
    },
    docs: 'Documents and construction', permitRow: 'Building permit', permitNo: 'not seen', permitYes: 'yes', permitUnknown: 'no data',
    build: 'Construction', notStarted: 'not started', readiness: (p: number) => `${Math.round(p * 100)}% done`, built: 'house ready',
    handover: 'Handover', payment: 'Payment',
    docsNote: 'Why it matters: without a permit construction can be stopped after the money is paid. Ask for a copy of the permit (PBG) before the first payment.',
    landT: 'Land', leaseRow: 'Land lease', leaseVal: (y: number) => `${y} years`, extRow: 'Extension', extVal: (y: number) => `${y} more years`,
    zoneRow: 'Zone', zoneHousing: 'yellow - residential',
    landNote: 'Foreigners in Bali buy not the land but the right to use it for a term. The house is yours all that time: live, rent out, sell.',
    landNoteYellow: ' Yellow zone is residential land: living and long-term rental are fine, nightly rental to tourists is not.',
    devT: (n: string | null) => n ? `Developer ${n}` : 'Developer', devProjects: 'Projects in Bali', devReady: 'Completed projects',
    devNone: 'none seen', devNote: 'A new developer is not necessarily a bad one, but there is no track record of handovers yet. Ask what they have built and go and see it.',
    devNoteOk: 'You can visit their completed projects - the best way to judge quality.',
    natureT: 'Nature', natureNote: 'From Indonesia’s official hazard map (InaRISK).',
    hz: { flood: 'Floods', flash_flood: 'Flash floods', landslide: 'Landslides', tsunami: 'Tsunami', volcano: 'Volcano', earthquake: 'Earthquakes' } as Record<string, string>,
    lvl: { none: 'no risk', low: 'low risk', medium: 'medium risk', high: 'high risk' },
    monthlyT: 'Rented monthly nearby', monthlyV: (n: number) => `${n} listings`, monthlySub: (b: number | null, km: number) => `${b != null ? `${b} bedrooms, ` : ''}within ${km} km`,
    usualT: 'Typical price', perMonth: 'per month', usualSub: 'usually from', to: 'to',
    dailyT: 'Nightly at neighbours', dailyTRestricted: 'If nightly rental were allowed', perNight: 'per night',
    dailySub: (n: number, occ: number | null) => `${n} places on Booking${occ != null ? `, about ${Math.round(occ)}% booked` : ''}`,
    dailySubRestricted: 'that is what neighbours charge - not allowed here',
    monthlyCards: 'Monthly rentals nearby', away: 'away', km: 'km', br: 'BR',
    futureT: 'What comes next',
    futureBuild: (p: number) => `More competition ahead: the number of buildings around grew by ${p}% in recent years.`,
    futureData: 'Whether demand is rising or falling we will say later: we have been collecting Booking history since August 2026.',
    prev: 'Previous', next: 'Next', open: 'Listing',
    yTitle: (p: string) => `On average this property would earn ${p} a year today`,
    yLeadMonthly: 'If you simply rent it out monthly at the neighbours’ typical price -',
    yLeadDaily: 'If you simply rent it out nightly at the typical price of similar neighbours -',
    yLeadTail: 'All running costs are already deducted; tax depends on your status:',
    yBefore: 'Before tax', yRes: 'If you are a resident', yNon: 'If you are not a resident', yResSub: '10% tax on rent', yNonSub: '20% tax on rent', yPerYear: 'a year',
    yMeans: 'What it means in practice:',
    yPayback: (n: number) => `the money comes back in about ${n} years.`,
    yMultiple: (m: string, y: number) => ` Over the ${y}-year land lease it earns about ${m} of what you put in, before tax - then the land returns to its owner.`,
    yNote: 'An average guide, not a promise. Put your own rent and occupancy into the calculator below.',
    yCalc: 'Open the calculator',
  },
}

export type QuestionHeader = { n: number; kicker: string; title: string; status: string; tone: Tone; lead: string }

/** Заголовок раздела-вопроса: номер, вопрос, метка и короткий ответ. */
export function questionHeaders(v: Verdict, y: YieldFacts | null, m: MonthlyBundle | null, saleDiff: number | null, underConstruction: boolean, lang: Lang) {
  const c = pickCopy(COPY, lang)
  const demandStatus = v.demand.monthlyOnly ? c.status.demandMonthly : c.status.demand
  return {
    safety: { n: 1, kicker: c.qOf(1), title: c.q.safety, status: c.status.safety[v.safety.tone], tone: v.safety.tone, lead: [c.safetyAnswer(v), c.safetyShort(v, underConstruction)].filter(Boolean).join('. ').replace(/\.\./g, '.') },
    comfort: { n: 2, kicker: c.qOf(2), title: c.q.comfort, status: c.status.comfort[v.comfort.tone], tone: v.comfort.tone, lead: [c.comfortAnswer(v), c.comfortShort(v)].filter(Boolean).join('. ').replace(/\.\./g, '.') },
    demand: { n: 3, kicker: c.qOf(3), title: c.q.demand, status: demandStatus[v.demand.tone], tone: v.demand.tone, lead: [c.demandAnswer(v, m), c.demandShort(v, m)].filter(Boolean).join('. ').replace(/\.\./g, '.') },
    money: { n: 4, kicker: c.qOf(4), title: c.q.money, status: c.status.money[v.money.tone], tone: v.money.tone, lead: [c.moneyAnswer(y), c.moneyShort(y, saleDiff)].filter(Boolean).join('. ').replace(/\.\./g, '.') },
  } satisfies Record<string, QuestionHeader>
}

export const TONE_PILL_CLASS = TONE_PILL

export function ToneDot({ tone }: { tone: Tone }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${tone === 'plus' ? 'bg-[var(--color-primary)]' : tone === 'warn' ? 'bg-[#C77700]' : 'bg-[#C0392B]'}`} aria-hidden />
}

export function ListingVerdict({ verdict: v, yields: y, monthly, saleDiff, underConstruction, anchors, lang }: {
  verdict: Verdict
  yields: YieldFacts | null
  monthly: MonthlyBundle | null
  saleDiff: number | null
  underConstruction: boolean
  anchors: { safety: string; comfort: string; demand: string; money: string }
  lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const why = c.totalWhy(v, saleDiff)
  const cards = [
    { key: 'safety' as const, n: 1, q: c.q.safety, tone: v.safety.tone, status: c.status.safety[v.safety.tone], answer: c.safetyAnswer(v), short: c.safetyShort(v, underConstruction) },
    { key: 'comfort' as const, n: 2, q: c.q.comfort, tone: v.comfort.tone, status: c.status.comfort[v.comfort.tone], answer: c.comfortAnswer(v), short: c.comfortShort(v) },
    { key: 'demand' as const, n: 3, q: c.q.demand, tone: v.demand.tone, status: (v.demand.monthlyOnly ? c.status.demandMonthly : c.status.demand)[v.demand.tone], answer: c.demandAnswer(v, monthly), short: c.demandShort(v, monthly) },
    { key: 'money' as const, n: 4, q: c.q.money, tone: v.money.tone, status: c.status.money[v.money.tone], answer: c.moneyAnswer(y), short: c.moneyShort(y, saleDiff) },
  ]
  return (
    <section className="mb-16" aria-labelledby="verdict-title">
      <h2 id="verdict-title" className="text-[28px] md:text-[36px] font-semibold tracking-tight leading-tight text-[var(--color-text)]">{c.title}</h2>
      <p className="mt-3 text-[16px] md:text-[18px] leading-relaxed text-[var(--color-text-muted)] max-w-[68ch]">{c.sub}</p>

      <div className="mt-8 rounded-2xl bg-[var(--color-text)] text-white p-6 md:p-8">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-[#A8D5BE]">{c.total}</div>
        <p className="mt-3 text-[20px] md:text-[26px] font-semibold leading-snug tracking-tight max-w-[52ch]">{c.totalLine(v)}</p>
        {why && <p className="mt-3 text-[15px] md:text-[16px] leading-relaxed text-[#C9D3CE] max-w-[72ch]">{why[0].toUpperCase() + why.slice(1)}.</p>}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {cards.map(card => (
          <a key={card.key} href={`#${anchors[card.key]}`}
            className="group flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-7 transition-colors duration-[120ms] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
            <span className="flex items-center justify-between gap-3">
              <span className="text-[15px] font-semibold text-[var(--color-text-muted)]">{card.n}. {card.q}</span>
              <span className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold ${TONE_PILL[card.tone]}`}>{card.status}</span>
            </span>
            <span className="text-[19px] md:text-[22px] font-semibold leading-snug tracking-tight text-[var(--color-text)]">{card.answer}</span>
            {card.short && <span className="text-[15px] md:text-[16px] leading-relaxed text-[var(--color-text-muted)]">{card.short}</span>}
            <span className="mt-auto pt-1 text-[15px] font-medium text-[var(--color-primary-pressed)] underline underline-offset-4 decoration-[var(--color-primary)]/30 group-hover:decoration-current">{c.more} ↓</span>
          </a>
        ))}
      </div>

      {(v.pluses.length >= 2 || v.checks.length > 0) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {v.pluses.length >= 2 && (
            <div className="rounded-2xl bg-[var(--color-primary-soft)] p-5 md:p-7">
              <h3 className="text-[18px] md:text-[20px] font-semibold text-[var(--color-text)]">{c.pluses}</h3>
              <ul className="mt-4 list-disc pl-5 flex flex-col gap-2 text-[16px] leading-relaxed text-[var(--color-text)]">
                {v.pluses.map(p => <li key={p}>{c.plus[p]}</li>)}
              </ul>
            </div>
          )}
          {v.checks.length > 0 && (
            <div className="rounded-2xl bg-[#FDF4E7] p-5 md:p-7">
              <h3 className="text-[18px] md:text-[20px] font-semibold text-[var(--color-text)]">{c.checks}</h3>
              <ol className="mt-4 list-decimal pl-5 flex flex-col gap-2 text-[16px] leading-relaxed text-[var(--color-text)]">
                {v.checks.map(k => <li key={k}>{c.check[k]}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Rows({ rows }: { rows: { k: string; v: ReactNode; tone?: Tone }[] }) {
  return (
    <dl className="flex flex-col gap-3">
      {rows.map(r => (
        <div key={r.k} className="flex justify-between gap-4 border-b border-[var(--color-border)] pb-2 text-[15px]">
          <dt className="text-[var(--color-text-muted)]">{r.k}</dt>
          <dd className={`shrink-0 whitespace-nowrap font-semibold text-right ${r.tone ? TONE_TEXT[r.tone] : 'text-[var(--color-text)]'}`}>{r.v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Card({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6 flex flex-col gap-4">
      <h3 className="text-[17px] md:text-[18px] font-semibold text-[var(--color-text)]">{title}</h3>
      {children}
      {note && <p className="text-[14px] md:text-[15px] leading-relaxed text-[var(--color-text-muted)]">{note}</p>}
    </div>
  )
}

export function SafetyCards({ verdict: v, permit, status, yearRaw, complex, leaseYears, landYellow, dev, lang }: {
  verdict: Verdict
  permit: string | null
  status: string | null
  yearRaw: string | null
  complex: ComplexFacts | null
  leaseYears: number | null
  landYellow: boolean
  dev: { name: string | null; total: number; ready: number } | null
  lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const permitTone: Tone | undefined = v.safety.permitMissing ? 'minus' : undefined
  const permitVal = v.safety.permitMissing ? c.permitNo : permit ? c.permitYes : c.permitUnknown
  const built = !!status && /построен|сдан|готов|complet/i.test(status)
  const buildVal = built ? c.built : v.safety.notStarted ? c.notStarted : complex?.readiness != null ? c.readiness(complex.readiness) : status
  const docsRows = [
    { k: c.permitRow, v: permitVal, tone: permitTone },
    buildVal ? { k: c.build, v: buildVal, tone: v.safety.notStarted ? ('minus' as Tone) : undefined } : null,
    yearRaw && !built ? { k: c.handover, v: yearRaw } : null,
    complex?.paymentPlan ? { k: c.payment, v: complex.paymentPlan } : null,
  ].filter(Boolean) as { k: string; v: ReactNode; tone?: Tone }[]
  const landRows = [
    leaseYears != null ? { k: c.leaseRow, v: c.leaseVal(leaseYears) } : null,
    complex?.leaseExtension ? { k: c.extRow, v: c.extVal(complex.leaseExtension) } : null,
    landYellow ? { k: c.zoneRow, v: c.zoneHousing } : null,
  ].filter(Boolean) as { k: string; v: ReactNode }[]
  const hz = v.safety.hazards.filter(h => h.key !== 'flash_flood')
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title={c.docs} note={v.safety.permitMissing || v.safety.notStarted ? c.docsNote : undefined}><Rows rows={docsRows} /></Card>
      {landRows.length > 0 && <Card title={c.landT} note={c.landNote + (landYellow ? c.landNoteYellow : '')}><Rows rows={landRows} /></Card>}
      {dev && dev.total > 0 && (
        <Card title={c.devT(dev.name)} note={dev.ready === 0 ? c.devNote : c.devNoteOk}>
          <Rows rows={[
            { k: c.devProjects, v: String(dev.total) },
            { k: c.devReady, v: dev.ready > 0 ? String(dev.ready) : c.devNone, tone: dev.ready === 0 ? 'minus' : undefined },
          ]} />
        </Card>
      )}
      {hz.length > 0 && (
        <Card title={c.natureT} note={c.natureNote}>
          <Rows rows={hz.map(h => ({ k: c.hz[h.key], v: c.lvl[h.level], tone: h.level === 'none' || h.level === 'low' ? ('plus' as Tone) : h.level === 'high' ? ('minus' as Tone) : undefined }))} />
        </Card>
      )}
    </div>
  )
}

export function DemandSummary({ verdict: v, monthly: m, bedrooms, daily, lang }: {
  verdict: Verdict
  monthly: MonthlyBundle | null
  bedrooms: number | null
  daily: { count: number; adrUsd: number | null; occupancyPct: number | null } | null
  lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const tile = 'rounded-2xl p-5 md:p-6 flex flex-col gap-2'
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {m && (
          <div className={`${tile} bg-[var(--color-primary-soft)]`}>
            <span className="text-[14px] font-semibold text-[var(--color-primary-pressed)]">{c.monthlyT}</span>
            <span className="text-[28px] md:text-[32px] font-semibold tracking-tight text-[var(--color-text)]">{c.monthlyV(m.n)}</span>
            <span className="text-[15px] text-[var(--color-text-muted)]">{c.monthlySub(m.bedroomsRelaxed ? null : bedrooms, m.radiusKm)}</span>
          </div>
        )}
        {m && (
          <div className={`${tile} bg-[var(--color-search-bg)]`}>
            <span className="text-[14px] font-semibold text-[var(--color-text-muted)]">{c.usualT}</span>
            <span className="text-[28px] md:text-[32px] font-semibold tracking-tight text-[var(--color-text)]"><InlinePrice usd={m.p50} lang={lang} /> <span className="text-[15px] font-medium text-[var(--color-text-muted)]">{c.perMonth}</span></span>
            <span className="text-[15px] text-[var(--color-text-muted)]">{c.usualSub} <InlinePrice usd={m.p25} lang={lang} /> {c.to} <InlinePrice usd={m.p75} lang={lang} /></span>
          </div>
        )}
        {daily?.adrUsd != null && daily.count > 0 && (
          <div className={`${tile} bg-[var(--color-search-bg)]`}>
            <span className="text-[14px] font-semibold text-[var(--color-text-muted)]">{v.demand.monthlyOnly ? c.dailyTRestricted : c.dailyT}</span>
            <span className="text-[28px] md:text-[32px] font-semibold tracking-tight text-[var(--color-text)]"><InlinePrice usd={daily.adrUsd} lang={lang} /> <span className="text-[15px] font-medium text-[var(--color-text-muted)]">{c.perNight}</span></span>
            <span className="text-[15px] text-[var(--color-text-muted)]">{v.demand.monthlyOnly ? c.dailySubRestricted : c.dailySub(daily.count, daily.occupancyPct)}</span>
          </div>
        )}
      </div>

      {m && m.comps.length > 0 && (
        <div>
          <h3 className="mb-4 text-[18px] md:text-[20px] font-semibold text-[var(--color-text)]">{c.monthlyCards}</h3>
          <CardRail prevLabel={c.prev} nextLabel={c.next}>
            {m.comps.map(comp => (
              <a key={`${comp.url}-${comp.rentMonthUsd}`} href={comp.url ?? undefined} target="_blank" rel="nofollow noopener noreferrer"
                className="flex h-full flex-col gap-1 rounded-2xl border border-[var(--color-border)] bg-white p-5 transition-colors duration-[120ms] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
                <span className="text-[20px] font-semibold text-[var(--color-text)]"><InlinePrice usd={comp.rentMonthUsd} lang={lang} /> <span className="text-[14px] font-medium text-[var(--color-text-muted)]">{c.perMonth}</span></span>
                <span className="text-[15px] font-medium leading-snug text-[var(--color-text)] line-clamp-2">{comp.title}</span>
                <span className="text-[14px] text-[var(--color-text-muted)]">
                  {[comp.bedrooms != null ? `${comp.bedrooms} ${c.br}` : null, comp.buildingM2 ? `${comp.buildingM2} м²` : null, comp.district, `${comp.distanceKm.toFixed(1)} ${c.km}`].filter(Boolean).join(' · ')}
                </span>
              </a>
            ))}
          </CardRail>
        </div>
      )}

      {v.buildingsGrowthPct != null && v.buildingsGrowthPct > 0 && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 md:p-6">
          <h3 className="text-[17px] md:text-[18px] font-semibold text-[var(--color-text)]">{c.futureT}</h3>
          <ul className="mt-3 list-disc pl-5 flex flex-col gap-2 text-[15px] md:text-[16px] leading-relaxed text-[var(--color-text)]">
            <li>{c.futureBuild(v.buildingsGrowthPct)}</li>
            <li>{c.futureData}</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export function YieldSummary({ yields: y, leaseYears, calcAnchor, lang }: { yields: YieldFacts; leaseYears: number | null; calcAnchor: string; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const fmt = lang === 'ru' || lang === 'uk' ? pctFmt : pctFmtEn
  const mult = y.leaseMultiple != null ? (lang === 'ru' || lang === 'uk' ? y.leaseMultiple.toFixed(1).replace('.', ',') : y.leaseMultiple.toFixed(1)) : null
  return (
    <div className="rounded-2xl border border-[var(--color-primary)] bg-white p-5 md:p-7 flex flex-col gap-4">
      <p className="text-[22px] md:text-[28px] font-semibold leading-snug tracking-tight text-[var(--color-text)] max-w-[40ch]">{c.yTitle(fmt(y.pct.beforeTax))}</p>
      <p className="text-[15px] md:text-[16px] leading-relaxed text-[var(--color-text-muted)] max-w-[72ch]">
        {y.mode === 'monthly' ? c.yLeadMonthly : c.yLeadDaily} <InlinePrice usd={y.rateUsd} lang={lang} /> {y.mode === 'monthly' ? c.perMonth : c.perNight}. {c.yLeadTail}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-[var(--color-primary-soft)] px-5 py-4 flex flex-col gap-1">
          <span className="text-[14px] font-semibold text-[var(--color-primary-pressed)]">{c.yBefore}</span>
          <span className="text-[28px] md:text-[32px] font-semibold text-[var(--color-text)]">{fmt(y.pct.beforeTax)}</span>
          <span className="text-[14px] text-[var(--color-text-muted)]">≈ <InlinePrice usd={y.noiBeforeTaxUsd} lang={lang} /> {c.yPerYear}</span>
        </div>
        <div className="rounded-xl bg-[var(--color-search-bg)] px-5 py-4 flex flex-col gap-1">
          <span className="text-[14px] font-semibold text-[var(--color-text-muted)]">{c.yRes}</span>
          <span className="text-[28px] md:text-[32px] font-semibold text-[var(--color-text)]">{fmt(y.pct.resident)}</span>
          <span className="text-[14px] text-[var(--color-text-muted)]">{c.yResSub}</span>
        </div>
        <div className="rounded-xl bg-[var(--color-search-bg)] px-5 py-4 flex flex-col gap-1">
          <span className="text-[14px] font-semibold text-[var(--color-text-muted)]">{c.yNon}</span>
          <span className="text-[28px] md:text-[32px] font-semibold text-[var(--color-text)]">{fmt(y.pct.nonResident)}</span>
          <span className="text-[14px] text-[var(--color-text-muted)]">{c.yNonSub}</span>
        </div>
      </div>
      {y.paybackYears != null && (
        <p className="text-[15px] md:text-[16px] leading-relaxed text-[var(--color-text)] max-w-[72ch]">
          <b className="font-semibold">{c.yMeans}</b> {c.yPayback(Math.round(y.paybackYears))}
          {mult && leaseYears != null ? c.yMultiple(mult, leaseYears) : ''}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[14px] text-[var(--color-text-muted)] max-w-[60ch]">{c.yNote}</span>
        <a href={`#${calcAnchor}`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--color-primary)] px-5 text-[15px] font-medium text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">{c.yCalc} ↓</a>
      </div>
    </div>
  )
}
