'use client'
// Wind rose: where the wind blows FROM, share of hours per direction, for the
// whole year and for each of Bali's two seasons (they blow from opposite
// sides, so the yearly picture alone hides the story).
//
// Data: climate.wind, built from six years of {src} POWER hourly 10 m wind
// (scripts/build-listing-environment.mjs --wind). Renders nothing without data.
import { useState } from 'react'
import type { Wind, WindRoseData } from '@/lib/complex-access'
import { pickCopy, type Lang } from '@/lib/i18n'

type Season = 'all' | 'dry' | 'wet'

const COPY = {
  ru: { title: 'Роза ветров', all: 'Год', dry: 'Сухой сезон', wet: 'Сезон дождей', dryMonths: 'апр — окт', wetMonths: 'ноя — мар', mostly: 'Чаще всего дует', ofTime: 'времени', avg: 'Средний ветер', ms: 'м/с', note: '{src}, почасовые данные за {n} лет. Показывает, откуда дует ветер.', compass: ['С', 'В', 'Ю', 'З'], from: ['с севера', 'с северо-востока', 'с востока', 'с юго-востока', 'с юга', 'с юго-запада', 'с запада', 'с северо-запада'], breeze: ['почти штиль', 'лёгкий ветер', 'слабый бриз', 'умеренный ветер'] },
  en: { title: 'Wind rose', all: 'Year', dry: 'Dry season', wet: 'Rainy season', dryMonths: 'Apr — Oct', wetMonths: 'Nov — Mar', mostly: 'Mostly blows', ofTime: 'of the time', avg: 'Average wind', ms: 'm/s', note: '{src} hourly data, {n} years. Shows where the wind comes from.', compass: ['N', 'E', 'S', 'W'], from: ['from the north', 'from the north-east', 'from the east', 'from the south-east', 'from the south', 'from the south-west', 'from the west', 'from the north-west'], breeze: ['nearly calm', 'light breeze', 'gentle breeze', 'moderate wind'] },
  id: { title: 'Mawar angin', all: 'Tahun', dry: 'Musim kemarau', wet: 'Musim hujan', dryMonths: 'Apr — Okt', wetMonths: 'Nov — Mar', mostly: 'Paling sering bertiup', ofTime: 'dari waktu', avg: 'Angin rata-rata', ms: 'm/d', note: 'Data per jam {src}, {n} tahun. Menunjukkan arah datangnya angin.', compass: ['U', 'T', 'S', 'B'], from: ['dari utara', 'dari timur laut', 'dari timur', 'dari tenggara', 'dari selatan', 'dari barat daya', 'dari barat', 'dari barat laut'], breeze: ['hampir tenang', 'angin sepoi', 'angin lembut', 'angin sedang'] },
  fr: { title: 'Rose des vents', all: 'Année', dry: 'Saison sèche', wet: 'Saison des pluies', dryMonths: 'avr — oct', wetMonths: 'nov — mars', mostly: 'Vent dominant', ofTime: 'du temps', avg: 'Vent moyen', ms: 'm/s', note: 'Données horaires {src}, {n} ans. Indique d’où vient le vent.', compass: ['N', 'E', 'S', 'O'], from: ['du nord', 'du nord-est', 'de l’est', 'du sud-est', 'du sud', 'du sud-ouest', 'de l’ouest', 'du nord-ouest'], breeze: ['presque calme', 'brise légère', 'petite brise', 'vent modéré'] },
  de: { title: 'Windrose', all: 'Jahr', dry: 'Trockenzeit', wet: 'Regenzeit', dryMonths: 'Apr — Okt', wetMonths: 'Nov — März', mostly: 'Meist weht er', ofTime: 'der Zeit', avg: 'Mittlerer Wind', ms: 'm/s', note: 'Stündliche {src}-Daten, {n} Jahre. Zeigt, woher der Wind kommt.', compass: ['N', 'O', 'S', 'W'], from: ['aus Norden', 'aus Nordosten', 'aus Osten', 'aus Südosten', 'aus Süden', 'aus Südwesten', 'aus Westen', 'aus Nordwesten'], breeze: ['fast windstill', 'leichte Brise', 'schwache Brise', 'mäßiger Wind'] },
  zh: { title: '风玫瑰图', all: '全年', dry: '旱季', wet: '雨季', dryMonths: '4—10月', wetMonths: '11—3月', mostly: '主导风向', ofTime: '的时间', avg: '平均风速', ms: '米/秒', note: '{src} 逐小时数据，{n} 年。显示风的来向。', compass: ['北', '东', '南', '西'], from: ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'], breeze: ['近乎无风', '轻风', '微风', '和风'] },
  nl: { title: 'Windroos', all: 'Jaar', dry: 'Droog seizoen', wet: 'Regenseizoen', dryMonths: 'apr — okt', wetMonths: 'nov — mrt', mostly: 'Meestal waait hij', ofTime: 'van de tijd', avg: 'Gemiddelde wind', ms: 'm/s', note: 'Uurgegevens van {src}, {n} jaar. Laat zien waar de wind vandaan komt.', compass: ['N', 'O', 'Z', 'W'], from: ['uit het noorden', 'uit het noordoosten', 'uit het oosten', 'uit het zuidoosten', 'uit het zuiden', 'uit het zuidwesten', 'uit het westen', 'uit het noordwesten'], breeze: ['bijna windstil', 'zwakke wind', 'lichte bries', 'matige wind'] },
  ban: { title: 'Mawar angin', all: 'Warsa', dry: 'Masan panes', wet: 'Masan ujan', dryMonths: 'Apr — Okt', wetMonths: 'Nov — Mar', mostly: 'Sering ngampehang', ofTime: 'saking galah', avg: 'Angin rata-rata', ms: 'm/d', note: 'Data {src} sabilang jam, {n} warsa. Nyinahang saking dija angin rauh.', compass: ['U', 'K', 'S', 'B'], from: ['saking kaja', 'saking kaja kangin', 'saking kangin', 'saking kelod kangin', 'saking kelod', 'saking kelod kauh', 'saking kauh', 'saking kaja kauh'], breeze: ['meh tenang', 'angin alon', 'angin lemuh', 'angin sedeng'] },
  pl: { title: 'Róża wiatrów', all: 'Rok', dry: 'Pora sucha', wet: 'Pora deszczowa', dryMonths: 'kwi — paź', wetMonths: 'lis — mar', mostly: 'Najczęściej wieje', ofTime: 'czasu', avg: 'Średni wiatr', ms: 'm/s', note: 'Godzinowe dane {src}, {n} lat. Pokazuje, skąd wieje wiatr.', compass: ['N', 'E', 'S', 'W'], from: ['z północy', 'z północnego wschodu', 'ze wschodu', 'z południowego wschodu', 'z południa', 'z południowego zachodu', 'z zachodu', 'z północnego zachodu'], breeze: ['prawie cisza', 'słaby wiatr', 'lekka bryza', 'umiarkowany wiatr'] },
  uk: { title: 'Роза вітрів', all: 'Рік', dry: 'Сухий сезон', wet: 'Сезон дощів', dryMonths: 'квіт — жовт', wetMonths: 'лист — бер', mostly: 'Найчастіше дме', ofTime: 'часу', avg: 'Середній вітер', ms: 'м/с', note: 'Погодинні дані {src} за {n} років. Показує, звідки дме вітер.', compass: ['Пн', 'Сх', 'Пд', 'Зх'], from: ['з півночі', 'з північного сходу', 'зі сходу', 'з південного сходу', 'з півдня', 'з південного заходу', 'із заходу', 'з північного заходу'], breeze: ['майже штиль', 'легкий вітер', 'слабкий бриз', 'помірний вітер'] },
} as const

// Beaufort 1–4 by mean speed, in words a buyer can picture.
function breezeLevel(ms: number): number {
  return ms < 1.6 ? 0 : ms < 3.4 ? 1 : ms < 5.5 ? 2 : 3
}

const LOCALE: Record<Lang, string> = { ru: 'ru', en: 'en', id: 'id', fr: 'fr', de: 'de', zh: 'zh', nl: 'nl', ban: 'id', pl: 'pl', uk: 'uk' }

const C = 100          // centre of the 200×200 viewBox
const R = 78           // radius of the longest petal

function petal(i: number, r: number): string {
  // Sector i is centred on i*45° clockwise from north; petals are 36° wide so
  // neighbours keep a visible gap.
  const a0 = ((i * 45 - 18) * Math.PI) / 180
  const a1 = ((i * 45 + 18) * Math.PI) / 180
  const p = (a: number) => `${(C + r * Math.sin(a)).toFixed(1)},${(C - r * Math.cos(a)).toFixed(1)}`
  return `M${C},${C} L${p(a0)} A${r},${r} 0 0 1 ${p(a1)} Z`
}

function Petals({ data, onMap }: { data: WindRoseData; onMap: boolean }) {
  const max = Math.max(...data.pct, 1)
  const top = data.pct.indexOf(max)
  return (
    <>
      {data.pct.map((v, i) => v > 0 && (
        <path
          key={i}
          d={petal(i, Math.max(4, (v / max) * R))}
          fill={onMap ? '#fff' : 'var(--color-primary)'}
          fillOpacity={onMap ? (i === top ? 0.6 : 0.35) : (i === top ? 0.9 : 0.4)}
          stroke={onMap ? 'var(--color-primary)' : 'none'}
          strokeWidth={onMap ? 2 : 0}
          strokeLinejoin="round"
        />
      ))}
    </>
  )
}

function Rose({ data, compass }: { data: WindRoseData; compass: readonly string[] }) {
  return (
    <svg viewBox="0 0 200 200" className="h-auto w-full max-w-[200px]" aria-hidden="true">
      {[0.33, 0.66, 1].map((k) => (
        <circle key={k} cx={C} cy={C} r={R * k} fill="none" stroke="var(--color-border)" strokeWidth="1" />
      ))}
      <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="var(--color-border)" strokeWidth="1" />
      <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="var(--color-border)" strokeWidth="1" />
      <Petals data={data} onMap={false} />
      {compass.map((label, i) => {
        const pos = [[C, 12], [192, C], [C, 192], [8, C]][i]
        return (
          <text key={label} x={pos[0]} y={pos[1]} textAnchor="middle" dominantBaseline="central"
            className="fill-[var(--color-text-muted)] text-[11px] font-medium">{label}</text>
        )
      })}
    </svg>
  )
}

// Satellite tiles (Esri World Imagery — same source as the sun-and-shadow
// block, no billing) laid out so the listing sits dead centre, with the rose
// drawn over it. Zoom 15 ≈ 1.5 km across: enough to see the coast, rice
// fields and roads the wind crosses before it reaches the plot.
const Z = 15
const TILE = 256

function tileOf(lat: number, lng: number) {
  const n = 2 ** Z
  const x = ((lng + 180) / 360) * n
  const phi = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n
  return { x0: Math.floor(x), y0: Math.floor(y), fx: Math.round((x - Math.floor(x)) * TILE), fy: Math.round((y - Math.floor(y)) * TILE) }
}

function MapRose({ data, compass, lat, lng }: { data: WindRoseData; compass: readonly string[]; lat: number; lng: number }) {
  const { x0, y0, fx, fy } = tileOf(lat, lng)
  const tiles: { dx: number; dy: number }[] = []
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) tiles.push({ dx, dy })
  return (
    <div className="relative aspect-square w-full max-w-[320px] overflow-hidden rounded-xl bg-[var(--color-neutral-200)]">
      <div
        className="absolute"
        style={{ width: TILE * 3, height: TILE * 3, left: `calc(50% - ${TILE + fx}px)`, top: `calc(50% - ${TILE + fy}px)`, transform: 'translateZ(0)' }}
      >
        {tiles.map(({ dx, dy }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${dx}:${dy}`}
            src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${Z}/${y0 + dy}/${x0 + dx}`}
            alt=""
            width={TILE + 1}
            height={TILE + 1}
            loading="lazy"
            decoding="async"
            className="absolute max-w-none select-none"
            style={{ left: (dx + 1) * TILE, top: (dy + 1) * TILE }}
            draggable={false}
          />
        ))}
      </div>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {[0.33, 0.66, 1].map((k) => (
          <circle key={k} cx={C} cy={C} r={R * k} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.8" />
        ))}
        <Petals data={data} onMap />
        <circle cx={C} cy={C} r="4.5" fill="var(--color-primary)" stroke="#fff" strokeWidth="1.5" />
        {compass.map((label, i) => {
          const pos = [[C, 11], [190, C], [C, 190], [10, C]][i]
          return (
            <text key={label} x={pos[0]} y={pos[1]} textAnchor="middle" dominantBaseline="central"
              fill="#fff" stroke="rgb(0 0 0 / .45)" strokeWidth="2.5" paintOrder="stroke"
              className="text-[11px] font-semibold">{label}</text>
          )
        })}
      </svg>
      <span className="absolute bottom-1 right-1.5 text-[9px] text-white/80 [text-shadow:0_0_2px_rgb(0_0_0/.6)]">Esri, Maxar</span>
    </div>
  )
}

type Props = { wind: Wind | null | undefined; lang: Lang; lat?: number | null; lng?: number | null }

export function WindRose({ wind, lang, lat, lng }: Props) {
  const [season, setSeason] = useState<Season>('all')
  const t = pickCopy(COPY, lang)
  if (!wind?.all?.pct?.length) return null

  const data = wind[season] ?? wind.all
  const max = Math.max(...data.pct)
  const top = data.pct.indexOf(max)
  const num = (n: number) => n.toLocaleString(LOCALE[lang] ?? 'en', { maximumFractionDigits: 1 })
  const tabs: { key: Season; label: string; sub?: string }[] = [
    { key: 'all', label: t.all },
    { key: 'dry', label: t.dry, sub: t.dryMonths },
    { key: 'wet', label: t.wet, sub: t.wetMonths },
  ]

  return (
    <div>
      <h4 className="mb-3 text-[14px] font-semibold text-[var(--color-text)]">{t.title}</h4>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {lat != null && lng != null ? (
          <div className="w-full shrink-0 sm:w-[280px]">
            <MapRose data={data} compass={t.compass} lat={lat} lng={lng} />
          </div>
        ) : (
          <div className="w-[168px] shrink-0">
            <Rose data={data} compass={t.compass} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div role="group" aria-label={t.title} className="mb-3 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={season === tab.key}
                onClick={() => setSeason(tab.key)}
                className={`rounded-lg border px-3 py-1.5 text-left text-[13px] leading-tight transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                  season === tab.key
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] font-medium text-[var(--color-text)]'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:border-[var(--color-neutral-300)] hover:text-[var(--color-text)]'
                }`}
              >
                {tab.label}
                {tab.sub && <span className="block text-[11px] font-normal text-[var(--color-text-muted)]">{tab.sub}</span>}
              </button>
            ))}
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--color-text)]">
            {t.mostly} <span className="font-semibold">{t.from[top]}</span> — {Math.round(max)}% {t.ofTime}
          </p>
          <p className="text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            {t.avg}: {num(data.avg_ms)} {t.ms} · {t.breeze[breezeLevel(data.avg_ms)]}
          </p>
          <p className="mt-2 text-[12px] leading-snug text-[var(--color-text-muted)]">
            {t.note.replace('{src}', wind.src.startsWith('ERA5') ? 'Copernicus ERA5-Land' : 'NASA').replace('{n}', String(wind.years))}
          </p>
        </div>
      </div>
    </div>
  )
}
