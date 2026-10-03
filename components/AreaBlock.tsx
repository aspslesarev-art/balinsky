// "What is happening around the plot" for a buyer holding it 20–30 years:
//  1. how fast the land within 1 km has been built over (2000 → 2020);
//  2. for plots near the sea — how high the plot sits above the worst
//     storm water expected once in 100 years up to 2050.
//
// Data: listing_geo_facts.climate.built / coast_m (scripts/ghsl-builtup.py,
// Copernicus GHSL) and climate.sea (scripts/sea-level-risk.py, Copernicus C3S
// sea level indicators). Server Component. Renders nothing without data.
import { Building2, Waves } from 'lucide-react'
import type { Climate } from '@/lib/complex-access'
import { pickCopy, type Lang } from '@/lib/i18n'

const SHOWN = ['2000', '2005', '2010', '2015', '2020'] as const

const COPY = {
  ru: {
    title: 'Район и берег', builtTitle: 'Как застраивался район', builtShare: 'земли под зданиями в радиусе 1 км', since2000: 'с 2000 года', growthFaster: (p: number) => `В 2000–2020 годах строились быстрее, чем вокруг ${p}% объектов на Бали`, growthSlower: (p: number) => `В 2000–2020 годах строились медленнее, чем вокруг ${100 - p}% объектов на Бали`, builtNote: 'Спутник Copernicus (GHSL). Последние данные — 2020 год, стройки после него сюда не попали.',
    seaTitle: 'Океан рядом', toSea: 'до океана', height: 'высота участка', m: 'м', worst: 'Самая высокая вода раз в 100 лет до 2050 года (прилив + шторм + подъём моря)', high: 'Участок высоко над водой — запас большой', mid: 'Запас есть, но небольшой', low: 'Участок низкий — спросите застройщика о высоте и защите от воды', seaNote: 'Copernicus C3S. Волны не учтены. Высота по спутнику, погрешность несколько метров.',
  },
  en: {
    title: 'Area and coast', builtTitle: 'How the area has been built up', builtShare: 'of land under buildings within 1 km', since2000: 'since 2000', growthFaster: (p: number) => `In 2000–2020 built up faster than around ${p}% of listings on Bali`, growthSlower: (p: number) => `In 2000–2020 built up slower than around ${100 - p}% of listings on Bali`, builtNote: 'Copernicus satellite data (GHSL). Latest data is for 2020; construction after that is not included.',
    seaTitle: 'The ocean is close', toSea: 'to the ocean', height: 'plot height', m: 'm', worst: 'Highest water expected once in 100 years up to 2050 (tide + storm + sea level rise)', high: 'The plot sits well above the water', mid: 'There is a margin, but a small one', low: 'Low-lying plot — ask the developer about its height and flood protection', seaNote: 'Copernicus C3S. Waves not included. Height from satellite, accurate to a few metres.',
  },
  id: {
    title: 'Kawasan dan pantai', builtTitle: 'Perkembangan bangunan di kawasan', builtShare: 'lahan tertutup bangunan dalam radius 1 km', since2000: 'sejak 2000', growthFaster: (p: number) => `Pada 2000–2020 pembangunan lebih cepat daripada di sekitar ${p}% properti di Bali`, growthSlower: (p: number) => `Pada 2000–2020 pembangunan lebih lambat daripada di sekitar ${100 - p}% properti di Bali`, builtNote: 'Data satelit Copernicus (GHSL). Data terakhir tahun 2020; pembangunan setelahnya belum tercakup.',
    seaTitle: 'Dekat laut', toSea: 'ke laut', height: 'ketinggian lahan', m: 'm', worst: 'Air tertinggi sekali dalam 100 tahun hingga 2050 (pasang + badai + kenaikan laut)', high: 'Lahan jauh di atas air', mid: 'Ada jarak aman, tetapi kecil', low: 'Lahan rendah — tanyakan pengembang soal ketinggian dan perlindungan banjir', seaNote: 'Copernicus C3S. Ombak tidak dihitung. Ketinggian dari satelit, selisih beberapa meter.',
  },
  fr: {
    title: 'Quartier et côte', builtTitle: 'Comment le quartier s’est construit', builtShare: 'du terrain bâti dans un rayon de 1 km', since2000: 'depuis 2000', growthFaster: (p: number) => `De 2000 à 2020, construit plus vite qu’autour de ${p} % des biens à Bali`, growthSlower: (p: number) => `De 2000 à 2020, construit moins vite qu’autour de ${100 - p} % des biens à Bali`, builtNote: 'Satellite Copernicus (GHSL). Dernières données : 2020 ; les chantiers postérieurs n’y figurent pas.',
    seaTitle: 'L’océan est proche', toSea: 'jusqu’à l’océan', height: 'altitude du terrain', m: 'm', worst: 'Niveau d’eau le plus haut attendu une fois en 100 ans d’ici 2050 (marée + tempête + montée des mers)', high: 'Le terrain est bien au-dessus de l’eau', mid: 'Il y a une marge, mais faible', low: 'Terrain bas — demandez au promoteur son altitude et sa protection contre l’eau', seaNote: 'Copernicus C3S. Vagues non comprises. Altitude satellite, précision de quelques mètres.',
  },
  de: {
    title: 'Umgebung und Küste', builtTitle: 'Wie die Gegend bebaut wurde', builtShare: 'der Fläche im Umkreis von 1 km bebaut', since2000: 'seit 2000', growthFaster: (p: number) => `2000–2020 schneller bebaut als rund um ${p} % der Objekte auf Bali`, growthSlower: (p: number) => `2000–2020 langsamer bebaut als rund um ${100 - p} % der Objekte auf Bali`, builtNote: 'Copernicus-Satellitendaten (GHSL). Letzter Stand 2020; spätere Bauten fehlen.',
    seaTitle: 'Das Meer ist nah', toSea: 'bis zum Meer', height: 'Höhe des Grundstücks', m: 'm', worst: 'Höchster Wasserstand einmal in 100 Jahren bis 2050 (Flut + Sturm + Meeresanstieg)', high: 'Das Grundstück liegt weit über dem Wasser', mid: 'Es gibt Reserve, aber wenig', low: 'Tief gelegen — fragen Sie den Bauträger nach Höhe und Hochwasserschutz', seaNote: 'Copernicus C3S. Wellen nicht enthalten. Höhe aus Satellitendaten, auf einige Meter genau.',
  },
  zh: {
    title: '周边与海岸', builtTitle: '周边建设速度', builtShare: '1公里范围内被建筑覆盖的土地', since2000: '自2000年起', growthFaster: (p: number) => `2000–2020年建设速度快于巴厘岛 ${p}% 房源的周边`, growthSlower: (p: number) => `2000–2020年建设速度慢于巴厘岛 ${100 - p}% 房源的周边`, builtNote: 'Copernicus 卫星数据（GHSL）。最新数据为2020年，之后的建设未包含。',
    seaTitle: '临近海洋', toSea: '距海', height: '地块海拔', m: '米', worst: '至2050年百年一遇最高水位（潮汐+风暴+海平面上升）', high: '地块远高于水位', mid: '有余量，但不大', low: '地块较低——请向开发商询问海拔和防水措施', seaNote: 'Copernicus C3S。未计入海浪。海拔来自卫星，误差数米。',
  },
  nl: {
    title: 'Omgeving en kust', builtTitle: 'Hoe de buurt is volgebouwd', builtShare: 'van de grond bebouwd binnen 1 km', since2000: 'sinds 2000', growthFaster: (p: number) => `In 2000–2020 sneller bebouwd dan rond ${p}% van de objecten op Bali`, growthSlower: (p: number) => `In 2000–2020 langzamer bebouwd dan rond ${100 - p}% van de objecten op Bali`, builtNote: 'Copernicus-satellietdata (GHSL). Laatste gegevens uit 2020; latere bouw ontbreekt.',
    seaTitle: 'De oceaan is dichtbij', toSea: 'tot de oceaan', height: 'hoogte van de kavel', m: 'm', worst: 'Hoogste water eens in de 100 jaar tot 2050 (getij + storm + zeespiegelstijging)', high: 'De kavel ligt ruim boven het water', mid: 'Er is marge, maar weinig', low: 'Laaggelegen kavel — vraag de ontwikkelaar naar hoogte en waterbescherming', seaNote: 'Copernicus C3S. Golven niet meegeteld. Hoogte via satelliet, enkele meters nauwkeurig.',
  },
  ban: {
    title: 'Wewidangan lan pasih', builtTitle: 'Pawangunan ring wewidangan', builtShare: 'tanah kaungkulin wangunan ring radius 1 km', since2000: 'saking 2000', growthFaster: (p: number) => `Ring 2000–2020 pawangunan lebih gelis ketimbang ring sekitar ${p}% properti ring Bali`, growthSlower: (p: number) => `Ring 2000–2020 pawangunan lebih adeng ketimbang ring sekitar ${100 - p}% properti ring Bali`, builtNote: 'Data satelit Copernicus (GHSL). Data pinih untat warsa 2020.',
    seaTitle: 'Nampek pasih', toSea: 'ka pasih', height: 'tegeh tanah', m: 'm', worst: 'Toya pinih tegeh apisan ring 100 warsa kantos 2050 (pasang + badai + pasih ngunggahang)', high: 'Tanah tegeh ring duur toya', mid: 'Wenten jarak, nanging alit', low: 'Tanah endep — takenang ring pengembang indik tegeh lan pangraksa banjir', seaNote: 'Copernicus C3S. Ombak nenten kaitung. Tegeh saking satelit.',
  },
  pl: {
    title: 'Okolica i wybrzeże', builtTitle: 'Jak zabudowywała się okolica', builtShare: 'gruntu pod budynkami w promieniu 1 km', since2000: 'od 2000 roku', growthFaster: (p: number) => `W latach 2000–2020 zabudowa rosła szybciej niż wokół ${p}% obiektów na Bali`, growthSlower: (p: number) => `W latach 2000–2020 zabudowa rosła wolniej niż wokół ${100 - p}% obiektów na Bali`, builtNote: 'Dane satelitarne Copernicus (GHSL). Ostatnie dane z 2020 roku; późniejsza zabudowa nie jest ujęta.',
    seaTitle: 'Ocean blisko', toSea: 'do oceanu', height: 'wysokość działki', m: 'm', worst: 'Najwyższa woda raz na 100 lat do 2050 roku (pływ + sztorm + wzrost poziomu morza)', high: 'Działka leży wysoko nad wodą', mid: 'Zapas jest, ale niewielki', low: 'Nisko położona działka — zapytaj dewelopera o wysokość i ochronę przed wodą', seaNote: 'Copernicus C3S. Bez fal. Wysokość z satelity, dokładność kilku metrów.',
  },
  uk: {
    title: 'Район і узбережжя', builtTitle: 'Як забудовувався район', builtShare: 'землі під будівлями в радіусі 1 км', since2000: 'з 2000 року', growthFaster: (p: number) => `У 2000–2020 роках забудовувався швидше, ніж довкола ${p}% об’єктів на Балі`, growthSlower: (p: number) => `У 2000–2020 роках забудовувався повільніше, ніж довкола ${100 - p}% об’єктів на Балі`, builtNote: 'Супутник Copernicus (GHSL). Останні дані — 2020 рік, будівництво після нього не враховане.',
    seaTitle: 'Океан поруч', toSea: 'до океану', height: 'висота ділянки', m: 'м', worst: 'Найвища вода раз на 100 років до 2050 року (приплив + шторм + підйом моря)', high: 'Ділянка високо над водою — запас великий', mid: 'Запас є, але невеликий', low: 'Ділянка низька — запитайте забудовника про висоту й захист від води', seaNote: 'Copernicus C3S. Хвилі не враховані. Висота із супутника, похибка кілька метрів.',
  },
} as const

const LOCALE: Record<Lang, string> = { ru: 'ru', en: 'en', id: 'id', fr: 'fr', de: 'de', zh: 'zh', nl: 'nl', ban: 'id', pl: 'pl', uk: 'uk' }

// Margins tuned to SRTM's few-metre error: under 3 m the error alone can eat
// the margin, 8 m and more survives it comfortably.
function marginLevel(m: number): 'high' | 'mid' | 'low' {
  return m >= 8 ? 'high' : m >= 3 ? 'mid' : 'low'
}

export function AreaBlock({ climate, lang }: { climate: Climate | null; lang: Lang }) {
  const t = pickCopy(COPY, lang)
  const built = climate?.built
  const sea = climate?.sea
  const coast = climate?.coast_m
  if (!built?.pct && !sea) return null

  const num = (n: number, digits = 1) => n.toLocaleString(LOCALE[lang] ?? 'en', { maximumFractionDigits: digits })
  const series = built?.pct ? SHOWN.map((y) => ({ y, v: built.pct[y] ?? 0 })) : []
  const now = built?.pct?.['2020'] ?? null
  const then = built?.pct?.['2000'] ?? null
  // A ratio off a near-zero base ("×12") says more about rounding than about the area.
  const ratio = now != null && then != null && then >= 0.5 ? now / then : null
  const maxV = Math.max(1, ...series.map((s) => s.v))
  const rank = built?.growth_rank ?? null

  const level = sea ? marginLevel(sea.margin_m) : null
  const worst = sea ? sea.twl100_2021_2050 + sea.msl_rise_2050 : null
  const levelColor = { high: 'var(--color-progress-hi)', mid: '#B45309', low: 'var(--color-progress-low)' } as const

  return (
    <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <h3 className="mb-4 text-[15px] font-semibold text-[var(--color-text)]">{t.title}</h3>

      {now != null && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Building2 size={15} className="shrink-0 text-[var(--color-primary)]" />
            <h4 className="text-[14px] font-semibold text-[var(--color-text)]">{t.builtTitle}</h4>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="flex h-[88px] items-end gap-2" aria-hidden="true">
              {series.map((s) => (
                <div key={s.y} className="flex w-9 flex-col items-center gap-1">
                  <span className="text-[11px] text-[var(--color-text-muted)]">{num(s.v)}%</span>
                  <div
                    className="w-full rounded-t-md bg-[var(--color-primary)]"
                    style={{ height: `${Math.max(3, (s.v / maxV) * 48)}px`, opacity: s.y === '2020' ? 0.9 : 0.4 }}
                  />
                  <span className="text-[11px] text-[var(--color-text-muted)]">{s.y}</span>
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-relaxed text-[var(--color-text)]">
                <span className="text-[22px] font-semibold">{num(now)}%</span>{' '}
                <span className="text-[var(--color-text-muted)]">{t.builtShare}</span>
                {ratio != null && ratio >= 1.05 && (
                  <span className="text-[var(--color-text-muted)]"> · ×{num(ratio)} {t.since2000}</span>
                )}
              </p>
              {rank != null && (
                <p className="text-[13px] leading-relaxed text-[var(--color-text)]">
                  {rank >= 50 ? t.growthFaster(rank) : t.growthSlower(rank)}
                </p>
              )}
            </div>
          </div>
          <p className="mt-2 text-[12px] leading-snug text-[var(--color-text-muted)]">{t.builtNote}</p>
        </div>
      )}

      {sea && level && worst != null && (
        <div className={now != null ? 'mt-4 border-t border-[var(--color-border)] pt-4' : ''}>
          <div className="mb-2 flex items-center gap-1.5">
            <Waves size={15} className="shrink-0 text-[var(--color-primary)]" />
            <h4 className="text-[14px] font-semibold text-[var(--color-text)]">{t.seaTitle}</h4>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
            {coast != null && (
              <span><span className="font-semibold text-[var(--color-text)]">~{num(coast, 0)} {t.m}</span> <span className="text-[var(--color-text-muted)]">{t.toSea}</span></span>
            )}
            <span><span className="font-semibold text-[var(--color-text)]">{num(sea.elevation_m, 0)} {t.m}</span> <span className="text-[var(--color-text-muted)]">{t.height}</span></span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            {t.worst}: <span className="font-semibold text-[var(--color-text)]">{num(worst)} {t.m}</span>
          </p>
          <p className="mt-1 flex items-center gap-2 text-[13px] font-medium text-[var(--color-text)]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: levelColor[level] }} />
            {t[level]}
          </p>
          <p className="mt-2 text-[12px] leading-snug text-[var(--color-text-muted)]">{t.seaNote}</p>
        </div>
      )}
    </div>
  )
}
