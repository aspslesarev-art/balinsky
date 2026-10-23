// «Пляж» в разделе «Удобно ли там жить?»: ближайший пляж одной карточкой —
// песок и вода, купаться, с детьми, сёрфинг, чем заняться, набережная, кому
// подходит и почему туда ходят (lib/beaches.ts). Расстояние — из расчёта
// «для жизни», в «Главном рядом» строка пляжа тогда не повторяется.
// Пояснения к пунктам написаны по-русски, на других языках — только сами
// значения; остальные языки берут английский.
import Image from 'next/image'
import { Star, Waves } from 'lucide-react'
import { pickCopy, type Lang } from '@/lib/i18n'
import type { BeachProfile } from '@/lib/beaches'
import { pluralRu } from '@/lib/plural-ru'

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
    nearL: 'У пляжа',
    near: (n: NonNullable<BeachProfile['nearby']>) => [
      n.cafes ? `${n.cafes} ${pluralRu(n.cafes, ['кафе', 'кафе', 'кафе'])}` : null,
      n.restaurants ? `${n.restaurants} ${pluralRu(n.restaurants, ['ресторан', 'ресторана', 'ресторанов'])}` : null,
      n.bars ? `${n.bars} ${pluralRu(n.bars, ['бар', 'бара', 'баров'])}` : null,
      n.beach_clubs ? `${n.beach_clubs} ${pluralRu(n.beach_clubs, ['бич-клуб', 'бич-клуба', 'бич-клубов'])}` : null,
    ].filter(Boolean).join(', ') + ` в ${n.radius_m} м`,
    nearNone: (r: number) => `заведений в ${r} м нет`,
    promPhoto: 'Набережная', photoBy: 'Фото',
    reviews: (n: number) => `${n.toLocaleString('ru-RU')} ${pluralRu(n, ['отзыв', 'отзыва', 'отзывов'])} в Google`,
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
    nearL: 'By the beach',
    near: (n: NonNullable<BeachProfile['nearby']>) => [
      n.cafes ? `${n.cafes} ${n.cafes === 1 ? 'café' : 'cafés'}` : null,
      n.restaurants ? `${n.restaurants} ${n.restaurants === 1 ? 'restaurant' : 'restaurants'}` : null,
      n.bars ? `${n.bars} ${n.bars === 1 ? 'bar' : 'bars'}` : null,
      n.beach_clubs ? `${n.beach_clubs} ${n.beach_clubs === 1 ? 'beach club' : 'beach clubs'}` : null,
    ].filter(Boolean).join(', ') + ` within ${n.radius_m} m`,
    nearNone: (r: number) => `no venues within ${r} m`,
    promPhoto: 'Promenade', photoBy: 'Photos',
    reviews: (n: number) => `${n.toLocaleString('en-US')} Google ${n === 1 ? 'review' : 'reviews'}`,
    notes: false,
  },
}

export function BeachBlock({ beach: b, km, google, lang }: { beach: BeachProfile; km: number; google?: { rating: number | null; reviews: number | null; url: string | null } | null; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const name = (lang === 'ru' ? b.name_ru : b.name_en) ?? b.name_en ?? b.name_ru ?? ''
  const note = (s?: string | null) => (c.notes && s ? ` - ${s[0].toLowerCase()}${s.slice(1)}` : '')
  // Значение и пояснение; если пояснение уже говорит то же самое — только пояснение.
  const val = (label: string, s?: string | null) => {
    if (!c.notes || !s) return label
    const n = s[0].toLowerCase() + s.slice(1)
    // Целым словом: «вода» содержит «да», но значения «да» в ней нет.
    const esc = label.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[\\s,.;:-])${esc}($|[\\s,.;:-])`, 'u').test(n) ? n : `${label} - ${n}`
  }
  // Пояснение к воде часто начинается тем же словом («волны - Волны, течения…»):
  // тогда показываем только пояснение.
  const waterLabel = b.water ? c.water[b.water] : null
  const waterNote = c.notes && b.water_note ? b.water_note : null
  const waterText = waterLabel && waterNote && waterNote.toLowerCase().startsWith(waterLabel.toLowerCase()) ? waterNote.toLowerCase() : waterLabel ? waterLabel + note(waterNote) : null
  const head = [b.sand ? c.sand[b.sand] : null, waterText].filter(Boolean).join(', ')
  const rows: { k: string; v: string }[] = []
  if (b.swim) rows.push({ k: c.swimL, v: val(c.swim[b.swim], b.swim_note) })
  if (b.kids) rows.push({ k: c.kidsL, v: val(c.kids[b.kids], b.kids_note) })
  if (b.surf) rows.push({ k: c.surfL, v: val(c.surf[b.surf], b.surf_note) })
  const nb = b.nearby
  if (nb) rows.push({ k: c.nearL, v: nb.cafes + nb.restaurants + nb.bars + nb.beach_clubs > 0 ? c.near(nb) : c.nearNone(nb.radius_m) })
  const acts = (b.activities ?? []).map(a => c.act[a]).filter(Boolean)
  if (acts.length) rows.push({ k: c.actL, v: acts.join(', ') })
  if (b.promenade?.exists != null) rows.push({ k: c.promL, v: b.promenade.exists ? c.promYes(b.promenade.length_km) + note(b.promenade.note) : c.promNo })
  if (b.access && b.access !== 'easy') rows.push({ k: c.accessL, v: val(c.access[b.access] ?? b.access, b.access_note) })
  if (c.notes && b.vibe) rows.push({ k: c.vibeL, v: b.vibe })
  if (c.notes && b.why) rows.push({ k: c.whyL, v: b.why })

  // Не больше трёх: пляж первым, набережная последней, если есть.
  const all = b.photos ?? []
  const prom = all.find(p => p.kind === 'promenade')
  const photos = [...all.filter(p => p.kind === 'beach').slice(0, prom ? 2 : 3), ...(prom ? [prom] : [])]
  // Подпись авторов — по одному разу на автора.
  const credits = [...new Map(photos.map(p => [p.author ?? p.page, p])).values()]

  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-white px-5 md:px-6 pb-2">
      <h3 className="flex items-center gap-2 pt-5 text-[17px] font-semibold text-[var(--color-text)]">
        <Waves size={18} className="shrink-0 text-[var(--color-primary)]" aria-hidden />
        {c.title(name, c.km(km))}
      </h3>
      {google?.rating != null && (google.reviews ?? 0) > 0 && (
        // Оценка точки пляжа в Google Картах — как его оценивают сами отдыхающие.
        <a href={google.url ?? undefined} target="_blank" rel="nofollow noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1.5 text-[14px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">
          <Star size={14} className="fill-[#F5B301] text-[#F5B301]" aria-hidden />
          <span className="font-semibold text-[var(--color-text)]">{lang === 'en' || lang === 'zh' ? google.rating.toFixed(1) : google.rating.toFixed(1).replace('.', ',')}</span>
          <span>· {c.reviews(google.reviews!)}</span>
        </a>
      )}
      {head && <p className="mt-1 text-[15px] text-[var(--color-text)]">{head[0].toUpperCase() + head.slice(1)}</p>}
      {photos.length > 0 && (
        <div className="mt-4">
          {/* Телефон — лента вбок, компьютер — до трёх в ряд. */}
          <div className="-mx-5 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {photos.map((p, i) => (
              // Фото не ссылка (владелец 23.10.2026): уводило на страницу Wikimedia.
              // Автор и лицензия — подписью ниже, как требует CC BY-SA.
              <div key={p.src}
                className="relative aspect-[4/3] w-[78%] shrink-0 snap-start overflow-hidden rounded-[12px] bg-[var(--color-search-bg)] md:w-auto">
                <Image src={p.src} alt={p.kind === 'promenade' ? `${c.promPhoto} - ${name}` : name} fill sizes="(min-width: 768px) 260px, 78vw" className="object-cover" loading={i === 0 ? 'eager' : 'lazy'} />
                {p.kind === 'promenade' && (
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[13px] font-medium text-white">{c.promPhoto}</span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
            {c.photoBy}: {credits.map((cr, i) => (
              <span key={cr.page}>{i > 0 && ', '}<a href={cr.page} target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--color-border)] underline-offset-2 hover:text-[var(--color-text)]">{cr.author ?? 'Wikimedia Commons'}</a>{cr.license ? ` (${cr.license})` : ''}</span>
            ))}
          </p>
        </div>
      )}
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
