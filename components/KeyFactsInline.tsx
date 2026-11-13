// Главное рядом одной строкой под заголовком объекта, сразу за районом
// (макет «Строка под заголовком», вариант A, владелец 2026-11-13):
// пляж · аэропорт · магазин · школа. Только то, что есть и правда близко.
// Отдаёт набор <span> - кладётся в flex-строку страницы.

import { pickCopy, type Lang } from '@/lib/i18n'
import type { LivingFacts } from '@/lib/living'

const COPY = {
  ru: { beach: 'Пляж', airport: 'Аэропорт', shop: 'Магазин', school: 'Школа', m: 'м', km: 'км', min: 'мин' },
  en: { beach: 'Beach', airport: 'Airport', shop: 'Shop', school: 'School', m: 'm', km: 'km', min: 'min' },
  id: { beach: 'Pantai', airport: 'Bandara', shop: 'Toko', school: 'Sekolah', m: 'm', km: 'km', min: 'mnt' },
  fr: { beach: 'Plage', airport: 'Aéroport', shop: 'Magasin', school: 'École', m: 'm', km: 'km', min: 'min' },
  de: { beach: 'Strand', airport: 'Flughafen', shop: 'Laden', school: 'Schule', m: 'm', km: 'km', min: 'Min.' },
  zh: { beach: '海滩', airport: '机场', shop: '超市', school: '学校', m: '米', km: '公里', min: '分钟' },
  nl: { beach: 'Strand', airport: 'Luchthaven', shop: 'Winkel', school: 'School', m: 'm', km: 'km', min: 'min' },
  ban: { beach: 'Pantai', airport: 'Bandara', shop: 'Toko', school: 'Sekolah', m: 'm', km: 'km', min: 'mnt' },
  pl: { beach: 'Plaża', airport: 'Lotnisko', shop: 'Sklep', school: 'Szkoła', m: 'm', km: 'km', min: 'min' },
  uk: { beach: 'Пляж', airport: 'Аеропорт', shop: 'Магазин', school: 'Школа', m: 'м', km: 'км', min: 'хв' },
} as const

const ICONS = {
  beach: <><path d="M2 18c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" /><circle cx="12" cy="9" r="4" /></>,
  airport: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
  shop: <><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 7H6" /></>,
  school: <><path d="M3 9l9-5 9 5-9 5z" /><path d="M7 11v5c3 2 7 2 10 0v-5" /></>,
} as const

// Дальше этих расстояний пункт не «ключевой» - не показываем.
const MAX_KM = { beach: 3, shop: 1, school: 5 } as const

export function KeyFactsInline({ facts, beachKm, lang }: { facts: LivingFacts | null; beachKm?: number | null; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const dist = (km: number) => (km < 1 ? `${Math.round(km * 1000)} ${c.m}` : `${km.toFixed(1).replace('.', lang === 'en' || lang === 'zh' ? '.' : ',')} ${c.km}`)
  const row = (k: 'beach' | 'shop' | 'school') => facts?.rows.find(r => r.key === k)?.km ?? null
  const beach = beachKm ?? row('beach')
  const shop = row('shop'), school = row('school')
  const items: { k: keyof typeof ICONS; text: string }[] = []
  if (beach != null && beach <= MAX_KM.beach) items.push({ k: 'beach', text: `${c.beach} ${dist(beach)}` })
  if (facts?.airportMin != null) items.push({ k: 'airport', text: `${c.airport} ${facts.airportMin} ${c.min}` })
  if (shop != null && shop <= MAX_KM.shop) items.push({ k: 'shop', text: `${c.shop} ${dist(shop)}` })
  if (school != null && school <= MAX_KM.school) items.push({ k: 'school', text: `${c.school} ${dist(school)}` })
  return (
    <>
      {items.map(it => (
        <span key={it.k} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[it.k]}</svg>
          {it.text}
        </span>
      ))}
    </>
  )
}
