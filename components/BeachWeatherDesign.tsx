import Image from 'next/image'
import { pickCopy, type Lang } from '@/lib/i18n'
import type { BeachProfile } from '@/lib/beaches'
import type { Climate } from '@/lib/complex-access'

const SAND: Record<string, { ru: string; en: string }> = {
  white: { ru: 'белый песок', en: 'white sand' },
  golden: { ru: 'золотистый песок', en: 'golden sand' },
  grey: { ru: 'серый песок', en: 'grey sand' },
  black: { ru: 'чёрный вулканический песок', en: 'black volcanic sand' },
  mixed: { ru: 'песок с камнями', en: 'sand and rocks' },
}
const WATER: Record<string, { ru: string; en: string }> = {
  calm: { ru: 'спокойная вода', en: 'calm water' },
  moderate: { ru: 'небольшие волны', en: 'small waves' },
  waves: { ru: 'волны', en: 'waves' },
  strong_currents: { ru: 'сильные течения', en: 'strong currents' },
}
const SWIM: Record<string, { ru: string; en: string }> = {
  yes: { ru: 'можно', en: 'yes' },
  high_tide_only: { ru: 'только в прилив', en: 'high tide only' },
  not_recommended: { ru: 'не стоит', en: 'not recommended' },
}
const KIDS: Record<string, { ru: string; en: string }> = {
  yes: { ru: 'да', en: 'yes' },
  with_care: { ru: 'с осторожностью', en: 'with care' },
  no: { ru: 'нет', en: 'no' },
}
const SURF: Record<string, { ru: string; en: string }> = {
  none: { ru: 'нет', en: 'no' },
  beginner: { ru: 'для новичков', en: 'beginners' },
  intermediate: { ru: 'для тех, кто уже катается', en: 'intermediate' },
  advanced: { ru: 'для опытных', en: 'advanced' },
}
const ACT: Record<string, { ru: string; en: string }> = {
  snorkeling: { ru: 'снорклинг', en: 'snorkelling' },
  diving: { ru: 'дайвинг', en: 'diving' },
  sup: { ru: 'сап', en: 'SUP' },
  kayak: { ru: 'каяк', en: 'kayak' },
  jet_ski: { ru: 'гидроцикл', en: 'jet ski' },
  parasailing: { ru: 'парасейлинг', en: 'parasailing' },
  banana_boat: { ru: 'банан', en: 'banana boat' },
  boat_trips: { ru: 'лодки на острова', en: 'boats to islands' },
  fishing: { ru: 'рыбалка', en: 'fishing' },
  horse_riding: { ru: 'конные прогулки', en: 'horse riding' },
  paragliding: { ru: 'параплан', en: 'paragliding' },
  yoga: { ru: 'йога', en: 'yoga' },
}

const COPY = {
  ru: {
    swimL: 'Купаться', kidsL: 'С детьми', surfL: 'Сёрфинг', actL: 'Ещё',
    nearL: 'У пляжа', promL: 'Набережная', vibeL: 'Кому подходит', whyL: 'Почему туда ходят',
    promYes: 'есть', promNo: 'нет',
    weather: 'Погода',
    sunnyDays: 'солнечных дней в году',
    windDir: ['Север', 'Северо-восток', 'Восток', 'Юго-восток', 'Юг', 'Юго-запад', 'Запад', 'Северо-запад'],
    windCardinal: ['С', 'В', 'Ю', 'З'],
    mainDir: 'основное направление',
    avgSpeed: 'ср. скорость',
    ms: 'м/с',
    drySeason: 'апр–окт: ЮВ (сухой сезон)',
    wetSeason: 'ноя–мар: З (влажный сезон)',
  },
  en: {
    swimL: 'Swimming', kidsL: 'With kids', surfL: 'Surf', actL: 'Also',
    nearL: 'Nearby', promL: 'Promenade', vibeL: 'Who it suits', whyL: 'Why people go',
    promYes: 'yes', promNo: 'no',
    weather: 'Weather',
    sunnyDays: 'sunny days a year',
    windDir: ['North', 'North-east', 'East', 'South-east', 'South', 'South-west', 'West', 'North-west'],
    windCardinal: ['N', 'E', 'S', 'W'],
    mainDir: 'prevailing direction',
    avgSpeed: 'avg speed',
    ms: 'm/s',
    drySeason: 'Apr–Oct: SE (dry season)',
    wetSeason: 'Nov–Mar: W (wet season)',
  },
} as const

const MONTHS = {
  ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
} as const

function beachRows(b: BeachProfile, lang: Lang): { k: string; v: string }[] {
  const c = pickCopy(COPY, lang)
  const isRu = lang === 'ru' || lang === 'uk'
  const note = (s?: string | null) => (isRu && s ? ` - ${s[0].toLowerCase()}${s.slice(1)}` : '')
  const rows: { k: string; v: string }[] = []
  if (b.swim) rows.push({ k: c.swimL, v: (pickCopy(SWIM[b.swim] ?? {}, lang) ?? b.swim) + note(b.swim_note) })
  if (b.kids) rows.push({ k: c.kidsL, v: (pickCopy(KIDS[b.kids] ?? {}, lang) ?? b.kids) + note(b.kids_note) })
  if (b.surf) rows.push({ k: c.surfL, v: pickCopy(SURF[b.surf] ?? {}, lang) ?? b.surf })
  const nb = b.nearby
  if (nb && nb.cafes + nb.restaurants + nb.bars + nb.beach_clubs > 0) {
    const parts = [
      nb.cafes ? `${nb.cafes} ${isRu ? 'кафе' : (nb.cafes === 1 ? 'café' : 'cafés')}` : null,
      nb.restaurants ? `${nb.restaurants} ${isRu ? (nb.restaurants === 1 ? 'ресторан' : nb.restaurants < 5 ? 'ресторана' : 'ресторанов') : (nb.restaurants === 1 ? 'restaurant' : 'restaurants')}` : null,
      nb.bars ? `${nb.bars} ${isRu ? (nb.bars === 1 ? 'бар' : nb.bars < 5 ? 'бара' : 'баров') : (nb.bars === 1 ? 'bar' : 'bars')}` : null,
      nb.beach_clubs ? `${nb.beach_clubs} ${isRu ? (nb.beach_clubs === 1 ? 'бич-клуб' : 'бич-клубов') : (nb.beach_clubs === 1 ? 'beach club' : 'beach clubs')}` : null,
    ].filter(Boolean).join(', ')
    rows.push({ k: c.nearL, v: `${parts} ${isRu ? 'в' : 'within'} ${nb.radius_m} ${isRu ? 'м' : 'm'}` })
  }
  const acts = (b.activities ?? []).map(a => pickCopy(ACT[a] ?? {}, lang)).filter(Boolean)
  if (acts.length) rows.push({ k: c.actL, v: acts.join(', ') })
  if (b.promenade?.exists != null) {
    const pv = b.promenade.exists
      ? (b.promenade.length_km ? `${c.promYes}, ${String(b.promenade.length_km).replace('.', isRu ? ',' : '.')} ${isRu ? 'км' : 'km'}` : c.promYes) + note(b.promenade.note)
      : c.promNo
    rows.push({ k: c.promL, v: pv })
  }
  if (isRu && b.vibe) rows.push({ k: c.vibeL, v: b.vibe })
  if (isRu && b.why) rows.push({ k: c.whyL, v: b.why })
  return rows
}

function WindRoseSvg({ pct, avgMs, lang }: { pct: number[]; avgMs: number; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const cx = 80, cy = 80, maxR = 44
  const maxPct = Math.max(...pct, 1)
  const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <svg viewBox="0 0 160 160" width="120" height="120" className="shrink-0">
      <circle cx={cx} cy={cy} r={44} fill="none" stroke="#E4E9E6" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={22} fill="none" stroke="#E4E9E6" strokeWidth="0.5" />
      <line x1={cx} y1={32} x2={cx} y2={128} stroke="#EEF2EF" strokeWidth="0.5" />
      <line x1={32} y1={cy} x2={128} y2={cy} stroke="#EEF2EF" strokeWidth="0.5" />
      {pct.map((p, i) => {
        if (p < 1) return null
        const r = (p / maxPct) * maxR
        const rad = (ANGLES[i] * Math.PI) / 180
        const x2 = cx + r * Math.sin(rad)
        const y2 = cy - r * Math.cos(rad)
        const opacity = 0.25 + (p / maxPct) * 0.75
        return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="#1B6E4A" strokeWidth="8" strokeLinecap="round" opacity={opacity} />
      })}
      <circle cx={cx} cy={cy} r={3} fill="#FFFFFF" stroke="#1B6E4A" strokeWidth="1.5" />
      <text x={cx} y={24} textAnchor="middle" fontSize="10" fill="#4C5751" fontFamily="inherit">{c.windCardinal[0]}</text>
      <text x={138} y={83} textAnchor="middle" fontSize="10" fill="#4C5751" fontFamily="inherit">{c.windCardinal[1]}</text>
      <text x={cx} y={146} textAnchor="middle" fontSize="10" fill="#4C5751" fontFamily="inherit">{c.windCardinal[2]}</text>
      <text x={22} y={83} textAnchor="middle" fontSize="10" fill="#4C5751" fontFamily="inherit">{c.windCardinal[3]}</text>
    </svg>
  )
}

type Props = {
  beach: BeachProfile | null
  beachKm: number
  beachPhoto: string | null
  climate: Climate | null
  lang: Lang
}

export function BeachWeatherDesign({ beach, beachKm, beachPhoto, climate, lang }: Props) {
  const c = pickCopy(COPY, lang)
  const isRu = lang === 'ru' || lang === 'uk'
  const months = pickCopy(MONTHS, lang)
  const beachName = beach ? ((lang === 'ru' ? beach.name_ru : beach.name_en) ?? beach.name_ru ?? '') : ''
  const distStr = beachKm < 1
    ? `${Math.round(beachKm * 1000 / 50) * 50} ${isRu ? 'м' : 'm'}`
    : `${beachKm.toFixed(1).replace('.', isRu ? ',' : '.')} ${isRu ? 'км' : 'km'}`
  const rows = beach ? beachRows(beach, lang) : []
  const head = beach ? [beach.sand ? pickCopy(SAND[beach.sand] ?? {}, lang) : null, beach.water ? pickCopy(WATER[beach.water] ?? {}, lang) : null].filter(Boolean).join(', ') : null
  const photo = beachPhoto ?? beach?.photos?.[0]?.src ?? null
  const year = climate?.year
  const wind = climate?.wind

  const mainSector = wind ? wind.all.pct.indexOf(Math.max(...wind.all.pct)) : -1

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
      {beach && (
        <div className="flex flex-col">
          <h2 className="text-[24px] font-semibold tracking-[-0.01em] text-[var(--color-text)] mb-3 mt-0">
            {beachName} · {distStr}
          </h2>
          {photo && (
            <div className="rounded-[10px] overflow-hidden mb-2">
              <Image src={photo} alt={beachName} width={560} height={180} sizes="(min-width: 768px) 440px, 100vw" className="w-full h-[180px] object-cover block" />
            </div>
          )}
          {head && (
            <div className="flex justify-between gap-3 py-3 border-b border-[#EEF2EF] text-[15px]">
              <span className="text-[#4C5751]">{isRu ? 'Песок и вода' : 'Sand & water'}</span>
              <span className="text-right">{head}</span>
            </div>
          )}
          {rows.map(r => (
            <div key={r.k} className="flex justify-between gap-3 py-3 border-b border-[#EEF2EF] text-[15px]">
              <span className="text-[#4C5751] shrink-0">{r.k}</span>
              <span className="text-right">{r.v}</span>
            </div>
          ))}
        </div>
      )}

      {climate && year && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[24px] font-semibold tracking-[-0.01em] text-[var(--color-text)] mt-0 mb-0">{c.weather}</h2>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-[22px] font-semibold">{year.sunny}</span>
            <span className="text-[13px] text-[#4C5751]">{c.sunnyDays} ({year.days})</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Array.from({ length: 12 }, (_, i) => {
              const mo = climate[String(i + 1).padStart(2, '0')]
              if (!mo) return null
              const tone = mo.sunny >= 21
                ? 'bg-[rgb(245_165_36/0.14)]'
                : mo.sunny >= 14
                ? 'bg-[#F3F7F4]'
                : 'bg-[rgb(80_140_255/0.10)]'
              return (
                <div key={i} className={`flex flex-col gap-0.5 rounded-lg px-2.5 py-2 ${tone}`}>
                  <span className="text-[12px] text-[#4C5751]">{months[i]}</span>
                  <span className="text-[17px] font-semibold">☀ {mo.sunny}</span>
                  <span className="text-[12px] text-[#4C5751]">{mo.t_max != null ? `${Math.round(mo.t_max)}°` : ''} · ☂ {mo.wet}</span>
                </div>
              )
            })}
          </div>

          {wind && (
            <div className="flex gap-4 items-center mt-3">
              <WindRoseSvg pct={wind.all.pct} avgMs={wind.all.avg_ms} lang={lang} />
              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-semibold">{mainSector >= 0 ? c.windDir[mainSector] : ''}</span>
                <span className="text-[13px] text-[#4C5751]">{c.mainDir}</span>
                <span className="text-[13px] text-[#4C5751]">{c.avgSpeed} {wind.all.avg_ms.toFixed(0)} {c.ms}</span>
                <span className="text-[12px] text-[#94A29A] mt-1">{c.drySeason}<br />{c.wetSeason}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
