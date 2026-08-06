import type { ReactNode } from 'react'
// "What is the weather actually like here" in numbers a person can picture:
// bright sunny days per year out of 365, the months worth coming for, and the
// months it rains. Deliberately NOT sunshine hours or kWh/m² — half of any
// 24-hour day is night, and nobody books a trip by irradiance.
//
// Data: listing_geo_facts.climate, built from six years of NASA POWER daily
// records (scripts/build-listing-environment.mjs). A day counts as sunny when
// the sky delivered >= 70% of cloudless-sky sunlight and it did not rain.
// Server Component. Renders nothing without data.
import { Sun, CloudRain, Wind } from 'lucide-react'
import type { Climate, ClimateMonth, GeoFacts } from '@/lib/complex-access'
import { pickCopy, type Lang } from '@/lib/i18n'

const COPY = {
  ru: { title: 'Солнце и погода', sunny: 'солнечных дней в году', best: 'Лучшие месяцы', worst: 'Сезон дождей', air: 'Воздух', airGood: 'хороший', airOk: 'умеренный', perMonth: 'солнечных дней в месяц' },
  en: { title: 'Sun and weather', sunny: 'bright sunny days a year', best: 'Best months', worst: 'Rainy season', air: 'Air', airGood: 'good', airOk: 'moderate', perMonth: 'sunny days a month' },
  id: { title: 'Matahari dan cuaca', sunny: 'hari cerah per tahun', best: 'Bulan terbaik', worst: 'Musim hujan', air: 'Udara', airGood: 'baik', airOk: 'sedang', perMonth: 'hari cerah per bulan' },
  fr: { title: 'Soleil et météo', sunny: 'journées ensoleillées par an', best: 'Meilleurs mois', worst: 'Saison des pluies', air: 'Air', airGood: 'bon', airOk: 'moyen', perMonth: 'jours de soleil par mois' },
  de: { title: 'Sonne und Wetter', sunny: 'sonnige Tage pro Jahr', best: 'Beste Monate', worst: 'Regenzeit', air: 'Luft', airGood: 'gut', airOk: 'mäßig', perMonth: 'Sonnentage pro Monat' },
  zh: { title: '阳光与天气', sunny: '晴天天数/年', best: '最佳月份', worst: '雨季', air: '空气', airGood: '良好', airOk: '中等', perMonth: '晴天/月' },
  nl: { title: 'Zon en weer', sunny: 'zonnige dagen per jaar', best: 'Beste maanden', worst: 'Regenseizoen', air: 'Lucht', airGood: 'goed', airOk: 'matig', perMonth: 'zonnige dagen per maand' },
  ban: { title: 'Surya lan cuaca', sunny: 'rahina galang sabilang warsa', best: 'Sasih pinih becik', worst: 'Masan ujan', air: 'Angin', airGood: 'becik', airOk: 'cukup', perMonth: 'rahina galang sabilang sasih' },
  pl: { title: 'Słońce i pogoda', sunny: 'słonecznych dni w roku', best: 'Najlepsze miesiące', worst: 'Pora deszczowa', air: 'Powietrze', airGood: 'dobre', airOk: 'umiarkowane', perMonth: 'dni słonecznych w miesiącu' },
  uk: { title: 'Сонце і погода', sunny: 'сонячних днів на рік', best: 'Найкращі місяці', worst: 'Сезон дощів', air: 'Повітря', airGood: 'добре', airOk: 'помірне', perMonth: 'сонячних днів на місяць' },
} as const

const MONTHS = {
  ru: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  zh: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  nl: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
  ban: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  pl: ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'],
  uk: ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'],
} as const

/** Longest run of consecutive months matching a test, wrapping across the new year. */
function monthRun(climate: Climate, pick: (m: ClimateMonth) => boolean): number[] {
  const flags = Array.from({ length: 12 }, (_, i) => {
    const m = climate[String(i + 1).padStart(2, '0')]
    return m ? pick(m) : false
  })
  let best: number[] = []
  let run: number[] = []
  // December→January wraps so a rainy season spanning the new year reads as one
  // period instead of two.
  for (let i = 0; i < 24; i++) {
    if (flags[i % 12]) {
      run.push(i % 12)
      if (run.length > best.length && run.length <= 12) best = [...run]
    } else run = []
  }
  return best
}

// Russian and Ukrainian decline both the adjective and the noun after a
// number: 21 солнечный день, 22 солнечных дня, 25 солнечных дней. Spelling the
// three forms out beats patching substrings.
const PLURAL_FORMS: Partial<Record<Lang, [string, string, string]>> = {
  ru: ['солнечный день в месяц', 'солнечных дня в месяц', 'солнечных дней в месяц'],
  uk: ['сонячний день на місяць', 'сонячні дні на місяць', 'сонячних днів на місяць'],
}

function perMonthPhrase(n: number, lang: Lang, fallback: string): string {
  const forms = PLURAL_FORMS[lang]
  if (!forms) return fallback
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 14) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]
  return forms[2]
}

function runLabel(run: number[], lang: Lang): string | null {
  if (!run.length) return null
  const names = MONTHS[lang as keyof typeof MONTHS] ?? MONTHS.en
  if (run.length === 1) return names[run[0]]
  return `${names[run[0]]} — ${names[run[run.length - 1]]}`
}

type Props = {
  climate: Climate | null
  air: GeoFacts['air']
  lang: Lang
  /** Необязательный подвал карточки — например, кнопка 3D-инсоляции. */
  footer?: ReactNode
}

export function ClimateBlock({ climate, air, lang, footer }: Props) {
  const t = pickCopy(COPY, lang)
  const year = climate?.year
  if (!climate || !year?.sunny) return null

  // A month earns "best" with at most ~4 rainy days and lands in the rainy
  // season at ten or more. Tuned to Bali's actual split: August 31/0,
  // February 12/16.
  const best = monthRun(climate, (m) => m.wet <= 4)
  const worst = monthRun(climate, (m) => m.wet >= 10)
  const bestLabel = runLabel(best, lang)
  const worstLabel = runLabel(worst, lang)
  const bestAvg = best.length
    ? Math.round(best.reduce((s, i) => s + (climate[String(i + 1).padStart(2, '0')]?.sunny ?? 0), 0) / best.length)
    : null

  // ISPU is Indonesia's own index: under 50 is officially "good".
  const ispu = air?.ispu_avg ?? null
  const airWord = ispu == null ? null : ispu <= 50 ? t.airGood : t.airOk

  return (
    <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-white p-5">
      <h3 className="mb-3 text-[15px] font-semibold text-[#111827]">{t.title}</h3>

      <div className="flex items-baseline gap-2">
        <Sun size={18} className="shrink-0 translate-y-0.5 text-[#F59E0B]" />
        <span className="text-[22px] font-semibold text-[#111827]">{year.sunny}</span>
        <span className="text-[13px] text-[var(--color-text-muted)]">
          {t.sunny} ({year.days})
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {bestLabel && (
          <div className="flex min-w-0 items-center gap-1.5">
            <Sun size={15} className="shrink-0 text-[#F59E0B]" />
            <span className="shrink-0 text-[13px] text-[var(--color-text-muted)]">{t.best}:</span>
            <span className="truncate text-[13px] font-medium text-[#111827]">
              {bestLabel}
              {bestAvg ? ` · ${bestAvg} ${perMonthPhrase(bestAvg, lang, t.perMonth)}` : ''}
            </span>
          </div>
        )}
        {worstLabel && (
          <div className="flex min-w-0 items-center gap-1.5">
            <CloudRain size={15} className="shrink-0 text-[#3B82F6]" />
            <span className="shrink-0 text-[13px] text-[var(--color-text-muted)]">{t.worst}:</span>
            <span className="truncate text-[13px] font-medium text-[#111827]">{worstLabel}</span>
          </div>
        )}
        {airWord && (
          <div className="flex min-w-0 items-center gap-1.5">
            <Wind size={15} className="shrink-0 text-[var(--color-primary)]" />
            <span className="shrink-0 text-[13px] text-[var(--color-text-muted)]">{t.air}:</span>
            <span className="truncate text-[13px] font-medium text-[#111827]">{airWord}</span>
          </div>
        )}
      </div>

      {footer && <div className="mt-4 border-t border-[var(--color-border)] pt-4">{footer}</div>}
    </div>
  )
}
