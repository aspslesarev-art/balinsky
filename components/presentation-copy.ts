// Тексты презентации объекта — общие для слайдов (VillaPresentation) и
// скачиваемого PDF (VillaPresentationPdf). Раньше оба файла были целиком на
// русском, и на английской странице открывалась русская презентация.
// Языки кроме ru/en берут английский (pickCopy), как и остальной сайт.

import { pickCopy, type Lang } from '@/lib/i18n'
import { pluralRu } from '@/lib/plural-ru'

type Kind = 'villa' | 'apartment' | undefined

// Зоны удалённости от пляжа. Внутренние коды (scooter, inland) и их
// подписи из lib/investment/zones.ts читателю не показываем.
const ZONES: Record<'ru' | 'en', Record<string, string>> = {
  ru: {
    beachfront: 'первая линия, до 100 м от пляжа',
    walking: 'пешком до пляжа, 100–500 м',
    scooter: 'на скутере до пляжа, 0,5–1,5 км',
    inland: 'вглубь острова, дальше 1,5 км от пляжа',
  },
  en: {
    beachfront: 'beachfront, within 100 m of the beach',
    walking: 'walking distance to the beach, 100–500 m',
    scooter: 'a short ride to the beach, 0.5–1.5 km',
    inland: 'inland, over 1.5 km from the beach',
  },
}

const COPY = {
  ru: {
    bali: 'Бали',
    dialog: 'Презентация объекта',
    download: 'Скачать',
    downloadAria: 'Скачать презентацию в PDF',
    close: 'Закрыть',
    closeAria: 'Закрыть презентацию',
    slide: (n: number) => `Слайд ${n}`,
    prevSlide: 'Предыдущий слайд',
    nextSlide: 'Следующий слайд',
    back: 'Назад',
    next: 'Дальше',
    noPhoto: 'Нет фото',
    sqm: 'м²',
    house: 'дом',
    land: 'земля',
    leaseYears: (y: string) => `Лизхолд ${y} лет`,
    years: (y: string) => `${y} лет`,
    perSqm: '/ м²',
    bedrooms: 'Спальни',
    houseLabel: 'Дом',
    landLabel: 'Земля',
    completion: 'Сдача',
    permits: 'Разрешения',
    leasehold: 'Лизхолд',
    district: 'Район',
    pricePerSqm: 'Цена за м²',
    factsTitle: 'Характеристики',
    factsSub: 'Ключевые параметры объекта',
    about: (k: Kind): string => (k === 'apartment' ? 'Об апартаментах' : 'О вилле'),
    location: 'Расположение',
    locationSub: 'Координаты и район',
    districtLine: (d: string) => `Район: ${d}, Бали`,
    coords: 'Координаты',
    openMaps: 'Открыть в Google Maps',
    map: 'Карта',
    noNearby: 'Нет данных о соседних точках',
    loadingNearby: 'Загружаем места поблизости…',
    nearbyTitle: (k: Kind): string => (k === 'apartment' ? 'Что вокруг апартаментов' : 'Что вокруг виллы'),
    nearbySub: 'Топ-места поблизости по рейтингу и расстоянию',
    investTitle: 'Инвестиционный потенциал',
    investSub: (n: number, zone: string | null | undefined) =>
      `Три сценария аренды по сравнению с ${n} ${pluralRu(n, ['похожим объектом', 'похожими объектами', 'похожими объектами'])} на Booking${zone && ZONES.ru[zone] ? ` — ${ZONES.ru[zone]}` : ''}`,
    scenario: { bad: 'Плохой', median: 'Нормальный', good: 'Хороший' },
    perNight: 'за ночь',
    perYearNet: '/ год чистыми',
    payback: 'Окупаемость',
    yieldPerYear: 'Доходность в год',
    calcNote: (price: string) => `Расчёт от цены ${price} с учётом комиссий, расходов на содержание и налога 10%.`,
    agentEyebrow: 'Ваш агент',
    agentSub: 'Свяжитесь напрямую — быстро отвечу и помогу с просмотром',
    moreEyebrow: 'Подробнее на сайте',
    moreSub: (k: Kind): string => `Полная карточка, актуальная цена и форма связи — на странице ${k === 'apartment' ? 'апартаментов' : 'виллы'}`,
    // Окно скачивания
    dlTitle: 'Скачать презентацию',
    dlChoose: 'Выберите формат и вариант. Горизонтальный — для экрана, вертикальный — под телефон.',
    landscape: 'Горизонтально',
    portrait: 'Для телефона',
    dlSimpleSub: (k: Kind): string => `На последней странице — ссылка на страницу ${k === 'apartment' ? 'апартаментов' : 'виллы'}`,
    dlAgent: 'Скачать для агента',
    dlAgentSub: 'На последней странице — ваши имя, Telegram и WhatsApp',
    backToChoice: 'К выбору варианта',
    agentNote: 'Ваши контакты попадут на последнюю страницу PDF — клиент сможет связаться напрямую.',
    name: 'Имя',
    namePlaceholder: 'Андрей',
    needContact: 'Укажите Telegram или WhatsApp — хотя бы один контакт.',
    building: 'Собираем PDF…',
    downloadPdf: 'Скачать PDF',
    pdfError: 'Не получилось собрать PDF. Попробуйте ещё раз.',
    nearby: {
      beach: 'Пляжи', beachclub: 'Бич-клубы', international_school: 'Международные школы', school: 'Школы',
      preschool: 'Сады и ясли', wellness: 'Йога и фитнес', restaurant: 'Рестораны', cafe: 'Кафе',
      supermarket: 'Магазины', pharmacy: 'Аптеки', hospital: 'Клиники', nightlife: 'Бары и клубы',
      attraction: 'Достопримечательности',
    } as Record<string, string>,
    m: 'м',
    km: 'км',
  },
  en: {
    bali: 'Bali',
    dialog: 'Property presentation',
    download: 'Download',
    downloadAria: 'Download the presentation as PDF',
    close: 'Close',
    closeAria: 'Close the presentation',
    slide: (n: number) => `Slide ${n}`,
    prevSlide: 'Previous slide',
    nextSlide: 'Next slide',
    back: 'Back',
    next: 'Next',
    noPhoto: 'No photo',
    sqm: 'm²',
    house: 'house',
    land: 'land',
    leaseYears: (y: string) => `Leasehold ${y} yrs`,
    years: (y: string) => `${y} yrs`,
    perSqm: '/ m²',
    bedrooms: 'Bedrooms',
    houseLabel: 'House',
    landLabel: 'Land',
    completion: 'Completion',
    permits: 'Permits',
    leasehold: 'Leasehold',
    district: 'Area',
    pricePerSqm: 'Price per m²',
    factsTitle: 'Key facts',
    factsSub: 'The main parameters of the property',
    about: (k: Kind): string => (k === 'apartment' ? 'About the apartment' : 'About the villa'),
    location: 'Location',
    locationSub: 'Coordinates and area',
    districtLine: (d: string) => `Area: ${d}, Bali`,
    coords: 'Coordinates',
    openMaps: 'Open in Google Maps',
    map: 'Map',
    noNearby: 'No data on places nearby',
    loadingNearby: 'Loading places nearby…',
    nearbyTitle: (k: Kind): string => (k === 'apartment' ? 'Around the apartment' : 'Around the villa'),
    nearbySub: 'Top places nearby by rating and distance',
    investTitle: 'Investment potential',
    investSub: (n: number, zone: string | null | undefined) =>
      `Three rental scenarios based on ${n} similar ${n === 1 ? 'listing' : 'listings'} on Booking${zone && ZONES.en[zone] ? ` — ${ZONES.en[zone]}` : ''}`,
    scenario: { bad: 'Low', median: 'Typical', good: 'High' },
    perNight: 'per night',
    perYearNet: '/ year net',
    payback: 'Payback',
    yieldPerYear: 'Yield per year',
    calcNote: (price: string) => `Calculated from a price of ${price}, including fees, running costs and 10% tax.`,
    agentEyebrow: 'Your agent',
    agentSub: 'Contact me directly — I reply fast and can arrange a viewing',
    moreEyebrow: 'More on the website',
    moreSub: (k: Kind): string => `Full listing, current price and contacts — on the ${k === 'apartment' ? 'apartment' : 'villa'} page`,
    dlTitle: 'Download the presentation',
    dlChoose: 'Pick a format. Landscape is for screens, portrait is for phones.',
    landscape: 'Landscape',
    portrait: 'For phone',
    dlSimpleSub: (k: Kind): string => `The last page links to the ${k === 'apartment' ? 'apartment' : 'villa'} page`,
    dlAgent: 'Download for an agent',
    dlAgentSub: 'The last page shows your name, Telegram and WhatsApp',
    backToChoice: 'Back to options',
    agentNote: 'Your contacts go on the last page of the PDF so the client can reach you directly.',
    name: 'Name',
    namePlaceholder: 'Alex',
    needContact: 'Add Telegram or WhatsApp — at least one contact.',
    building: 'Building the PDF…',
    downloadPdf: 'Download PDF',
    pdfError: 'Could not build the PDF. Please try again.',
    nearby: {
      beach: 'Beaches', beachclub: 'Beach clubs', international_school: 'International schools', school: 'Schools',
      preschool: 'Kindergartens', wellness: 'Yoga & fitness', restaurant: 'Restaurants', cafe: 'Cafes',
      supermarket: 'Shops', pharmacy: 'Pharmacies', hospital: 'Clinics', nightlife: 'Bars & clubs',
      attraction: 'Attractions',
    } as Record<string, string>,
    m: 'm',
    km: 'km',
  },
}

export type PresentationCopy = (typeof COPY)['ru']

export function presentationCopy(lang: Lang | undefined): PresentationCopy {
  return pickCopy(COPY, lang ?? 'ru')
}

export function presentationDistance(km: number, c: PresentationCopy): string {
  if (km < 1) return `${Math.round(km * 1000)} ${c.m}`
  return `${km.toFixed(km < 10 ? 1 : 0)} ${c.km}`
}

// Поле «Разрешение» хранится в базе по-русски: «нет», «PBG», «Заявка PBG»,
// «Заявка SLF». null — показывать нечего.
export function permitLabel(raw: string | null | undefined, lang: Lang | undefined): string | null {
  if (!raw) return null
  const v = raw.trim()
  if (!v || v.toLowerCase() === 'нет') return null
  if (lang === 'ru' || lang === 'uk' || !lang) return v
  const applied = v.match(/^заявка\s+(.+)$/i)
  return applied ? `${applied[1]} applied for` : v
}

// Часть мест рядом взята из русскоязычной подборки baliforum и называется
// по-русски («Пляж Пандава» — это тот же Pantai Pandawa из Google). В
// презентации на других языках такие дубли не показываем.
export function placeVisible(name: string | null | undefined, lang: Lang | undefined): boolean {
  if (!name) return false
  if (!lang || lang === 'ru' || lang === 'uk') return true
  return !/[А-Яа-яЁё]/.test(name)
}
