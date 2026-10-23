// «Главное рядом» в разделе «Удобно ли там жить?» (lib/living.ts): по одной
// строке на пункт — школа, пляж, клиника, магазин, кафе, тишина, вулкан.
// Ответ на вопрос («Для жизни удобно, но бывает шумно») — в заголовке
// раздела и в итоге наверху (ListingVerdict). Дорога, погода, воздух и
// высота — в этом же разделе своими блоками, аренда земли — в разделе
// «Безопасно ли это?», здесь их нет. Остальные языки берут английский текст.
import { pickCopy, type Lang } from '@/lib/i18n'
import type { LivingFacts, LivingRow, NoiseReason } from '@/lib/living'
import type { Tone } from '@/lib/listing-verdict'
import { pluralRu } from '@/lib/plural-ru'
import { nearPoints } from '@/lib/listing-map'
import type { NearbyPlace } from '@/lib/nearby-places'
import { ListingMap } from './ListingMap'
import { LazyMount } from './LazyMount'

const TONE_DOT: Record<Tone, string> = { plus: 'bg-[var(--color-primary)]', warn: 'bg-[#D08A1C]', minus: 'bg-[#C0392B]' }

const mRound = (m: number) => Math.round(m / 10) * 10
const kmRu = (km: number) => (km < 1 ? `${Math.round(km * 1000 / 50) * 50} м` : `${km.toFixed(1).replace('.', ',')} км`)
const kmEn = (km: number) => (km < 1 ? `${Math.round(km * 1000 / 50) * 50} m` : `${km.toFixed(1)} km`)
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
    title: 'Главное рядом - по прямой, по Google Maps и OpenStreetMap',
    far: (km: number) => `дальше ${String(km).replace('.', ',')} км`,
    km: kmRu,
    reason: reasonRu,
    labels: { school: 'Школа', intl: 'Международная школа', beach: 'Пляж', health: 'Клиника', shop: 'Магазин', cafes: 'Кафе', quiet: 'Тишина', volcano: 'Вулкан' },
    pharmacy: (km: string) => `аптека ${km}`,
    cafes: (n: number) => `${n} в 500 м`,
    cowork: (km: string) => `коворкинг ${km}`,
    quietOk: 'тихо',
    volcano: (r: LivingRow) => `${VOLC_RU[r.volcano!]}, ${kmRu(r.km!)}`,
  },
  en: {
    title: 'Essentials nearby - straight-line, from Google Maps and OpenStreetMap',
    far: (km: number) => `beyond ${km} km`,
    km: kmEn,
    reason: reasonEn,
    labels: { school: 'School', intl: 'International school', beach: 'Beach', health: 'Clinic', shop: 'Grocery store', cafes: 'Cafés', quiet: 'Quiet', volcano: 'Volcano' },
    pharmacy: (km: string) => `pharmacy ${km}`,
    cafes: (n: number) => `${n} within 500 m`,
    cowork: (km: string) => `coworking ${km}`,
    quietOk: 'quiet',
    volcano: (r: LivingRow) => `${VOLC_EN[r.volcano!]}, ${kmEn(r.km!)}`,
  },
}

export function LivingList({ facts: f, lang, hideBeach = false, map }: {
  facts: LivingFacts
  lang: Lang
  /** Пляж описан отдельной карточкой (BeachBlock) — здесь не повторяем. */
  hideBeach?: boolean
  /** Карта: объект красной точкой, места рядом цветными (макет «Карты», A — 23.10.2026). */
  map?: { byCategory: Record<string, NearbyPlace[]>; lat: number; lng: number; name: string } | null
}) {
  const c = pickCopy(COPY, lang)
  const row = (k: LivingRow['key']) => f.rows.find(r => r.key === k)
  const dist = (r: LivingRow, extra?: string | null) =>
    [r.km != null ? c.km(r.km) : c.far(r.searchKm ?? 0), r.name, extra].filter(Boolean).join(' · ')

  const near = map ? nearPoints(map.byCategory) : null
  const lines: Line[] = []
  const school = row('school'), beach = row('beach'), health = row('health'), shop = row('shop'), cafes = row('cafes'), quiet = row('quiet'), volcano = row('volcano')
  if (school) lines.push({ key: 'school', label: school.intl ? c.labels.intl : c.labels.school, value: dist(school), tone: school.tone })
  if (beach && !hideBeach) lines.push({ key: 'beach', label: c.labels.beach, value: dist(beach), tone: beach.tone })
  if (health) lines.push({ key: 'health', label: c.labels.health, value: dist(health, health.pharmacyKm != null ? c.pharmacy(c.km(health.pharmacyKm)) : null), tone: health.tone })
  if (shop) lines.push({ key: 'shop', label: c.labels.shop, value: dist(shop), tone: shop.tone })
  if (cafes) lines.push({ key: 'cafes', label: c.labels.cafes, value: [c.cafes(cafes.count ?? 0), cafes.coworkKm != null ? c.cowork(c.km(cafes.coworkKm)) : null].filter(Boolean).join(' · '), tone: cafes.tone })
  if (quiet) lines.push({ key: 'quiet', label: c.labels.quiet, value: quiet.reasons?.length ? quiet.reasons.map(c.reason).join(' · ') : c.quietOk, tone: quiet.tone })
  if (volcano) lines.push({ key: 'volcano', label: c.labels.volcano, value: c.volcano(volcano), tone: volcano.tone })

  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-white px-5 md:px-6">
      <h3 className="pt-5 text-[15px] font-semibold text-[var(--color-text)]">{c.title}</h3>
      {/* С картой — полосой: список слева, карта с легендой справа (макет «Удобно ли
          там жить?», B — владелец 23.10.2026). */}
      <div className={near && near.points.length > 0 ? 'mt-3 grid grid-cols-1 gap-4 pb-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-8' : ''}>
      {near && near.points.length > 0 && (
        <div className="flex flex-col gap-3 lg:order-last">
          <LazyMount fallback={<div className="h-[320px] rounded-xl bg-[var(--color-search-bg)]" />}>
            <ListingMap lat={map!.lat} lng={map!.lng} name={map!.name} points={near.points} />
          </LazyMount>
          {/* Легенда — под картой: цвета относятся к ней. */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[var(--color-text-muted)]">
            {near.groups.map(g => (
              <span key={g.key} className="flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                {lang === 'ru' ? g.ru : g.en}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="min-w-0">
      <dl className="divide-y divide-[var(--color-border)]">
        {lines.map(l => (
          <div key={l.key} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6">
            <dt className="flex items-center gap-2 text-[15px] text-[var(--color-text-muted)]">
              <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[l.tone]}`} aria-hidden />
              {l.label}
            </dt>
            <dd className="text-[16px] text-[var(--color-text)] [overflow-wrap:anywhere]">{l.value}</dd>
          </div>
        ))}
      </dl>
      </div>
      </div>
    </div>
  )
}
