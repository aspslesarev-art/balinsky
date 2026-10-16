// «Пляж» в разделе «Удобно ли там жить?»: ближайший пляж одной карточкой —
// песок и вода, купаться, с детьми, сёрфинг, чем заняться, набережная, кому
// подходит и почему туда ходят (lib/beaches.ts). Расстояние — из расчёта
// «для жизни», в «Главном рядом» строка пляжа тогда не повторяется.
// Пояснения к пунктам написаны по-русски, на других языках — только сами
// значения; остальные языки берут английский.
import { Waves } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import type { BeachProfile } from '@/lib/beaches'

const COPY = {
  ru: {
    title: (name: string, dist: string) => `${/^пляж/i.test(name) ? name : `Пляж ${name}`} - ${dist}`,
    km: (km: number) => (km < 1 ? `${Math.round(km * 1000 / 50) * 50} м` : `${km.toFixed(1).replace('.', ',')} км`),
    sand: { white: 'белый песок', golden: 'золотистый песок', grey: 'серый песок', black: 'чёрный вулканический песок', mixed: 'песок с камнями' } as Record<string, string>,
    water: { calm: 'спокойная вода', moderate: 'небольшие волны', waves: 'волны', strong_currents: 'сильные течения' } as Record<string, string>,
    swimL: 'Купаться', swim: { yes: 'можно', high_tide_only: 'только в прилив', not_recommended: 'не стоит' } as Record<string, string>,
    kidsL: 'С детьми', kids: { yes: 'да', with_care: 'с осторожностью', no: 'нет' } as Record<string, string>,
    surfL: 'Сёрфинг', surf: { none: 'нет', beginner: 'для новичков', intermediate: 'для тех, кто уже катается', advanced: 'для опытных' } as Record<string, string>,
    actL: 'Ещё',
    act: { snorkeling: 'снорклинг', diving: 'дайвинг', sup: 'сап', kayak: 'каяк', jet_ski: 'гидроцикл', parasailing: 'парасейлинг', banana_boat: 'банан', boat_trips: 'лодки на острова', fishing: 'рыбалка', horse_riding: 'конные прогулки', paragliding: 'параплан', yoga: 'йога' } as Record<string, string>,
    promL: 'Набережная', promYes: (km: number | null) => (km ? `есть, ${String(km).replace('.', ',')} км` : 'есть'), promNo: 'нет',
    accessL: 'Как спуститься', access: { easy: 'просто', stairs: 'по лестнице', steep_path: 'крутая тропа', via_hotel_only: 'только через отель', boat: 'на лодке' } as Record<string, string>,
    vibeL: 'Кому подходит', whyL: 'Почему туда ходят',
    notes: true,
  },
  en: {
    title: (name: string, dist: string) => `${name} - ${dist}`,
    km: (km: number) => (km < 1 ? `${Math.round(km * 1000 / 50) * 50} m` : `${km.toFixed(1)} km`),
    sand: { white: 'white sand', golden: 'golden sand', grey: 'grey sand', black: 'black volcanic sand', mixed: 'sand and rocks' } as Record<string, string>,
    water: { calm: 'calm water', moderate: 'small waves', waves: 'waves', strong_currents: 'strong currents' } as Record<string, string>,
    swimL: 'Swimming', swim: { yes: 'yes', high_tide_only: 'high tide only', not_recommended: 'not recommended' } as Record<string, string>,
    kidsL: 'With kids', kids: { yes: 'yes', with_care: 'with care', no: 'no' } as Record<string, string>,
    surfL: 'Surf', surf: { none: 'no', beginner: 'beginners', intermediate: 'intermediate', advanced: 'advanced' } as Record<string, string>,
    actL: 'Also',
    act: { snorkeling: 'snorkelling', diving: 'diving', sup: 'SUP', kayak: 'kayak', jet_ski: 'jet ski', parasailing: 'parasailing', banana_boat: 'banana boat', boat_trips: 'boats to the islands', fishing: 'fishing', horse_riding: 'horse riding', paragliding: 'paragliding', yoga: 'yoga' } as Record<string, string>,
    promL: 'Promenade', promYes: (km: number | null) => (km ? `yes, ${km} km` : 'yes'), promNo: 'no',
    accessL: 'Getting down', access: { easy: 'easy', stairs: 'stairs', steep_path: 'steep path', via_hotel_only: 'through a hotel only', boat: 'by boat' } as Record<string, string>,
    vibeL: 'Who it suits', whyL: 'Why people go',
    notes: false,
  },
}

export function BeachBlock({ beach: b, km, lang }: { beach: BeachProfile; km: number; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const name = (lang === 'ru' ? b.name_ru : b.name_en) ?? b.name_en ?? b.name_ru ?? ''
  const note = (s?: string | null) => (c.notes && s ? ` - ${s}` : '')
  const head = [b.sand ? c.sand[b.sand] : null, b.water ? c.water[b.water] : null].filter(Boolean).join(', ')
  const rows: { k: string; v: string }[] = []
  if (b.swim) rows.push({ k: c.swimL, v: c.swim[b.swim] + note(b.swim_note) })
  if (b.kids) rows.push({ k: c.kidsL, v: c.kids[b.kids] + note(b.kids_note) })
  if (b.surf) rows.push({ k: c.surfL, v: c.surf[b.surf] + note(b.surf_note) })
  const acts = (b.activities ?? []).map(a => c.act[a]).filter(Boolean)
  if (acts.length) rows.push({ k: c.actL, v: acts.join(', ') })
  if (b.promenade?.exists != null) rows.push({ k: c.promL, v: b.promenade.exists ? c.promYes(b.promenade.length_km) + note(b.promenade.note) : c.promNo })
  if (b.access && b.access !== 'easy') rows.push({ k: c.accessL, v: (c.access[b.access] ?? b.access) + note(b.access_note) })
  if (c.notes && b.vibe) rows.push({ k: c.vibeL, v: b.vibe })
  if (c.notes && b.why) rows.push({ k: c.whyL, v: b.why })

  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-white px-5 md:px-6 pb-2">
      <h3 className="flex items-center gap-2 pt-5 text-[17px] font-semibold text-[var(--color-text)]">
        <Waves size={18} className="shrink-0 text-[var(--color-primary)]" aria-hidden />
        {c.title(name, c.km(km))}
      </h3>
      {head && <p className="mt-1 text-[15px] text-[var(--color-text)]">{head[0].toUpperCase() + head.slice(1)}{note(b.water_note)}</p>}
      <dl className="mt-2 divide-y divide-[var(--color-border)]">
        {rows.map(r => (
          <div key={r.k} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
            <dt className="text-[15px] text-[var(--color-text-muted)]">{r.k}</dt>
            <dd className="text-[16px] text-[var(--color-text)] [overflow-wrap:anywhere]">{r.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
