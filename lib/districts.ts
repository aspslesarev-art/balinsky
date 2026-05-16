// District-level SEO content for the catalogue filter pages.
// When /ru/villy/<district> or /ru/apartamenty/<district> is rendered
// with a single district and no other filters, the catalog injects this
// intro block above the grid — gives Google and the visitor 400-600
// words of real content per district, not just a property list.

import type { Lang } from '@/lib/i18n'

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

export function getDistrictCopy(slug: string, lang: Lang): DistrictCopy | null {
  const bundle = DISTRICTS[slug]
  if (!bundle) return null
  return bundle[lang]
}
