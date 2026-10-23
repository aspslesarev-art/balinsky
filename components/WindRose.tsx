'use client'
// Ветер у дома: вид сверху на квартал вокруг объекта, по снимку летят
// стрелки ветра (вариант A из макета, владелец 21.10.2026: «роза ветров ни
// о чём не говорит — покажите сверху, как ветер летит в их сторону»).
// Под снимком — вывод словами и что это значит для дома.
//
// Данные: climate.wind — Copernicus ERA5-Land, почасовой ветер на 10 м за
// несколько лет (scripts/era5-land-wind.py). Сезоны на Бали дуют с разных
// сторон, поэтому переключатель: сухой сезон / дожди / весь год.
// Без координат — прежняя роза-диаграмма. Без данных — ничего.
import { useState } from 'react'
import type { Wind, WindRoseData } from '@/lib/complex-access'
import { pickCopy, type Lang } from '@/lib/i18n'

type Season = 'all' | 'dry' | 'wet'

// pair(fromA, fromB, baseA, baseB): «с востока и юго-востока» — два соседних
// направления одной фразой; язык сам решает, из каких форм её собрать.
// facing: куда смотрят окна, которые продувает ветер с этой стороны.
const COPY = {
  ru: {
    title: 'Ветер у дома', all: 'Весь год', dry: 'Сухой сезон', wet: 'Дожди', dryMonths: 'Апрель — октябрь', wetMonths: 'Ноябрь — март', yearLabel: 'За год',
    blows: 'ветер чаще всего', ofTime: 'времени', avg: 'в среднем', ms: 'м/с', here: 'Объект', north: 'С',
    means: 'Что это значит:',
    meaning: (facing: string) => `окна и терраса, которые смотрят ${facing}, продуваются; противоположная сторона дома — в затишье.`,
    weak: 'Ветер слабый: кондиционер всё равно понадобится.',
    note: '{src}, почасовые данные за {n} лет. Снимок Esri.',
    from: ['с севера', 'с северо-востока', 'с востока', 'с юго-востока', 'с юга', 'с юго-запада', 'с запада', 'с северо-запада'],
    base: ['севера', 'северо-востока', 'востока', 'юго-востока', 'юга', 'юго-запада', 'запада', 'северо-запада'],
    pair: (_fa: string, _fb: string, a: string, b: string) => `с ${a} и ${b}`,
    facing: ['на север', 'на северо-восток', 'на восток', 'на юго-восток', 'на юг', 'на юго-запад', 'на запад', 'на северо-запад'],
    breeze: ['почти штиль', 'лёгкий ветер', 'лёгкий бриз', 'умеренный ветер'],
  },
  en: {
    title: 'Wind at the house', all: 'Whole year', dry: 'Dry season', wet: 'Rainy season', dryMonths: 'April — October', wetMonths: 'November — March', yearLabel: 'Over the year',
    blows: 'the wind mostly blows', ofTime: 'of the time', avg: 'average', ms: 'm/s', here: 'Property', north: 'N',
    means: 'What it means:',
    meaning: (facing: string) => `windows and terraces facing ${facing} get the breeze; the opposite side of the house is sheltered.`,
    weak: 'The wind is light: you will still need air conditioning.',
    note: '{src} hourly data, {n} years. Imagery Esri.',
    from: ['from the north', 'from the north-east', 'from the east', 'from the south-east', 'from the south', 'from the south-west', 'from the west', 'from the north-west'],
    base: ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'],
    pair: (_fa: string, _fb: string, a: string, b: string) => `from the ${a} and ${b}`,
    facing: ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'],
    breeze: ['nearly calm', 'light air', 'light breeze', 'moderate wind'],
  },
  id: {
    title: 'Angin di rumah', all: 'Sepanjang tahun', dry: 'Musim kemarau', wet: 'Musim hujan', dryMonths: 'April — Oktober', wetMonths: 'November — Maret', yearLabel: 'Sepanjang tahun',
    blows: 'angin paling sering bertiup', ofTime: 'dari waktu', avg: 'rata-rata', ms: 'm/d', here: 'Properti', north: 'U',
    means: 'Artinya:',
    meaning: (facing: string) => `jendela dan teras yang menghadap ${facing} mendapat angin; sisi rumah yang berlawanan terlindung.`,
    weak: 'Anginnya lemah: AC tetap diperlukan.',
    note: 'Data per jam {src}, {n} tahun. Citra Esri.',
    from: ['dari utara', 'dari timur laut', 'dari timur', 'dari tenggara', 'dari selatan', 'dari barat daya', 'dari barat', 'dari barat laut'],
    base: ['utara', 'timur laut', 'timur', 'tenggara', 'selatan', 'barat daya', 'barat', 'barat laut'],
    pair: (_fa: string, _fb: string, a: string, b: string) => `dari ${a} dan ${b}`,
    facing: ['utara', 'timur laut', 'timur', 'tenggara', 'selatan', 'barat daya', 'barat', 'barat laut'],
    breeze: ['hampir tenang', 'angin sepoi', 'angin lembut', 'angin sedang'],
  },
  fr: {
    title: 'Le vent à la maison', all: 'Toute l’année', dry: 'Saison sèche', wet: 'Saison des pluies', dryMonths: 'Avril — octobre', wetMonths: 'Novembre — mars', yearLabel: 'Sur l’année',
    blows: 'le vent souffle surtout', ofTime: 'du temps', avg: 'en moyenne', ms: 'm/s', here: 'Le bien', north: 'N',
    means: 'Ce que cela veut dire :',
    meaning: (facing: string) => `les fenêtres et la terrasse orientées ${facing} sont ventilées ; le côté opposé de la maison est abrité.`,
    weak: 'Le vent est faible : la climatisation reste nécessaire.',
    note: 'Données horaires {src}, {n} ans. Image Esri.',
    from: ['du nord', 'du nord-est', 'de l’est', 'du sud-est', 'du sud', 'du sud-ouest', 'de l’ouest', 'du nord-ouest'],
    base: ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ouest', 'ouest', 'nord-ouest'],
    pair: (fa: string, fb: string) => `${fa} et ${fb}`,
    facing: ['au nord', 'au nord-est', 'à l’est', 'au sud-est', 'au sud', 'au sud-ouest', 'à l’ouest', 'au nord-ouest'],
    breeze: ['presque calme', 'très légère brise', 'légère brise', 'vent modéré'],
  },
  de: {
    title: 'Wind am Haus', all: 'Ganzes Jahr', dry: 'Trockenzeit', wet: 'Regenzeit', dryMonths: 'April — Oktober', wetMonths: 'November — März', yearLabel: 'Übers Jahr',
    blows: 'weht der Wind meist', ofTime: 'der Zeit', avg: 'im Mittel', ms: 'm/s', here: 'Objekt', north: 'N',
    means: 'Was das bedeutet:',
    meaning: (facing: string) => `Fenster und Terrasse nach ${facing} werden gut belüftet; die gegenüberliegende Hausseite liegt windgeschützt.`,
    weak: 'Der Wind ist schwach: eine Klimaanlage braucht man trotzdem.',
    note: 'Stündliche {src}-Daten, {n} Jahre. Bild Esri.',
    from: ['aus Norden', 'aus Nordosten', 'aus Osten', 'aus Südosten', 'aus Süden', 'aus Südwesten', 'aus Westen', 'aus Nordwesten'],
    base: ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'],
    pair: (_fa: string, _fb: string, a: string, b: string) => `aus ${a} und ${b}`,
    facing: ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'],
    breeze: ['fast windstill', 'leiser Zug', 'leichte Brise', 'mäßiger Wind'],
  },
  zh: {
    title: '房屋周边的风', all: '全年', dry: '旱季', wet: '雨季', dryMonths: '4月—10月', wetMonths: '11月—3月', yearLabel: '全年',
    blows: '最常见的风向是', ofTime: '的时间', avg: '平均', ms: '米/秒', here: '房产', north: '北',
    means: '这意味着：',
    meaning: (facing: string) => `朝${facing}的窗户和露台通风好；房屋另一侧则避风。`,
    weak: '风力较弱：仍然需要空调。',
    note: '{src} 逐小时数据，{n} 年。影像 Esri。',
    from: ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'],
    base: ['北', '东北', '东', '东南', '南', '西南', '西', '西北'],
    pair: (_fa: string, _fb: string, a: string, b: string) => `${a}风和${b}风`,
    facing: ['北', '东北', '东', '东南', '南', '西南', '西', '西北'],
    breeze: ['近乎无风', '软风', '轻风', '和风'],
  },
  nl: {
    title: 'Wind bij het huis', all: 'Heel het jaar', dry: 'Droog seizoen', wet: 'Regenseizoen', dryMonths: 'April — oktober', wetMonths: 'November — maart', yearLabel: 'Over het jaar',
    blows: 'waait de wind meestal', ofTime: 'van de tijd', avg: 'gemiddeld', ms: 'm/s', here: 'Object', north: 'N',
    means: 'Wat dit betekent:',
    meaning: (facing: string) => `ramen en terras op het ${facing} krijgen de bries; de andere kant van het huis ligt beschut.`,
    weak: 'De wind is zwak: airco blijft nodig.',
    note: 'Uurgegevens van {src}, {n} jaar. Beeld Esri.',
    from: ['uit het noorden', 'uit het noordoosten', 'uit het oosten', 'uit het zuidoosten', 'uit het zuiden', 'uit het zuidwesten', 'uit het westen', 'uit het noordwesten'],
    base: ['noorden', 'noordoosten', 'oosten', 'zuidoosten', 'zuiden', 'zuidwesten', 'westen', 'noordwesten'],
    pair: (_fa: string, _fb: string, a: string, b: string) => `uit het ${a} en ${b}`,
    facing: ['noorden', 'noordoosten', 'oosten', 'zuidoosten', 'zuiden', 'zuidwesten', 'westen', 'noordwesten'],
    breeze: ['bijna windstil', 'flauw en stil', 'zwakke bries', 'matige wind'],
  },
  ban: {
    title: 'Angin ring umah', all: 'Awarsa', dry: 'Masan panes', wet: 'Masan ujan', dryMonths: 'April — Oktober', wetMonths: 'November — Maret', yearLabel: 'Awarsa',
    blows: 'angin pinih sering ngampehang', ofTime: 'saking galah', avg: 'rata-rata', ms: 'm/d', here: 'Properti', north: 'U',
    means: 'Artinipun:',
    meaning: (facing: string) => `jendela lan teras sane madelokan ka ${facing} kenehang angin; sisi umah sane lianan tenang.`,
    weak: 'Anginnyane alon: AC kantun kaperluang.',
    note: 'Data {src} sabilang jam, {n} warsa. Citra Esri.',
    from: ['saking kaja', 'saking kaja kangin', 'saking kangin', 'saking kelod kangin', 'saking kelod', 'saking kelod kauh', 'saking kauh', 'saking kaja kauh'],
    base: ['kaja', 'kaja kangin', 'kangin', 'kelod kangin', 'kelod', 'kelod kauh', 'kauh', 'kaja kauh'],
    pair: (_fa: string, _fb: string, a: string, b: string) => `saking ${a} lan ${b}`,
    facing: ['kaja', 'kaja kangin', 'kangin', 'kelod kangin', 'kelod', 'kelod kauh', 'kauh', 'kaja kauh'],
    breeze: ['meh tenang', 'angin alon pisan', 'angin alon', 'angin sedeng'],
  },
  pl: {
    title: 'Wiatr przy domu', all: 'Cały rok', dry: 'Pora sucha', wet: 'Pora deszczowa', dryMonths: 'Kwiecień — październik', wetMonths: 'Listopad — marzec', yearLabel: 'W ciągu roku',
    blows: 'wiatr wieje najczęściej', ofTime: 'czasu', avg: 'średnio', ms: 'm/s', here: 'Obiekt', north: 'N',
    means: 'Co to oznacza:',
    meaning: (facing: string) => `okna i taras od strony ${facing} są przewiewne; przeciwna strona domu jest osłonięta.`,
    weak: 'Wiatr jest słaby: klimatyzacja i tak będzie potrzebna.',
    note: 'Godzinowe dane {src}, {n} lat. Zdjęcie Esri.',
    from: ['z północy', 'z północnego wschodu', 'ze wschodu', 'z południowego wschodu', 'z południa', 'z południowego zachodu', 'z zachodu', 'z północnego zachodu'],
    base: ['północy', 'północnego wschodu', 'wschodu', 'południowego wschodu', 'południa', 'południowego zachodu', 'zachodu', 'północnego zachodu'],
    pair: (fa: string, fb: string) => `${fa} i ${fb}`,
    facing: ['północnej', 'północno-wschodniej', 'wschodniej', 'południowo-wschodniej', 'południowej', 'południowo-zachodniej', 'zachodniej', 'północno-zachodniej'],
    breeze: ['prawie cisza', 'powiew', 'lekka bryza', 'umiarkowany wiatr'],
  },
  uk: {
    title: 'Вітер біля будинку', all: 'Весь рік', dry: 'Сухий сезон', wet: 'Дощі', dryMonths: 'Квітень — жовтень', wetMonths: 'Листопад — березень', yearLabel: 'За рік',
    blows: 'вітер найчастіше дме', ofTime: 'часу', avg: 'у середньому', ms: 'м/с', here: "Об'єкт", north: 'Пн',
    means: 'Що це означає:',
    meaning: (facing: string) => `вікна й тераса, що виходять ${facing}, провітрюються; протилежний бік будинку — у затишку.`,
    weak: 'Вітер слабкий: кондиціонер однаково знадобиться.',
    note: 'Погодинні дані {src} за {n} років. Знімок Esri.',
    from: ['з півночі', 'з північного сходу', 'зі сходу', 'з південного сходу', 'з півдня', 'з південного заходу', 'із заходу', 'з північного заходу'],
    base: ['півночі', 'північного сходу', 'сходу', 'південного сходу', 'півдня', 'південного заходу', 'заходу', 'північного заходу'],
    pair: (fa: string, fb: string) => `${fa} і ${fb}`,
    facing: ['на північ', 'на північний схід', 'на схід', 'на південний схід', 'на південь', 'на південний захід', 'на захід', 'на північний захід'],
    breeze: ['майже штиль', 'тихий вітер', 'легкий бриз', 'помірний вітер'],
  },
}

// Бофорт 1–4 по средней скорости — словами, которые покупатель себе представит.
function breezeLevel(ms: number): number {
  return ms < 1.6 ? 0 : ms < 3.4 ? 1 : ms < 5.5 ? 2 : 3
}

const LOCALE: Record<Lang, string> = { ru: 'ru', en: 'en', id: 'id', fr: 'fr', de: 'de', zh: 'zh', nl: 'nl', ban: 'id', pl: 'pl', uk: 'uk' }

/** Главное направление: самый частый сектор, а если соседний почти так же
 *  част (≥ 50% от него) — оба вместе («с востока и юго-востока»). */
function dominant(d: WindRoseData): { dirs: number[]; share: number; mean: number } {
  const top = d.pct.indexOf(Math.max(...d.pct))
  const l = (top + 7) % 8, r = (top + 1) % 8
  const nb = d.pct[l] >= d.pct[r] ? l : r
  const dirs = d.pct[nb] >= d.pct[top] * 0.5 ? [top, nb] : [top]
  // По часовой стрелке: «с востока и юго-востока», «с северо-запада и севера».
  dirs.sort((a, b) => (Math.abs(a - b) === 7 ? b - a : a - b))
  const share = dirs.reduce((s, i) => s + d.pct[i], 0)
  // Середина направления (откуда дует), градусы по компасу — по долям секторов.
  let x = 0, y = 0
  for (const i of dirs) { const a = (i * 45 * Math.PI) / 180; x += Math.sin(a) * d.pct[i]; y += Math.cos(a) * d.pct[i] }
  const mean = ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360
  return { dirs, share, mean }
}

// ---------------------------------------------------------------- map

// Снимок Esri World Imagery (как в «Солнце и тени», без оплаты). Зум 17 —
// около 650 м в ширину: видно улицы и соседние участки, через которые
// проходит ветер.
const Z = 17
const TILE = 256

function tileOf(lat: number, lng: number) {
  const n = 2 ** Z
  const x = ((lng + 180) / 360) * n
  const phi = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n
  return { x0: Math.floor(x), y0: Math.floor(y), fx: Math.round((x - Math.floor(x)) * TILE), fy: Math.round((y - Math.floor(y)) * TILE) }
}

// Стрелки потока в рамке 600×380: ровная сетка с постоянным смещением, чтобы
// картинка не менялась от рендера к рендеру. flowDeg — куда дует (компас).
const VB_W = 600, VB_H = 380
function streaks(flowDeg: number) {
  const a = (flowDeg * Math.PI) / 180
  const dx = Math.sin(a), dy = -Math.cos(a)
  const out: { x1: number; y1: number; x2: number; y2: number; delay: number }[] = []
  const L = 64
  let k = 0
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      // Псевдослучайный сдвиг — один и тот же при каждом рендере.
      const jx = ((k * 37) % 23) - 11, jy = ((k * 53) % 19) - 9
      const cx = 60 + col * 120 + (row % 2) * 60 + jx
      const cy = 48 + row * 95 + jy
      out.push({ x1: cx - dx * L / 2, y1: cy - dy * L / 2, x2: cx + dx * L / 2, y2: cy + dy * L / 2, delay: ((k * 7) % 10) * 0.32 })
      k++
    }
  }
  return { list: out, dx: dx * 28, dy: dy * 28 }
}

function WindMap({ flowDeg, lat, lng, here, north, compact = false }: { flowDeg: number; lat: number; lng: number; here: string; north: string; compact?: boolean }) {
  const { x0, y0, fx, fy } = tileOf(lat, lng)
  const tiles: { dx: number; dy: number }[] = []
  // 5 плиток в ширину: на широкой полосе 3 не закрывали края — слева оставалась серая полоса.
  for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) tiles.push({ dx, dy })
  const s = streaks(flowDeg)
  return (
    <div className={`relative h-[240px] w-full overflow-hidden rounded-xl bg-[var(--color-neutral-200)] ${compact ? '' : 'sm:h-[340px]'}`}>
      <div
        className="absolute"
        style={{ width: TILE * 5, height: TILE * 3, left: `calc(50% - ${2 * TILE + fx}px)`, top: `calc(50% - ${TILE + fy}px)`, transform: 'translateZ(0)' }}
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
            style={{ left: (dx + 2) * TILE, top: (dy + 1) * TILE }}
            draggable={false}
          />
        ))}
      </div>
      <div aria-hidden className="absolute inset-0 bg-[rgb(15_26_21/0.18)]" />
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <marker id="bx-wind-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="#fff" />
          </marker>
        </defs>
        {s.list.map((p, i) => (
          <g key={i} className="bx-wind-streak" style={{ ['--wdx' as string]: `${s.dx}px`, ['--wdy' as string]: `${s.dy}px`, animationDelay: `${p.delay}s` }}>
            <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="rgb(0 0 0 / .35)" strokeWidth="5" strokeLinecap="round" />
            <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#bx-wind-head)" />
          </g>
        ))}
      </svg>
      <span aria-hidden className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[var(--color-primary)] shadow-[0_2px_8px_rgb(0_0_0/.35)]" />
      <span className="absolute left-1/2 top-[calc(50%+18px)] -translate-x-1/2 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-[var(--color-text)] shadow-[0_2px_8px_rgb(0_0_0/.2)]">{here}</span>
      <span aria-hidden className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[12px] font-semibold text-[var(--color-text)]">{north}</span>
      <span className="absolute bottom-1 right-1.5 text-[9px] text-white/80 [text-shadow:0_0_2px_rgb(0_0_0/.6)]">Esri, Maxar</span>
    </div>
  )
}

// ---------------------------------------------------------------- fallback

// Без координат снимка нет — простая роза-диаграмма.
const C = 100, R = 78
function petal(i: number, r: number): string {
  const a0 = ((i * 45 - 18) * Math.PI) / 180
  const a1 = ((i * 45 + 18) * Math.PI) / 180
  const p = (a: number) => `${(C + r * Math.sin(a)).toFixed(1)},${(C - r * Math.cos(a)).toFixed(1)}`
  return `M${C},${C} L${p(a0)} A${r},${r} 0 0 1 ${p(a1)} Z`
}
function Rose({ data }: { data: WindRoseData }) {
  const max = Math.max(...data.pct, 1)
  return (
    <svg viewBox="0 0 200 200" className="h-auto w-full max-w-[200px]" aria-hidden="true">
      {[0.33, 0.66, 1].map((k) => <circle key={k} cx={C} cy={C} r={R * k} fill="none" stroke="var(--color-border)" strokeWidth="1" />)}
      {data.pct.map((v, i) => v > 0 && (
        <path key={i} d={petal(i, Math.max(4, (v / max) * R))} fill="var(--color-primary)" fillOpacity={v === max ? 0.9 : 0.4} />
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------- block

type Props = { wind: Wind | null | undefined; lang: Lang; lat?: number | null; lng?: number | null; /** Ниже карта — в полосе «Солнце и погода» (23.10.2026). */ compact?: boolean }

export function WindRose({ wind, lang, lat, lng, compact = false }: Props) {
  const [season, setSeason] = useState<Season>(wind?.dry?.pct?.length ? 'dry' : 'all')
  const t = pickCopy(COPY, lang)
  if (!wind?.all?.pct?.length) return null

  const data = wind[season] ?? wind.all
  const dom = dominant(data)
  const [d0, d1] = dom.dirs
  const phrase = d1 != null ? t.pair(t.from[d0], t.from[d1], t.base[d0], t.base[d1]) : t.from[d0]
  // Продувается сторона, обращённая к ветру: ближайшее из 8 направлений к середине.
  const facing = t.facing[Math.round(dom.mean / 45) % 8]
  const num = (n: number) => n.toLocaleString(LOCALE[lang] ?? 'en', { maximumFractionDigits: 1 })
  const when = season === 'dry' ? t.dryMonths : season === 'wet' ? t.wetMonths : t.yearLabel
  const tabs: { key: Season; label: string }[] = [
    { key: 'dry', label: t.dry },
    { key: 'wet', label: t.wet },
    { key: 'all', label: t.all },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-[14px] font-semibold text-[var(--color-text)]">{t.title}</h4>
        <div role="group" aria-label={t.title} className="flex gap-1 rounded-[10px] border border-[var(--color-border)] p-[3px]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              aria-pressed={season === tab.key}
              onClick={() => setSeason(tab.key)}
              className={`h-8 rounded-lg px-3 text-[13px] font-medium transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                season === tab.key ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text)] hover:bg-[var(--color-search-bg)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {lat != null && lng != null
        ? <WindMap flowDeg={(dom.mean + 180) % 360} lat={lat} lng={lng} here={t.here} north={t.north} compact={compact} />
        : <div className="w-[168px]"><Rose data={data} /></div>}

      <div className="flex flex-col gap-1">
        <p className="text-[16px] font-semibold leading-snug text-[var(--color-text)] md:text-[18px]">
          {when}: {t.blows} {phrase}
        </p>
        <p className="text-[14px] text-[var(--color-text-muted)]">
          {Math.round(dom.share)}% {t.ofTime} · {t.avg} {num(data.avg_ms)} {t.ms}, {t.breeze[breezeLevel(data.avg_ms)]}
        </p>
      </div>
      <p className="rounded-xl bg-[var(--color-primary-soft)] px-3.5 py-3 text-[14px] leading-relaxed text-[var(--color-text)]">
        <span className="font-semibold">{t.means}</span> {t.meaning(facing)}{data.avg_ms < 5.5 ? ` ${t.weak}` : ''}
      </p>
      <p className="text-[12px] leading-snug text-[var(--color-text-muted)]">
        {t.note.replace('{src}', wind.src.startsWith('ERA5') ? 'Copernicus ERA5-Land' : 'NASA POWER').replace('{n}', String(wind.years))}
      </p>
    </div>
  )
}
