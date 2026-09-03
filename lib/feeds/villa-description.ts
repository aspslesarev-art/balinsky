// Краткие описания вилл для партнёрских фидов.
//
// ВАЖНО (SEO): в фид НЕЛЬЗЯ отдавать `SEO Text` — это дословный текст карточки
// на balinsky.info. Портал сильнее по домену, и на одинаковом тексте он
// вытесняет наш оригинал из выдачи по длинному хвосту. Поэтому описание для
// фида собирается здесь по шаблону из фактов (район, спальни, площадь,
// leasehold, срок сдачи) — оно уникально относительно сайта и при этом
// достаточно информативно для площадки.
//
// Такой же приём уже применён в app/feeds/kompleksy.xml/route.ts для ЖК.

import { districtRu } from '@/lib/district-ru'

function str(v: unknown): string | null {
  if (Array.isArray(v)) return v.length > 0 ? str(v[0]) : null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  if (v && typeof v === 'object' && 'value' in v) return str((v as { value: unknown }).value)
  return null
}

function num(v: unknown): number | null {
  if (Array.isArray(v)) return v.length > 0 ? num(v[0]) : null
  const n = typeof v === 'string' ? Number(v.trim()) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}

// Творительный падеж — фраза строится как «вилла с …»:
// с 1 спальней / с 2 спальнями / с 21 спальней.
function bedroomsRu(n: number): string {
  const mod100 = n % 100
  const mod10 = n % 10
  const one = mod10 === 1 && mod100 !== 11
  return `${n} ${one ? 'спальней' : 'спальнями'}`
}

// 1 год / 22 года / 25 лет
function yearsRu(n: number): string {
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 14) return `${n} лет`
  if (mod10 === 1) return `${n} год`
  if (mod10 >= 2 && mod10 <= 4) return `${n} года`
  return `${n} лет`
}

const EN_NUMERALS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

function bedroomsEn(n: number): string {
  const word = n <= 10 ? EN_NUMERALS[n] : String(n)
  return `${word}-bedroom`
}

const money = (n: number) => `$${n.toLocaleString('en-US')}`

const isBuilt = (status: string | null) => !!status && /постро|built|ready/i.test(status)

export type VillaDescription = { ru: string; en: string }

/** Собирает пару описаний (RU/EN) из полей raw_villas. */
export function buildVillaDescription(d: Record<string, unknown>): VillaDescription | null {
  const districtLatin = str(d['Location 2']) ?? str(d['Location'])
  const bedrooms = num(d['Комнаты'])
  const area = num(d['Площадь'])
  const land = num(d['Земля'])
  const leasehold = num(d['Leasehold']) ?? num(d['Leashold'])
  // «Разрешение» местами заполнено мусором («нет», «-»), а осмысленные
  // значения — латинские аббревиатуры (PBG, SHM, HGB, IMB). Всё остальное
  // выбрасываем, иначе в текст попадает «разрешение нет».
  const permitRaw = str(d['Разрешение'])
  const permit = permitRaw && /^[A-Za-z]{2,10}$/.test(permitRaw) ? permitRaw.toUpperCase() : null
  const price = num(d['price']) ?? num(d['Цена'])
  const year = str(d['Year of completion'])
  const status = str(d['Статус'])
  const yieldPct = num(d['Заявленная доходность'])

  // Без района и площади текст выродится в набор цифр — такое лучше не слать.
  if (!districtLatin || !area) return null

  const districtRuName = districtRu(districtLatin) ?? districtLatin

  // --- RU ---
  const ru: string[] = []
  ru.push(
    bedrooms
      ? `Вилла с ${bedroomsRu(bedrooms)} в районе ${districtRuName}, Бали.`
      : `Вилла в районе ${districtRuName}, Бали.`,
  )
  ru.push(land ? `Площадь ${area} м², участок ${land} м².` : `Площадь ${area} м².`)
  if (leasehold) {
    ru.push(permit ? `Leasehold ${yearsRu(leasehold)}, разрешение ${permit}.` : `Leasehold ${yearsRu(leasehold)}.`)
  }
  if (price) ru.push(`Стоимость — ${money(price)}.`)
  if (isBuilt(status)) ru.push('Объект построен и готов к заселению.')
  else if (year && /^\d{4}$/.test(year)) ru.push(`Сдача — ${year} год.`)
  if (yieldPct) ru.push(`Заявленная доходность — ${yieldPct}% годовых.`)

  // --- EN ---
  const en: string[] = []
  en.push(
    bedrooms
      ? `A ${bedroomsEn(bedrooms)} villa in ${districtLatin}, Bali.`
      : `A villa in ${districtLatin}, Bali.`,
  )
  en.push(land ? `Built-up area ${area} m², land plot ${land} m².` : `Built-up area ${area} m².`)
  if (leasehold) en.push(permit ? `Leasehold ${leasehold} years, ${permit} permit.` : `Leasehold ${leasehold} years.`)
  if (price) en.push(`Price — ${money(price)}.`)
  if (isBuilt(status)) en.push('The property is completed and ready to move in.')
  else if (year && /^\d{4}$/.test(year)) en.push(`Completion — ${year}.`)
  if (yieldPct) en.push(`Projected yield — ${yieldPct}% per annum.`)

  return { ru: ru.join(' '), en: en.join(' ') }
}
