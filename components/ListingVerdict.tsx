// Страница объекта для новичка: «Стоит ли брать» и четыре раздела-вопроса
// (безопасно → удобно → спрос → деньги). Выводы — lib/listing-verdict.ts.
// Тексты пока RU + EN; остальные языки берут английский до перевода.
import type { ReactNode } from 'react'
import { DemandTabs } from './DemandTabs'
import { BookingCompCard } from './BookingCompCard'
import { InfoTip } from './InfoTip'
import { pickCopy, type Lang } from '@/lib/i18n'
import { districtRu } from '@/lib/district-ru'
import { permitOk, type Verdict, type Tone, type YieldFacts, type ComplexFacts, type YieldScenarios, type ScenarioRow } from '@/lib/listing-verdict'
import type { MonthlyBundle } from '@/lib/investment/monthly'
import type { InvestmentSnapshot, NearbyMatchCard } from '@/lib/investment/snapshot'
import { NightReceiptBlock } from './NightReceiptBlock'
import { BandedRail } from './BandedRail'
import { BAND_SURFACE, BAND_TEXT, type Band } from '@/lib/band-colors'
import { nightReceipt, monthReceipt, monthlyNetAt } from '@/lib/investment/night-economics'
import type { AirbnbComp } from '@/lib/airbnb-nearby'
import { InlinePrice } from './InlinePrice'
import { CardRail } from './CardRail'
import { VerifiedYieldBadge } from './VerifiedYieldBadge'
import { pluralRu } from '@/lib/plural-ru'

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

// «Для жизни удобно, но бывает шумно» / «Для жизни есть минусы: далеко до школы».
function livingLine(v: Verdict, line: Record<Tone, string>, but: string, minus: Record<string, string>): string {
  const ms = (v.comfort.living?.minuses ?? []).map(k => minus[k]).filter(Boolean)
  if (!ms.length) return line[v.comfort.tone]
  return v.comfort.tone === 'plus' ? `${line.plus}, ${but} ${ms.join(', ')}` : `${line[v.comfort.tone]}: ${ms.join(', ')}`
}

const yearsRu = (n: number) => `${n} ${pluralRu(n, ['год', 'года', 'лет'])}`
const en = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const pctFmt = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`
const pctFmtEn = (x: number) => `${(x * 100).toFixed(1)}%`
// «Проверьте документы» в итоге: разрешения или срока аренды нет в данных,
// стройка не начата или по безопасности уже красный флаг.
const docsFirst = (v: Verdict) => v.safety.tone === 'minus' || !permitOk(v.safety.permit) || v.safety.leaseUnknown || v.safety.notStarted

const COPY = {
  ru: {
    title: 'Стоит ли брать этот объект',
    sub: 'Четыре главных вопроса покупателя. Ответы - из данных, не из рекламы.',
    titleLive: 'Подходит ли для жизни',
    subLive: 'Два вопроса для тех, кто покупает для себя. Ответы - из данных, не из рекламы.',
    docsFirst: 'Сначала проверьте документы.',
    total: 'Итог',
    more: 'Подробнее',
    q: { safety: 'Безопасно ли это?', comfort: 'Удобно ли там жить?', demand: 'Будет ли спрос?', money: 'Сколько принесёт?' },
    qShort: { safety: 'Безопасность', comfort: 'Удобство', demand: 'Спрос', money: 'Доход' },
    qOf: (n: number) => `Вопрос ${n} из 4`,
    pluses: 'Чем хорош',
    checks: 'Что проверить до оплаты',
    howCheck: 'Как проверить документы',
    status: {
      safety: { plus: 'Рисков не видно', warn: 'Есть вопросы', minus: 'Есть риски' },
      comfort: { plus: 'Удобно', warn: 'Тихо, но далеко', minus: 'Далеко' },
      comfortLiving: { plus: 'Удобно', warn: 'Есть минусы', minus: 'Неудобно' },
      demand: { plus: 'Спрос есть', warn: 'Спрос средний', minus: 'Спрос слабый' },
      demandMonthly: { plus: 'Только помесячно', warn: 'Только помесячно', minus: 'Только помесячно' },
      money: { plus: 'Хорошо', warn: 'Средне', minus: 'Мало' },
    },
    safetyAnswer: (v: Verdict) => !permitOk(v.safety.permit) && v.safety.notStarted
      ? 'Стройка не начата, а разрешения на неё мы не видели'
      : v.safety.notStarted ? 'Стройка не начата - вы платите за будущий дом'
      : v.safety.permit === 'unknown' ? 'Нет данных о разрешении - запросите PBG у застройщика'
      : v.safety.permit === 'pbgApplied' ? 'Разрешения на стройку (PBG) пока нет - подана только заявка'
      : v.safety.permit === 'slfApplied' ? 'Дом ещё не принят в эксплуатацию - на SLF подана только заявка'
      : v.safety.leaseUnknown ? 'Нет данных о сроке аренды земли - уточните у застройщика'
      : v.safety.noFinishedProjects ? 'Сданных проектов у застройщика мы не видим'
      : 'Явных рисков в данных нет',
    safetyShort: (v: Verdict, underConstruction: boolean) => [
      underConstruction ? 'Большую часть цены вы заплатите до сдачи дома.' : null,
      v.safety.hazards.length && !v.safety.hazards.some(h => h.key !== 'earthquake' && h.level === 'high') ? 'Наводнений и оползней нет.' : null,
    ].filter(Boolean).join(' '),
    // Есть расчёт «для жизни» — ответ по школе, пляжу, врачам, магазину и тишине.
    comfortAnswer: (v: Verdict) => v.comfort.living
      ? livingLine(v, { plus: 'Для жизни удобно', warn: 'Для жизни есть минусы', minus: 'Для жизни неудобно' }, 'но', { school: 'далеко до школы', beach: 'далеко до пляжа', health: 'далеко до клиники', shop: 'далеко до магазина', cafes: 'мало кафе', quiet: 'бывает шумно', quietMinus: 'шумно', volcano: 'близко вулкан' })
      : v.comfort.airportBand === 'near' ? 'Аэропорт и главные районы рядом'
      : v.comfort.airportBand === 'far' ? 'Далеко - больше для жизни, чем для отпуска'
      : 'Для жизни удобно, для отпуска далековато',
    comfortShort: (v: Verdict) => !v.comfort.living && v.comfort.airportMin != null ? `До аэропорта около ${v.comfort.airportMin} мин.` : '',
    demandAnswer: (v: Verdict, m: MonthlyBundle | null) => v.demand.monthlyOnly
      ? (m && m.n >= 10 ? 'Сдавать можно только надолго - спрос на это есть' : 'Сдавать можно только надолго, а таких предложений рядом мало')
      : v.demand.ownOccupancy != null ? (v.demand.tone === 'plus' ? 'Этот комплекс уже хорошо сдаётся на Booking' : 'Комплекс сдаётся на Booking, но занят не полностью')
      : v.demand.tone === 'plus' ? 'Похожие объекты рядом сдаются хорошо' : 'Спрос есть, но не высокий',
    demandShort: (v: Verdict, m: MonthlyBundle | null) => v.demand.monthlyOnly
      ? `Туристам посуточно нельзя: земля под жильё.${m ? ` Надолго рядом сдают ${m.n} ${pluralRu(m.n, ['похожий объект', 'похожих объекта', 'похожих объектов'])}.` : ''}`
      : v.demand.ownOccupancy != null ? `Занят примерно ${Math.round(v.demand.ownOccupancy * 100)}% ночей.`
      : '',
    moneyAnswer: (y: YieldFacts | null) => y ? `Около ${pctFmt(y.pct.beforeTax)} в год до налогов, ${pctFmt(y.pct.nonResident)} - если вы не резидент` : 'Посчитать доход пока не из чего',
    // Сравнение цены с виллами на продаже рядом убрано: это разные объекты
    // (решение владельца 16.10.2026). Второй аргумент оставлен для совместимости.
    moneyShort: (y: YieldFacts | null, _diff: number | null) =>
      y?.paybackYears ? `Вложения вернутся примерно за ${yearsRu(Math.round(y.paybackYears))}.` : '',
    totalLine: (v: Verdict) => {
      const earn = v.money.tone === 'minus' || v.demand.tone === 'minus' ? 'Для заработка на аренде - слабый вариант.'
        : v.money.tone === 'plus' && v.demand.tone === 'plus' ? 'Для заработка на аренде - сильный вариант.'
        : 'Для заработка на аренде - средний вариант.'
      const live = v.demand.monthlyOnly ? ' Подходит для жизни или долгой аренды.' : ''
      // Сильный по доходу, но документы не подтверждены — без безусловного «сильный».
      if (docsFirst(v) && v.money.tone === 'plus' && v.demand.tone === 'plus') return 'Для заработка на аренде - сильный вариант, но сначала проверьте документы.' + live
      const docs = docsFirst(v) ? ' Сначала проверьте документы.' : ''
      return earn + live + docs
    },
    totalWhy: (v: Verdict, diff: number | null) => [
      v.demand.monthlyOnly ? 'туристам посуточно сдавать нельзя' : null,
      diff != null && diff >= 10 ? `дороже похожих вилл на продаже рядом на ${Math.round(diff)}% - за м² с учётом срока аренды земли` : null,
      v.safety.notStarted ? 'стройка ещё не началась' : null,
    ].filter(Boolean).join(', '),
    plus: {
      pool: 'Свой бассейн', smallComplex: 'Маленький комплекс - мало соседей', installments: 'Можно платить частями во время стройки',
      flat: 'Ровный участок с подъездом', cheaper: 'Дешевле похожих вилл на продаже рядом', nearAirport: 'Близко к аэропорту', strongYield: 'Доходность выше средней',
    },
    check: {
      permit: 'Разрешение на стройку (PBG) - попросите копию', lease: 'Договор аренды земли и продление - у нотариуса',
      delays: 'Сроки сдачи и штрафы за задержку - в договоре', zoneMonthly: 'Земля под жильё - посуточно сдавать нельзя',
    },
    // Безопасность
    docs: 'Документы и стройка', permitRow: 'Разрешение на стройку', slfRow: 'Ввод в эксплуатацию (SLF)', permitApplied: 'только заявка', permitYes: 'есть', permitUnknown: 'нет данных',
    build: 'Стройка', notStarted: 'не начата', readiness: (p: number) => `готова на ${Math.round(p * 100)}%`, built: 'дом готов',
    handover: 'Сдача', payment: 'Оплата',
    docsNote: 'Без разрешения стройку могут остановить, а деньги уже будут уплачены. Попросите копию разрешения (PBG) до оплаты.',
    docsNoteUnknown: 'Мы не знаем, есть ли у проекта разрешение. Попросите копию PBG до оплаты и проверьте номер на simbg.pu.go.id.',
    docsNoteSlf: 'Без SLF дом нельзя легально сдавать. Спросите, когда его выдадут, и попросите копию.',
    landT: 'Земля', leaseRow: 'Аренда земли', leaseVal: (y: number) => yearsRu(y), extRow: 'Продление', extVal: (y: number) => `ещё ${yearsRu(y)}`,
    zoneRow: 'Зона', zoneHousing: 'жёлтая, для жилья',
    landNote: 'Иностранцы покупают не землю, а право пользоваться ею на срок. Дом всё это время ваш: можно жить, сдавать, продать.',
    landNoteYellow: ' Жёлтая зона - для жилья: жить и сдавать надолго можно, посуточно - нельзя.',
    devT: (n: string | null) => n ? `Застройщик ${n}` : 'Застройщик', devProjects: 'Проектов на Бали', devReady: 'Сданных проектов',
    devNone: 'не видим', devOf: (r: number, t: number) => `${r} из ${t}`, floodSlide: 'Наводнения, оползни',
    airportChip: (m: number) => `${m} мин до аэропорта`, neighboursChip: 'Соседи на Booking', yResShort: 'Резидент', yNonShort: 'Нерезидент',
    devNote: 'Сданных объектов у застройщика пока нет. Спросите, что они уже построили, и съездите посмотреть.',
    devNoteOk: 'Съездите посмотреть сданные проекты - так проще всего оценить качество.',
    natureT: 'Природа', natureNote: 'По официальной карте рисков Индонезии (InaRISK).',
    hz: { flood: 'Наводнения', flash_flood: 'Внезапные паводки', landslide: 'Оползни', tsunami: 'Цунами', volcano: 'Вулкан', earthquake: 'Землетрясения' } as Record<string, string>,
    lvl: { none: 'нет риска', low: 'низкий риск', medium: 'средний риск', high: 'высокий риск' },
    // Спрос
    monthlyT: 'Сдают рядом помесячно', monthlyV: (n: number) => `${n} ${pluralRu(n, ['объявление', 'объявления', 'объявлений'])}`,
    monthlySub: (b: number | null, km: number) => `${b != null ? `с ${b} ${pluralRu(b, ['спальней', 'спальнями', 'спальнями'])}, ` : ''}в радиусе ${km} км`,
    usualT: 'Обычная цена', perMonth: 'в месяц', usualSub: 'чаще всего от', to: 'до',
    dailyT: 'Посуточно у соседей', dailyTRestricted: 'Посуточно у соседей', perNight: 'за ночь',
    dailySub: (n: number, occ: number | null) => `${n} ${pluralRu(n, ['объект', 'объекта', 'объектов'])} на Booking${occ != null ? `, загрузка около ${Math.round(occ)}%` : ''}`,
    dailySubRestricted: 'этому объекту так сдавать нельзя',
    monthlyCards: 'Что сдают рядом помесячно', away: 'от объекта', km: 'км', br: 'сп.', studio: 'студия',
    monthlyH: 'Сдают помесячно в этом районе',
    tabMonthly: 'Помесячно', tabDaily: 'Посуточно', tabSale: 'Продажа рядом', tabsLabel: 'Что сдают и продают рядом',
    dailyH: 'Сдают посуточно в этом районе',
    occNote: 'Загрузка — по estatemarket.io: доля ночей за месяц, когда этот вариант нельзя было забронировать (бронь или закрыл хозяин); у объекта — средняя по его вариантам.',
    airbnbLine: (n: number) => `На Airbnb рядом ${n} ${pluralRu(n, ['похожий объект', 'похожих объекта', 'похожих объектов'])}`,
    airbnbNote: 'Цена на Airbnb — сколько гость платит за ночь вместе со сборами при брони на 5 ночей. Оценка на Booking — из 10, на Airbnb — из 5. Airbnb сдвигает точку на карте, поэтому расстояние до его объектов примерное.',
    approx: 'около',
    infoLabel: 'Откуда эти цифры',
    dailyHRestricted: 'Посуточно у соседей - этому объекту так сдавать нельзя',
    whoLine: (b: number | null, km: number) => `${b != null ? `${b} ${pluralRu(b, ['спальня', 'спальни', 'спален'])}` : 'Похожие объекты'} в радиусе ${String(km).replace('.', ',')} км`,
    whoDistrict: (b: number | null, d: string, km: number) => `${b != null ? `${b} ${pluralRu(b, ['спальня', 'спальни', 'спален'])}` : 'Похожие объекты'} - район ${d} и радиус ${String(km).replace('.', ',')} км`,
    avg: 'в среднем', range: 'обычно от', from: 'от', occ: (p: number) => `занято около ${p}% ночей`,
    futureT: '', futureBuild: (p: number) => `${p}`, futureData: '',
    prev: 'Назад', next: 'Дальше', open: 'Объявление',
    // Деньги
    yTitle: (p: string) => `В среднем объект приносил бы ${p} в год`,
    yLeadMonthly: 'Если сдавать помесячно по средней цене соседей -',
    yLeadDaily: 'Если сдавать посуточно с загрузкой, как у похожих объявлений вокруг, и по цене, как у соседей и объектов такой стоимости, -',
    yLeadOwn: 'Если сдавать посуточно, как сейчас сдаётся этот комплекс на Booking -',
    yLeadActual: (m: number, own: boolean) => `Если сдавать посуточно с той загрузкой, что была у этого комплекса по реальным броням за ${m} ${pluralRu(m, ['месяц', 'месяца', 'месяцев'])}, и по ${own ? 'его цене на Booking' : 'цене похожих соседей'} -`,
    yLeadRevenue: (m: number) => `Если сдавать посуточно так, как этот комплекс сдавался по отчёту управляющей за ${m} ${pluralRu(m, ['месяц', 'месяца', 'месяцев'])}, - цена на витрине около`,
    yLeadTail: 'Расходы уже вычтены. Налог зависит от статуса:',
    yBefore: 'До налогов', yRes: 'Резидент', yNon: 'Нерезидент', yResSub: 'налог 10% с аренды', yNonSub: 'налог 20% с аренды', yPerYear: 'в год',
    yMeans: 'На деле:',
    yPayback: (n: number) => `вложения вернутся примерно за ${yearsRu(n)}.`,
    yMultiple: (m: string, y: number) => ` За ${yearsRu(y)} аренды земли объект вернёт около ${m} вложений до налогов, потом земля уходит хозяину.`,
    yNote: 'Это ориентир, не обещание. Свою цену и загрузку поставьте в калькуляторе.',
    yCalc: 'Открыть калькулятор',
  },
  en: {
    title: 'Is this property worth buying',
    sub: 'Four questions every first-time buyer in Bali asks. The answers come from data, not from advertising.',
    titleLive: 'Is it good to live in',
    subLive: 'Two questions for those buying for themselves. The answers come from data, not from advertising.',
    docsFirst: 'Check the documents first.',
    total: 'Bottom line',
    more: 'Details',
    q: { safety: 'Is it safe?', comfort: 'Is it a good place to live?', demand: 'Will there be demand?', money: 'How much will it earn?' },
    qShort: { safety: 'Safety', comfort: 'Comfort', demand: 'Demand', money: 'Income' },
    qOf: (n: number) => `Question ${n} of 4`,
    pluses: 'What is good about it',
    checks: 'What to check before the first payment',
    howCheck: 'How to check the documents - a simple guide',
    status: {
      safety: { plus: 'No visible risks', warn: 'Open questions', minus: 'Risks' },
      comfort: { plus: 'Convenient', warn: 'Quiet but far', minus: 'Far' },
      comfortLiving: { plus: 'Convenient', warn: 'Has drawbacks', minus: 'Inconvenient' },
      demand: { plus: 'In demand', warn: 'Moderate demand', minus: 'Weak demand' },
      demandMonthly: { plus: 'Monthly only', warn: 'Monthly only', minus: 'Monthly only' },
      money: { plus: 'Good', warn: 'Average', minus: 'Low' },
    },
    safetyAnswer: (v: Verdict) => !permitOk(v.safety.permit) && v.safety.notStarted
      ? 'Construction has not started and we have not seen a building permit'
      : v.safety.notStarted ? 'Construction has not started - you pay for a future house'
      : v.safety.permit === 'unknown' ? 'No data on the building permit - ask the developer for the PBG'
      : v.safety.permit === 'pbgApplied' ? 'No building permit (PBG) yet - only an application'
      : v.safety.permit === 'slfApplied' ? 'The building is not certified for use yet - only an SLF application'
      : v.safety.leaseUnknown ? 'No data on the land lease term - ask the developer'
      : v.safety.noFinishedProjects ? 'We see no completed projects by this developer yet'
      : 'No obvious risks in the data',
    safetyShort: (v: Verdict, underConstruction: boolean) => [
      underConstruction ? 'You pay most of the price while the house is being built.' : null,
      v.safety.hazards.length && !v.safety.hazards.some(h => h.key !== 'earthquake' && h.level === 'high') ? 'No natural hazards like floods.' : null,
    ].filter(Boolean).join(' '),
    comfortAnswer: (v: Verdict) => v.comfort.living
      ? livingLine(v, { plus: 'Comfortable to live in', warn: 'Liveable, with drawbacks', minus: 'Inconvenient to live in' }, 'but', { school: 'school is far', beach: 'beach is far', health: 'clinic is far', shop: 'grocery is far', cafes: 'few cafés', quiet: 'can be noisy', quietMinus: 'noisy', volcano: 'volcano nearby' })
      : v.comfort.airportBand === 'near' ? 'Close to the airport and main areas'
      : v.comfort.airportBand === 'far' ? 'Far from the airport - better for living than for a holiday'
      : 'Average distance - fine for living, a bit far for a holiday',
    comfortShort: (v: Verdict) => !v.comfort.living && v.comfort.airportMin != null ? `About ${v.comfort.airportMin} min to the airport.` : '',
    demandAnswer: (v: Verdict, m: MonthlyBundle | null) => v.demand.monthlyOnly
      ? (m && m.n >= 10 ? 'Only long-term rental is allowed - and there is demand for it nearby' : 'Only long-term rental is allowed, and few similar listings nearby')
      : v.demand.ownOccupancy != null ? (v.demand.tone === 'plus' ? 'This complex already rents well on Booking' : 'The complex rents on Booking but is not fully booked')
      : v.demand.tone === 'plus' ? 'Similar places nearby rent well' : 'There is demand nearby, but not high',
    demandShort: (v: Verdict, m: MonthlyBundle | null) => v.demand.monthlyOnly
      ? `Nightly rental to tourists is not allowed: residential land.${m ? ` ${m.n} similar places nearby rent monthly.` : ''}`
      : v.demand.ownOccupancy != null ? `Booked about ${Math.round(v.demand.ownOccupancy * 100)}% of nights.`
      : '',
    moneyAnswer: (y: YieldFacts | null) => y ? `About ${pctFmtEn(y.pct.beforeTax)} a year before tax, ${pctFmtEn(y.pct.nonResident)} for non-residents` : 'Not enough data to estimate income yet',
    moneyShort: (y: YieldFacts | null, _diff: number | null) =>
      y?.paybackYears ? `Pays back in about ${en(Math.round(y.paybackYears), 'year', 'years')}.` : '',
    totalLine: (v: Verdict) => {
      const earn = v.money.tone === 'minus' || v.demand.tone === 'minus' ? 'For rental income - a weak option.'
        : v.money.tone === 'plus' && v.demand.tone === 'plus' ? 'For rental income - a strong option.'
        : 'For rental income - an average option.'
      const live = v.demand.monthlyOnly ? ' Suits living or long-term rental.' : ''
      if (docsFirst(v) && v.money.tone === 'plus' && v.demand.tone === 'plus') return 'For rental income - a strong option, but check the documents first.' + live
      const docs = docsFirst(v) ? ' Check the documents first.' : ''
      return earn + live + docs
    },
    totalWhy: (v: Verdict, diff: number | null) => [
      v.demand.monthlyOnly ? 'nightly rental to tourists is not allowed' : null,
      diff != null && diff >= 10 ? `${Math.round(diff)}% pricier than similar villas for sale nearby - per m², adjusted for the land lease term` : null,
      v.safety.notStarted ? 'construction has not started' : null,
    ].filter(Boolean).join(', '),
    plus: {
      pool: 'Private pool', smallComplex: 'Small complex - few neighbours', installments: 'Pay in instalments during construction',
      flat: 'Flat plot with road access', cheaper: 'Cheaper than similar villas for sale nearby', nearAirport: 'Close to the airport', strongYield: 'Above-average yield',
    },
    check: {
      permit: 'Building permit (PBG) - ask for a copy', lease: 'Land lease and extension terms - with a notary',
      delays: 'What happens if construction is late: deadlines and penalties in the contract', zoneMonthly: 'Residential land - no nightly rental to tourists',
    },
    docs: 'Documents and construction', permitRow: 'Building permit', slfRow: 'Occupancy certificate (SLF)', permitApplied: 'application only', permitYes: 'yes', permitUnknown: 'no data',
    build: 'Construction', notStarted: 'not started', readiness: (p: number) => `${Math.round(p * 100)}% done`, built: 'house ready',
    handover: 'Handover', payment: 'Payment',
    docsNote: 'Why it matters: without a permit construction can be stopped after the money is paid. Ask for a copy of the permit (PBG) before the first payment.',
    docsNoteUnknown: 'We do not know whether the project has a permit. Ask for a copy of the PBG before paying and check its number on simbg.pu.go.id.',
    docsNoteSlf: 'Without an SLF the building cannot be legally rented out. Ask when it will be issued and request a copy.',
    landT: 'Land', leaseRow: 'Land lease', leaseVal: (y: number) => en(y, 'year', 'years'), extRow: 'Extension', extVal: (y: number) => `${en(y, 'more year', 'more years')}`,
    zoneRow: 'Zone', zoneHousing: 'yellow - residential',
    landNote: 'Foreigners in Bali buy not the land but the right to use it for a term. The house is yours all that time: live, rent out, sell.',
    landNoteYellow: ' Yellow zone is residential land: living and long-term rental are fine, nightly rental to tourists is not.',
    devT: (n: string | null) => n ? `Developer ${n}` : 'Developer', devProjects: 'Projects in Bali', devReady: 'Completed projects',
    devNone: 'none seen', devOf: (r: number, t: number) => `${r} of ${t}`, floodSlide: 'Floods, landslides',
    airportChip: (m: number) => `${m} min to the airport`, neighboursChip: 'Neighbours on Booking', yResShort: 'Resident', yNonShort: 'Non-resident', devNote: 'A new developer is not necessarily a bad one, but there is no track record of handovers yet. Ask what they have built and go and see it.',
    devNoteOk: 'You can visit their completed projects - the best way to judge quality.',
    natureT: 'Nature', natureNote: 'From Indonesia’s official hazard map (InaRISK).',
    hz: { flood: 'Floods', flash_flood: 'Flash floods', landslide: 'Landslides', tsunami: 'Tsunami', volcano: 'Volcano', earthquake: 'Earthquakes' } as Record<string, string>,
    lvl: { none: 'no risk', low: 'low risk', medium: 'medium risk', high: 'high risk' },
    monthlyT: 'Rented monthly nearby', monthlyV: (n: number) => en(n, 'listing', 'listings'), monthlySub: (b: number | null, km: number) => `${b != null ? `${en(b, 'bedroom', 'bedrooms')}, ` : ''}within ${km} km`,
    usualT: 'Typical price', perMonth: 'per month', usualSub: 'usually from', to: 'to',
    dailyT: 'Nightly at neighbours', dailyTRestricted: 'If nightly rental were allowed', perNight: 'per night',
    dailySub: (n: number, occ: number | null) => `${en(n, 'place', 'places')} on Booking${occ != null ? `, about ${Math.round(occ)}% booked` : ''}`,
    dailySubRestricted: 'that is what neighbours charge - not allowed here',
    monthlyCards: 'Monthly rentals nearby', away: 'away', km: 'km', br: 'BR', studio: 'studio',
    monthlyH: 'Rented monthly in this area',
    tabMonthly: 'Monthly', tabDaily: 'Nightly', tabSale: 'For sale nearby', tabsLabel: 'Rentals and sales nearby',
    dailyH: 'Rented nightly in this area',
    occNote: 'Occupancy is from estatemarket.io: share of nights in a month this option could not be booked (booked or closed by the owner); for the property, the average across its options.',
    airbnbLine: (n: number) => `On Airbnb nearby: ${en(n, 'similar place', 'similar places')}`,
    airbnbNote: 'Airbnb price is what a guest pays per night including fees, for a 5-night stay. Booking rates guests out of 10, Airbnb out of 5. Airbnb shifts map pins, so distances to its listings are approximate.',
    approx: '~',
    infoLabel: 'Where these numbers come from',
    dailyHRestricted: 'Nightly at neighbours - not allowed for this property',
    whoLine: (b: number | null, km: number) => `${b != null ? en(b, 'bedroom', 'bedrooms') : 'Similar places'} within ${km} km`,
    whoDistrict: (b: number | null, d: string, km: number) => `${b != null ? en(b, 'bedroom', 'bedrooms') : 'Similar places'} in ${d} and within ${km} km`,
    avg: 'typically', range: 'usually from', from: 'from', occ: (p: number) => `about ${p}% of nights booked`,
    futureT: 'What comes next',
    futureBuild: (p: number) => `More competition ahead: the number of buildings around grew by ${p}% in recent years.`,
    futureData: 'Whether demand is rising or falling we will say later: we have been collecting Booking history since August 2026.',
    prev: 'Previous', next: 'Next', open: 'Listing',
    yTitle: (p: string) => `On average this property would earn ${p} a year today`,
    yLeadMonthly: 'If you simply rent it out monthly at the neighbours’ typical price -',
    yLeadDaily: 'If you rent it out nightly at the occupancy of similar listings around and a rate in line with neighbours and properties at this price -',
    yLeadOwn: 'If you rent it out nightly the way this complex rents on Booking now -',
    yLeadActual: (m: number, own: boolean) => `If you rent it out nightly at this complex’s occupancy from real bookings over ${m} months and ${own ? 'its Booking rate' : 'the rate of similar neighbours'} -`,
    yLeadRevenue: (m: number) => `If you rent it out nightly the way this complex did in its manager’s report over ${m} months - listed rate about`,
    yLeadTail: 'All running costs are already deducted; tax depends on your status:',
    yBefore: 'Before tax', yRes: 'If you are a resident', yNon: 'If you are not a resident', yResSub: '10% tax on rent', yNonSub: '20% tax on rent', yPerYear: 'a year',
    yMeans: 'What it means in practice:',
    yPayback: (n: number) => `the money comes back in about ${en(n, 'year', 'years')}.`,
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
    safety: { n: 1, kicker: c.qOf(1), title: c.q.safety, status: c.status.safety[v.safety.tone], tone: v.safety.tone, // Риски природы и прочее — в списке раздела, в ответе не повторяем.
      lead: `${c.safetyAnswer(v)}.` },
    comfort: { n: 2, kicker: c.qOf(2), title: c.q.comfort, status: (v.comfort.living ? c.status.comfortLiving : c.status.comfort)[v.comfort.tone], tone: v.comfort.tone, lead: [c.comfortAnswer(v), c.comfortShort(v)].filter(Boolean).join('. ').replace(/\.\./g, '.') },
    demand: { n: 3, kicker: c.qOf(3), title: c.q.demand, status: demandStatus[v.demand.tone], tone: v.demand.tone, lead: [c.demandAnswer(v, m), c.demandShort(v, m)].filter(Boolean).join('. ').replace(/\.\./g, '.') },
    money: { n: 4, kicker: c.qOf(4), title: c.q.money, status: c.status.money[v.money.tone], tone: v.money.tone, lead: [c.moneyAnswer(y), c.moneyShort(y, saleDiff)].filter(Boolean).join('. ').replace(/\.\./g, '.') },
  } satisfies Record<string, QuestionHeader>
}

export const TONE_PILL_CLASS = TONE_PILL

export function ToneDot({ tone }: { tone: Tone }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${tone === 'plus' ? 'bg-[var(--color-primary)]' : tone === 'warn' ? 'bg-[#C77700]' : 'bg-[#C0392B]'}`} aria-hidden />
}

const SEG_COLOR: Record<Tone, string> = { minus: 'bg-[#C0392B]', warn: 'bg-[#D08A1C]', plus: 'bg-[var(--color-primary)]' }
function Steps({ tone }: { tone: Tone }) {
  const on = { minus: 0, warn: 1, plus: 2 }[tone]
  const tones: Tone[] = ['minus', 'warn', 'plus']
  return (
    <span className="grid grid-cols-3 gap-1" aria-hidden>
      {tones.map((t, i) => <span key={t} className={`h-1.5 rounded-full ${i === on ? SEG_COLOR[t] : 'bg-[var(--color-border)]'}`} />)}
    </span>
  )
}

export function ListingVerdict({ verdict: v, yields: y, monthly, saleDiff, underConstruction, anchors, lang, mode = 'income' }: {
  /** 'live' — для покупки «для себя»: только безопасность и удобство, итог по удобству. */
  mode?: 'income' | 'live'
  verdict: Verdict
  yields: YieldFacts | null
  monthly: MonthlyBundle | null
  saleDiff: number | null
  underConstruction: boolean
  anchors: { safety: string; comfort: string; demand: string; money: string }
  lat: number | null
  lng: number | null
  neighbourPhotos: string[]
  dev: { total: number; ready: number } | null
  lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const live = mode === 'live'
  const cards = [
    { key: 'safety' as const, q: c.q.safety, tone: v.safety.tone, status: c.status.safety[v.safety.tone], answer: c.safetyAnswer(v), short: c.safetyShort(v, underConstruction) },
    { key: 'comfort' as const, q: c.q.comfort, tone: v.comfort.tone, status: (v.comfort.living ? c.status.comfortLiving : c.status.comfort)[v.comfort.tone], answer: c.comfortAnswer(v), short: c.comfortShort(v) },
    { key: 'demand' as const, q: c.q.demand, tone: v.demand.tone, status: (v.demand.monthlyOnly ? c.status.demandMonthly : c.status.demand)[v.demand.tone], answer: c.demandAnswer(v, monthly), short: c.demandShort(v, monthly) },
    { key: 'money' as const, q: c.q.money, tone: v.money.tone, status: c.status.money[v.money.tone], answer: c.moneyAnswer(y), short: c.moneyShort(y, saleDiff) },
  ].filter(card => !live || card.key === 'safety' || card.key === 'comfort')

  return (
    <section className="mb-16" aria-labelledby={live ? 'verdict-title-live' : 'verdict-title'}>
      {/* Заголовок только для экранных дикторов: на экране — сразу вывод. */}
      <h2 id={live ? 'verdict-title-live' : 'verdict-title'} className="sr-only">{live ? c.titleLive : c.title}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 lg:gap-10 items-center rounded-[20px] bg-[var(--color-surface-alt)] p-6 md:p-8">
        <div>
          <p className="text-[20px] md:text-[26px] font-semibold leading-snug tracking-tight text-[var(--color-text)]">{live ? `${c.comfortAnswer(v)}.${docsFirst(v) ? ` ${c.docsFirst}` : ''}` : c.totalLine(v)}</p>
        </div>
        <ul className="flex flex-col gap-3">
          {cards.map(card => (
            <li key={card.key}>
              <a href={`#${anchors[card.key]}`} className="bx-auth-link flex flex-col gap-1.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)]">
                <span className="flex justify-between gap-3 text-[14px]">
                  <span className="text-[var(--color-text-muted)]">{c.qShort[card.key]}</span>
                  <span className={`font-semibold ${TONE_TEXT[card.tone]}`}>{card.status}</span>
                </span>
                <Steps tone={card.tone} />
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Большие карточки с ответами убраны: тот же ответ и та же картинка — в
          заголовке и начале каждого раздела ниже, шкала выше ведёт туда. */}

      {((!live && v.pluses.length >= 2) || v.checks.length > 0) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {!live && v.pluses.length >= 2 && (
            <div className="rounded-[20px] bg-[var(--color-primary-soft)] p-5 md:p-7">
              <h3 className="text-[18px] font-semibold text-[var(--color-text)]">{c.pluses}</h3>
              <ul className="mt-3 list-disc pl-5 flex flex-col gap-1.5 text-[16px] leading-relaxed text-[var(--color-text)] marker:text-[var(--color-primary)]">
                {v.pluses.map(p => <li key={p}>{c.plus[p]}</li>)}
              </ul>
            </div>
          )}
          {v.checks.length > 0 && (
            <div className="rounded-[20px] bg-[#FDF4E7] p-5 md:p-7">
              <h3 className="text-[18px] font-semibold text-[var(--color-text)]">{c.checks}</h3>
              <ol className="mt-3 list-decimal pl-5 flex flex-col gap-1.5 text-[16px] leading-relaxed text-[var(--color-text)] marker:font-semibold marker:text-[#8A4B00]">
                {v.checks.map(k => <li key={k}>{c.check[k]}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/** «Что проверить до оплаты» — в правой колонке «Безопасно ли это?» под участком
 *  (макет «Безопасно ли это?», B — владелец 23.10.2026): закрывает пустоту справа. */
export function SafetyChecks({ verdict: v, lang }: { verdict: Verdict; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  if (!v.checks.length) return null
  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-white p-5 md:p-6">
      <h3 className="text-[16px] font-semibold text-[var(--color-text)]">{c.checks}</h3>
      <ol className="mt-3 list-decimal pl-5 flex flex-col gap-1.5 text-[15px] leading-relaxed text-[var(--color-text)] marker:font-semibold marker:text-[#8A4B00]">
        {v.checks.map(k => <li key={k}>{c.check[k]}</li>)}
      </ol>
    </div>
  )
}

// «Безопасно ли это?» одним списком: документы, стройка, земля, застройщик,
// природа, подъезд и уклон — строка на пункт с цветной точкой. Подсказка — только
// где нужно действие (что спросить у застройщика), без вводных абзацев.
type Plot = NonNullable<import('@/lib/complex-access').Climate['plot']>
const DOT: Record<Tone, string> = { plus: 'bg-[var(--color-primary)]', warn: 'bg-[#D08A1C]', minus: 'bg-[#C0392B]' }

export function SafetyCards({ verdict: v, status, yearRaw, complex, leaseYears, landYellow, dev, plot, coast, lang }: {
  verdict: Verdict
  permit: string | null
  status: string | null
  yearRaw: string | null
  complex: ComplexFacts | null
  leaseYears: number | null
  landYellow: boolean
  dev: { name: string | null; total: number; ready: number } | null
  /** Подъезд и уклон участка (listing_geo_facts.climate.plot). */
  plot?: Plot | null
  /** Высота над морем и океан (climate.sea / coast_m) — раньше в блоке «Район и берег» (убран 23.10.2026). */
  coast?: { coastM: number | null; elevationM: number | null; marginM: number | null } | null
  lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const ru = lang === 'ru' || lang === 'uk'
  const p = v.safety.permit
  const built = !!status && /построен|сдан|готов|complet/i.test(status)
  const buildVal = built ? c.built : v.safety.notStarted ? c.notStarted : complex?.readiness != null ? c.readiness(complex.readiness) : status
  const docsNote = v.safety.notStarted || p === 'pbgApplied' ? c.docsNote : p === 'unknown' ? c.docsNoteUnknown : p === 'slfApplied' ? c.docsNoteSlf : undefined
  const m = (x: number) => (x < 1000 ? `${Math.round(x / 10) * 10 || x} ${ru ? 'м' : 'm'}` : `${(x / 1000).toFixed(1).replace('.', ru ? ',' : '.')} ${ru ? 'км' : 'km'}`)

  type Row = { k: string; v: ReactNode; tone: Tone | null; note?: string }
  const rows: Row[] = []
  rows.push({ k: p === 'slf' || p === 'slfApplied' ? c.slfRow : c.permitRow, v: permitOk(p) ? c.permitYes : p === 'unknown' ? c.permitUnknown : c.permitApplied, tone: permitOk(p) ? 'plus' : 'warn', note: docsNote })
  if (buildVal) rows.push({ k: c.build, v: [buildVal, yearRaw && !built ? `${c.handover.toLowerCase()} ${yearRaw}` : null].filter(Boolean).join(', '), tone: v.safety.notStarted ? 'minus' : built ? 'plus' : null })
  if (complex?.paymentPlan) rows.push({ k: c.payment, v: complex.paymentPlan, tone: null })
  rows.push(leaseYears != null
    ? { k: c.leaseRow, v: [c.leaseVal(leaseYears), complex?.leaseExtension ? `${c.extRow.toLowerCase()} ${c.extVal(complex.leaseExtension)}` : null].filter(Boolean).join(', '), tone: leaseYears >= 25 ? 'plus' : 'warn' }
    : { k: c.leaseRow, v: c.permitUnknown, tone: 'warn' })
  if (landYellow) rows.push({ k: c.zoneRow, v: c.zoneHousing, tone: 'warn' })
  if (dev && dev.total > 0) rows.push({ k: c.devT(dev.name), v: ru ? `сдано ${dev.ready} из ${dev.total} ${pluralRu(dev.total, ['проекта', 'проектов', 'проектов'])}` : `${dev.ready} of ${dev.total} projects completed`, tone: dev.ready === 0 ? 'minus' : 'plus' })
  // Высота и океан — прямо над риском цунами и наводнений: конкретика к нему.
  if (coast && coast.elevationM != null) {
    const h = Math.round(coast.elevationM)
    const nearSea = coast.marginM != null
    const lvl = coast.marginM == null ? null : coast.marginM >= 8 ? 'high' : coast.marginM >= 3 ? 'mid' : 'low'
    rows.push({
      k: nearSea ? (ru ? 'Высота и океан' : 'Elevation and ocean') : (ru ? 'Высота над морем' : 'Elevation'),
      v: [ru ? `участок на ${h} м над морем` : `plot ${h} m above sea level`, nearSea && coast.coastM != null ? (ru ? `${m(coast.coastM)} до океана` : `${m(coast.coastM)} to the ocean`) : null].filter(Boolean).join(', ').replace(/^./, x => x.toUpperCase()),
      tone: lvl === 'low' ? 'minus' : lvl === 'mid' ? 'warn' : 'plus',
      note: lvl == null ? undefined : ru
        ? { high: 'Запас от самой высокой воды до 2050 года большой.', mid: 'Запас от самой высокой воды до 2050 года небольшой.', low: 'Участок низкий - спросите застройщика о защите от воды.' }[lvl]
        : { high: 'A large margin above the highest water expected by 2050.', mid: 'A small margin above the highest water expected by 2050.', low: 'A low plot - ask the developer about flood protection.' }[lvl],
    })
  }
  const hz = v.safety.hazards.filter(h => h.key !== 'flash_flood')
  if (hz.length) {
    const bad = hz.filter(h => h.level === 'medium' || h.level === 'high')
    const none = hz.filter(h => h.level === 'none' || h.level === 'low').map(h => c.hz[h.key].toLowerCase())
    rows.push({
      k: c.natureT,
      v: [bad.map(h => `${c.hz[h.key].toLowerCase()} - ${c.lvl[h.level]}`).join(', '), none.length ? `${ru ? 'нет риска' : 'no risk'}: ${none.join(', ')}` : null].filter(Boolean).join('; '),
      // Землетрясения — средний риск по всему Бали, это не минус конкретного участка.
      tone: bad.some(h => h.key !== 'earthquake') ? (bad.some(h => h.level === 'high' && h.key !== 'earthquake') ? 'minus' : 'warn') : 'plus',
    })
  }
  if (plot) {
    const r = plot.road
    const paved = r.surface ? (['asphalt', 'concrete', 'paved', 'paving_stones'].includes(r.surface) ? (ru ? 'асфальт' : 'paved') : (ru ? 'без асфальта' : 'unpaved')) : null
    const narrow = (r.width_m != null && r.width_m < 3.5) || r.class === 'track'
    rows.push({ k: ru ? 'Подъезд' : 'Access', v: [`${ru ? 'улица в' : 'road'} ${m(r.m)}`, paved, r.width_m ? `${ru ? 'ширина' : 'width'} ${r.width_m} ${ru ? 'м' : 'm'}` : null].filter(Boolean).join(', '),
      tone: r.m > 100 || narrow ? 'warn' : 'plus',
      note: r.m > 100 ? (ru ? 'Уточните, как заезжать на участок.' : 'Ask how cars reach the plot.') : narrow ? (ru ? 'Узкая дорога: грузовик и машины гостей могут не проехать.' : 'Narrow road: trucks and guests’ cars may not get through.') : undefined })
    if (plot.slope_pct != null) {
      const s2 = plot.slope_pct
      rows.push({ k: ru ? 'Уклон' : 'Slope', v: `${s2 < 5 ? (ru ? 'ровный' : 'flat') : s2 < 15 ? (ru ? 'пологий' : 'gentle') : (ru ? 'крутой' : 'steep')}, ${Math.round(s2)}%`, tone: s2 < 15 ? 'plus' : 'warn' })
    }
    const water = Math.min(plot.river_m, plot.stream_m)
    if (water <= 100) rows.push({ k: ru ? 'Река или ручей' : 'River or stream', v: m(water), tone: 'warn', note: ru ? 'Спросите, заливало ли участок в сезон дождей.' : 'Ask whether the plot floods in the rainy season.' })
  }

  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-white px-5 md:px-6">
      <dl className="divide-y divide-[var(--color-border)]">
        {rows.map(r => (
          <div key={r.k} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6">
            <dt className="flex items-center gap-2 text-[15px] text-[var(--color-text-muted)]">
              <span className={`h-2 w-2 shrink-0 rounded-full ${r.tone ? DOT[r.tone] : 'bg-[var(--color-border)]'}`} aria-hidden />
              {r.k}
            </dt>
            <dd className="text-[16px] text-[var(--color-text)]">
              {r.v}
              {r.note && <span className="mt-0.5 block text-[14px] leading-snug text-[var(--color-text-muted)]">{r.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="pb-4 pt-1 text-[12px] text-[var(--color-text-muted)]">{ru ? 'Риски - InaRISK, дороги - OpenStreetMap, уклон и уровень моря - Copernicus' : 'Hazards - InaRISK, roads - OpenStreetMap, slope and sea level - Copernicus'}</p>
    </div>
  )
}

// Квартили цены по объявлениям: «в среднем» — середина (медиана), «обычно» — от 25% до 75%.
function quartiles(xs: number[]): { p25: number; p50: number; p75: number } | null {
  const a = xs.filter(x => Number.isFinite(x) && x > 0).sort((x, y) => x - y)
  if (a.length < 3) return null
  const q = (p: number) => a[Math.min(a.length - 1, Math.floor((a.length - 1) * p))]
  return { p25: q(0.25), p50: q(0.5), p75: q(0.75) }
}

// «Будет ли спрос?»: что сдают рядом помесячно и посуточно — одной строкой цены
// и карточками объявлений с фото, без отдельных плиток с теми же цифрами.
/** Название варианта у соседа: из нашей базы Booking, иначе имя карточки
 *  (когда у неё отдельно указан комплекс, имя - это и есть вариант). */
function variant(comp: NearbyMatchCard): string | null {
  return comp.facts?.roomType ?? (comp.complex ? comp.name : null)
}

/** Площадь из старого манифеста конкурентов — без проверки по типу
 *  варианта (её делает migrations/127), поэтому отсекаем явную ошибку
 *  хозяина вроде «вилла 9 м²» (100 кв. футов). */
function plausibleArea(m2: number | null): number | null {
  return m2 != null && m2 >= 20 ? m2 : null
}

// Зоны цен соседей (владелец 23.10.2026): дешёвая четверть / середина /
// дорогая четверть, и сколько на руки в месяц, если сдавать по такой цене.
const BANDS_COPY = {
  ru: {
    heading: 'Что будет, если сдавать как соседи',
    bad: 'Плохо: сдавать как дешёвые',
    mid: 'Средне: как большинство',
    good: 'Хорошо: как дорогие',
    upTo: 'до', from: 'от',
    moneyBad: (x: ReactNode) => <>Вам на руки до {x} в месяц</>,
    moneyMid: (x: ReactNode) => <>Около {x} в месяц</>,
    moneyGood: (x: ReactNode) => <>От {x} в месяц</>,
    tag: { bad: 'Плохо', mid: 'Средне', good: 'Хорошо' } as Record<Band, string>,
    loss: 'В минус',
    allLoss: (be: ReactNode, unit: 'night' | 'month') => <>Даже по цене дорогих соседей вложенное за срок лизхолда не вернётся: для этого нужно сдавать от {be} {unit === 'night' ? 'за ночь' : 'в месяц'}.</>,
  },
  en: {
    heading: 'What if you rent like the neighbours',
    bad: 'Poor: priced like the cheap ones',
    mid: 'Typical: like most',
    good: 'Good: like the pricey ones',
    upTo: 'up to', from: 'from',
    moneyBad: (x: ReactNode) => <>Up to {x} a month in hand</>,
    moneyMid: (x: ReactNode) => <>About {x} a month</>,
    moneyGood: (x: ReactNode) => <>From {x} a month</>,
    tag: { bad: 'Poor', mid: 'Typical', good: 'Good' } as Record<Band, string>,
    loss: 'At a loss',
    allLoss: (be: ReactNode, unit: 'night' | 'month') => <>Even at the pricier neighbours’ rate the investment does not pay back within the leasehold: that takes from {be} a {unit}.</>,
  },
}

export function DemandSummary({ verdict: v, monthly: m, bedrooms, daily, dailyComps = [], airbnbComps = [], sale, snap, lang }: {
  verdict: Verdict
  monthly: MonthlyBundle | null
  bedrooms: number | null
  daily: { count: number; adrUsd: number | null; occupancyPct: number | null } | null
  /** Похожие объекты на Booking (снимок калькулятора) — карточки с фото. */
  dailyComps?: NearbyMatchCard[]
  /** Соседи на Airbnb с тем же числом спален (lib/airbnb-nearby.ts) — в той же ленте. */
  airbnbComps?: AirbnbComp[]
  /** Лента «Продаются в этом районе» — третьей вкладкой. */
  sale?: ReactNode
  /** Снимок калькулятора — для чеков ночи и месяца и зон соседей (владелец 23.10.2026). */
  snap?: InvestmentSnapshot | null
  lang: Lang
}) {
  const c = pickCopy(COPY, lang)
  const receipt = snap ? nightReceipt(snap) : null
  const mReceipt = snap ? monthReceipt(snap) : null
  const dec = (x: number) => (lang === 'en' || lang === 'zh' ? x.toFixed(1) : x.toFixed(1).replace('.', ','))
  const cardCls = 'flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white transition-colors duration-[120ms] hover:border-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]'
  const dq = quartiles(dailyComps.map(x => x.adr))
  const dailyKm = dailyComps.length ? Math.max(...dailyComps.map(x => x.distanceKm)) : null
  const tabs: { key: string; label: string; content: ReactNode }[] = []
  const aq = quartiles(airbnbComps.map(x => x.priceUsd))
  const hasOcc = dailyComps.some(x => x.facts?.roomOcc != null || x.facts?.occ != null)
  if (dailyComps.length > 0 || airbnbComps.length > 0) tabs.push({ key: 'daily', label: c.tabDaily, content: (
        // Всё содержимое вкладки — одной карточкой (макет «Будет ли спрос → Посуточно», A).
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 md:p-6">
          {v.demand.monthlyOnly && <p className="mb-2 text-[15px] font-medium text-[var(--color-text)]">{c.dailyHRestricted}</p>}
          {/* Сводка слева, пояснение «откуда цифры» — под значком i справа (владелец 22.10.2026). */}
          <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
          {dq && (
            <p className="text-[16px] text-[var(--color-text)]">
              {c.whoLine(dailyComps.every(x => x.bedrooms === bedrooms) ? bedrooms : null, dailyKm != null ? Math.max(1, Math.ceil(dailyKm)) : 2)}: {c.avg} <span className="whitespace-nowrap"><InlinePrice usd={dq.p50} lang={lang} /></span> {c.perNight}, {c.range} <span className="whitespace-nowrap"><InlinePrice usd={dq.p25} lang={lang} approx={false} /></span> {c.to} <span className="whitespace-nowrap"><InlinePrice usd={dq.p75} lang={lang} approx={false} /></span>.
            </p>
          )}
          {!dq && dailyComps.length > 0 && (
            // Меньше трёх соседей — без «в среднем», просто цены как есть.
            <p className="text-[16px] text-[var(--color-text)]">
              {c.whoLine(dailyComps.every(x => x.bedrooms === bedrooms) ? bedrooms : null, dailyKm != null ? Math.max(1, Math.ceil(dailyKm)) : 2)}: {(() => {
                const ps = dailyComps.map(x => x.adr).filter(x => x > 0).sort((a, b) => a - b)
                return ps.length > 1 && ps[0] !== ps[ps.length - 1]
                  ? <>{c.from} <span className="whitespace-nowrap"><InlinePrice usd={ps[0]} lang={lang} approx={false} /></span> {c.to} <span className="whitespace-nowrap"><InlinePrice usd={ps[ps.length - 1]} lang={lang} approx={false} /></span> {c.perNight}</>
                  : <span className="whitespace-nowrap"><InlinePrice usd={ps[0]} lang={lang} /> {c.perNight}</span>
              })()}.
            </p>
          )}
          {airbnbComps.length > 0 && (
            // Airbnb отдельной строкой: его цена со сборами, в «обычно» Booking не смешиваем.
            <p className="text-[16px] text-[var(--color-text)]">
              {c.airbnbLine(airbnbComps.length)}{aq ? <>: {c.avg} <span className="whitespace-nowrap"><InlinePrice usd={aq.p50} lang={lang} /></span> {c.perNight}</> : ''}.
            </p>
          )}
          </div>
          {(hasOcc || airbnbComps.length > 0) && (
            <InfoTip label={c.infoLabel}>
              {[hasOcc ? c.occNote : '', airbnbComps.length > 0 ? c.airbnbNote : ''].filter(Boolean).join(' ')}
            </InfoTip>
          )}
          </div>
          {receipt && <div className="mb-6 border-b border-[var(--color-border)] pb-6"><NightReceiptBlock r={receipt} marketMedian={dq?.p50 ?? null} lang={lang} /></div>}
          {/* Booking и Airbnb одной лентой, от дорогих к дешёвым (владелец 21.10.2026). */}
          {(() => {
            const all = [
              ...[...dailyComps].sort((a, b) => b.adr - a.adr).slice(0, 12).map(comp => ({ price: comp.adr, node: (t?: { tone: Band; toneLabel: string }) => (
              <BookingCompCard
                key={`b-${comp.id}`}
                source="booking"
                rating={comp.facts?.score ?? comp.rating ?? null}
                reviews={comp.facts?.reviewCount ?? comp.reviews ?? null}
                href={comp.url}
                photo={comp.facts?.roomPhoto ?? comp.photo}
                fallbackPhoto={comp.photo}
                priceUsd={comp.adr}
                name={comp.complex ?? comp.name}
                variant={variant(comp)}
                bedrooms={comp.bedrooms}
                areaSqm={comp.facts ? comp.facts.roomArea : plausibleArea(comp.area)}
                distance={`${dec(comp.distanceKm)} ${c.km}`}
                mix={comp.facts}
                variantOcc={comp.facts?.roomOcc ?? null}
                propertyOcc={comp.facts?.occ ?? null}
                lang={lang}
                {...t}
              />
              ) })),
              ...airbnbComps.map(comp => ({ price: comp.priceUsd, node: (t?: { tone: Band; toneLabel: string }) => (
              <BookingCompCard
                key={`a-${comp.id}`}
                source="airbnb"
                rating={comp.rating}
                reviews={comp.reviews}
                href={comp.url}
                photo={comp.photo}
                priceUsd={comp.priceUsd}
                name={comp.name}
                variant={null}
                bedrooms={comp.bedrooms}
                areaSqm={null}
                distance={`${c.approx} ${dec(comp.distanceKm)} ${c.km}`}
                lang={lang}
                {...t}
              />
              ) })),
            ].sort((a, b) => b.price - a.price)
            // Зоны — только когда соседей хватает на четверти и считается чек.
            const bq = receipt ? quartiles(all.map(x => x.price)) : null
            if (!bq || !snap) return (
              <CardRail prevLabel={c.prev} nextLabel={c.next}>{all.map(x => x.node(undefined))}</CardRail>
            )
            const b = pickCopy(BANDS_COPY, lang)
            const P = (usd: number) => <span className="whitespace-nowrap"><InlinePrice usd={usd} lang={lang} approx={false} /></span>
            const band = (p: number): Band => p < bq.p25 ? 'bad' : p > bq.p75 ? 'good' : 'mid'
            const month = (p: number) => monthlyNetAt(snap, p) ?? 0
            return (
              <BandedRail heading={b.heading} prevLabel={c.prev} nextLabel={c.next}
                note={receipt?.breakeven != null && bq.p75 < receipt.breakeven ? b.allLoss(P(receipt.breakeven), 'night') : undefined}
                chips={[
                  { band: 'bad', title: b.bad, range: <>{b.upTo} {P(bq.p25)}</>, money: b.moneyBad(P(month(bq.p25))) },
                  { band: 'mid', title: b.mid, range: <>{P(bq.p25)} – {P(bq.p75)}</>, money: b.moneyMid(P(month(bq.p50))) },
                  { band: 'good', title: b.good, range: <>{b.from} {P(bq.p75)}</>, money: b.moneyGood(P(month(bq.p75))) },
                ]}
                items={all.map(x => {
                  const t = band(x.price)
                  const loss = receipt?.breakeven != null && x.price < receipt.breakeven
                  return { band: t, node: x.node({ tone: loss ? 'bad' : t, toneLabel: loss ? b.loss : b.tag[t] }) }
                })} />
            )
          })()}
        </div>
  ) })
  if (m && m.comps.length > 0) tabs.push({ key: 'monthly', label: c.tabMonthly, content: (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 md:p-6">
          <p className="mb-4 text-[16px] text-[var(--color-text)]">
            {m.ownN && m.ownDistrict ? c.whoDistrict(m.bedroomsRelaxed ? null : bedrooms, lang === 'ru' ? (districtRu(m.ownDistrict) ?? m.ownDistrict) : m.ownDistrict, m.radiusKm) : c.whoLine(m.bedroomsRelaxed ? null : bedrooms, m.radiusKm)}: {c.avg} <span className="whitespace-nowrap"><InlinePrice usd={m.p50} lang={lang} /></span> {c.perMonth}, {c.range} <span className="whitespace-nowrap"><InlinePrice usd={m.p25} lang={lang} approx={false} /></span> {c.to} <span className="whitespace-nowrap"><InlinePrice usd={m.p75} lang={lang} approx={false} /></span>.
          </p>
          {mReceipt && <div className="mb-6 border-b border-[var(--color-border)] pb-6"><NightReceiptBlock r={mReceipt} marketMedian={m.p50} lang={lang} /></div>}
          {(() => {
            // Зоны — те же, что посуточно: дешёвая четверть, середина, дорогая четверть.
            const card = (comp: typeof m.comps[number], tone?: Band, tag?: string) => (
              <a key={`${comp.url}-${comp.rentMonthUsd}`} href={comp.url ?? undefined} target="_blank" rel="nofollow noopener noreferrer"
                className={tone ? cardCls.replace('border-[var(--color-border)] bg-white', BAND_SURFACE[tone]) : cardCls}>
                {comp.photo && (
                  // Фото из объявления rumah123 — видно, что именно сдают по соседству.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={comp.photo} alt={comp.title} loading="lazy" referrerPolicy="no-referrer" width={480} height={320}
                    className="aspect-[3/2] w-full bg-[var(--color-search-bg)] object-cover" />
                )}
                <span className="flex flex-1 flex-col gap-1 p-5">
                  {tone && tag && <span className={`mb-1 self-start rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold ${BAND_TEXT[tone]}`}>{tag}</span>}
                  <span className="text-[20px] font-semibold text-[var(--color-text)]"><InlinePrice usd={comp.rentMonthUsd} lang={lang} /> <span className="text-[14px] font-medium text-[var(--color-text-muted)]">{c.perMonth}</span></span>
                  <span className="text-[15px] font-medium leading-snug text-[var(--color-text)] line-clamp-2">{comp.title}</span>
                  <span className="text-[14px] text-[var(--color-text-muted)]">
                    {[comp.bedrooms != null ? (comp.bedrooms === 0 ? c.studio : `${comp.bedrooms} ${c.br}`) : null, comp.buildingM2 ? `${comp.buildingM2} м²` : null, lang === 'ru' ? districtRu(comp.district) : comp.district, comp.distanceKm != null ? `${dec(comp.distanceKm)} ${c.km}` : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </a>
            )
            const sorted = [...m.comps].sort((a, b) => b.rentMonthUsd - a.rentMonthUsd)
            if (!mReceipt || !snap) return <CardRail prevLabel={c.prev} nextLabel={c.next}>{sorted.map(comp => card(comp))}</CardRail>
            const b = pickCopy(BANDS_COPY, lang)
            const P = (usd: number) => <span className="whitespace-nowrap"><InlinePrice usd={usd} lang={lang} approx={false} /></span>
            const band = (p: number): Band => p < m.p25 ? 'bad' : p > m.p75 ? 'good' : 'mid'
            const month = (p: number) => monthlyNetAt(snap, p, 'month') ?? 0
            return (
              <BandedRail heading={b.heading} prevLabel={c.prev} nextLabel={c.next}
                note={mReceipt.breakeven != null && m.p75 < mReceipt.breakeven ? b.allLoss(P(mReceipt.breakeven), 'month') : undefined}
                chips={[
                  { band: 'bad', title: b.bad, range: <>{b.upTo} {P(m.p25)}</>, money: b.moneyBad(P(month(m.p25))) },
                  { band: 'mid', title: b.mid, range: <>{P(m.p25)} – {P(m.p75)}</>, money: b.moneyMid(P(month(m.p50))) },
                  { band: 'good', title: b.good, range: <>{b.from} {P(m.p75)}</>, money: b.moneyGood(P(month(m.p75))) },
                ]}
                items={sorted.map(comp => {
                  const t = band(comp.rentMonthUsd)
                  const loss = mReceipt.breakeven != null && comp.rentMonthUsd < mReceipt.breakeven
                  return { band: t, node: card(comp, loss ? 'bad' : t, loss ? b.loss : b.tag[t]) }
                })} />
            )
          })()}
        </div>
  ) })
  if (sale) tabs.push({ key: 'sale', label: c.tabSale, content: sale })
  return <DemandTabs tabs={tabs} label={c.tabsLabel} />
}

export function YieldSummary({ yields: y, leaseYears, calcAnchor, lang }: { yields: YieldFacts; leaseYears: number | null; calcAnchor: string; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const fmt = lang === 'ru' || lang === 'uk' ? pctFmt : pctFmtEn
  const mult = y.leaseMultiple != null ? (lang === 'ru' || lang === 'uk' ? y.leaseMultiple.toFixed(1).replace('.', ',') : y.leaseMultiple.toFixed(1)) : null
  return (
    <div className="rounded-2xl border border-[var(--color-primary)] bg-white p-5 md:p-7 flex flex-col gap-4">
      {y.ownSource === 'actual' && <VerifiedYieldBadge lang={lang} className="self-start" />}
      <p className="text-[22px] md:text-[28px] font-semibold leading-snug tracking-tight text-[var(--color-text)] max-w-[40ch]">{c.yTitle(fmt(y.pct.beforeTax))}</p>
      <p className="text-[15px] md:text-[16px] leading-relaxed text-[var(--color-text-muted)] max-w-[72ch]">
        {y.mode === 'monthly' ? c.yLeadMonthly : y.ownSource === 'actual' && y.ownMonths ? (y.ownRevenue ? c.yLeadRevenue(y.ownMonths) : c.yLeadActual(y.ownMonths, !!y.ownBooking)) : y.ownBooking ? c.yLeadOwn : c.yLeadDaily} <InlinePrice usd={y.rateUsd} lang={lang} /> {y.mode === 'monthly' ? c.perMonth : c.perNight}. {c.yLeadTail}
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

// «Сколько принесёт?» — три варианта без повторов ответа раздела: строка на вид
// дохода, столбцы «плохо / средне / хорошо». Подробности — в калькуляторе ниже.
const SC_COPY = {
  ru: {
    cols: ['Плохо', 'Средне', 'Хорошо'] as const,
    daily: 'Посуточная аренда', monthly: 'Помесячная аренда', resale: 'Перепродажа сейчас',
    dailyNote: 'в год до налогов', monthlyNote: 'в год до налогов', resaleNote: 'к цене покупки, по объявлениям рядом',
  },
  en: {
    cols: ['Low', 'Typical', 'High'] as const,
    daily: 'Nightly rental', monthly: 'Monthly rental', resale: 'Resale now',
    dailyNote: 'per year before tax', monthlyNote: 'per year before tax', resaleNote: 'vs purchase price, by listings nearby',
  },
}

export function YieldScenariosTable({ data, verified, lang }: { data: YieldScenarios; verified?: boolean; lang: Lang }) {
  const c = pickCopy(SC_COPY, lang)
  const pct = (x: number, signed = false) => {
    const s = (Math.round(x * 1000) / 10).toFixed(1)
    const t = lang === 'en' || lang === 'zh' ? s : s.replace('.', ',')
    return `${signed && x > 0 ? '+' : ''}${t.replace('-', '−')}%`
  }
  const rows = [
    data.daily && { k: 'daily', label: c.daily, note: c.dailyNote, r: data.daily, signed: false },
    data.monthly && { k: 'monthly', label: c.monthly, note: c.monthlyNote, r: data.monthly, signed: false },
    data.resale && { k: 'resale', label: c.resale, note: c.resaleNote, r: data.resale, signed: true },
  ].filter((x): x is { k: string; label: string; note: string; r: ScenarioRow; signed: boolean } => !!x)
  if (!rows.length) return null
  return (
    <div className="flex flex-col gap-3">
      {verified && <VerifiedYieldBadge lang={lang} className="self-start" />}
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-[14px] text-[var(--color-text-muted)]">
            <th className="py-2 pr-3 font-normal" />
            {c.cols.map(h => <th key={h} className="py-2 px-2 text-right font-normal">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.k} className="border-t border-[var(--color-border)] align-top">
              <th scope="row" className="py-3 pr-3 font-normal">
                <span className="block text-[16px] font-medium text-[var(--color-text)]">{row.label}</span>
                <span className="block text-[13px] leading-snug text-[var(--color-text-muted)]">{row.note}</span>
              </th>
              {([row.r.bad, row.r.mid, row.r.good] as const).map((v, i) => (
                <td key={i} className={`py-3 px-2 text-right tabular-nums text-[16px] md:text-[18px] whitespace-nowrap ${i === 1 ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                  {pct(v, row.signed)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
