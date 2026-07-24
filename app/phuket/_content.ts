// Контент лендинга «Balinsky на Пхукете» — выездная серия встреч с
// агентствами острова, 29 июля — 10 августа. Страница временная и
// самостоятельная: вне локализованной структуры сайта, noindex,
// без шапки/футера маркетплейса. Весь копирайт собран здесь, чтобы
// правки текста не требовали трогать разметку.

/** Контакты Елены — она ведёт запись на слоты. */
export const CONTACTS = {
  // Международный формат без плюса и пробелов — так его принимает wa.me.
  whatsappPhone: '79787489673',
  // Telegram-username без @ — так его принимает t.me.
  telegramUser: 'elenadanilyk',
} as const

export const whatsappHref = (): string =>
  `https://wa.me/${CONTACTS.whatsappPhone}?text=${encodeURIComponent(
    'Здравствуйте! Хотим встретиться с Balinsky на Пхукете. Агентство: ',
  )}`

export const telegramHref = (): string => `https://t.me/${CONTACTS.telegramUser}`

export const TRIP = {
  dates: '29 июля — 10 августа',
  place: 'Пхукет',
  slots: 30,
} as const

export const HERO = {
  eyebrow: 'BALINSKY · ВСТРЕЧИ С АГЕНТСТВАМИ ПХУКЕТА',
  // Каждая строка — отдельная строка заголовка (осознанные переносы).
  titleLines: [
    'Ваш клиент уходит без сделки.',
    'Закройте его на Бали —',
    'комиссия остаётся вашей',
  ],
  lead:
    'Отобранные застройщики, защита вашего клиента на 12 месяцев и бонус +0,5% сверху. Вы продаёте как привыкли — сделку ведут на земле, деньги получаете вы. 30 минут встречи — и готовый инструмент у вас на руках.',
  // Фото построенного объекта BREIG — фон героя.
  photo:
    'https://images.balinsky.info/storage/v1/object/public/complex-photos/rec4LXzhZnVEi0MWP/0.jpg?v=sSLl9i0O7ZncXl',
} as const

export const WHY_NOW = {
  eyebrow: 'ПОЧЕМУ СЕЙЧАС',
  title: 'Вы видите, что происходит с рынком',
  points: [
    {
      title: 'Посуточная аренда кондо — вне закона',
      body: 'Рейды, суды, аресты. Схема, на которой держались продажи, перестала быть безопасной.',
    },
    {
      title: '«Phuket Model» в действии',
      body: 'Верховный суд финально отозвал землю даже у Pullman Arcadia — 13 рай, предписания о сносе вывешены 10 июля.',
    },
    {
      title: 'Клиент за доходностью уходит без сделки',
      body: 'Он приходит считать доход, получает 3–5% чистыми и не покупает ничего.',
    },
  ],
  key:
    'Я не предлагаю бросать Пхукет. Я предлагаю закрывать клиента, которого вы сейчас теряете, — на Бали, вашими руками, за вашу комиссию.',
} as const

export const TAKEAWAYS = {
  eyebrow: 'ЧТО ВЫ УНЕСЁТЕ СО ВСТРЕЧИ',
  title: '30 минут — и у вас на руках:',
  items: [
    {
      title: 'Каталог отобранных застройщиков Бали',
      body: 'Только с PBG, треком построенного и фактической доходностью по сданным объектам.',
    },
    {
      title: 'Условия по каждому',
      body: 'Цены, payment plan, комиссия агентству — без «уточним позже».',
    },
    {
      title: 'Модель защиты сделки',
      body: 'Письменная регистрация клиента, 12 месяцев защиты, прозрачный статус — вашего клиента не перехватят на Бали.',
    },
    {
      title: 'Бонус +0,5%',
      body: 'Сверх стандартной комиссии — за работу через сеть.',
    },
  ],
  note: 'Никаких обязательств. Не увидите денег для себя — потратили 30 минут на кофе.',
} as const

export const WHY_BALI = {
  eyebrow: 'АРГУМЕНТЫ ДЛЯ КЛИЕНТА',
  title: 'Почему Бали продаётся вашему клиенту',
  items: [
    { title: 'Доходность в разы выше', body: 'При легальной посуточной аренде.' },
    { title: 'Тот же лизхолд', body: 'Который вы уже умеете продавать.' },
    { title: '4 часа прямым рейсом', body: 'Ежедневно — инспекция за уикенд.' },
    { title: 'Предложение ограничено', body: 'Строить выше 4 этажей нельзя.' },
  ],
  note: 'Детали и цифры — на встрече.',
} as const

export interface DeveloperCard {
  name: string
  logo: string
  meta: string
  href: string
  photos: readonly { src: string; alt: string }[]
}

const CDN = 'https://images.balinsky.info/storage/v1/object/public/complex-photos'
const LOGOS = 'https://ifdgiwxothmcalibmydv.supabase.co/storage/v1/object/public/developer-logos'

export const DEVELOPERS: readonly DeveloperCard[] = [
  {
    name: 'BREIG',
    logo: `${LOGOS}/rec3dbXwsXa9oA2OJ.svg`,
    meta: 'Апартаменты и виллы · Чангу, Убуд, Букит',
    href: 'https://balinsky.info/ru/zastrojshhiki/breig-bali-developer',
    photos: [
      { src: `${CDN}/rec4LXzhZnVEi0MWP/1.jpg?v=dYGC3r3ofXxBPm`, alt: 'Garden Villa II, Убуд — построен BREIG в 2024 году' },
      { src: `${CDN}/recWmiC2vOh7qvgUh/0.jpg?v=1X4dzzNxAWcaUW`, alt: 'BALIWOOD II, Чангу — построен BREIG в 2024 году' },
      { src: `${CDN}/recdf0jTXs7NdByEm/0.jpg?v=okrgFID97Xu8py`, alt: 'Oasis III, Чангу — построен BREIG в 2025 году' },
    ],
  },
  {
    name: 'HQC',
    logo: `${LOGOS}/reczJozrEesn071t9.svg`,
    meta: 'Премиальные резиденции · Букит, Убуд',
    href: 'https://balinsky.info/ru/zastrojshhiki/high-quality-construction-bali-developer',
    photos: [
      { src: `${CDN}/rec7HF1JmZLVw4PNR/0.jpg?v=XK35PCzeOYhAac`, alt: 'Ardhana Residence, Букит — построен HQC в 2025 году' },
      { src: `${CDN}/rec8A9IzLGw1SqIOD/0.jpg?v=GGtfEt256nTH7E`, alt: 'Black Rock, Букит — построен HQC в 2024 году' },
      { src: `${CDN}/recqPBo3KvBTOEaKf/0.jpg?v=l9t2jK94zeyktJ`, alt: 'Dzen Greenfield Villas, Убуд — построен HQC в 2025 году' },
    ],
  },
  {
    name: 'IJI Group',
    logo: `${LOGOS}/recl9Mp1JQclby1UE.png`,
    meta: 'Резиденции · Букит',
    href: 'https://balinsky.info/ru/zastrojshhiki/iji-group-bali-developer',
    photos: [
      { src: `${CDN}/recw5fC0zJ0QNKIxy/0.jpg?v=K1xgpId3xoqJRE`, alt: 'BODY SENSE, Букит — проект IJI Group' },
      { src: `${CDN}/recw5fC0zJ0QNKIxy/1.jpg?v=kQg6RSHaxEAD1K`, alt: 'BODY SENSE, Букит — проект IJI Group' },
      { src: `${CDN}/recgIqgmMkdCuH3j6/0.jpg?v=slLO2mnfa4lUIz`, alt: 'EIGHTH SENSE, Букит — проект IJI Group' },
    ],
  },
  {
    name: 'Big Bali Group',
    logo: `${LOGOS}/rec45XABp4aef39Ak.jpg`,
    meta: 'Апарт-комплексы · Букит',
    href: 'https://balinsky.info/ru/zastrojshhiki/big-bali-group-bali-developer',
    photos: [
      { src: `${CDN}/recTMa0rFk5VSarDc/0.jpg?v=MsEA8OfKm8NdZf`, alt: 'Manta Livin, Букит — проект Big Bali Group' },
      { src: `${CDN}/recTMa0rFk5VSarDc/1.jpg?v=E1Tgwj4Li7SeBq`, alt: 'Manta Livin, Букит — проект Big Bali Group' },
      { src: `${CDN}/recTMa0rFk5VSarDc/2.jpg?v=SC0dPlYxF88frG`, alt: 'Manta Livin, Букит — проект Big Bali Group' },
    ],
  },
  {
    name: 'Urban Escape',
    logo: `${LOGOS}/reccIgeMeuwhEiVsx.jpg`,
    meta: 'Резиденции · Чангу, Букит',
    href: 'https://balinsky.info/ru/zastrojshhiki/urban-escape-bali-developer',
    photos: [
      { src: `${CDN}/recauVEKAMqw3E9yy/0.jpg?v=o3KMgKURBdVwGG`, alt: 'PRIVÉ Pererenan, Чангу — проект Urban Escape' },
      { src: `${CDN}/recauVEKAMqw3E9yy/1.jpg?v=nUxOD2dL980nIV`, alt: 'PRIVÉ Pererenan, Чангу — проект Urban Escape' },
      { src: `${CDN}/rec5SHg9DPOxcKJMl/0.jpg?v=cVuHDd3VIDFOff`, alt: 'BINGIN ELEMENTS, Букит — проект Urban Escape' },
    ],
  },
]

export const ABOUT = {
  eyebrow: 'КТО Я',
  name: 'Андрей',
  role: 'основатель Balinsky',
  body:
    '2600+ объектов Бали в каталоге, топ-50 агентств Бали в партнёрской сети, медиа на YouTube, Instagram и TikTok.',
  partners: 'Среди партнёров: BREIG, TEUS, LOYO&BONDAR.',
  photo: '/andrei.jpg',
} as const

export const BOOKING = {
  eyebrow: 'РАСПИСАНИЕ И БРОНЬ',
  title: '29 июля — 10 августа · Пхукет · 30 слотов',
  body:
    'Встречи по 30 минут — приеду в ваш офис или в удобное вам место. Расписание собираю по районам острова: чем раньше бронируете, тем удобнее слот под вашу локацию.',
  note: 'Напишите название агентства и удобные дни — пришлём подтверждение в тот же день.',
} as const
