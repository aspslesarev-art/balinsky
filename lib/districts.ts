// District-level SEO content for the catalogue filter pages.
// When /ru/villy/<district> or /ru/apartamenty/<district> is rendered
// with a single district and no other filters, the catalog injects this
// intro block above the grid — gives Google and the visitor 400-600
// words of real content per district, not just a property list.

import type { Lang } from '@/lib/i18n'
// Long-tail districts (beyond the ~12 curated below) generated from
// assistant_kb guides + real stats by scripts/kb-district-pages.mjs.
import generatedDistricts from './districts-generated.json'

export type DistrictCopy = {
  slug: string
  name: string // Display name in the active language
  hero: string // 1-2 sentence positioning
  paragraphs: string[] // 2-4 body paragraphs
  highlights: { label: string; value: string }[]
  bestFor: string[]
}

type DistrictBundle = {
  ru: DistrictCopy
  en: DistrictCopy
}

// Districts ordered roughly by trading volume; the first six get the
// full editorial treatment, the rest fall through to a templated
// description so we still ship some content for the long tail.
const DISTRICTS: Record<string, DistrictBundle> = {
  canggu: {
    ru: {
      slug: 'canggu', name: 'Чангу',
      hero: 'Главный тренд-район Бали: серф, ивенты, нетворкинг, рекордные ставки суточной аренды.',
      paragraphs: [
        'Чангу — самый плотный и быстрорастущий рынок аренды на острове. Концентрация ресторанов, коворкингов, серф-спотов и ивентов делает район магнитом для digital-nomads и краткосрочных туристов. Средний дневной тариф (ADR) виллы с двумя спальнями — $180-230 в высокий сезон, загрузка через профессиональную УК 75-85%.',
        'Чистая доходность инвестора, по реальным данным Booking-аналитики через estatemarket.io, — 10-13% годовых для виллы стоимостью $200-350K. Премиум-сегмент (новые виллы Echo Beach, Berawa) с океанским видом — до 15%. Стартовая цена объекта — от $180K за компактную виллу 1BR в Padang-Linjong и Babakan.',
        'Главные суб-локации: Berawa (премиум, рядом с Finns Beach Club), Batu Bolong (центр, max-loyalty туристов), Pererenan (тише, растущий тренд), Echo Beach (серф, north Canggu). Юридически — преимущественно лизхолд 25-30 лет от частных владельцев; freehold-сделки через PT PMA встречаются у застройщиков нового пула.',
        'Риски: рост цен на землю опережает рост ставок аренды последние 18 месяцев — окно дешёвого входа закрывается. Часть участков попадает под пересмотр зонирования (RDTR), стоит проверять статус земли до сделки.',
      ],
      highlights: [
        { label: 'Стартовая цена 1BR', value: 'от $180K' },
        { label: 'Доходность', value: '10-13%' },
        { label: 'Загрузка ВЫС сезон', value: '75-85%' },
        { label: 'ADR 2BR', value: '$180-230' },
      ],
      bestFor: ['Краткосрочная аренда', 'Серф-сообщество', 'Digital nomads', 'Активная жизнь'],
    },
    en: {
      slug: 'canggu', name: 'Canggu',
      hero: 'Bali\'s main trend district: surf, events, networking, record short-term rental rates.',
      paragraphs: [
        'Canggu is the densest and fastest-growing rental market on the island. A concentration of restaurants, coworkings, surf spots and events makes it a magnet for digital nomads and short-term tourists. Average daily rate (ADR) for a 2-bedroom villa is $180-230 in high season; managed-rental occupancy runs 75-85%.',
        'Investor net yield, based on live Booking analytics via estatemarket.io, is 10-13% annual for a $200-350K villa. Premium segment (new villas in Echo Beach and Berawa) with ocean views can reach 15%. Entry price starts at $180K for a compact 1BR villa in Padang-Linjong or Babakan.',
        'Main sub-locations: Berawa (premium, next to Finns Beach Club), Batu Bolong (centre, peak tourist loyalty), Pererenan (quieter, rising trend), Echo Beach (surf, north Canggu). Legally, leasehold 25-30 years from private owners dominates; freehold via PT PMA appears in newer developer projects.',
        'Risks: land prices have outpaced rental rates for the last 18 months — the cheap-entry window is closing. Some plots are being reviewed for zoning (RDTR), worth verifying land status before transacting.',
      ],
      highlights: [
        { label: '1BR entry', value: 'from $180K' },
        { label: 'Yield', value: '10-13%' },
        { label: 'Peak occupancy', value: '75-85%' },
        { label: '2BR ADR', value: '$180-230' },
      ],
      bestFor: ['Short-term rental', 'Surf community', 'Digital nomads', 'Active lifestyle'],
    },
  },
  uluwatu: {
    ru: {
      slug: 'uluwatu', name: 'Улувату',
      hero: 'Полуостров Букит с премиум-видами на океан и самой высокой доходностью на Бали.',
      paragraphs: [
        'Улувату и весь Букит (включая Пандава, Унгасан, Биндин) — премиум-направление для investor-buyers. Виллы с прямым видом на океан и close-to-cliff локация дают самый высокий ADR на острове: $250-450/ночь для 2-3BR. Загрузка профессиональной аренды через Airbnb Luxe и Plum Guide — 70-85%.',
        'Чистая доходность 10-15% годовых — выше Чангу за счёт премиум-ставок и более длительных stays (4-7 ночей в среднем). Цена входа — от $130K за компактную виллу 1BR в Pecatu или Bingin, до $1.5M+ за cliff-edge виллу с инфинити-бассейном в Uluwatu и Padang-Padang.',
        'Сильные стороны Букита: меньше пробок чем в Чангу, более «зрелая» аудитория туристов (luxury и semi-luxury), стабильный круглогодичный спрос за счёт surf-сезонов в обе стороны года. Минусы: дорога до аэропорта 45-60 минут, ограниченная инфраструктура повседневного пользования (магазины, аптеки), полная зависимость от автомобиля.',
        'Юридический ландшафт стандартный для Бали: лизхолд 25-80 лет от индивидуальных лендлордов; freehold через PT PMA доступен для проектов крупных застройщиков. Зонирование стабильное — Букит выпал из недавних RDTR-пересмотров.',
      ],
      highlights: [
        { label: 'Стартовая цена 1BR', value: 'от $130K' },
        { label: 'Доходность', value: '10-15%' },
        { label: 'ADR 2-3BR', value: '$250-450' },
        { label: 'Длительность stay', value: '4-7 ночей' },
      ],
      bestFor: ['Премиум-аренда', 'Long-stay туристы', 'Серф-комьюнити', 'Океанские виды'],
    },
    en: {
      slug: 'uluwatu', name: 'Uluwatu',
      hero: 'The Bukit peninsula — premium ocean views and the highest yields in Bali.',
      paragraphs: [
        'Uluwatu and the wider Bukit (including Pandawa, Ungasan, Bingin) are the premium destination for investor buyers. Direct-ocean-view villas with close-to-cliff positioning command the highest ADR on the island: $250-450/night for 2-3BR units. Managed-rental occupancy via Airbnb Luxe and Plum Guide runs 70-85%.',
        'Net yield is 10-15% annual — above Canggu thanks to premium rates and longer stays (4-7 nights on average). Entry price starts at $130K for a compact 1BR villa in Pecatu or Bingin and reaches $1.5M+ for a cliff-edge villa with infinity pool in Uluwatu and Padang-Padang proper.',
        'Bukit\'s strengths: less traffic than Canggu, a more «mature» tourist audience (luxury and semi-luxury), stable year-round demand thanks to surf seasons in both directions. Downsides: 45-60 minutes from the airport, limited daily-use infrastructure (groceries, pharmacies), full car dependence.',
        'Legal landscape is standard for Bali: leasehold 25-80 years from individual landlords; freehold via PT PMA available in larger developer projects. Zoning is stable — Bukit was unaffected by recent RDTR reviews.',
      ],
      highlights: [
        { label: '1BR entry', value: 'from $130K' },
        { label: 'Yield', value: '10-15%' },
        { label: '2-3BR ADR', value: '$250-450' },
        { label: 'Avg stay', value: '4-7 nights' },
      ],
      bestFor: ['Premium rental', 'Long-stay tourists', 'Surf community', 'Ocean views'],
    },
  },
  ubud: {
    ru: {
      slug: 'ubud', name: 'Убуд',
      hero: 'Культурно-духовный центр Бали: wellness, йога, длительные аренды.',
      paragraphs: [
        'Убуд — единственный non-coastal район Бали с серьёзным инвестиционным интересом. Тут другая экономика аренды: не суточная, а weekly/monthly stays для wellness-туристов, retreat-organisers и осознанных «slow travel» аудиторий. Средний срок проживания — 7-14 ночей, ADR 2BR — $90-150.',
        'Доходность скромнее побережья — 6-9% годовых чистыми, но стабильнее: меньше сезонных провалов, выше повторные бронирования, ниже расходы на коммунальные (отсутствие морской соли в воздухе значимо снижает износ техники). Цена входа — от $120K за виллу 1BR в Penestanan или Tegallalang.',
        'Целевой инвестор Убуда — тот, кто планирует совмещать сдачу с собственным проживанием 2-4 месяца в году. Сезон высокого спроса с мая по сентябрь и декабрь-январь, остальные месяцы реально жить самому без потери доходности.',
        'Юридически Убуд проще побережья: меньше спекулятивных лендлордов, лизхолды чаще от семей с прозрачной историей земли, freehold через PT PMA доступен на ряде участков с подтверждённым статусом.',
      ],
      highlights: [
        { label: 'Стартовая цена 1BR', value: 'от $120K' },
        { label: 'Доходность', value: '6-9%' },
        { label: 'ADR 2BR', value: '$90-150' },
        { label: 'Длительность stay', value: '7-14 ночей' },
      ],
      bestFor: ['Wellness и йога', 'Long-stay аренда', 'Слоу-туризм', 'Собственное проживание'],
    },
    en: {
      slug: 'ubud', name: 'Ubud',
      hero: 'Bali\'s cultural-spiritual centre: wellness, yoga, longer stays.',
      paragraphs: [
        'Ubud is the only inland district with serious investor interest. The rental economy is different here: not nightly but weekly/monthly stays for wellness tourists, retreat organisers and mindful slow-travel audiences. Average stay is 7-14 nights, 2BR ADR is $90-150.',
        'Yield is more modest than the coast — 6-9% net annual, but steadier: fewer seasonal dips, higher repeat bookings, lower utility cost (no sea salt in the air significantly reduces wear on equipment). Entry price starts at $120K for a 1BR villa in Penestanan or Tegallalang.',
        'Ubud\'s typical investor is someone planning to combine renting with their own 2-4 months of personal use per year. Peak demand May-September and December-January; other months you can live there yourself without sacrificing yield.',
        'Legally Ubud is simpler than the coast: fewer speculative landlords, leaseholds usually from families with clean land history, freehold via PT PMA available on plots with verified status.',
      ],
      highlights: [
        { label: '1BR entry', value: 'from $120K' },
        { label: 'Yield', value: '6-9%' },
        { label: '2BR ADR', value: '$90-150' },
        { label: 'Avg stay', value: '7-14 nights' },
      ],
      bestFor: ['Wellness & yoga', 'Long-stay rentals', 'Slow travel', 'Personal use'],
    },
  },
  sanur: {
    ru: {
      slug: 'sanur', name: 'Санур',
      hero: 'Семейно-спокойный курорт восточного побережья с низкими инвестиционными рисками.',
      paragraphs: [
        'Санур — старейший туристический район Бали, известный спокойной семейной аудиторией, безопасным бэйкграундом и предсказуемой доходностью. Тут нет ажиотажа Чангу, но и нет резких просадок: загрузка аренд держится 65-75% круглый год без сезонных пиков и провалов.',
        'Доходность скромнее — 5-8% годовых чистыми, зато инвестиционный риск минимальный: устоявшаяся инфраструктура, госпиталь BIMC, международные школы, прогулочный променад вдоль моря. Цена входа — от $150K за виллу 1BR в районе Renon или Sindhu.',
        'Целевая аудитория арендаторов — европейские пенсионеры на 1-3 месяца, релоканты с детьми, корпоративные сотрудники крупных компаний с проектами на Бали. Объекты в Сануре трудно продать спекулятивно (рост цен на землю 4-6% в год вместо 10-15% как в Чангу), но и трудно потерять — рынок stable.',
        'Этот район подходит инвесторам с горизонтом 10+ лет и страх-low профилем: гарантированный денежный поток важнее agressive appreciation.',
      ],
      highlights: [
        { label: 'Стартовая цена 1BR', value: 'от $150K' },
        { label: 'Доходность', value: '5-8%' },
        { label: 'Загрузка круглый год', value: '65-75%' },
        { label: 'Прирост цен/год', value: '4-6%' },
      ],
      bestFor: ['Семейная аудитория', 'Стабильный кэшфлоу', 'Низкие риски', 'Long-stay'],
    },
    en: {
      slug: 'sanur', name: 'Sanur',
      hero: 'A calm family-oriented east-coast resort with low investment risk.',
      paragraphs: [
        'Sanur is Bali\'s oldest tourist district, known for a calm family audience, safe background, and predictable yields. There is no Canggu-style hype but no sharp dips either: rental occupancy holds 65-75% year-round without seasonal peaks or troughs.',
        'Yield is more modest — 5-8% net annual, but investment risk is minimal: mature infrastructure, BIMC hospital, international schools, beachside promenade. Entry price starts at $150K for a 1BR villa in Renon or Sindhu.',
        'Tenant base — European retirees for 1-3 months, expat families, corporate employees of large companies with Bali projects. Sanur properties are hard to sell speculatively (4-6% annual land appreciation vs 10-15% in Canggu) but also hard to lose money on — the market is stable.',
        'Sanur fits investors with a 10+ year horizon and low-risk profile: predictable cash flow matters more than aggressive appreciation.',
      ],
      highlights: [
        { label: '1BR entry', value: 'from $150K' },
        { label: 'Yield', value: '5-8%' },
        { label: 'Year-round occupancy', value: '65-75%' },
        { label: 'Annual appreciation', value: '4-6%' },
      ],
      bestFor: ['Family audience', 'Stable cash flow', 'Low risk', 'Long stays'],
    },
  },
  pererenan: {
    ru: {
      slug: 'pererenan', name: 'Переренан',
      hero: 'Тихая альтернатива Чангу с растущим трендом и доходностью 9-12%.',
      paragraphs: [
        'Переренан — следующий за Чангу район по тренду, в 15 минутах езды от Berawa. Меньше шума, меньше пробок, тот же серф и пляжные клубы. За последние два года ADR вырос на 35%, при этом цены на землю — всего на 15-20%, что делает район одним из лучших по cost-to-yield соотношению на острове.',
        'Доходность — 9-12% годовых чистыми, что близко к Чангу при на 20-30% более низкой стартовой цене входа. Виллы 2BR — от $160K (в Чангу аналогичные начинаются от $220K).',
        'Главный риск — длительный «инфраструктурный долг»: дорога к пляжу узкая, в час пик пробки, мало супермаркетов. По мере застройки региона эти проблемы будут усугубляться раньше, чем решаться. Покупать имеет смысл, если планируете удержать объект на 5+ лет — за этот горизонт инфраструктура подтянется.',
        'Юридически Переренан остаётся «дикой» зоной в плохом смысле: много частных лендлордов с непрозрачной историей земли. Due diligence по статусу участка тут критичнее, чем в Чангу или Букит.',
      ],
      highlights: [
        { label: 'Стартовая цена 2BR', value: 'от $160K' },
        { label: 'Доходность', value: '9-12%' },
        { label: 'Рост ADR 2 года', value: '+35%' },
        { label: 'Рост цен 2 года', value: '+15-20%' },
      ],
      bestFor: ['Cost-to-yield инвесторов', 'Долгий горизонт 5+ лет', 'Серф + спокойствие'],
    },
    en: {
      slug: 'pererenan', name: 'Pererenan',
      hero: 'A quieter Canggu alternative with rising trend and 9-12% yields.',
      paragraphs: [
        'Pererenan is the next-trending district after Canggu, 15 minutes from Berawa. Less noise, less traffic, same surf and beach clubs. Over the last two years ADR grew 35% while land prices grew only 15-20% — one of the best cost-to-yield ratios on the island.',
        'Yield is 9-12% net annual, close to Canggu at 20-30% lower entry price. 2BR villas start at $160K (the Canggu equivalent starts at $220K).',
        'Main risk — chronic «infrastructure debt»: narrow road to the beach, rush-hour traffic, few supermarkets. As the area is built out these issues will worsen before they resolve. Makes sense to buy if you can hold 5+ years — by then the infrastructure catches up.',
        'Pererenan is still a «wild» zone in the bad sense: many private landlords with unclear land history. Due diligence on plot status matters more here than in Canggu or Bukit.',
      ],
      highlights: [
        { label: '2BR entry', value: 'from $160K' },
        { label: 'Yield', value: '9-12%' },
        { label: 'ADR growth 2y', value: '+35%' },
        { label: 'Price growth 2y', value: '+15-20%' },
      ],
      bestFor: ['Cost-to-yield investors', '5+ year horizon', 'Surf + calm'],
    },
  },
  'nusa-dua': {
    ru: {
      slug: 'nusa-dua', name: 'Нуса Дуа',
      hero: 'Корпоративно-семейный курорт с премиум-отелями и спокойной охраняемой территорией.',
      paragraphs: [
        'Нуса Дуа — закрытый зонированный курорт на южном побережье Бали, где сконцентрированы 5-звёздочные международные сети (St Regis, Mulia, Ritz-Carlton, Sofitel). Это даёт уникальный для острова инвест-профиль: высокий и стабильный поток корпоративных туристов, делегаций конференций, semi-luxury и luxury family-аудитории.',
        'Доходность виллы 7-10% годовых чистыми — между Чангу и Сануром. Средний ADR 2BR — $180-260, загрузка 70-78% круглый год, провалов нет даже в low season за счёт корпоративных групп. Цена входа — от $200K за виллу 1BR на периметре зоны, до $1M+ за объекты внутри Nusa Dua Resort.',
        'Сильная сторона — инфраструктура международного уровня: больница, школы, торговые центры, аэропорт в 15 минутах. Слабая — относительная закрытость района, нет той «местной жизни», за которую любят Чангу и Убуд. Подходит инвесторам с приоритетом стабильность > рост.',
        'Юридически — стандартно для Бали: лизхолд от частных лендлордов на периметре, freehold через PT PMA в проектах больших застройщиков. Кадастровая стоимость одна из самых высоких на острове.',
      ],
      highlights: [
        { label: 'Стартовая цена 1BR', value: 'от $200K' },
        { label: 'Доходность', value: '7-10%' },
        { label: 'Загрузка', value: '70-78%' },
        { label: 'ADR 2BR', value: '$180-260' },
      ],
      bestFor: ['Корпоративные туристы', 'Семейный сегмент', 'Low-risk портфель', 'Long-term'],
    },
    en: {
      slug: 'nusa-dua', name: 'Nusa Dua',
      hero: 'Corporate-family resort with premium hotels and a quiet gated environment.',
      paragraphs: [
        'Nusa Dua is a gated zoned resort on Bali\'s south coast where major 5-star international chains cluster (St Regis, Mulia, Ritz-Carlton, Sofitel). This gives a unique island investment profile: steady high flow of corporate visitors, conference delegations, semi-luxury and luxury family audience.',
        'Villa yield is 7-10% net annual — between Canggu and Sanur. Average 2BR ADR is $180-260, occupancy 70-78% year-round, no low-season dips thanks to corporate groups. Entry price starts at $200K for a 1BR villa on the perimeter, reaches $1M+ for properties inside the Nusa Dua Resort.',
        'Strength — international-grade infrastructure: hospital, schools, shopping malls, airport 15 minutes away. Weakness — the area\'s relative isolation, none of the «local life» Canggu and Ubud are loved for. Fits investors who prioritise stability over growth.',
        'Legally standard for Bali: leasehold from private landlords on the perimeter, freehold via PT PMA in larger developer projects. Cadastral value is among the highest on the island.',
      ],
      highlights: [
        { label: '1BR entry', value: 'from $200K' },
        { label: 'Yield', value: '7-10%' },
        { label: 'Occupancy', value: '70-78%' },
        { label: '2BR ADR', value: '$180-260' },
      ],
      bestFor: ['Corporate visitors', 'Family segment', 'Low-risk portfolio', 'Long-term'],
    },
  },
  nyanyi: {
    ru: {
      slug: 'nyanyi', name: 'Нянь',
      hero: 'Следующий тренд-район после Переренан — нетронутые пляжи, ранний вход.',
      paragraphs: [
        'Нянь — узкая полоса побережья к северу от Тананлот и Переренан. Несколько лет назад это была чистая сельская местность; сейчас здесь сдают первые beach clubs, открылись первые butik-отели и виллы под аренду. Это «next Pererenan» по логике застройки.',
        'Цены ниже Переренан на 25-35% при близкой доходности 8-11% годовых: $130-180K за виллу 1BR, $200-280K за 2BR. ADR 2BR — $130-180, загрузка через профессиональную УК 65-75%. Премия за «нетронутость» — туристы, ищущие альтернативу переполненному Чангу.',
        'Главный риск — инфраструктурный вакуум. Нормальные дороги, супермаркеты, аптеки, медицинский сервис — в 20-30 минутах езды в сторону Чангу. На горизонте 3-5 лет это решится, но владельцу нужно либо мириться, либо использовать объект как pure rental с УК.',
        'Юридически Нянь — зона с большим количеством сельхозземель. Due diligence по статусу участка и пересмотрам RDTR — критичен. Многие лизхолд-сделки тут от семей с долгой историей владения, проще для верификации.',
      ],
      highlights: [
        { label: 'Стартовая цена 1BR', value: 'от $130K' },
        { label: 'Доходность', value: '8-11%' },
        { label: 'ADR 2BR', value: '$130-180' },
        { label: 'Дисконт к Переренан', value: '−25-35%' },
      ],
      bestFor: ['Ранний вход', '3-5 летний горизонт', 'Pure rental', 'Тихий пляж'],
    },
    en: {
      slug: 'nyanyi', name: 'Nyanyi',
      hero: 'The next trend area after Pererenan — untouched beaches, early entry point.',
      paragraphs: [
        'Nyanyi is a narrow coastal strip north of Tanah Lot and Pererenan. A few years ago it was pure agricultural land; now the first beach clubs, boutique hotels and rental villas are appearing. This is the «next Pererenan» on the build-out trajectory.',
        'Prices sit 25-35% below Pererenan at similar 8-11% yields: $130-180K for a 1BR villa, $200-280K for a 2BR. 2BR ADR is $130-180, managed-rental occupancy 65-75%. The «untouched» premium attracts tourists looking for a Canggu alternative.',
        'Main risk — infrastructure vacuum. Decent roads, supermarkets, pharmacies, medical care are 20-30 minutes towards Canggu. The 3-5 year horizon should solve this, but owners must either accept it or treat the property as pure rental with a manager.',
        'Legally, Nyanyi has a high share of agricultural-zoned land. Due diligence on plot status and RDTR reviews is critical. Many leaseholds here come from families with long ownership history — easier to verify.',
      ],
      highlights: [
        { label: '1BR entry', value: 'from $130K' },
        { label: 'Yield', value: '8-11%' },
        { label: '2BR ADR', value: '$130-180' },
        { label: 'Discount to Pererenan', value: '−25-35%' },
      ],
      bestFor: ['Early entry', '3-5 year horizon', 'Pure rental', 'Quiet beach'],
    },
  },
  melasti: {
    ru: {
      slug: 'melasti', name: 'Меласти',
      hero: 'Премиум-cliff-зона Букита с лучшими закатами и высокими ставками.',
      paragraphs: [
        'Меласти — один из самых живописных участков Букита: вертикальные скалы, белый песок, прозрачная вода, плотная застройка cliff-edge виллами с инфинити-бассейнами. Соседствует с Пандава и Унгасан, входит в premium-кластер южного полуострова.',
        'Доходность 11-15% годовых — выше Чангу за счёт премиум-аренды и длительных stays. Виллы 2-3BR с видом на океан — от $350K до $1.5M. ADR — $300-500 в высокий сезон, что выше среднего по Бали в полтора-два раза. Audience: HNW туристы, retreats, влоговые группы.',
        'Меласти отличается от других сабрайонов Букита более «острым» рельефом — много вилл буквально на краю скалы, что даёт уникальный вид но усложняет ландшафтные работы и эвакуацию. Перед сделкой обязательно гео-экспертиза участка (риск эрозии, оползней).',
        'Юридически — стандартно: лизхолд 50-80 лет от индивидуальных владельцев, freehold через PT PMA у больших застройщиков. Цены за квадратный метр земли — одни из самых высоких на острове ($800-1500 за м²).',
      ],
      highlights: [
        { label: 'Стартовая цена 2BR', value: 'от $350K' },
        { label: 'Доходность', value: '11-15%' },
        { label: 'ADR 2-3BR', value: '$300-500' },
        { label: 'Цена земли', value: '$800-1500/м²' },
      ],
      bestFor: ['Премиум-сегмент', 'Океанский вид', 'HNW туристы', 'Long stays'],
    },
    en: {
      slug: 'melasti', name: 'Melasti',
      hero: 'A premium cliff zone in Bukit with the best sunsets and high rental rates.',
      paragraphs: [
        'Melasti is one of Bukit\'s most spectacular stretches: vertical cliffs, white sand, clear water, dense cliff-edge villa development with infinity pools. It borders Pandawa and Ungasan and belongs to the southern peninsula\'s premium cluster.',
        'Yield is 11-15% net annual — above Canggu thanks to premium rates and long stays. 2-3BR ocean-view villas range from $350K to $1.5M. ADR is $300-500 in high season, 1.5-2x the Bali average. Audience: HNW travellers, retreats, video crews.',
        'Melasti differs from other Bukit sub-areas in its sharper relief — many villas sit literally on the cliff edge, which gives a unique view but complicates landscaping and evacuation. A geological survey before transacting is mandatory (erosion and landslide risk).',
        'Legally standard: 50-80 year leasehold from individual owners, freehold via PT PMA in larger developer projects. Land prices per square metre are among the highest on the island ($800-1500/m²).',
      ],
      highlights: [
        { label: '2BR entry', value: 'from $350K' },
        { label: 'Yield', value: '11-15%' },
        { label: '2-3BR ADR', value: '$300-500' },
        { label: 'Land price', value: '$800-1500/m²' },
      ],
      bestFor: ['Premium segment', 'Ocean views', 'HNW tourists', 'Long stays'],
    },
  },
  kerobokan: {
    ru: {
      slug: 'kerobokan', name: 'Керобокан',
      hero: 'Сити-район в северном Семиньяке: рестораны, бизнес, expat-аудитория.',
      paragraphs: [
        'Керобокан — менее туристический район между Семиньяк и Чангу, ориентированный на резидентский рынок: длительные аренды, expat-семьи, профессионалы среднего уровня. Здесь нет beach front, но плотная сеть кафе, ресторанов, школ и спортзалов даёт уверенный спрос на 1-12-месячные аренды.',
        'Доходность 7-10% годовых при стабильной загрузке 75-90% — близка к долгосрочной аренде Канберры/Бангкока по экономике. ADR 2BR — $80-130, средний срок stay 30-90 дней. Цена входа — от $170K за виллу 2BR, $300-450K за хороший family-home 3-4BR.',
        'Сильная сторона — стабильность дохода, минимум сезонности, простота управления (длинные стои = меньше turnover). Слабая — низкий апсайд по апрециации цен (4-6% в год vs 10-15% в Чангу). Подходит инвесторам, которые хотят минимизировать operational headache.',
        'Юридически Керобокан — преимущественно лизхолд 25-50 лет. Freehold через PT PMA встречается у застройщиков туристических проектов на границе с Семиньяк.',
      ],
      highlights: [
        { label: 'Стартовая цена 2BR', value: 'от $170K' },
        { label: 'Доходность', value: '7-10%' },
        { label: 'Загрузка', value: '75-90%' },
        { label: 'Длительность stay', value: '30-90 дней' },
      ],
      bestFor: ['Долгосрочная аренда', 'Expat-семьи', 'Стабильный кэшфлоу', 'Резидентский рынок'],
    },
    en: {
      slug: 'kerobokan', name: 'Kerobokan',
      hero: 'A city-style district in north Seminyak: restaurants, business, expat audience.',
      paragraphs: [
        'Kerobokan is a less touristy district between Seminyak and Canggu, oriented toward the resident market: long-term rentals, expat families, mid-level professionals. No beachfront, but a dense network of cafés, restaurants, schools and gyms drives steady demand for 1-12 month stays.',
        'Yield is 7-10% net annual with stable 75-90% occupancy — close to the long-term rental economics of Canberra or Bangkok. 2BR ADR is $80-130, average stay 30-90 days. Entry price starts at $170K for a 2BR villa, $300-450K for a good 3-4BR family home.',
        'Strength — income stability, minimal seasonality, easy management (longer stays = less turnover). Weakness — low price appreciation upside (4-6% per year vs 10-15% in Canggu). Fits investors who want to minimise operational headache.',
        'Legally Kerobokan is mostly 25-50 year leasehold. Freehold via PT PMA appears in tourism-project developers on the Seminyak border.',
      ],
      highlights: [
        { label: '2BR entry', value: 'from $170K' },
        { label: 'Yield', value: '7-10%' },
        { label: 'Occupancy', value: '75-90%' },
        { label: 'Avg stay', value: '30-90 days' },
      ],
      bestFor: ['Long-term rental', 'Expat families', 'Stable cash flow', 'Resident market'],
    },
  },
  cemagi: {
    ru: {
      slug: 'cemagi', name: 'Чемаги',
      hero: 'Тихий западный пляжный район — следующий этап трендовой миграции.',
      paragraphs: [
        'Чемаги — пляжный район к западу от Переренан, на полпути к Танахлот. Несколько лет назад был аграрной зоной; сейчас идёт активная застройка вилла-проектами middle и premium-сегмента. По динамике развития напоминает Переренан 2022 года.',
        'Доходность 8-11% годовых. Виллы 2-3BR — от $200K, премиум beach-front — до $700K. ADR 2BR — $140-200, загрузка через УК 65-75%. Аудитория: digital-nomads ищущие тишину, family-туристы из Австралии и Сингапура.',
        'Сильная сторона — широкий пляж с черным вулканическим песком, серф-комьюнити, относительно низкая плотность застройки. Слабая — слабая инфраструктура (дороги узкие, мало супермаркетов), 25-35 минут до Чангу.',
        'Главный риск — пересмотры зонирования. Часть проектов в Чемаги попадает под аграрный статус земли — обязательная проверка по RDTR до сделки.',
      ],
      highlights: [
        { label: 'Стартовая цена 2BR', value: 'от $200K' },
        { label: 'Доходность', value: '8-11%' },
        { label: 'ADR 2BR', value: '$140-200' },
        { label: 'Загрузка', value: '65-75%' },
      ],
      bestFor: ['Ранний вход', 'Серф и beach', '4-5 летний горизонт'],
    },
    en: {
      slug: 'cemagi', name: 'Cemagi',
      hero: 'A quiet western beach area — next stage of the trend migration.',
      paragraphs: [
        'Cemagi is a beach district west of Pererenan, halfway to Tanah Lot. A few years ago it was agricultural land; now active villa-project construction is rolling across middle and premium segments. Development pace mirrors Pererenan 2022.',
        'Yield is 8-11% net annual. 2-3BR villas start at $200K, premium beachfront reaches $700K. 2BR ADR is $140-200, managed-rental occupancy 65-75%. Audience: digital nomads looking for quiet, family travellers from Australia and Singapore.',
        'Strength — wide black volcanic beach, surf community, relatively low building density. Weakness — limited infrastructure (narrow roads, few supermarkets), 25-35 minutes to Canggu.',
        'Main risk — zoning reviews. Some Cemagi projects sit on agricultural-status land — mandatory RDTR check before transacting.',
      ],
      highlights: [
        { label: '2BR entry', value: 'from $200K' },
        { label: 'Yield', value: '8-11%' },
        { label: '2BR ADR', value: '$140-200' },
        { label: 'Occupancy', value: '65-75%' },
      ],
      bestFor: ['Early entry', 'Surf and beach', '4-5 year horizon'],
    },
  },
  umalas: {
    ru: {
      slug: 'umalas', name: 'Умалас',
      hero: 'Резидентский район между Семиньяк и Чангу — школы, гольф, длительные аренды.',
      paragraphs: [
        'Умалас — тихий резидентский район для тех, кто живёт на Бали. Сосредоточенность международных школ (Australian Independent School, Sunrise School, Cita Hati), гольф-полей и family-friendly инфраструктуры даёт стабильный спрос на длительные аренды — преимущественно от expat-семей с детьми и удалёнщиков, выбирающих остров для постоянного проживания.',
        'Доходность 6-9% годовых от длительной аренды, без сезонных пиков. ADR 2BR — $80-120, средний срок stay 60-180 дней. Цена входа — от $180K за виллу 2BR, $350-500K за family home 3-4BR с садом и бассейном.',
        'Сильная сторона — низкие операционные расходы (мало turnover), стабильный денежный поток, простота управления. Слабая — низкая ликвидность (продать резидентский объект сложнее, чем виллу для аренды), низкий апрециация капитала (3-5% в год).',
        'Юридически Умалас — стабильный район с прозрачной историей лендлордов. Большинство сделок лизхолд 25-50 лет, freehold через PT PMA для крупных family-домов.',
      ],
      highlights: [
        { label: 'Стартовая цена 2BR', value: 'от $180K' },
        { label: 'Доходность', value: '6-9%' },
        { label: 'ADR 2BR', value: '$80-120' },
        { label: 'Длительность stay', value: '60-180 дней' },
      ],
      bestFor: ['Семейные expats', 'Долгосрочная аренда', 'Школьная аудитория', 'Стабильность'],
    },
    en: {
      slug: 'umalas', name: 'Umalas',
      hero: 'A residential district between Seminyak and Canggu — schools, golf, long-term rentals.',
      paragraphs: [
        'Umalas is a quiet residential district for people who live in Bali full-time. The concentration of international schools (Australian Independent School, Sunrise School, Cita Hati), golf courses and family-friendly infrastructure drives steady demand for long-term rentals — mainly from expat families with kids and remote workers who chose the island for permanent residence.',
        'Yield is 6-9% net annual from long-term rentals, no seasonal peaks. 2BR ADR is $80-120, average stay 60-180 days. Entry price starts at $180K for a 2BR villa, $350-500K for a 3-4BR family home with garden and pool.',
        'Strength — low operational overhead (little turnover), stable cash flow, easy management. Weakness — low liquidity (selling a residential property is harder than a rental villa), low capital appreciation (3-5% per year).',
        'Legally Umalas is a stable district with transparent landlord history. Most deals are 25-50 year leasehold, freehold via PT PMA for larger family homes.',
      ],
      highlights: [
        { label: '2BR entry', value: 'from $180K' },
        { label: 'Yield', value: '6-9%' },
        { label: '2BR ADR', value: '$80-120' },
        { label: 'Avg stay', value: '60-180 days' },
      ],
      bestFor: ['Expat families', 'Long-term rental', 'School audience', 'Stability'],
    },
  },
  berawa: {
    ru: {
      slug: 'berawa', name: 'Беравa',
      hero: 'Премиум-сегмент Чангу: дорогие виллы, beach clubs, корпоративная аудитория.',
      paragraphs: [
        'Берава — самый дорогой и развитый суб-район Чангу: на нём концентрируются Finns Beach Club, Atlas Beach Fest, La Brisa, премиальные рестораны. Цена объектов выше остального Чангу на 30-50%, но и арендные ставки выше: 2BR-вилла приносит $250-320/ночь в высокий сезон.',
        'Доходность — 9-12% годовых чистыми. Премиум-сегмент с прямым видом на океан или Finns — до 14%. Цена входа — от $250K за компактную виллу 1BR в глубине района, до $1.2M+ за beachfront-объект.',
        'Аудитория арендаторов: high-net-worth digital nomads, family-туристы из Сингапура, Гонконга и Австралии, корпоративные retreats. Stay-length — 5-10 ночей, выше среднего по Чангу.',
        'Главный недостаток: высокая концентрация туристов и шум beach clubs ночью. Не подходит для собственного проживания, только для arms-length инвестиции под аренду.',
      ],
      highlights: [
        { label: 'Стартовая цена 1BR', value: 'от $250K' },
        { label: 'Доходность', value: '9-12%' },
        { label: 'ADR 2BR', value: '$250-320' },
        { label: 'Длительность stay', value: '5-10 ночей' },
      ],
      bestFor: ['Премиум-аренда', 'HNW туристы', 'Beachfront', 'Pure investment'],
    },
    en: {
      slug: 'berawa', name: 'Berawa',
      hero: 'Canggu\'s premium pocket: high-end villas, beach clubs, corporate audience.',
      paragraphs: [
        'Berawa is the priciest and most developed Canggu sub-district: Finns Beach Club, Atlas Beach Fest, La Brisa and premium restaurants all concentrate here. Property prices are 30-50% above the rest of Canggu but so are rental rates: a 2BR villa earns $250-320/night in high season.',
        'Yield is 9-12% net annual. Premium segment with direct ocean or Finns views can reach 14%. Entry price starts at $250K for a compact 1BR villa deeper in the district, reaching $1.2M+ for beachfront.',
        'Tenant audience: high-net-worth digital nomads, family travellers from Singapore, Hong Kong and Australia, corporate retreats. Stay length 5-10 nights, above Canggu average.',
        'Main downside: high tourist density and nightly beach-club noise. Doesn\'t suit owner-occupation — strictly arms-length rental investment.',
      ],
      highlights: [
        { label: '1BR entry', value: 'from $250K' },
        { label: 'Yield', value: '9-12%' },
        { label: '2BR ADR', value: '$250-320' },
        { label: 'Avg stay', value: '5-10 nights' },
      ],
      bestFor: ['Premium rental', 'HNW tourists', 'Beachfront', 'Pure investment'],
    },
  },
}

const GENERATED_DISTRICTS = generatedDistricts as Record<string, DistrictBundle>

export function getDistrictCopy(slug: string, lang: Lang): DistrictCopy | null {
  // Curated entries win; generated long-tail fills the rest.
  const bundle = DISTRICTS[slug] ?? GENERATED_DISTRICTS[slug]
  if (!bundle) return null
  return bundle[lang]
}

// Commercial title / heading / description for single-district hub pages.
// Audit feedback: the descriptive defaults («Виллы и дома в районе Nusa Dua»)
// don't carry the «купить» keyword, year, count or commercial signals.
// This produces the «Купить виллу в Нуса Дуа, Бали — N объектов 2026 …»
// pattern + a description with price-from and yield range pulled from the
// editorial district data.
export type Kind = 'villa' | 'apartment' | 'complex'

const NOUN: Record<Lang, Record<Kind, { sing: string; plural: (n: number) => string }>> = {
  ru: {
    villa:     { sing: 'виллу',  plural: n => pluralRu(n, 'вилла', 'виллы', 'вилл') },
    apartment: { sing: 'квартиру', plural: n => pluralRu(n, 'апартамент', 'апартамента', 'апартаментов') },
    complex:   { sing: 'жилой комплекс', plural: n => pluralRu(n, 'жилой комплекс', 'жилых комплекса', 'жилых комплексов') },
  },
  en: {
    villa:     { sing: 'a villa', plural: n => n === 1 ? 'villa' : 'villas' },
    apartment: { sing: 'an apartment', plural: n => n === 1 ? 'apartment' : 'apartments' },
    complex:   { sing: 'a residential complex', plural: n => n === 1 ? 'residential complex' : 'residential complexes' },
  },
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 > 20)) return few
  return many
}

const YEAR = 2026

export function getDistrictCommercialMeta(
  slug: string,
  lang: Lang,
  kind: Kind,
  totalCount?: number,
): { title: string; heading: string; description: string } | null {
  const copy = getDistrictCopy(slug, lang)
  if (!copy) return null
  const n = NOUN[lang][kind]
  const priceFrom = copy.highlights.find(h => /entry|стартовая|from/i.test(h.label))?.value
  const yieldRange = copy.highlights.find(h => /yield|доходность/i.test(h.label))?.value

  if (lang === 'ru') {
    const countWord = totalCount ? `${totalCount} ${n.plural(totalCount)}` : null
    const heading = countWord
      ? `Купить ${n.sing} в ${copy.name}, Бали — ${countWord} ${YEAR}`
      : `Купить ${n.sing} в ${copy.name}, Бали — каталог ${YEAR}`
    const title = `Купить ${n.sing} в ${copy.name}, Бали — цены ${YEAR} | Balinsky`
    const descParts: string[] = [`Купить ${n.sing} в ${copy.name}, Бали`]
    if (countWord) descParts.push(`— ${countWord} от застройщиков`)
    const tail: string[] = []
    if (priceFrom) tail.push(`Цены ${priceFrom.toLowerCase()}`)
    if (yieldRange) tail.push(`доходность ${yieldRange}`)
    tail.push('лизхолд и фрихолд')
    const description = `${descParts.join(' ')}. ${tail.join(', ')}. Документы проверены, видео с земли.`
    return { title, heading, description }
  }

  // en
  const countWord = totalCount ? `${totalCount} ${n.plural(totalCount)}` : null
  const heading = countWord
    ? `Buy ${n.sing} in ${copy.name}, Bali — ${countWord} ${YEAR}`
    : `Buy ${n.sing} in ${copy.name}, Bali — ${YEAR} catalogue`
  const title = `Buy ${n.sing.replace(/^(a |an )/, '')} in ${copy.name}, Bali — ${YEAR} prices | Balinsky`
  const descParts: string[] = [`Buy ${n.sing} in ${copy.name}, Bali`]
  if (countWord) descParts.push(`— ${countWord} from developers`)
  const tail: string[] = []
  if (priceFrom) tail.push(`prices ${priceFrom.toLowerCase()}`)
  if (yieldRange) tail.push(`yield ${yieldRange}`)
  tail.push('leasehold and freehold')
  const description = `${descParts.join(' ')}. ${tail.join(', ')}. Permits verified, on-the-ground video.`
  return { title, heading, description }
}
