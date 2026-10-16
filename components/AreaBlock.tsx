// «Район и берег» — два коротких вывода для того, кто держит участок 20–30 лет:
//  1. как быстро застраивается округа (здания в 1 км, 2016–2023) — вывод
//     одной фразой и маленький график по годам;
//  2. у моря — хватает ли высоты участка над самой высокой водой до 2050 года.
//
// Данные: listing_geo_facts.climate.buildings (scripts/open-buildings-temporal.py,
// Google Open Buildings), .built (Copernicus GHSL — запасной, если первых нет),
// .sea / .coast_m (Copernicus C3S). Server Component. Без данных — ничего.
import { Building2, Waves } from 'lucide-react'
import type { Climate } from '@/lib/complex-access'
import { pickCopy, type Lang } from '@/lib/i18n'

type Pace = 'fast' | 'avg' | 'slow'

const COPY: Record<Lang, {
  title: string; titleInland: string
  pace: Record<Pace, string>
  grew: (pct: number, from: string, to: string) => string
  sea: (coastM: number | null, heightM: number) => string
  seaLevel: Record<'high' | 'mid' | 'low', string>
  elevation: (m: number) => string
  src: string
}> = {
  ru: {
    title: 'Район и берег', titleInland: 'Район',
    pace: { fast: 'Район быстро застраивается - рядом будут стройки', avg: 'Район застраивается в обычном для Бали темпе', slow: 'Район застраивается медленно - вид и тишина сохранятся дольше' },
    grew: (p, a, b) => `${p > 0 ? '+' : ''}${p}% зданий в радиусе 1 км за ${a}–${b}`,
    sea: (c, h) => `${c != null ? `До океана ~${c} м, ` : ''}участок на ${h} м над морем`,
    seaLevel: { high: 'запас от самой высокой воды до 2050 года большой', mid: 'запас от самой высокой воды до 2050 года небольшой', low: 'участок низкий - спросите застройщика о защите от воды' },
    elevation: m => `Высота над морем ${m} м`,
    src: 'Google Open Buildings, Copernicus',
  },
  en: {
    title: 'Area and coast', titleInland: 'Area',
    pace: { fast: 'The area is building up fast - expect construction nearby', avg: 'The area is building up at a typical Bali pace', slow: 'The area is building up slowly - views and quiet will last longer' },
    grew: (p, a, b) => `${p > 0 ? '+' : ''}${p}% buildings within 1 km in ${a}–${b}`,
    sea: (c, h) => `${c != null ? `Ocean ~${c} m away, ` : ''}plot ${h} m above sea level`,
    seaLevel: { high: 'a large margin above the highest water expected by 2050', mid: 'a small margin above the highest water expected by 2050', low: 'a low plot - ask the developer about flood protection' },
    elevation: m => `Elevation ${m} m`,
    src: 'Google Open Buildings, Copernicus',
  },
  id: {
    title: 'Kawasan dan pantai', titleInland: 'Kawasan',
    pace: { fast: 'Kawasan cepat dibangun - akan ada proyek konstruksi di dekatnya', avg: 'Kawasan dibangun dengan laju biasa untuk Bali', slow: 'Kawasan lambat dibangun - pemandangan dan ketenangan bertahan lebih lama' },
    grew: (p, a, b) => `${p > 0 ? '+' : ''}${p}% bangunan dalam radius 1 km pada ${a}–${b}`,
    sea: (c, h) => `${c != null ? `Laut ~${c} m, ` : ''}lahan ${h} m di atas permukaan laut`,
    seaLevel: { high: 'jarak aman besar dari air tertinggi hingga 2050', mid: 'jarak aman kecil dari air tertinggi hingga 2050', low: 'lahan rendah - tanyakan pengembang soal perlindungan banjir' },
    elevation: m => `Ketinggian ${m} m`,
    src: 'Google Open Buildings, Copernicus',
  },
  fr: {
    title: 'Quartier et côte', titleInland: 'Quartier',
    pace: { fast: 'Le quartier se construit vite - attendez-vous à des chantiers', avg: 'Le quartier se construit au rythme habituel de Bali', slow: 'Le quartier se construit lentement - vue et calme dureront plus longtemps' },
    grew: (p, a, b) => `${p > 0 ? '+' : ''}${p} % de bâtiments dans un rayon de 1 km en ${a}–${b}`,
    sea: (c, h) => `${c != null ? `Océan à ~${c} m, ` : ''}terrain à ${h} m au-dessus de la mer`,
    seaLevel: { high: 'large marge face aux plus hautes eaux d’ici 2050', mid: 'faible marge face aux plus hautes eaux d’ici 2050', low: 'terrain bas - demandez au promoteur la protection contre l’eau' },
    elevation: m => `Altitude ${m} m`,
    src: 'Google Open Buildings, Copernicus',
  },
  de: {
    title: 'Umgebung und Küste', titleInland: 'Umgebung',
    pace: { fast: 'Die Gegend wird schnell bebaut - mit Baustellen ist zu rechnen', avg: 'Die Gegend wird im üblichen Bali-Tempo bebaut', slow: 'Die Gegend wird langsam bebaut - Aussicht und Ruhe bleiben länger' },
    grew: (p, a, b) => `${p > 0 ? '+' : ''}${p} % Gebäude im Umkreis von 1 km ${a}–${b}`,
    sea: (c, h) => `${c != null ? `Meer ~${c} m entfernt, ` : ''}Grundstück ${h} m über dem Meer`,
    seaLevel: { high: 'großer Abstand zum höchsten Wasserstand bis 2050', mid: 'kleiner Abstand zum höchsten Wasserstand bis 2050', low: 'tief gelegen - fragen Sie den Bauträger nach Hochwasserschutz' },
    elevation: m => `Höhe ${m} m`,
    src: 'Google Open Buildings, Copernicus',
  },
  zh: {
    title: '周边与海岸', titleInland: '周边',
    pace: { fast: '周边建设很快——附近会有工地', avg: '周边建设速度与巴厘岛平均水平相当', slow: '周边建设缓慢——景观和安静能保持更久' },
    grew: (p, a, b) => `${a}–${b}年 1公里内建筑${p > 0 ? '增加' : '变化'} ${Math.abs(p)}%`,
    sea: (c, h) => `${c != null ? `距海约${c}米，` : ''}地块海拔${h}米`,
    seaLevel: { high: '距2050年前最高水位余量充足', mid: '距2050年前最高水位余量较小', low: '地块较低——请向开发商询问防水措施' },
    elevation: m => `海拔${m}米`,
    src: 'Google Open Buildings, Copernicus',
  },
  nl: {
    title: 'Omgeving en kust', titleInland: 'Omgeving',
    pace: { fast: 'De buurt wordt snel volgebouwd - reken op bouwwerk in de buurt', avg: 'De buurt wordt in het gewone Bali-tempo bebouwd', slow: 'De buurt wordt langzaam bebouwd - uitzicht en rust blijven langer' },
    grew: (p, a, b) => `${p > 0 ? '+' : ''}${p}% gebouwen binnen 1 km in ${a}–${b}`,
    sea: (c, h) => `${c != null ? `Oceaan op ~${c} m, ` : ''}perceel ${h} m boven zee`,
    seaLevel: { high: 'ruime marge boven het hoogste water tot 2050', mid: 'kleine marge boven het hoogste water tot 2050', low: 'laag perceel - vraag de ontwikkelaar naar bescherming tegen water' },
    elevation: m => `Hoogte ${m} m`,
    src: 'Google Open Buildings, Copernicus',
  },
  ban: {
    title: 'Wewidangan lan pasih', titleInland: 'Wewidangan',
    pace: { fast: 'Wewidangan gelis kawangun - pacang wenten pawangunan ring sisi', avg: 'Wewidangan kawangun manut laju biasa ring Bali', slow: 'Wewidangan adeng kawangun - panorama lan sepi kantun suwe' },
    grew: (p, a, b) => `${p > 0 ? '+' : ''}${p}% wangunan ring radius 1 km ring ${a}–${b}`,
    sea: (c, h) => `${c != null ? `Pasih ~${c} m, ` : ''}tanah ${h} m ring ajeng pasih`,
    seaLevel: { high: 'jarak becik saking yeh pinih tegeh nyantos 2050', mid: 'jarak alit saking yeh pinih tegeh nyantos 2050', low: 'tanah endep - takenang pangwangun indik pangaman saking yeh' },
    elevation: m => `Ketinggian ${m} m`,
    src: 'Google Open Buildings, Copernicus',
  },
  pl: {
    title: 'Okolica i wybrzeże', titleInland: 'Okolica',
    pace: { fast: 'Okolica szybko się zabudowuje - w pobliżu będą budowy', avg: 'Okolica zabudowuje się w zwykłym dla Bali tempie', slow: 'Okolica zabudowuje się powoli - widok i cisza zostaną na dłużej' },
    grew: (p, a, b) => `${p > 0 ? '+' : ''}${p}% budynków w promieniu 1 km w latach ${a}–${b}`,
    sea: (c, h) => `${c != null ? `Ocean ~${c} m, ` : ''}działka ${h} m n.p.m.`,
    seaLevel: { high: 'duży zapas nad najwyższą wodą do 2050 roku', mid: 'mały zapas nad najwyższą wodą do 2050 roku', low: 'niska działka - zapytaj dewelopera o ochronę przed wodą' },
    elevation: m => `Wysokość ${m} m n.p.m.`,
    src: 'Google Open Buildings, Copernicus',
  },
  uk: {
    title: 'Район і узбережжя', titleInland: 'Район',
    pace: { fast: 'Район швидко забудовується - поруч будуть будівництва', avg: 'Район забудовується у звичайному для Балі темпі', slow: 'Район забудовується повільно - краєвид і тиша збережуться довше' },
    grew: (p, a, b) => `${p > 0 ? '+' : ''}${p}% будівель у радіусі 1 км за ${a}–${b}`,
    sea: (c, h) => `${c != null ? `До океану ~${c} м, ` : ''}ділянка на ${h} м над морем`,
    seaLevel: { high: 'запас від найвищої води до 2050 року великий', mid: 'запас від найвищої води до 2050 року невеликий', low: 'ділянка низька - запитайте забудовника про захист від води' },
    elevation: m => `Висота над морем ${m} м`,
    src: 'Google Open Buildings, Copernicus',
  },
}

// Запас под погрешность спутниковой высоты в несколько метров: меньше 3 м
// погрешность съедает запас целиком, от 8 м — переживает.
function marginLevel(m: number): 'high' | 'mid' | 'low' {
  return m >= 8 ? 'high' : m >= 3 ? 'mid' : 'low'
}

// Темп застройки — по месту среди объектов Бали (growth_rank, 0–100):
// верхняя треть — «быстро», нижняя — «медленно».
function paceOf(rank: number | null | undefined): Pace | null {
  if (rank == null) return null
  return rank >= 67 ? 'fast' : rank <= 33 ? 'slow' : 'avg'
}

export function AreaBlock({ climate, lang, elevationM = null }: { climate: Climate | null; lang: Lang; elevationM?: number | null }) {
  const t = pickCopy(COPY, lang)
  const ob = climate?.buildings
  const sea = climate?.sea
  const coast = climate?.coast_m != null ? Math.round(climate.coast_m / 10) * 10 : null

  const years = ob ? Object.keys(ob.years).sort() : []
  const first = years.length ? ob!.years[years[0]] : null
  const last = years.length ? ob!.years[years[years.length - 1]] : null
  const growth = first && last && first.n >= 20 ? Math.round(100 * (last.n - first.n) / first.n) : null
  const pace = paceOf(ob?.growth_rank ?? climate?.built?.growth_rank)
  const ns = years.map(y => ob!.years[y].n)
  const minN = Math.min(...ns), maxN = Math.max(...ns)

  if (!pace && growth == null && !sea && elevationM == null) return null

  return (
    <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <h3 className="mb-4 text-[15px] font-semibold text-[var(--color-text)]">{sea ? t.title : t.titleInland}</h3>

      {(pace || growth != null) && (
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-start gap-2 text-[15px] font-medium leading-snug text-[var(--color-text)]">
              <Building2 size={16} className="mt-0.5 shrink-0 text-[var(--color-primary)]" aria-hidden />
              {pace ? t.pace[pace] : null}
            </p>
            {growth != null && <p className="mt-1 pl-6 text-[14px] text-[var(--color-text-muted)]">{t.grew(growth, years[0], years[years.length - 1])}</p>}
          </div>
          {years.length > 1 && (
            // Здания в 1 км по годам: от меньшего к большему, чтобы рост был виден.
            <div className="flex h-10 shrink-0 items-end gap-1" aria-hidden="true">
              {years.map((y, i) => (
                <div key={y} className="w-2 rounded-t-sm bg-[var(--color-primary)]"
                  style={{ height: `${6 + (maxN > minN ? (ob!.years[y].n - minN) / (maxN - minN) : 1) * 34}px`, opacity: i === years.length - 1 ? 0.9 : 0.4 }} />
              ))}
            </div>
          )}
        </div>
      )}

      {sea ? (
        <p className={`flex items-start gap-2 text-[15px] leading-snug text-[var(--color-text)] ${pace || growth != null ? 'mt-4 border-t border-[var(--color-border)] pt-4' : ''}`}>
          <Waves size={16} className="mt-0.5 shrink-0 text-[var(--color-primary)]" aria-hidden />
          <span>{t.sea(coast, Math.round(sea.elevation_m))}: {t.seaLevel[marginLevel(sea.margin_m)]}.</span>
        </p>
      ) : elevationM != null && (
        <p className={`text-[15px] text-[var(--color-text)] ${pace || growth != null ? 'mt-4 border-t border-[var(--color-border)] pt-4' : ''}`}>{t.elevation(Math.round(elevationM))}</p>
      )}

      <p className="mt-4 text-[12px] text-[var(--color-text-muted)]">{t.src}</p>
    </div>
  )
}
