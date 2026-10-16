// «Удобно ли тут жить» — итог для тех, кто покупает для себя (lib/living.ts).
// Каждое значение — один раз: итог называет только минусы, ниже один список
// по пунктам. Воздух, погода и высота — в разделе «Место» на этой же
// странице, здесь их нет. Остальные языки берут английский текст, как и
// «Стоит ли брать» (ListingVerdict).
import { pickCopy, type Lang } from '@/lib/i18n'
import type { LivingFacts, LivingRow, NoiseReason } from '@/lib/living'
import type { Tone } from '@/lib/listing-verdict'
import { pluralRu } from '@/lib/plural-ru'

const TONE_TEXT: Record<Tone, string> = {
  plus: 'text-[var(--color-primary-pressed)]',
  warn: 'text-[#8A4B00]',
  minus: 'text-[#A1281C]',
}
const TONE_DOT: Record<Tone, string> = { plus: 'bg-[var(--color-primary)]', warn: 'bg-[#D08A1C]', minus: 'bg-[#C0392B]' }

const mRound = (m: number) => Math.round(m / 10) * 10
const kmRu = (km: number) => (km < 1 ? `${Math.round(km * 1000 / 50) * 50} м` : `${km.toFixed(1).replace('.', ',')} км`)
const kmEn = (km: number) => (km < 1 ? `${Math.round(km * 1000 / 50) * 50} m` : `${km.toFixed(1)} km`)
const HUB_RU = { canggu: 'Чангу', ubud: 'Убуд', uluwatu: 'Улувату', sanur: 'Санур' } as const
const HUB_EN = { canggu: 'Canggu', ubud: 'Ubud', uluwatu: 'Uluwatu', sanur: 'Sanur' } as const
const VOLC_RU = { agung: 'Агунг', batur: 'Батур' } as const
const VOLC_EN = { agung: 'Agung', batur: 'Batur' } as const

const reasonRu = (r: NoiseReason) => r.k === 'bars' ? `${r.n} ${pluralRu(r.n, ['бар или клуб', 'бара или клуба', 'баров и клубов'])} в 300 м`
  : r.k === 'school' ? `школа в ${mRound(r.m)} м`
  : r.k === 'road' ? `${r.cls === 'big' ? 'оживлённая дорога' : 'проезжая улица'} в ${mRound(r.m)} м`
  : r.k === 'mosque' ? `мечеть в ${mRound(r.m)} м`
  : r.k === 'flight' ? (r.v === 'near' ? 'рядом аэропорт' : 'под заходом самолётов')
  : 'стройки вокруг'
const reasonEn = (r: NoiseReason) => r.k === 'bars' ? `${r.n} ${r.n === 1 ? 'bar or club' : 'bars and clubs'} within 300 m`
  : r.k === 'school' ? `school ${mRound(r.m)} m away`
  : r.k === 'road' ? `${r.cls === 'big' ? 'busy road' : 'through street'} ${mRound(r.m)} m away`
  : r.k === 'mosque' ? `mosque ${mRound(r.m)} m away`
  : r.k === 'flight' ? (r.v === 'near' ? 'next to the airport' : 'under the landing approach')
  : 'construction around'

type Line = { key: string; label: string; value: string; tone: Tone }

const COPY = {
  ru: {
    title: 'Удобно ли тут жить',
    sub: 'Для тех, кто покупает для себя. Расстояния по прямой, по Google Maps и OpenStreetMap.',
    line: { plus: 'Для жизни удобно', warn: 'Для жизни есть минусы', minus: 'Для жизни неудобно' } as Record<Tone, string>,
    far: (km: number) => `дальше ${String(km).replace('.', ',')} км`,
    km: kmRu,
    reason: reasonRu,
    labels: { school: 'Школа', intl: 'Международная школа', beach: 'Пляж', health: 'Клиника', shop: 'Магазин', cafes: 'Кафе', quiet: 'Тишина', road: 'Дорога в час пик', lease: 'Аренда земли', volcano: 'Вулкан' },
    pharmacy: (km: string) => `аптека ${km}`,
    cafes: (n: number) => `${n} в 500 м`,
    cowork: (km: string) => `коворкинг ${km}`,
    quietOk: 'тихо',
    road: (f: LivingFacts) => [f.airportMin != null ? `аэропорт ${f.airportMin} мин` : null, f.hub ? `${HUB_RU[f.hub.key]} ${f.hub.min} мин` : null].filter(Boolean).join(', '),
    lease: (y: number) => `осталось ${Math.floor(y)} ${pluralRu(Math.floor(y), ['год', 'года', 'лет'])}`,
    volcano: (r: LivingRow) => `${VOLC_RU[r.volcano!]}, ${kmRu(r.km!)}`,
    // Минус в итоге — коротко, без цифр (они в списке ниже).
    minus: { school: 'далеко до школы', beach: 'далеко до пляжа', health: 'далеко до клиники', shop: 'далеко до магазина', cafes: 'мало кафе', quiet: 'бывает шумно', quietMinus: 'шумно', volcano: 'близко вулкан', lease: 'короткая аренда земли' } as Record<string, string>,
    but: 'но',
  },
  en: {
    title: 'Is it good to live here',
    sub: 'For those buying for themselves. Straight-line distances, from Google Maps and OpenStreetMap.',
    line: { plus: 'Comfortable to live in', warn: 'Liveable, with drawbacks', minus: 'Inconvenient to live in' } as Record<Tone, string>,
    far: (km: number) => `beyond ${km} km`,
    km: kmEn,
    reason: reasonEn,
    labels: { school: 'School', intl: 'International school', beach: 'Beach', health: 'Clinic', shop: 'Grocery store', cafes: 'Cafés', quiet: 'Quiet', road: 'Rush-hour drive', lease: 'Land lease', volcano: 'Volcano' },
    pharmacy: (km: string) => `pharmacy ${km}`,
    cafes: (n: number) => `${n} within 500 m`,
    cowork: (km: string) => `coworking ${km}`,
    quietOk: 'quiet',
    road: (f: LivingFacts) => [f.airportMin != null ? `airport ${f.airportMin} min` : null, f.hub ? `${HUB_EN[f.hub.key]} ${f.hub.min} min` : null].filter(Boolean).join(', '),
    lease: (y: number) => `${Math.floor(y)} years left`,
    volcano: (r: LivingRow) => `${VOLC_EN[r.volcano!]}, ${kmEn(r.km!)}`,
    minus: { school: 'school is far', beach: 'beach is far', health: 'clinic is far', shop: 'grocery is far', cafes: 'few cafés', quiet: 'can be noisy', quietMinus: 'noisy', volcano: 'volcano nearby', lease: 'short land lease' } as Record<string, string>,
    but: 'but',
  },
}

export function LivingVerdict({ facts: f, lang }: { facts: LivingFacts; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const row = (k: LivingRow['key']) => f.rows.find(r => r.key === k)
  const dist = (r: LivingRow, extra?: string | null) =>
    [r.km != null ? c.km(r.km) : c.far(r.searchKm ?? 0), r.name, extra].filter(Boolean).join(' · ')

  const lines: Line[] = []
  const school = row('school'), beach = row('beach'), health = row('health'), shop = row('shop'), cafes = row('cafes'), quiet = row('quiet'), volcano = row('volcano')
  if (school) lines.push({ key: 'school', label: school.intl ? c.labels.intl : c.labels.school, value: dist(school), tone: school.tone })
  if (beach) lines.push({ key: 'beach', label: c.labels.beach, value: dist(beach), tone: beach.tone })
  if (health) lines.push({ key: 'health', label: c.labels.health, value: dist(health, health.pharmacyKm != null ? c.pharmacy(c.km(health.pharmacyKm)) : null), tone: health.tone })
  if (shop) lines.push({ key: 'shop', label: c.labels.shop, value: dist(shop), tone: shop.tone })
  if (cafes) lines.push({ key: 'cafes', label: c.labels.cafes, value: [c.cafes(cafes.count ?? 0), cafes.coworkKm != null ? c.cowork(c.km(cafes.coworkKm)) : null].filter(Boolean).join(' · '), tone: cafes.tone })
  if (quiet) lines.push({ key: 'quiet', label: c.labels.quiet, value: quiet.reasons?.length ? quiet.reasons.map(c.reason).join(' · ') : c.quietOk, tone: quiet.tone })
  if (volcano) lines.push({ key: 'volcano', label: c.labels.volcano, value: c.volcano(volcano), tone: volcano.tone })
  const road = c.road(f)
  if (road) lines.push({ key: 'road', label: c.labels.road, value: road, tone: 'plus' })
  if (f.leaseYears != null) lines.push({ key: 'lease', label: c.labels.lease, value: c.lease(f.leaseYears), tone: f.leaseYears >= 25 ? 'plus' : 'warn' })

  // Итог называет только минусы — коротко, без цифр: значения и так в списке.
  const minuses = lines.filter(l => l.tone !== 'plus' && c.minus[l.key]).map(l => c.minus[l.key === 'quiet' && l.tone === 'minus' ? 'quietMinus' : l.key])
  const total = f.tone === 'plus'
    ? `${c.line.plus}${minuses.length ? `, ${c.but} ${minuses.join(', ')}` : ''}.`
    : `${c.line[f.tone]}${minuses.length ? `: ${minuses.join(', ')}` : ''}.`

  return (
    <section className="mb-16" aria-labelledby="living-title">
      <h2 id="living-title" className="text-[28px] md:text-[36px] font-semibold tracking-tight leading-tight text-[var(--color-text)]">{c.title}</h2>
      <p className="mt-3 text-[16px] leading-relaxed text-[var(--color-text-muted)] max-w-[64ch]">{c.sub}</p>

      <div className="mt-8 rounded-[20px] bg-[var(--color-surface-alt)] p-6 md:p-8">
        <p className={`text-[20px] md:text-[24px] font-semibold leading-snug tracking-tight ${TONE_TEXT[f.tone]}`}>
          {total}
        </p>
        <dl className="mt-6 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {lines.map(l => (
            <div key={l.key} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6">
              <dt className="flex items-center gap-2 text-[15px] text-[var(--color-text-muted)]">
                <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[l.tone]}`} aria-hidden />
                {l.label}
              </dt>
              <dd className="text-[16px] text-[var(--color-text)] [overflow-wrap:anywhere]">{l.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
