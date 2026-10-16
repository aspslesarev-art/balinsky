// Публичный каталог для AI-слоя: /llms-full.txt, /api/llm/search и блок
// «Данные Balinsky» в .md/.json-версиях карточек.
//
// Раньше AI-слой строился только из assistant_kb, а она живёт своей жизнью:
// в ней были снятые с публикации виллы, несуществующие страницы застройщиков,
// объекты скрытых застройщиков (lib/hidden-developers.ts), slug ЖК в старой
// SEO-форме (xo-canggu-batu-bolong-bali вместо xo-canggu → 404) и половины
// опубликованных вилл не было вовсе. Здесь список объектов берётся из тех же
// загрузчиков, что каталог и карта сайта, а assistant_kb даёт только текст.
//
// Доходность — только своя, из listing_yields (scripts/build-listing-yields.ts,
// те же функции, что блок «Сколько принесёт?» на странице). Цифра застройщика
// идёт лишь с пометкой «застройщик заявляет» и рядом с нашей оценкой.
import { createClient } from '@supabase/supabase-js'
import { loadAll as loadAllVillas, firstString, numberOrNull } from '@/app/ru/villy/_lib'
import { loadAll as loadAllApartments } from '@/app/ru/apartamenty/_lib'
import { loadAll as loadAllComplexes } from '@/app/ru/zhilye-kompleksy/_lib'
import { loadAllRental } from '@/lib/rental'
import { isHiddenDeveloper } from '@/lib/hidden-developers'
import { normalizeSlug } from '@/lib/slug-normalize'
import { moneyTone, type Tone } from '@/lib/listing-verdict'
import { revisionedCache } from '@/lib/revisioned-cache'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export type AiKind = 'villa' | 'apartment' | 'complex' | 'developer' | 'rental'

export type ListingYield = {
  mode: 'daily' | 'monthly'
  capBefore: number
  capResident: number | null
  capNonres: number | null
  occupancy: number | null
  occSource: string | null
}

export type AiEntry = {
  kind: AiKind
  id: string
  slug: string
  /** Путь русской страницы — остальные языки через switchLangPath. */
  ruPath: string
  /** Запасной заголовок, если в assistant_kb нет текста. */
  name: string | null
  nameEn: string | null
  priceUsd: number | null
  /** Аренда — цена в месяц. */
  rentMonthUsd: number | null
  areaSqm: number | null
  landSqm: number | null
  bedrooms: string | null
  status: string | null
  year: string | null
  leaseYears: string | null
  district: string | null
  developer: string | null
  /** «Заявленная доходность» застройщика, доля (0.128 = 12,8%). */
  claimedYield: number | null
  yield: ListingYield | null
}

const RU_SECTION: Record<AiKind, string> = {
  villa: '/ru/villy/o/',
  apartment: '/ru/apartamenty/o/',
  complex: '/ru/zhilye-kompleksy/o/',
  developer: '/ru/zastrojshhiki/',
  rental: '/ru/arenda/o/',
}

function blank(kind: AiKind, id: string, slug: string): AiEntry {
  return {
    kind, id, slug, ruPath: RU_SECTION[kind] + slug,
    name: null, nameEn: null, priceUsd: null, rentMonthUsd: null, areaSqm: null, landSqm: null,
    bedrooms: null, status: null, year: null, leaseYears: null, district: null, developer: null,
    claimedYield: null, yield: null,
  }
}

function cleanSlug(raw: unknown): string | null {
  const s = typeof raw === 'string' ? normalizeSlug(raw) : null
  return s && !s.startsWith('-') ? s : null
}

async function loadYields(): Promise<Map<string, ListingYield>> {
  const { data, error } = await sb
    .from('listing_yields')
    .select('kind, airtable_id, mode, cap_before, cap_resident, cap_nonres, occupancy, occ_source')
    .limit(5000)
  if (error) throw new Error(`listing_yields: ${error.message}`)
  const out = new Map<string, ListingYield>()
  for (const r of data ?? []) {
    if (r.cap_before == null) continue
    out.set(`${r.kind}:${r.airtable_id}`, {
      mode: r.mode === 'monthly' ? 'monthly' : 'daily',
      capBefore: Number(r.cap_before),
      capResident: r.cap_resident != null ? Number(r.cap_resident) : null,
      capNonres: r.cap_nonres != null ? Number(r.cap_nonres) : null,
      occupancy: r.occupancy != null ? Number(r.occupancy) : null,
      occSource: r.occ_source ?? null,
    })
  }
  return out
}

// Опубликованные и не скрытые застройщики — то же правило, что у их
// детальной страницы и карты сайта.
export async function loadPublicDevelopers(): Promise<{ id: string; slug: string; name: string | null }[]> {
  const { data, error } = await sb.from('raw_developers')
    .select('airtable_id, slug:data->"SEO:Slug", pub:data->"Публикация", dev:data->"Developer"').limit(500)
  if (error) throw new Error(`raw_developers: ${error.message}`)
  const out: { id: string; slug: string; name: string | null }[] = []
  const seen = new Set<string>()
  for (const r of (data ?? []) as { airtable_id: string; slug: unknown; pub: unknown; dev: unknown }[]) {
    if (r.pub !== true) continue
    const name = firstString(r.dev)
    if (isHiddenDeveloper(name)) continue
    const slug = firstString(r.slug)
    if (!slug || slug.startsWith('-') || seen.has(slug)) continue
    seen.add(slug)
    out.push({ id: r.airtable_id, slug, name })
  }
  return out
}

async function build(): Promise<AiEntry[]> {
  const [villas, apts, cpx, devs, rentals, yields] = await Promise.all([
    loadAllVillas(), loadAllApartments(), loadAllComplexes(), loadPublicDevelopers(), loadAllRental('ru'), loadYields(),
  ])
  // Пустой каталог — это сбой загрузки, а не «объектов нет»: не отдаём
  // AI-слою обрубок (его бы закэшировали на весь TTL).
  if (villas.enriched.length === 0 || apts.enriched.length === 0 || cpx.enriched.length === 0) {
    throw new Error('ai catalog: empty listing set')
  }
  const out: AiEntry[] = []
  const seen = new Set<string>()
  const push = (e: AiEntry) => {
    const key = `${e.kind}:${e.slug}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(e)
  }

  for (const v of villas.enriched) {
    const slug = cleanSlug(v.slug)
    if (!slug) continue
    const d = v.data
    push({
      ...blank('villa', v.id, slug),
      name: firstString(d['SEO:Title']) ?? firstString(d['ИИ Имя']) ?? firstString(d['Name']),
      nameEn: firstString(d['SEO:Title EN']) ?? firstString(d['ИИ Имя EN']),
      priceUsd: v.priceUsd, areaSqm: v.area, landSqm: v.land, bedrooms: v.bedrooms,
      status: v.status, year: v.year, district: v.district, developer: v.developerName,
      leaseYears: firstString(d['Leasehold']) ?? firstString(d['Leashold']),
      claimedYield: numberOrNull(d['Заявленная доходность']),
      yield: yields.get(`villa:${v.id}`) ?? null,
    })
  }
  for (const a of apts.enriched) {
    const d = a.data
    const slug = cleanSlug(firstString(d['SEO:Slug']))
    if (!slug) continue
    const yearRaw = firstString(d['Year of completion']) ?? firstString(d['Year of completion '])
    push({
      ...blank('apartment', a.id, slug),
      name: firstString(d['SEO:Title']) ?? firstString(d['ИИ Имя']),
      nameEn: firstString(d['SEO:Title EN']) ?? firstString(d['ИИ Имя EN']),
      priceUsd: a.priceUsd, areaSqm: a.area, bedrooms: a.bedrooms,
      status: a.status, year: yearRaw && /^\d{4}$/.test(yearRaw) ? yearRaw : null,
      district: a.district, developer: a.developerNames[0] ?? null,
      leaseYears: firstString(d['Leasehold']) ?? firstString(d['Leashold']),
      claimedYield: numberOrNull(d['Заявленная доходность']),
      yield: yields.get(`apartment:${a.id}`) ?? null,
    })
  }
  for (const c of cpx.enriched) {
    const slug = cleanSlug(c.slug)
    if (!slug) continue
    push({
      ...blank('complex', c.id, slug),
      name: c.name, nameEn: c.name, status: c.status, year: c.year,
      district: c.district, developer: c.developerName,
    })
  }
  for (const dv of devs) push({ ...blank('developer', dv.id, dv.slug), name: dv.name, nameEn: dv.name })
  for (const r of rentals) {
    const slug = cleanSlug(r.slug)
    if (!slug) continue
    push({
      ...blank('rental', r.id, slug),
      name: r.title, rentMonthUsd: r.priceMonthUsd || null,
      bedrooms: r.bedrooms != null ? String(r.bedrooms) : null, district: r.location,
    })
  }
  return out
}

// Каталог тяжёлый (три загрузчика каталога + аренда), но сами загрузчики уже
// держат данные в памяти — здесь только сборка. Правка любой из баз сбрасывает.
export const loadAiCatalog: () => Promise<AiEntry[]> =
  revisionedCache(['villas', 'apartments', 'complexes', 'developers', 'rental'], 30 * 60 * 1000, build)

// --- Текст ---------------------------------------------------------------

const PCT_RE = /\d+(?:[.,]\d+)?\s?%/
// «Доходность», «yield», «ROI» … на всех языках сайта. Предложение с
// процентом и таким словом — это заявленная доходность из текста
// застройщика; в AI-слое её место занимает наша оценка.
const YIELD_WORD_RE = /yield|return|roi\b|доходн|окупаем|rendite|rendement|rentabilit|rendimiento|imbal hasil|hasil investasi|keuntungan|收益|回报|回報|opbrengst|rentown|zwrot|дохідн|прибутков/i

// «Доходность не указана» тоже убираем: рядом стоит наша оценка, и фраза
// ей противоречила бы.
const NO_DATA_RE = /no (?:yield |return )?data|not (?:stated|specified|provided|available)|no data on|нет данных|не указан|не заявлен|отсутству/i

export function stripYieldClaims(text: string): string {
  const sentences = text.split(/(?<=[.!?。！？])\s+/)
  return sentences
    .filter(s => !(YIELD_WORD_RE.test(s) && (PCT_RE.test(s) || NO_DATA_RE.test(s))))
    .join(' ').trim()
}

// Телефоны и мессенджеры частных арендодателей из объявлений: AI-слой не
// должен раздавать чужие контакты.
const CONTACT_PATTERNS: RegExp[] = [
  /https?:\/\/(?:wa\.me|api\.whatsapp\.com|t\.me|telegram\.me)\/\S*/gi,
  /\b(?:wa\.me|t\.me)\/\S*/gi,
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,
  // +62 811-3831-9624, +6285941320413, (+62) 877 65341723. Только с «+»
  // или индонезийским мобильным префиксом: цены вида «2 000 000 000» не трогаем.
  /\(?\+\d{1,3}\)?[\s.-]?(?:\(0\)[\s.-]?)?\d{2,4}(?:[\s.-]?\d{2,5}){1,4}\b/g,
  /\b(?:62[\s.-]?|0)8\d{1,3}(?:[\s.-]?\d{2,5}){1,4}\b/g,
]
// Подпись, от которой после вырезания номера ничего не осталось: «WhatsApp:».
const CONTACT_LABEL_RE = /(?:📲|📞|☎️?|📩)?\s*\b(?:whats\s?app|WA|telegram|phone|tel|телефон)\b\s*[:：]?(?=\s*(?:$|[.,;!)\n]|\p{Extended_Pictographic}))/giu

export function stripContacts(text: string): string {
  let s = text
  for (const re of CONTACT_PATTERNS) s = s.replace(re, '')
  s = s.replace(CONTACT_LABEL_RE, '')
  return s.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim()
}

export function sanitizeAiText(text: string): string {
  return stripContacts(stripYieldClaims(text))
}

// --- Строки фактов ---------------------------------------------------------

type L = 'ru' | 'en'

const STATUS_EN: Record<string, string> = {
  'строится': 'under construction',
  'построен': 'completed',
  'построена': 'completed',
  'готов': 'completed',
  'под заказ': 'built to order',
  'проект': 'project stage',
}

function pct(x: number, l: L): string {
  const v = (Math.round(x * 1000) / 10).toFixed(1)
  return (l === 'ru' ? v.replace('.', ',') : v) + '%'
}

function usd(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

const TONE_TEXT: Record<L, Record<Tone, string>> = {
  ru: { plus: 'выше среднего', warn: 'средне', minus: 'слабо' },
  en: { plus: 'strong', warn: 'average', minus: 'weak' },
}

/** Строка доходности: своя оценка, рядом — заявление застройщика с пометкой. */
export function yieldLine(e: AiEntry, lang: string): string | null {
  if (e.kind !== 'villa' && e.kind !== 'apartment') return null
  const l: L = lang === 'ru' ? 'ru' : 'en'
  const claim = e.claimedYield != null && e.claimedYield > 0 && e.claimedYield < 1 ? e.claimedYield : null
  const y = e.yield
  if (!y) {
    // Без нашей оценки цифру застройщика не повторяем — иначе она снова
    // окажется единственной.
    return l === 'ru'
      ? 'Доходность по расчёту Balinsky: не посчитана — мало данных по аренде рядом.'
      : 'Balinsky yield estimate: not calculated — not enough rental data nearby.'
  }
  const occ = y.occupancy != null ? Math.round(y.occupancy * 100) : null
  const basis = l === 'ru'
    ? (y.mode === 'monthly'
        ? 'помесячная сдача (посуточная на этой земле ограничена)'
        : `посуточная сдача${occ != null ? `, загрузка ${occ}%` : ''}${y.occSource === 'actual' ? ' по реальным броням' : y.occSource === 'booking' ? ' самого объекта на Booking' : ' похожих объектов рядом'}`)
    : (y.mode === 'monthly'
        ? 'monthly rental (daily rental restricted on this land)'
        : `daily rental${occ != null ? `, ${occ}% occupancy` : ''}${y.occSource === 'actual' ? ' from actual bookings' : y.occSource === 'booking' ? ' of this property on Booking' : ' of comparable listings nearby'}`)
  const tone = TONE_TEXT[l][moneyTone(y.capBefore)]
  const parts: string[] = []
  if (l === 'ru') {
    parts.push(`Доходность по расчёту Balinsky: ${pct(y.capBefore, l)} в год до налогов` +
      (y.capNonres != null ? `, ${pct(y.capNonres, l)} для нерезидента` : '') + ` (${basis}). Итог по доходу: ${tone}.`)
    if (claim != null) parts.push(`Застройщик заявляет ${pct(claim, l)} — это его цифра, не наша оценка.`)
  } else {
    parts.push(`Balinsky yield estimate: ${pct(y.capBefore, l)}/yr before tax` +
      (y.capNonres != null ? `, ${pct(y.capNonres, l)} for a non-resident` : '') + ` (${basis}). Income verdict: ${tone}.`)
    if (claim != null) parts.push(`The developer claims ${pct(claim, l)} — the developer's figure, not Balinsky's estimate.`)
  }
  return parts.join(' ')
}

/** Короткая строка фактов: цена, площадь, спальни, участок, лизхолд, статус. */
export function factsLine(e: AiEntry, lang: string): string | null {
  const l: L = lang === 'ru' ? 'ru' : 'en'
  const f: string[] = []
  const status = e.status ? (l === 'ru' ? e.status.toLowerCase() : STATUS_EN[e.status.toLowerCase()] ?? null) : null
  if (e.priceUsd != null && e.priceUsd > 0) f.push(l === 'ru' ? `цена ${usd(e.priceUsd)}` : `price ${usd(e.priceUsd)}`)
  if (e.rentMonthUsd != null && e.rentMonthUsd > 0) f.push(l === 'ru' ? `${usd(e.rentMonthUsd)} в месяц` : `${usd(e.rentMonthUsd)}/month`)
  if (e.areaSqm != null && e.areaSqm > 0) f.push(l === 'ru' ? `${e.areaSqm} м²` : `${e.areaSqm} m²`)
  if (e.bedrooms) f.push(l === 'ru' ? `спален: ${e.bedrooms}` : `bedrooms: ${e.bedrooms}`)
  if (e.landSqm != null && e.landSqm > 0) f.push(l === 'ru' ? `участок ${e.landSqm} м²` : `land ${e.landSqm} m²`)
  const lease = e.leaseYears && /^\d+(?:[.,]\d+)?$/.test(e.leaseYears.trim()) ? e.leaseYears.trim() : null
  if (lease) f.push(l === 'ru' ? `лизхолд ${lease} лет` : `leasehold ${lease} years`)
  if (status) f.push(status)
  if (e.year) f.push(l === 'ru' ? `сдача ${e.year}` : `completion ${e.year}`)
  if (e.district) f.push(e.district)
  if (e.developer && e.kind !== 'developer') f.push(l === 'ru' ? `застройщик ${e.developer}` : `developer ${e.developer}`)
  return f.length ? f.join(' · ') : null
}
