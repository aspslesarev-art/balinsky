// Контент лендинга «Balinsky на Пхукете» — выездная серия встреч с
// агентствами острова, 29 июля — 10 августа. Страница временная и
// самостоятельная: вне локализованной структуры сайта, noindex,
// без шапки/футера маркетплейса. Весь копирайт собран здесь, чтобы
// правки текста не требовали трогать разметку.

/** Контакты Елены — она ведёт запись на слоты. */
export const CONTACTS = {
  // Международный формат без плюса и пробелов — так его принимает wa.me.
  whatsappPhone: '66000000000',
  // Публичный Line ID (то, что идёт после https://line.me/ti/p/~).
  lineId: 'REPLACE_ME',
} as const

export const whatsappHref = (): string =>
  `https://wa.me/${CONTACTS.whatsappPhone}?text=${encodeURIComponent(
    'Здравствуйте! Хотим встретиться с Balinsky на Пхукете. Агентство: ',
  )}`

export const lineHref = (): string => `https://line.me/ti/p/~${CONTACTS.lineId}`

export const TRIP = {
  dates: '29 июля — 10 августа',
  place: 'Пхукет',
  slots: 30,
} as const

export const HERO = {
  eyebrow: 'BALINSKY · ВЫЕЗД НА ПХУКЕТ',
  title: 'Я лечу на Пхукет, чтобы встретиться с 30 лучшими агентствами острова',
  lead:
    'Меня зовут Андрей. Balinsky — партнёрская сеть по недвижимости Бали: 2600+ объектов, топ-50 агентств Бали в работе. Привожу отобранных застройщиков и модель, в которой ваша комиссия защищена + бонус сверху.',
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
  badges: readonly string[]
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
    badges: ['PBG ✓', 'Лизхолд ✓', 'Посуточная лицензия ✓'],
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
    badges: ['PBG ✓', 'Лизхолд ✓', 'Посуточная лицензия ✓'],
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
