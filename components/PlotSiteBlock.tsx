// "What is right at the plot": slope, the road that leads in, rivers and the
// sea — with the two legal setbacks a buyer trips over on Bali (100 m from the
// sea, a river buffer). Sits in the «Участок» chapter under LandProfileBlock.
//
// Data: listing_geo_facts.climate.plot (scripts/plot-site.py — OpenStreetMap +
// Copernicus DEM GLO-30). Server Component. Renders nothing without data.
import { Mountain, Route, Droplets, Waves, AlertTriangle, ShieldAlert, Compass } from 'lucide-react'
import type { Climate } from '@/lib/complex-access'
import { pickCopy, type Lang } from '@/lib/i18n'

type Plot = NonNullable<Climate['plot']>
type Hazards = NonNullable<Climate['hazards']>
type HazardKey = Exclude<keyof Hazards, 'src'>

const HAZARD_ORDER: HazardKey[] = ['flood', 'flash_flood', 'landslide', 'tsunami', 'volcano', 'earthquake']
// BNPB's own map classes for the 0..1 index.
function hazardLevel(v: number): 'low' | 'mid' | 'high' {
  return v >= 0.666 ? 'high' : v >= 0.333 ? 'mid' : 'low'
}

// Show a river or the sea only when it is close enough to matter for the plot.
const RIVER_SHOW_M = 300
const SEA_SHOW_M = 1500
const RIVER_WARN_M = 50
const SEA_WARN_M = 100
const SEA_NEAR_M = 200

const ROAD_RU: Record<string, string> = {
  motorway: 'магистраль', trunk: 'магистраль', primary: 'главная дорога острова',
  secondary: 'дорога между районами', tertiary: 'дорога местного значения',
  unclassified: 'улица', residential: 'улица', living_street: 'улица',
  service: 'подъездная дорожка', track: 'грунтовая дорога',
}
const ROAD_EN: Record<string, string> = {
  motorway: 'highway', trunk: 'highway', primary: 'main island road',
  secondary: 'road between districts', tertiary: 'local road',
  unclassified: 'street', residential: 'street', living_street: 'street',
  service: 'access lane', track: 'dirt track',
}

const COPY = {
  ru: {
    title: 'Что вокруг участка',
    slope: 'Уклон', flat: 'Ровный участок', gentle: 'Пологий склон', steep: 'Крутой склон', verySteep: 'Очень крутой склон',
    steepHint: 'На склоне стройка дороже: подпорные стены, террасы, дренаж. Зато часто есть вид.',
    road: 'Подъезд', roadAt: (m: string) => `в ${m}`, width: (w: string) => `ширина ${w} м`,
    paved: 'асфальт', unpaved: 'без асфальта',
    mainRoad: (name: string | null, kind: string, m: string) => name ? `До большой дороги (${name}) — ${m}` : `До ${kind === 'главная дорога острова' ? 'главной дороги острова' : kind === 'дорога между районами' ? 'дороги между районами' : kind === 'магистраль' ? 'магистрали' : 'дороги местного значения'} — ${m}`,
    farRoad: 'До дороги больше 100 м по карте — уточните, как заезжать на участок.',
    narrowHint: 'Узкая дорога: грузовик со стройматериалами и гости на машинах могут не проехать.',
    river: 'Река', stream: 'Ручей', riverAt: (m: string) => `в ${m} от участка`,
    riverWarn: 'Вдоль рек строить нельзя: отступ от 3 до 100 м, смотря какая река (закон о реках PP 38/2011). Спросите застройщика, соблюдён ли отступ — он прописан в KKPR участка.',
    sea: 'Море', seaAt: (m: string) => `в ${m} от точки объекта`,
    seaWarn: 'Ближе 100 м от линии прилива строить нельзя (Perpres 51/2016). Точка на карте неточная — спросите застройщика, где проходит граница и как это отражено в KKPR.',
    seaNear: 'Граница 100 м от моря близко. Уточните у застройщика, что весь проект за ней.',
    note: 'Дороги, реки и берег — OpenStreetMap, точность 10–20 м. Уклон — спутниковая карта высот Copernicus (30 м): деревья и крыши его искажают. Это подсказка, что проверить, а не замер на месте.',
    hazards: 'Природные риски',
    hz: { flood: 'Наводнение', flash_flood: 'Сель', landslide: 'Оползень', tsunami: 'Цунами', volcano: 'Вулкан', earthquake: 'Землетрясение' },
    lvl: { low: 'низкий', mid: 'средний', high: 'высокий' },
    hzHint: {
      flood: 'Спросите застройщика про дренаж и высоту пола над землёй.',
      flash_flood: 'Спросите, отводит ли участок воду в ливень и далеко ли русло.',
      landslide: 'Нужны проверка грунта и подпорные стены — спросите, сделаны ли они.',
      tsunami: 'Узнайте путь эвакуации и высоту ближайшего укрытия.',
      volcano: 'Участок в зоне вулкана. При извержении район могут закрыть, страховка дороже.',
     
      earthquake: 'На Бали сейсмоопасно везде. Спросите, рассчитан ли дом по нормам SNI на землетрясения.',
    },
    hzNone: 'Высоких рисков нет. Землетрясения на Бали возможны везде.',
    hzNote: 'Индексы опасности InaRISK (агентство по ЧС Индонезии, BNPB). Это модель по району, а не обследование участка.',
    road_: ROAD_RU, m: 'м', km: 'км',
  },
  en: {
    title: 'Around the plot',
    slope: 'Slope', flat: 'Flat plot', gentle: 'Gentle slope', steep: 'Steep slope', verySteep: 'Very steep slope',
    steepHint: 'Building on a slope costs more: retaining walls, terraces, drainage. It often comes with a view, though.',
    road: 'Access', roadAt: (m: string) => `${m} away`, width: (w: string) => `${w} m wide`,
    paved: 'paved', unpaved: 'unpaved',
    mainRoad: (name: string | null, kind: string, m: string) => `To the ${name ?? kind}: ${m}`,
    farRoad: 'The map shows no road within 100 m — ask how cars reach the plot.',
    narrowHint: 'A narrow road: construction trucks and guests’ cars may not get through.',
    river: 'River', stream: 'Stream', riverAt: (m: string) => `${m} from the plot`,
    riverWarn: 'No building is allowed along rivers: a 3–100 m setback depending on the river (river law PP 38/2011). Ask the developer whether it is respected — it is set in the plot’s KKPR.',
    sea: 'Sea', seaAt: (m: string) => `${m} from the listing point`,
    seaWarn: 'No building within 100 m of the high-tide line (Perpres 51/2016). The map point is approximate — ask the developer where the line runs and how the KKPR reflects it.',
    seaNear: 'The 100 m coastal line is close. Check with the developer that the whole project is behind it.',
    note: 'Roads, rivers and coast: OpenStreetMap, accurate to 10–20 m. Slope: Copernicus satellite elevation (30 m) — trees and roofs distort it. A hint on what to check, not a site survey.',
    hazards: 'Natural hazards',
    hz: { flood: 'Flood', flash_flood: 'Flash flood', landslide: 'Landslide', tsunami: 'Tsunami', volcano: 'Volcano', earthquake: 'Earthquake' },
    lvl: { low: 'low', mid: 'medium', high: 'high' },
    hzHint: {
      flood: 'Ask the developer about drainage and how high the floor sits above ground.',
      flash_flood: 'Ask how the plot drains in a downpour and how close the nearest stream bed is.',
      landslide: 'A soil survey and retaining walls are needed — ask whether they were done.',
      tsunami: 'Find out the evacuation route and the nearest high ground.',
      volcano: 'The plot is in a volcano zone. An eruption can close the area, and insurance costs more.',
     
      earthquake: 'All of Bali is seismic. Ask whether the building is designed to the SNI earthquake code.',
    },
    hzNone: 'No high hazards. Earthquakes are possible anywhere on Bali.',
    hzNote: 'Hazard indices from InaRISK (Indonesia’s disaster agency, BNPB). A district-level model, not a survey of the plot.',
    road_: ROAD_EN, m: 'm', km: 'km',
  },
} as const

// Chapter hint for plots with no official zoning row: the stock one promises
// zoning, which is not there.
const CHAPTER_HINT = {
  ru: {
    hint: 'Что рядом с участком: склон, дорога, река и море — и где закон запрещает строить.',
    both: 'Что разрешено строить на этой земле по официальной карте зон, и что вокруг: склон, дорога, вода и природные риски.',
  },
  en: {
    hint: 'What is next to the plot: slope, road, river and sea — and where the law forbids building.',
    both: 'What may be built on this land per the official zoning map, and what surrounds it: slope, road, water and natural hazards.',
  },
} as const

/** `withZoning` — the chapter also shows LandProfileBlock. */
export function plotChapterHint(lang: Lang, withZoning = false): string {
  const c = pickCopy(CHAPTER_HINT, lang)
  return withZoning ? c.both : c.hint
}

const LOCALE: Record<Lang, string> = { ru: 'ru', en: 'en', id: 'id', fr: 'fr', de: 'de', zh: 'zh', nl: 'nl', ban: 'id', pl: 'pl', uk: 'uk' }

// Same tile as the use-case cells in LandProfileBlock, so the two cards read as a pair.
function Row({ icon, label, value, hint, warn }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; hint?: string | null; warn?: boolean
}) {
  return (
    <div className="flex gap-2.5 rounded-lg bg-[var(--color-search-bg)] px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-[var(--color-primary)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</div>
        <div className="text-[13.5px] leading-relaxed text-[var(--color-text)]">{value}</div>
        {hint && (
          <p className={`mt-1 flex gap-1.5 text-[12.5px] leading-relaxed ${warn ? 'text-[#92400E]' : 'text-[var(--color-text-muted)]'}`}>
            {warn && <AlertTriangle size={13} className="mt-[3px] shrink-0" />}
            <span>{hint}</span>
          </p>
        )}
      </div>
    </div>
  )
}

export function PlotSiteBlock({ plot, hazards, lang }: { plot: Plot | null | undefined; hazards?: Hazards | null; lang: Lang }) {
  if (!plot) return null
  const t = pickCopy(COPY, lang)
  const dist = (m: number) => m < 1000
    ? `${Math.round(m / 10) * 10 || m} ${t.m}`
    : `${(m / 1000).toLocaleString(LOCALE[lang] ?? 'en', { maximumFractionDigits: m < 10000 ? 1 : 0 })} ${t.km}`

  const s = plot.slope_pct
  const slopeLabel = s == null ? null : s < 5 ? t.flat : s < 15 ? t.gentle : s < 30 ? t.steep : t.verySteep

  const r = plot.road
  const roadKind = t.road_[r.class.replace('_link', '') as keyof typeof t.road_] ?? r.class
  const paved = r.surface ? (['asphalt', 'concrete', 'paved', 'paving_stones'].includes(r.surface) ? t.paved : t.unpaved) : null
  const roadBits = [r.name, r.width_m ? t.width(String(r.width_m)) : null, paved].filter(Boolean).join(', ')
  const main = plot.main_road
  const showMain = main.m > r.m + 30 && main.m <= 5000
  const roadHint = r.m > 100 ? t.farRoad
    : r.width_m != null && r.width_m < 3.5 ? t.narrowHint
    : r.class === 'track' ? t.narrowHint
    : null

  const water = plot.river_m <= plot.stream_m
    ? { label: t.river, m: plot.river_m }
    : { label: t.stream, m: plot.stream_m }
  const showWater = water.m <= RIVER_SHOW_M
  const showSea = plot.coast_m <= SEA_SHOW_M
  const seaHint = plot.coast_m < SEA_WARN_M ? t.seaWarn : plot.coast_m < SEA_NEAR_M ? t.seaNear : null

  // Hazards the model puts at this point, worst first; "none" ones are left out.
  const hz = hazards
    ? HAZARD_ORDER.filter((k) => hazards[k] != null)
        .map((k) => ({ k, level: hazardLevel(hazards[k]!) }))
        .sort((a, b) => ['high', 'mid', 'low'].indexOf(a.level) - ['high', 'mid', 'low'].indexOf(b.level))
    : []
  const hzHigh = hz.filter((h) => h.level === 'high').map((h) => h.k)

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden">
      <div className="px-5 py-4 flex items-start gap-3">
        <Compass size={18} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-[12px] font-normal uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{t.title}</h3>
          <div className="text-[15px] font-medium text-[var(--color-text)]">
            {[slopeLabel, `${roadKind} ${t.roadAt(dist(r.m))}`].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
      <div className="px-5 pb-4 space-y-1.5">
        <Row
          icon={<Route size={16} />}
          label={t.road}
          value={<>
            {roadKind[0].toUpperCase() + roadKind.slice(1)} {t.roadAt(dist(r.m))}
            {roadBits && <span className="text-[var(--color-text-muted)]"> · {roadBits}</span>}
            {showMain && <span className="block text-[13px] text-[var(--color-text-muted)]">{t.mainRoad(main.name, t.road_[main.class.replace('_link', '') as keyof typeof t.road_] ?? main.class, dist(main.m))}</span>}
          </>}
          hint={roadHint}
          warn={r.m > 100}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {slopeLabel && (
            <Row
              icon={<Mountain size={16} />}
              label={t.slope}
              value={<>{slopeLabel} <span className="text-[var(--color-text-muted)]">· {s!.toLocaleString(LOCALE[lang] ?? 'en', { maximumFractionDigits: 0 })}%</span></>}
              hint={s! >= 15 ? t.steepHint : null}
            />
          )}
          {showWater && (
            <Row
              icon={<Droplets size={16} />}
              label={water.label}
              value={t.riverAt(dist(water.m))}
              hint={water.m < RIVER_WARN_M ? t.riverWarn : null}
              warn={water.m < RIVER_WARN_M}
            />
          )}
          {showSea && (
            <Row
              icon={<Waves size={16} />}
              label={t.sea}
              value={t.seaAt(dist(plot.coast_m))}
              hint={seaHint}
              warn={plot.coast_m < SEA_WARN_M}
            />
          )}
        </div>
        {hz.length > 0 && (
          <Row
            icon={<ShieldAlert size={16} />}
            label={t.hazards}
            value={
              <span className="flex flex-wrap gap-1.5 pt-1">
                {hz.map(({ k, level }) => (
                  <span
                    key={k}
                    className={`rounded-md px-2 py-0.5 text-[13px] ${level === 'high' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-white text-[var(--color-text)]'}`}
                  >
                    {t.hz[k]} · {t.lvl[level]}
                  </span>
                ))}
              </span>
            }
            hint={hzHigh.length ? hzHigh.map((k) => t.hzHint[k]).join(' ') : t.hzNone}
            warn={hzHigh.length > 0}
          />
        )}
        <p className="pt-1.5 text-[11px] leading-snug text-[var(--color-text-muted)]">{t.note}{hz.length > 0 && <> {t.hzNote}</>}</p>
      </div>
    </section>
  )
}
