// «Удобно ли тут жить» — итог для тех, кто покупает для себя (lib/living.ts).
// Тот же язык, что у «Стоит ли брать» (ListingVerdict): итог одной строкой,
// шкала из трёх делений и карточки по пунктам. Остальные языки берут
// английский текст, как и ListingVerdict.
import { pickCopy, type Lang } from '@/lib/i18n'
import type { LivingFacts, LivingRow, NoiseReason } from '@/lib/living'
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

const mRound = (m: number) => Math.round(m / 10) * 10
const kmRu = (km: number) => (km < 1 ? `${Math.round(km * 1000 / 50) * 50} м` : `${km.toFixed(1).replace('.', ',')} км`)
const kmEn = (km: number) => (km < 1 ? `${Math.round(km * 1000 / 50) * 50} m` : `${km.toFixed(1)} km`)
const HUB_RU = { canggu: 'Чангу', ubud: 'Убуда', uluwatu: 'Улувату', sanur: 'Санура' } as const
const HUB_EN = { canggu: 'Canggu', ubud: 'Ubud', uluwatu: 'Uluwatu', sanur: 'Sanur' } as const
const VOLC_RU = { agung: 'Агунг', batur: 'Батур' } as const
const VOLC_EN = { agung: 'Agung', batur: 'Batur' } as const

// Что шумит рядом — по-русски и по-английски.
const reasonRu = (r: NoiseReason) => r.k === 'bars' ? `${r.n} ${pluralRu(r.n, ['бар или клуб', 'бара или клуба', 'баров и клубов'])} в 500 м`
  : r.k === 'road' ? `${r.cls === 'big' ? 'оживлённая дорога' : 'проезжая улица'} в ${mRound(r.m)} м`
  : r.k === 'mosque' ? `мечеть в ${mRound(r.m)} м: призыв к молитве с 4:30`
  : r.k === 'flight' ? (r.v === 'near' ? 'рядом аэропорт: слышно самолёты' : 'под заходом самолётов на посадку')
  : 'район быстро застраивается: рядом стройки'
const reasonEn = (r: NoiseReason) => r.k === 'bars' ? `${r.n} ${r.n === 1 ? 'bar or club' : 'bars and clubs'} within 500 m`
  : r.k === 'road' ? `${r.cls === 'big' ? 'busy road' : 'through street'} ${mRound(r.m)} m away`
  : r.k === 'mosque' ? `mosque ${mRound(r.m)} m away: call to prayer from 4:30 am`
  : r.k === 'flight' ? (r.v === 'near' ? 'close to the airport: planes are audible' : 'under the landing approach')
  : 'fast-growing area: construction nearby'

// В шкале справа и в итоге — главные пять пунктов; остальные только карточками.
const MAIN = new Set(['school', 'beach', 'health', 'shop', 'quiet'])

const COPY = {
  ru: {
    title: 'Удобно ли тут жить',
    sub: 'Для тех, кто покупает для себя. Расстояние по прямой до ближайшего места - по Google Maps и OpenStreetMap.',
    total: 'Итог для жизни',
    line: { plus: 'Для жизни удобно', warn: 'Для жизни есть минусы', minus: 'Для жизни неудобно' } as Record<Tone, string>,
    label: (r: LivingRow) => ({
      school: r.intl ? 'Международная школа' : 'Школа', beach: 'Пляж', health: 'Клиника или больница', shop: 'Магазин',
      quiet: 'Тишина', cafes: 'Кафе и коворкинг', walk: 'Пешком', air: 'Воздух', heat: 'Жара', volcano: 'Вулкан',
    })[r.key],
    status: (r: LivingRow) => {
      const t = r.tone
      if (r.key === 'quiet') return ({ plus: 'тихо', warn: 'бывает шумно', minus: 'шумно' } as Record<Tone, string>)[t]
      if (r.key === 'cafes') return ({ plus: 'много рядом', warn: 'немного', minus: 'мало' } as Record<Tone, string>)[t]
      if (r.key === 'walk') return ({ plus: 'можно без мопеда', warn: 'частично', minus: 'нужен мопед' } as Record<Tone, string>)[t]
      if (r.key === 'air') return ({ plus: 'хороший', warn: 'умеренный', minus: 'плохой' } as Record<Tone, string>)[t]
      if (r.key === 'heat') return t === 'plus' ? 'прохладнее' : 'жарко, как на побережье'
      if (r.key === 'volcano') return ({ plus: 'далеко', warn: 'неблизко', minus: 'близко' } as Record<Tone, string>)[t]
      return ({ plus: 'близко', warn: 'неблизко', minus: 'далеко' } as Record<Tone, string>)[t]
    },
    value: (r: LivingRow): string => {
      switch (r.key) {
        case 'quiet': return r.reasons?.length ? reasonRu(r.reasons[0]) : 'рядом нет больших дорог, баров и аэропорта'
        case 'cafes': return `${r.count} ${pluralRu(r.count ?? 0, ['кафе или ресторан', 'кафе или ресторана', 'кафе и ресторанов'])} в 500 м`
        case 'walk': return r.beachKm != null ? `пляж ${kmRu(r.beachKm)}, ${r.count} ${pluralRu(r.count ?? 0, ['кафе', 'кафе', 'кафе'])} в 500 м` : `${r.count} кафе в 500 м`
        case 'air': return `индекс ${r.ispu}`
        case 'heat': return `днём до ${r.tMax}°`
        case 'volcano': return `${VOLC_RU[r.volcano!]} в ${kmRu(r.km!)}`
        default: return r.km != null ? kmRu(r.km) : `дальше ${String(r.searchKm).replace('.', ',')} км`
      }
    },
    note: (r: LivingRow): string | null => {
      switch (r.key) {
        case 'quiet': return r.reasons && r.reasons.length > 1 ? r.reasons.slice(1).map(reasonRu).join(' · ') : null
        case 'cafes': return [r.coworkKm != null ? `коворкинг ${kmRu(r.coworkKm)}` : null, r.gymKm != null ? `йога или спорт ${kmRu(r.gymKm)}` : null].filter(Boolean).join(' · ') || null
        case 'walk': return 'Тротуаров на Бали почти нет: «пешком» - это пляж и кафе на расстоянии прогулки.'
        case 'air': return 'Индекс Индонезии ISPU: до 50 - хороший, до 100 - умеренный.'
        case 'heat': return [r.rh != null ? `влажность ${r.rh}%` : null, r.elevationM != null ? `${Math.round(r.elevationM)} м над морем` : null].filter(Boolean).join(' · ') || null
        case 'volcano': return 'В 2017 году зону эвакуации вокруг Агунга расширяли до 12 км.'
        case 'health': return [r.name, r.pharmacyKm != null ? `аптека ${kmRu(r.pharmacyKm)}` : null].filter(Boolean).join(' · ') || null
        default: return r.name ?? null
      }
    },
    why: (f: LivingFacts) => f.tone === 'plus'
      ? f.rows.filter(r => ['school', 'beach', 'health'].includes(r.key) && r.km != null)
        .map(r => `${({ school: 'школа', beach: 'пляж', health: 'клиника' } as Record<string, string>)[r.key]} ${kmRu(r.km!)}`).join(', ')
      // Есть минусы — называем их, а не плюсы.
      : f.rows.filter(r => MAIN.has(r.key) && r.tone !== 'plus')
        .map(r => r.key === 'quiet' ? `шумно (${COPY.ru.value(r)})` : `${COPY.ru.label(r).toLowerCase()} ${COPY.ru.status(r)} (${COPY.ru.value(r)})`).join(', '),
    road: (f: LivingFacts) => [
      f.airportMin != null ? `до аэропорта ${f.airportMin} мин` : null,
      f.hub ? `до ${HUB_RU[f.hub.key]} ${f.hub.min} мин` : null,
    ].filter(Boolean).join(', '),
    roadLabel: 'Дорога в час пик',
    lease: (y: number) => `Аренда земли: осталось ${Math.floor(y)} ${pluralRu(Math.floor(y), ['год', 'года', 'лет'])}`,
    hint: 'Если важна доходность, переключитесь на «Для дохода»: там расчёт сдачи в аренду.',
  },
  en: {
    title: 'Is it good to live here',
    sub: 'For those buying for themselves. Straight-line distance to the nearest place, from Google Maps and OpenStreetMap.',
    total: 'For living',
    line: { plus: 'Comfortable to live in', warn: 'Liveable, with drawbacks', minus: 'Inconvenient to live in' } as Record<Tone, string>,
    label: (r: LivingRow) => ({
      school: r.intl ? 'International school' : 'School', beach: 'Beach', health: 'Clinic or hospital', shop: 'Grocery store',
      quiet: 'Quiet', cafes: 'Cafés and coworking', walk: 'On foot', air: 'Air', heat: 'Heat', volcano: 'Volcano',
    })[r.key],
    status: (r: LivingRow) => {
      const t = r.tone
      if (r.key === 'quiet') return ({ plus: 'quiet', warn: 'can be noisy', minus: 'noisy' } as Record<Tone, string>)[t]
      if (r.key === 'cafes') return ({ plus: 'plenty nearby', warn: 'a few', minus: 'few' } as Record<Tone, string>)[t]
      if (r.key === 'walk') return ({ plus: 'no scooter needed', warn: 'partly', minus: 'scooter needed' } as Record<Tone, string>)[t]
      if (r.key === 'air') return ({ plus: 'good', warn: 'moderate', minus: 'poor' } as Record<Tone, string>)[t]
      if (r.key === 'heat') return t === 'plus' ? 'cooler' : 'hot, like the coast'
      if (r.key === 'volcano') return ({ plus: 'far', warn: 'not that far', minus: 'close' } as Record<Tone, string>)[t]
      return ({ plus: 'close', warn: 'not that close', minus: 'far' } as Record<Tone, string>)[t]
    },
    value: (r: LivingRow): string => {
      switch (r.key) {
        case 'quiet': return r.reasons?.length ? reasonEn(r.reasons[0]) : 'no busy roads, bars or airport nearby'
        case 'cafes': return `${r.count} ${r.count === 1 ? 'café or restaurant' : 'cafés and restaurants'} within 500 m`
        case 'walk': return r.beachKm != null ? `beach ${kmEn(r.beachKm)}, ${r.count} cafés within 500 m` : `${r.count} cafés within 500 m`
        case 'air': return `index ${r.ispu}`
        case 'heat': return `up to ${r.tMax}° by day`
        case 'volcano': return `${VOLC_EN[r.volcano!]} ${kmEn(r.km!)} away`
        default: return r.km != null ? kmEn(r.km) : `beyond ${r.searchKm} km`
      }
    },
    note: (r: LivingRow): string | null => {
      switch (r.key) {
        case 'quiet': return r.reasons && r.reasons.length > 1 ? r.reasons.slice(1).map(reasonEn).join(' · ') : null
        case 'cafes': return [r.coworkKm != null ? `coworking ${kmEn(r.coworkKm)}` : null, r.gymKm != null ? `yoga or gym ${kmEn(r.gymKm)}` : null].filter(Boolean).join(' · ') || null
        case 'walk': return 'Bali has few sidewalks: “on foot” means the beach and cafés are within a walk.'
        case 'air': return 'Indonesia’s ISPU index: up to 50 is good, up to 100 moderate.'
        case 'heat': return [r.rh != null ? `humidity ${r.rh}%` : null, r.elevationM != null ? `${Math.round(r.elevationM)} m above sea level` : null].filter(Boolean).join(' · ') || null
        case 'volcano': return 'In 2017 the evacuation zone around Agung was extended to 12 km.'
        case 'health': return [r.name, r.pharmacyKm != null ? `pharmacy ${kmEn(r.pharmacyKm)}` : null].filter(Boolean).join(' · ') || null
        default: return r.name ?? null
      }
    },
    why: (f: LivingFacts) => f.tone === 'plus'
      ? f.rows.filter(r => ['school', 'beach', 'health'].includes(r.key) && r.km != null)
        .map(r => `${({ school: 'school', beach: 'beach', health: 'clinic' } as Record<string, string>)[r.key]} ${kmEn(r.km!)}`).join(', ')
      : f.rows.filter(r => MAIN.has(r.key) && r.tone !== 'plus')
        .map(r => r.key === 'quiet' ? `noisy (${COPY.en.value(r)})` : `${COPY.en.label(r).toLowerCase()} ${COPY.en.status(r)} (${COPY.en.value(r)})`).join(', '),
    road: (f: LivingFacts) => [
      f.airportMin != null ? `airport ${f.airportMin} min` : null,
      f.hub ? `${HUB_EN[f.hub.key]} ${f.hub.min} min` : null,
    ].filter(Boolean).join(', '),
    roadLabel: 'Drive at rush hour',
    lease: (y: number) => `Land lease: ${Math.floor(y)} years left`,
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
          {f.rows.filter(r => MAIN.has(r.key)).map(r => (
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

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {f.rows.map(r => {
          const note = c.note(r)
          return (
            <div key={r.key} className="rounded-[20px] border border-[var(--color-border)] bg-white p-5">
              <div className={`text-[14px] font-semibold ${TONE_TEXT[r.tone]}`}>{c.label(r)} · {c.status(r)}</div>
              <div className="mt-2 text-[19px] font-semibold leading-snug tracking-tight text-[var(--color-text)] [text-wrap:balance]">{c.value(r)}</div>
              {note && <div className="mt-1 text-[14px] leading-relaxed text-[var(--color-text-muted)] [overflow-wrap:anywhere]">{note}</div>}
            </div>
          )
        })}
      </div>
      <p className="mt-6 text-[15px] leading-relaxed text-[var(--color-text-muted)] max-w-[64ch]">{c.hint}</p>
    </section>
  )
}
