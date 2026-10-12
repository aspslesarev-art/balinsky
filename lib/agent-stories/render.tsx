// Три картинки 1080×1920 для сторис агента: обложка, главное, контакт.
// Без названия ЖК, застройщика и Balinsky — агент ставит их от себя.
// Фото отзеркалены: по поиску картинок объект находится хуже.
//
// next/og (Satori): только flex, у каждого блока с несколькими детьми —
// display:flex; шрифт грузим явно (Inter есть в public/fonts, кириллица в нём есть).

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import type { StoryData } from './data'

export const STORY_COUNT = 3
const W = 1080
const H = 1920
// Верх и низ сторис закрывают элементы Instagram/Telegram — текст держим внутри.
const SAFE_TOP = 220
const SAFE_BOTTOM = 240
const SIDE = 72

const INK = '#14302f'
const INK2 = '#3c5654'
const MUTED = '#6b7f7c'
const PAPER = '#f6f4ef'
const LINE = '#dde3e0'
const ACCENT = '#e0763a'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://balinsky.info'

let fontsPromise: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }[]> | null = null
async function fontFile(name: string): Promise<ArrayBuffer> {
  try {
    const buf = await readFile(join(process.cwd(), 'public/fonts', name))
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  } catch {
    const r = await fetch(`${SITE}/fonts/${name}`)
    if (!r.ok) throw new Error(`font ${name}: ${r.status}`)
    return await r.arrayBuffer()
  }
}
function loadFonts() {
  fontsPromise ??= Promise.all([fontFile('Inter-Regular.otf'), fontFile('Inter-Bold.otf')])
    .then(([regular, bold]) => [
      { name: 'Inter', data: regular, weight: 400 as const, style: 'normal' as const },
      { name: 'Inter', data: bold, weight: 700 as const, style: 'normal' as const },
    ])
    .catch(err => { fontsPromise = null; throw err })
  return fontsPromise
}

const nbsp = ' '
function usd(n: number): string {
  return '$' + Math.round(n).toLocaleString('ru-RU').replace(/\s/g, nbsp)
}
function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
function km(n: number): string {
  return `${n < 10 ? n.toFixed(1).replace('.', ',') : Math.round(n)}${nbsp}км`
}

function headline(d: StoryData): string {
  if (d.kind === 'complex') {
    const types = unitTypesLine(d.unitTypes)
    return types ? `Комплекс: ${types}` : 'Жилой комплекс'
  }
  const what = d.kind === 'villa' ? 'Вилла' : 'Апартаменты'
  if (d.bedrooms == null) return what
  if (d.bedrooms === 0) return d.kind === 'apartment' ? 'Апартаменты-студия' : what
  return `${what}, ${d.bedrooms}${nbsp}${plural(d.bedrooms, 'спальня', 'спальни', 'спален')}`
}

function unitTypesLine(types: string[]): string | null {
  const t = types.map(s => s.toLowerCase())
  const has = (re: RegExp) => t.some(s => re.test(s))
  const parts = [has(/вилл|villa/) && 'виллы', has(/апарт|apart|студ|loft|лофт|таунх/) && 'апартаменты'].filter(Boolean) as string[]
  return parts.length ? parts.join(' и ') : null
}

function statusLine(d: StoryData): string {
  const ready = d.kind === 'villa' ? 'Вилла построена' : d.kind === 'apartment' ? 'Апартаменты построены' : 'Комплекс построен'
  if (d.ready) return ready
  const y = d.completionYear && /^\d{4}$/.test(d.completionYear) ? d.completionYear : null
  return y ? `Строится, сдача ${y}` : 'Строится'
}

type Fact = { value: string; label: string }
function facts(d: StoryData): Fact[] {
  const out: Fact[] = []
  if (d.area != null) out.push({ value: `${Math.round(d.area)}${nbsp}м²`, label: d.kind === 'villa' ? 'площадь дома' : 'площадь' })
  if (d.land != null) out.push({ value: `${Math.round(d.land)}${nbsp}м²`, label: 'участок' })
  if (d.leaseYears != null && d.leaseYears > 0) out.push({ value: `${d.leaseYears}${nbsp}${plural(d.leaseYears, 'год', 'года', 'лет')}`, label: 'лизхолд - аренда земли' })
  if (d.kind !== 'complex' && d.priceUsd != null && d.area != null && d.area > 0) out.push({ value: usd(d.priceUsd / d.area), label: 'за м²' })
  if (d.airportKm != null) out.push({ value: km(d.airportKm), label: 'до аэропорта' })
  return out.slice(0, 5)
}

// Фото на всю ширину, отзеркаленное. Нет фото — спокойная заливка.
function Photo({ src, width, height, radius = 0 }: { src: string | undefined; width: number; height: number; radius?: number }) {
  if (!src) return <div style={{ display: 'flex', width, height, background: '#2a4a48', borderRadius: radius }} />
  return (
    <div style={{ display: 'flex', width, height, overflow: 'hidden', borderRadius: radius }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={width} height={height} alt="" style={{ width, height, objectFit: 'cover', transform: 'scaleX(-1)' }} />
    </div>
  )
}

function Cover(d: StoryData) {
  const photoH = 1200
  const price = d.priceUsd != null ? `${d.priceFrom ? 'от ' : ''}${usd(d.priceUsd)}` : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: INK, color: '#fff', position: 'relative' }}>
      <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0 }}>
        <Photo src={d.photos[0]} width={W} height={photoH} />
      </div>
      <div style={{ display: 'flex', position: 'absolute', top: photoH - 520, left: 0, width: W, height: 520, backgroundImage: `linear-gradient(180deg, rgba(20,48,47,0) 0%, ${INK} 100%)` }} />
      <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: SIDE, right: SIDE, bottom: SAFE_BOTTOM }}>
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, letterSpacing: 2.5, color: ACCENT, textTransform: 'uppercase' }}>
          {[d.district, 'Бали'].filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, marginTop: 24 }}>{headline(d)}</div>
        {price && <div style={{ display: 'flex', fontSize: 104, fontWeight: 700, letterSpacing: -2, marginTop: 40 }}>{price}</div>}
        <div style={{ display: 'flex', marginTop: 48 }}>
          <div style={{ display: 'flex', background: ACCENT, color: '#fff', fontSize: 36, fontWeight: 700, padding: '20px 32px', borderRadius: 12 }}>{statusLine(d)}</div>
        </div>
      </div>
    </div>
  )
}

function Facts(d: StoryData) {
  const list = facts(d)
  const photoW = (W - SIDE * 2 - 24) / 2
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: PAPER, color: INK, padding: `${SAFE_TOP}px ${SIDE}px ${SAFE_BOTTOM}px` }}>
      <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, letterSpacing: 2.5, color: ACCENT, textTransform: 'uppercase' }}>Главное</div>
      <div style={{ display: 'flex', fontSize: 80, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5, marginTop: 16 }}>{headline(d)}</div>
      <div style={{ display: 'flex', marginTop: 48, gap: 24 }}>
        <Photo src={d.photos[1] ?? d.photos[0]} width={photoW} height={520} radius={24} />
        <Photo src={d.photos[2] ?? d.photos[0]} width={photoW} height={520} radius={24} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 48 }}>
        {list.map(f => (
          <div key={f.label} style={{ display: 'flex', alignItems: 'center', borderTop: `2px solid ${LINE}`, padding: '26px 0' }}>
            <div style={{ display: 'flex', width: 380, fontSize: 60, fontWeight: 700, letterSpacing: -1 }}>{f.value}</div>
            <div style={{ display: 'flex', flex: 1, fontSize: 36, color: INK2 }}>{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Contact(d: StoryData) {
  const photoH = 1240
  const today = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Makassar' })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: PAPER, color: INK, position: 'relative' }}>
      <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0 }}>
        <Photo src={d.photos[3] ?? d.photos[0]} width={W} height={photoH} />
      </div>
      <div style={{ display: 'flex', position: 'absolute', top: photoH - 300, left: 0, width: W, height: 300, backgroundImage: `linear-gradient(180deg, rgba(246,244,239,0) 0%, ${PAPER} 100%)` }} />
      <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: SIDE, right: SIDE, bottom: SAFE_BOTTOM }}>
        <div style={{ display: 'flex', fontSize: 80, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>Хотите подробнее?</div>
        <div style={{ display: 'flex', fontSize: 40, lineHeight: 1.4, color: INK2, marginTop: 24 }}>Пришлю фото, планировку и условия покупки</div>
        <div style={{ display: 'flex', marginTop: 48, background: ACCENT, color: '#fff', borderRadius: 24, padding: '44px 48px', fontSize: 48, fontWeight: 700 }}>Напишите мне</div>
        <div style={{ display: 'flex', fontSize: 26, color: MUTED, marginTop: 32 }}>{`Цена на ${today}`}</div>
      </div>
    </div>
  )
}

const SLIDES = [Cover, Facts, Contact]

export async function renderStory(d: StoryData, n: number): Promise<ImageResponse> {
  const Slide = SLIDES[n - 1]
  if (!Slide) throw new Error(`story ${n} out of range`)
  const fonts = await loadFonts()
  return new ImageResponse(<Slide {...d} />, { width: W, height: H, fonts })
}
