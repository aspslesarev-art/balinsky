// «Удобно ли тут жить» — итог для тех, кто покупает для себя (lib/living.ts).
// Тот же язык, что у «Стоит ли брать» (ListingVerdict): итог одной строкой,
// шкала из трёх делений и строки с расстояниями. Остальные языки берут
// английский текст, как и ListingVerdict.
import { pickCopy, type Lang } from '@/lib/i18n'
import type { LivingFacts, LivingRow } from '@/lib/living'
import type { Tone } from '@/lib/listing-verdict'
import { pluralRu } from '@/lib/plural-ru'

const TONE_TEXT: Record<Tone, string> = {
  plus: 'text-[var(--color-primary-pressed)]',
  warn: 'text-[#8A4B00]',
  minus: 'text-[#A1281C]',
}
const SEG_COLOR: Record<Tone, string> = { minus: 'bg-[#C0392B]', warn: 'bg-[#D08A1C]', plus: 'bg-[var(--color-primary)]' }

function Steps({ tone }: { tone: Tone }) {
  const on = { minus: 0, warn: 1, plus: 2 }[tone]
  const tones: Tone[] = ['minus', 'warn', 'plus']
  return (
    <span className="grid grid-cols-3 gap-1" aria-hidden>
      {tones.map((t, i) => <span key={t} className={`h-1.5 rounded-full ${i === on ? SEG_COLOR[t] : 'bg-[var(--color-border)]'}`} />)}
    </span>
  )
}

const kmRu = (km: number) => (km < 1 ? `${Math.round(km * 1000 / 50) * 50} м` : `${km.toFixed(1).replace('.', ',')} км`)
const kmEn = (km: number) => (km < 1 ? `${Math.round(km * 1000 / 50) * 50} m` : `${km.toFixed(1)} km`)
const HUB_RU = { canggu: 'Чангу', ubud: 'Убуда', uluwatu: 'Улувату', sanur: 'Санура' } as const
const HUB_EN = { canggu: 'Canggu', ubud: 'Ubud', uluwatu: 'Uluwatu', sanur: 'Sanur' } as const

const COPY = {
  ru: {
    title: 'Удобно ли тут жить',
    sub: 'Для тех, кто покупает для себя. Расстояние по прямой до ближайшего места по Google Maps.',
    total: 'Итог для жизни',
    line: { plus: 'Для жизни удобно', warn: 'Для жизни есть минусы', minus: 'Для жизни неудобно' } as Record<Tone, string>,
    label: (r: LivingRow) => ({ school: r.intl ? 'Международная школа' : 'Школа', beach: 'Пляж', health: 'Клиника или больница', shop: 'Магазин', quiet: 'Тишина' })[r.key],
    status: (r: LivingRow) => r.key === 'quiet'
      ? ({ plus: 'тихо', warn: 'бывает шумно', minus: 'шумно' } as Record<Tone, string>)[r.tone]
      : ({ plus: 'близко', warn: 'неблизко', minus: 'далеко' } as Record<Tone, string>)[r.tone],
    value: (r: LivingRow) => r.key === 'quiet'
      ? (r.count ? `${r.count} ${pluralRu(r.count, ['бар или клуб', 'бара или клуба', 'баров и клубов'])} в 500 м` : 'баров и клубов в 500 м нет')
      : r.km != null ? kmRu(r.km) : `дальше ${String(r.searchKm).replace('.', ',')} км`,
    why: (f: LivingFacts) => f.rows.filter(r => r.key !== 'quiet' && r.km != null).slice(0, 3)
      .map(r => `${({ school: 'школа', beach: 'пляж', health: 'клиника', shop: 'магазин', quiet: '' })[r.key]} ${kmRu(r.km!)}`).join(', '),
    road: (f: LivingFacts) => [
      f.airportMin != null ? `до аэропорта ${f.airportMin} мин` : null,
      f.hub ? `до ${HUB_RU[f.hub.key]} ${f.hub.min} мин` : null,
    ].filter(Boolean).join(', '),
    roadLabel: 'Дорога в час пик',
    lease: (y: number) => `Аренда земли: осталось ${Math.floor(y)} ${pluralRu(Math.floor(y), ['год', 'года', 'лет'])}`,
    pharmacy: (km: number) => `аптека ${kmRu(km)}`,
    hint: 'Если важна доходность, переключитесь на «Для дохода»: там расчёт сдачи в аренду.',
  },
  en: {
    title: 'Is it good to live here',
    sub: 'For those buying for themselves. Straight-line distance to the nearest place, from Google Maps.',
    total: 'For living',
    line: { plus: 'Comfortable to live in', warn: 'Liveable, with drawbacks', minus: 'Inconvenient to live in' } as Record<Tone, string>,
    label: (r: LivingRow) => ({ school: r.intl ? 'International school' : 'School', beach: 'Beach', health: 'Clinic or hospital', shop: 'Grocery store', quiet: 'Quiet' })[r.key],
    status: (r: LivingRow) => r.key === 'quiet'
      ? ({ plus: 'quiet', warn: 'can be noisy', minus: 'noisy' } as Record<Tone, string>)[r.tone]
      : ({ plus: 'close', warn: 'not that close', minus: 'far' } as Record<Tone, string>)[r.tone],
    value: (r: LivingRow) => r.key === 'quiet'
      ? (r.count ? `${r.count} ${r.count === 1 ? 'bar or club' : 'bars and clubs'} within 500 m` : 'no bars or clubs within 500 m')
      : r.km != null ? kmEn(r.km) : `beyond ${r.searchKm} km`,
    why: (f: LivingFacts) => f.rows.filter(r => r.key !== 'quiet' && r.km != null).slice(0, 3)
      .map(r => `${({ school: 'school', beach: 'beach', health: 'clinic', shop: 'grocery', quiet: '' })[r.key]} ${kmEn(r.km!)}`).join(', '),
    road: (f: LivingFacts) => [
      f.airportMin != null ? `airport ${f.airportMin} min` : null,
      f.hub ? `${HUB_EN[f.hub.key]} ${f.hub.min} min` : null,
    ].filter(Boolean).join(', '),
    roadLabel: 'Drive at rush hour',
    lease: (y: number) => `Land lease: ${Math.floor(y)} years left`,
    pharmacy: (km: number) => `pharmacy ${kmEn(km)}`,
    hint: 'If returns matter, switch to “For income” for the rental calculation.',
  },
}

export function LivingVerdict({ facts: f, lang }: { facts: LivingFacts; lang: Lang }) {
  const c = pickCopy(COPY, lang)
  const why = c.why(f)
  const road = c.road(f)
  return (
    <section className="mb-16" aria-labelledby="living-title">
      <h2 id="living-title" className="text-[28px] md:text-[36px] font-semibold tracking-tight leading-tight text-[var(--color-text)]">{c.title}</h2>
      <p className="mt-3 text-[16px] md:text-[18px] leading-relaxed text-[var(--color-text-muted)] max-w-[64ch]">{c.sub}</p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 lg:gap-10 items-center rounded-[20px] bg-[var(--color-surface-alt)] p-6 md:p-8">
        <div>
          <div className="text-[13px] font-semibold uppercase tracking-wider text-[var(--color-primary-pressed)]">{c.total}</div>
          <p className="mt-3 text-[20px] md:text-[26px] font-semibold leading-snug tracking-tight text-[var(--color-text)]">{c.line[f.tone]}{why ? `: ${why}` : ''}.</p>
          {(road || f.leaseYears != null) && (
            <p className="mt-3 text-[15px] md:text-[16px] leading-relaxed text-[var(--color-text-muted)]">
              {road && <>{c.roadLabel}: {road}.</>}
              {road && f.leaseYears != null && ' '}
              {f.leaseYears != null && <>{c.lease(f.leaseYears)}.</>}
            </p>
          )}
        </div>
        <ul className="flex flex-col gap-3">
          {f.rows.map(r => (
            <li key={r.key} className="flex flex-col gap-1.5">
              <span className="flex justify-between gap-3 text-[14px]">
                <span className="text-[var(--color-text-muted)]">{c.label(r)}</span>
                <span className={`font-semibold ${TONE_TEXT[r.tone]}`}>{c.status(r)}</span>
              </span>
              <Steps tone={r.tone} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {f.rows.map(r => (
          <div key={r.key} className="rounded-[20px] border border-[var(--color-border)] bg-white p-5">
            <div className={`text-[14px] font-semibold ${TONE_TEXT[r.tone]}`}>{c.label(r)} · {c.status(r)}</div>
            <div className="mt-2 text-[21px] font-semibold leading-snug tracking-tight text-[var(--color-text)]">{c.value(r)}</div>
            {(r.name || (r.key === 'health' && r.pharmacyKm != null)) && (
              <div className="mt-1 text-[14px] leading-relaxed text-[var(--color-text-muted)] [overflow-wrap:anywhere]">
                {[r.name, r.key === 'health' && r.pharmacyKm != null ? c.pharmacy(r.pharmacyKm) : null].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-6 text-[15px] leading-relaxed text-[var(--color-text-muted)] max-w-[64ch]">{c.hint}</p>
    </section>
  )
}
